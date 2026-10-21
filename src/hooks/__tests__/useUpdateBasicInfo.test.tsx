import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { BasicInfoType } from "@/@types/BasicInfo.types";
import { basicInfoMock } from "@/mocks/basic-info";
import { createTestQueryWrapper } from "@/tests/tan-query";
import { useBasicInfo, useUpdateBasicInfo } from "../useBasicInfo";

const UploadForm = ({ onSuccess, onError }: {
    onSuccess: () => void;
    onError: (error: Error) => void;
}) => {
    const { register, handleSubmit } = useForm<BasicInfoType>({ defaultValues: basicInfoMock[0] });
    const mutation = useUpdateBasicInfo();
    return (
        <form onSubmit={handleSubmit((data) => mutation.updateBasicInfo(data, { onSuccess, onError }))}>
            <input aria-label="Avatar" type="file" {...register("avatar_url")} />
            <input aria-label="Favicon" type="file" {...register("favicon_url")} />
            <button type="submit">Save profile</button>
            <output>{mutation.isLoading ? "Saving" : mutation.error?.message}</output>
        </form>
    );
};

describe("useUpdateBasicInfo", () => {
    const fetchMock = vi.fn<typeof fetch>();
    const basicInfo = basicInfoMock[0];
    const success = { success: true, message: "Basic info updated" };
    let context: ReturnType<typeof createTestQueryWrapper>;

    beforeEach(() => {
        context = createTestQueryWrapper();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        cleanup();
        context.queryClient.clear();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    test("should expose pending state, retain existing image URLs and invalidate only basic info after success", async () => {
        context.queryClient.setQueryData(["basicInfo"], basicInfo);
        context.queryClient.setQueryData(["skills"], []);
        const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
        const onSuccess = vi.fn();
        const { promise, resolve } = Promise.withResolvers<Response>();
        fetchMock.mockReturnValueOnce(promise);
        const { result } = renderHook(useUpdateBasicInfo, { wrapper: context.wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
        act(() => result.current.updateBasicInfo(basicInfo, { onSuccess }));
        try {
            await waitFor(() => expect(result.current.isLoading).toBe(true));
            expect(invalidate).not.toHaveBeenCalled();
        } finally {
            resolve(Response.json(success));
        }

        await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/basic-info/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(basicInfo),
        });
        expect(onSuccess.mock.calls[0][0]).toEqual(success);
        expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["basicInfo"] });
        expect(context.queryClient.getQueryState(["basicInfo"])?.isInvalidated).toBe(true);
        expect(context.queryClient.getQueryState(["skills"])?.isInvalidated).toBe(false);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    test.each([200, 503])("should expose unsuccessful updates with status %i without invalidating cache", async (status) => {
        fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Update failed" }, { status }));
        const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
        const onError = vi.fn();
        const { result } = renderHook(useUpdateBasicInfo, { wrapper: context.wrapper });

        act(() => result.current.updateBasicInfo(basicInfo, { onError }));

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe(status === 200 ? "Failed to update basic info" : "Network response was not ok");
        expect(onError).toHaveBeenCalledTimes(1);
        expect(result.current.isLoading).toBe(false);
        expect(invalidate).not.toHaveBeenCalled();
    });

    test.each(["network", "JSON"])("should expose a %s error when saving", async (kind) => {
        if (kind === "network") {
            fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));
        } else {
            fetchMock.mockResolvedValueOnce(new Response("invalid JSON"));
        }
        const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
        const { result } = renderHook(useUpdateBasicInfo, { wrapper: context.wrapper });

        act(() => result.current.updateBasicInfo(basicInfo));

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.name).toBe(kind === "network" ? "TypeError" : "SyntaxError");
        expect(invalidate).not.toHaveBeenCalled();
    });

    test("should skip uploads for empty image URLs and surface backend validation errors", async () => {
        const data = { ...basicInfo, avatar_url: "", favicon_url: "" };
        fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Invalid image URLs" }, { status: 422 }));
        const { result } = renderHook(useUpdateBasicInfo, { wrapper: context.wrapper });

        act(() => result.current.updateBasicInfo(data));

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/basic-info/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });

    test("should clear mutation errors after a successful retry", async () => {
        fetchMock
            .mockRejectedValueOnce(new Error("Offline"))
            .mockResolvedValueOnce(Response.json(success));
        const onSuccess = vi.fn();
        const { result } = renderHook(useUpdateBasicInfo, { wrapper: context.wrapper });
        act(() => result.current.updateBasicInfo(basicInfo));
        await waitFor(() => expect(result.current.isError).toBe(true));

        act(() => result.current.updateBasicInfo(basicInfo, { onSuccess }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test.each(["avatar", "favicon", "both"])("should upload %s files and send the returned image URLs", async (selection) => {
        const user = userEvent.setup();
        const avatar = new File(["avatar image"], "avatar.png", { type: "image/png" });
        const favicon = new File(["favicon image"], "favicon.svg", { type: "image/svg+xml" });
        const onSuccess = vi.fn();
        const onError = vi.fn();
        const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
        const uploads: { file: File; url: string }[] = [];
        const hasAvatar = selection === "avatar" || selection === "both";
        const hasFavicon = selection === "favicon" || selection === "both";
        if (hasFavicon) {
            uploads.push({ file: favicon, url: "/uploads/favicon.svg" });
        }
        if (hasAvatar) {
            uploads.push({ file: avatar, url: "/uploads/avatar.png" });
        }
        for (const upload of uploads) {
            fetchMock.mockResolvedValueOnce(Response.json({ fileUrl: upload.url }));
        }
        fetchMock.mockResolvedValueOnce(Response.json(success));
        render(<UploadForm onSuccess={onSuccess} onError={onError} />, { wrapper: context.wrapper });
        if (hasAvatar) {
            await user.upload(screen.getByLabelText("Avatar"), avatar);
        }
        if (hasFavicon) {
            await user.upload(screen.getByLabelText("Favicon"), favicon);
        }

        await user.click(screen.getByRole("button", { name: "Save profile" }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
        expect(fetchMock).toHaveBeenCalledTimes(uploads.length + 1);
        for (const [index, upload] of uploads.entries()) {
            expect(fetchMock).toHaveBeenNthCalledWith(index + 1, "/api/upload", { method: "POST", body: expect.any(FormData) });
            const body = fetchMock.mock.calls[index][1]?.body;
            if (!(body instanceof FormData)) {
                throw new Error("Expected a multipart upload body");
            }
            expect(body.get("file")).toBe(upload.file);
        }
        expect(fetchMock).toHaveBeenLastCalledWith("/api/basic-info/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...basicInfo,
                avatar_url: hasAvatar ? "/uploads/avatar.png" : basicInfo.avatar_url,
                favicon_url: hasFavicon ? "/uploads/favicon.svg" : basicInfo.favicon_url,
            }),
        });
        expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["basicInfo"] });
        expect(onError).not.toHaveBeenCalled();
    });

    describe.each(["avatar", "favicon"])("%s upload errors", (image) => {
        test.each(["HTTP", "network", "JSON"])("should stop saving after an upload %s error", async (kind) => {
            const user = userEvent.setup();
            const onSuccess = vi.fn();
            const onError = vi.fn();
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            if (image === "avatar") {
                fetchMock.mockResolvedValueOnce(Response.json({ fileUrl: "/uploads/favicon.svg" }));
            }
            if (kind === "network") {
                fetchMock.mockRejectedValueOnce(new TypeError("Upload unavailable"));
            } else if (kind === "JSON") {
                fetchMock.mockResolvedValueOnce(new Response("invalid JSON"));
            } else {
                fetchMock.mockResolvedValueOnce(Response.json({ error: "Upload failed" }, { status: 500 }));
            }
            render(<UploadForm onSuccess={onSuccess} onError={onError} />, { wrapper: context.wrapper });
            await user.upload(screen.getByLabelText("Avatar"), new File(["avatar"], "avatar.png", { type: "image/png" }));
            await user.upload(screen.getByLabelText("Favicon"), new File(["favicon"], "favicon.png", { type: "image/png" }));

            await user.click(screen.getByRole("button", { name: "Save profile" }));

            await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
            const error: Error = onError.mock.calls[0][0];
            if (kind === "HTTP") {
                expect(error.message).toBe(`Failed to upload ${image}`);
            } else {
                expect(error.name).toBe(kind === "network" ? "TypeError" : "SyntaxError");
            }
            expect(screen.getByText(error.message)).toBeInTheDocument();
            expect(fetchMock).toHaveBeenCalledTimes(image === "avatar" ? 2 : 1);
            expect(onSuccess).not.toHaveBeenCalled();
            expect(invalidate).not.toHaveBeenCalled();
        });
    });

    test("should refetch active basic info queries after a successful update", async () => {
        const updatedInfo = { ...basicInfo, name: "Updated Developer" };
        fetchMock
            .mockResolvedValueOnce(Response.json({ success: true, data: [basicInfo] }))
            .mockResolvedValueOnce(Response.json(success))
            .mockResolvedValueOnce(Response.json({ success: true, data: [updatedInfo] }));
        const { result } = renderHook(() => ({ query: useBasicInfo(), mutation: useUpdateBasicInfo() }), {
            wrapper: context.wrapper,
        });
        await waitFor(() => expect(result.current.query.basicInfo).toEqual(basicInfo));

        act(() => result.current.mutation.updateBasicInfo(updatedInfo));

        await waitFor(() => expect(result.current.query.basicInfo).toEqual(updatedInfo));
        expect(result.current.query.isBasicInfoError).toBe(false);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });
});
