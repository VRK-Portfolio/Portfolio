// @vitest-environment node

import { put } from "@vercel/blob";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "../route";

vi.mock("@vercel/blob", () => ({ put: vi.fn() }));

describe("POST /api/upload", () => {
    const timestamp = 1700000000000;
    const fileContents = "test image contents";
    const blobResult = {
        url: "https://portfolio.public.blob.vercel-storage.com/uploads/icon.png",
        downloadUrl: "https://portfolio.public.blob.vercel-storage.com/uploads/icon.png?download=1",
        pathname: `uploads/${timestamp}-icon.png`,
        contentType: "image/png",
        contentDisposition: 'inline; filename="icon.png"',
        etag: '"test-etag"',
    };

    const createRequest = (file?: File | string) => {
        const formData = new FormData();
        if (file !== undefined) {
            formData.set("file", file);
        }
        return new Request("http://localhost/api/upload", {
            method: "POST",
            body: formData,
        });
    };

    beforeEach(() => {
        vi.mocked(put).mockReset();
        vi.mocked(put).mockResolvedValue(blobResult);
        vi.spyOn(Date, "now").mockReturnValue(timestamp);
    });

    afterEach(() => vi.restoreAllMocks());

    test.each([
        { name: "icon.svg", type: "image/svg+xml" },
        { name: "icon.png", type: "image/png" },
        { name: "icon.jpg", type: "image/jpeg" },
        { name: "icon.jpeg", type: "image/jpeg" },
        { name: "icon.jpg", type: "image/jpg" },
        { name: "icon.webp", type: "image/webp" },
        { name: "ICON.PNG", type: "image/png" },
    ])("uploads an allowed $name file with MIME type $type to public Blob storage", async ({ name, type }) => {
        const response = await POST(createRequest(new File([fileContents], name, { type })));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            message: "File uploaded successfully",
            fileUrl: blobResult.url,
        });
        expect(put).toHaveBeenCalledExactlyOnceWith(
            `uploads/${timestamp}-${name}`,
            expect.objectContaining({ name, type, size: Buffer.byteLength(fileContents) }),
            { access: "public" }
        );
        const uploadedFile = vi.mocked(put).mock.calls[0][1];
        if (!(uploadedFile instanceof File)) {
            throw new Error("Expected Blob storage to receive the uploaded File");
        }
        expect(await uploadedFile.text()).toBe(fileContents);
    });

    test("replaces consecutive whitespace in the Blob pathname with a single underscore", async () => {
        const response = await POST(createRequest(new File([fileContents], "my skill  icon.png", { type: "image/png" })));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            message: "File uploaded successfully",
            fileUrl: blobResult.url,
        });
        expect(put).toHaveBeenCalledExactlyOnceWith(
            `uploads/${timestamp}-my_skill_icon.png`, expect.any(File), { access: "public" }
        );
    });

    test.each([
        { scenario: "no file field", file: undefined },
        { scenario: "a string instead of a file", file: "icon.png" },
    ])("returns 400 for $scenario without uploading", async ({ file }) => {
        const response = await POST(createRequest(file));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ success: false, error: "No valid file uploaded" });
        expect(put).not.toHaveBeenCalled();
    });

    test.each(["text/plain", "application/pdf", ""])("rejects MIME type '%s' before uploading", async (type) => {
        const response = await POST(createRequest(new File([fileContents], "icon.png", { type })));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "Invalid file format. Only SVG, PNG, JPG, and WebP are allowed.",
        });
        expect(put).not.toHaveBeenCalled();
    });

    test("reports multipart parsing failures without calling Blob storage", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const request = createRequest();
        vi.spyOn(request, "formData").mockRejectedValue(new Error("Invalid multipart body"));

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "File upload failed: Invalid multipart body" });
        expect(consoleError).toHaveBeenCalledExactlyOnceWith("Invalid multipart body");
        expect(put).not.toHaveBeenCalled();
    });

    test.each([
        { error: new Error("Upload unavailable"), message: "Upload unavailable" },
        { error: "Storage quota exceeded", message: "Storage quota exceeded" },
    ])("reports and logs Blob upload failures: $message", async ({ error, message }) => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(put).mockRejectedValueOnce(error);

        const response = await POST(createRequest(new File([fileContents], "icon.png", { type: "image/png" })));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: `File upload failed: ${message}` });
        expect(consoleError).toHaveBeenCalledExactlyOnceWith(message);
        expect(put).toHaveBeenCalledTimes(1);
    });
});
