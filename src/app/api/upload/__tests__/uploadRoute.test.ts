// @vitest-environment node

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "../route";

vi.mock("fs/promises", () => ({
    mkdir: vi.fn(),
    writeFile: vi.fn(),
}));

describe("POST /api/upload", () => {
    const timestamp = 1700000000000;
    const fileContents = "test image contents";
    const uploadDir = path.join(process.cwd(), "public/uploads");

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
        vi.clearAllMocks();
        vi.spyOn(Date, "now").mockReturnValue(timestamp);
        vi.mocked(mkdir).mockResolvedValue(undefined);
        vi.mocked(writeFile).mockResolvedValue(undefined);
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
    ])("should save an allowed $name file with MIME type $type", async ({ name, type }) => {
        const response = await POST(createRequest(new File([fileContents], name, { type })));
        const fileName = `${timestamp}-${name}`;

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            message: "File uploaded successfully",
            fileUrl: `/uploads/${fileName}`,
        });
        expect(mkdir).toHaveBeenCalledExactlyOnceWith(uploadDir, { recursive: true });
        expect(writeFile).toHaveBeenCalledExactlyOnceWith(
            path.join(uploadDir, fileName),
            Buffer.from(fileContents)
        );
    });

    test("should replace whitespace in the filename with underscores", async () => {
        const response = await POST(createRequest(new File([fileContents], "my skill  icon.png", { type: "image/png" })));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            message: "File uploaded successfully",
            fileUrl: `/uploads/${timestamp}-my_skill_icon.png`,
        });
        expect(writeFile).toHaveBeenCalledExactlyOnceWith(
            path.join(uploadDir, `${timestamp}-my_skill_icon.png`),
            Buffer.from(fileContents)
        );
    });

    test.each([
        { scenario: "no file field", file: undefined },
        { scenario: "a string instead of a file", file: "icon.png" },
    ])("should return 400 for $scenario", async ({ file }) => {
        const response = await POST(createRequest(file));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ success: false, error: "No valid file uploaded" });
        expect(mkdir).not.toHaveBeenCalled();
        expect(writeFile).not.toHaveBeenCalled();
    });

    test.each(["text/plain", "application/pdf", ""])("should reject MIME type '%s' before writing a file", async (type) => {
        const response = await POST(createRequest(new File([fileContents], "icon.png", { type })));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "Invalid file format. Only SVG, PNG, JPG, and WebP are allowed.",
        });
        expect(mkdir).not.toHaveBeenCalled();
        expect(writeFile).not.toHaveBeenCalled();
    });

    test.each(["icon.txt", "icon", "icon.png.exe"])("should reject the unsupported extension in %s", async (name) => {
        const response = await POST(createRequest(new File([fileContents], name, { type: "image/png" })));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "Invalid file extension. Only .svg, .png, .jpg, .jpeg, and .webp are allowed.",
        });
        expect(mkdir).not.toHaveBeenCalled();
        expect(writeFile).not.toHaveBeenCalled();
    });

    test("should return 500 when multipart parsing fails", async () => {
        const request = createRequest();
        vi.spyOn(request, "formData").mockRejectedValue(new Error("Invalid multipart body"));

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "File upload failed" });
        expect(mkdir).not.toHaveBeenCalled();
        expect(writeFile).not.toHaveBeenCalled();
    });

    test("should return 500 when reading file bytes fails", async () => {
        const file = new File([fileContents], "icon.png", { type: "image/png" });
        vi.spyOn(file, "arrayBuffer").mockRejectedValue(new Error("Cannot read file"));
        const formData = new FormData();
        formData.set("file", file);
        const request = createRequest();
        vi.spyOn(request, "formData").mockResolvedValue(formData);

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "File upload failed" });
        expect(mkdir).not.toHaveBeenCalled();
        expect(writeFile).not.toHaveBeenCalled();
    });

    test("should return 500 and not write a file when directory creation fails", async () => {
        vi.mocked(mkdir).mockRejectedValueOnce(new Error("Permission denied"));

        const response = await POST(createRequest(new File([fileContents], "icon.png", { type: "image/png" })));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "File upload failed" });
        expect(mkdir).toHaveBeenCalledExactlyOnceWith(uploadDir, { recursive: true });
        expect(writeFile).not.toHaveBeenCalled();
    });

    test("should return 500 when writing the file fails", async () => {
        vi.mocked(writeFile).mockRejectedValueOnce(new Error("Disk full"));

        const response = await POST(createRequest(new File([fileContents], "icon.png", { type: "image/png" })));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "File upload failed" });
        expect(writeFile).toHaveBeenCalledExactlyOnceWith(
            path.join(uploadDir, `${timestamp}-icon.png`),
            Buffer.from(fileContents)
        );
    });
});
