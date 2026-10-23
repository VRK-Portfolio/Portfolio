import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mockCertifications } from "@/mocks/certifications";
import { createTestQueryWrapper } from "@/tests/tan-query";
import { useAddCertification, useCertifications, useDeleteCertifications, useUpdateCertifications } from "../useCertifications";

type MutationMode = "add" | "update" | "delete";
type MutationOptions = {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
};

const useCertificationMutation = (mode: MutationMode) => {
    const add = useAddCertification();
    const update = useUpdateCertifications();
    const remove = useDeleteCertifications();
    const certification = mockCertifications[0];
    if (mode === "add") {
        return { ...add, mutate: (options?: MutationOptions) => add.addCertification(certification, options) };
    }
    if (mode === "update") {
        return { ...update, mutate: (options?: MutationOptions) => update.updateCertification(certification, options) };
    }
    return { ...remove, mutate: (options?: MutationOptions) => remove.deleteCertification(certification._id!, options) };
};

describe("certification hooks", () => {
    const fetchMock = vi.fn<typeof fetch>();
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

    describe("useCertifications", () => {
        test("should expose loading defaults and cache validated certifications with their count", async () => {
            fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: mockCertifications }));
            const { result } = renderHook(useCertifications, { wrapper: context.wrapper });
            expect(result.current.certifications).toEqual([]);
            expect(result.current.certificationCount).toBe(0);
            expect(result.current.isLoading).toBe(true);
            expect(result.current.isError).toBe(false);
            expect(result.current.error).toBeNull();

            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(result.current.certifications).toEqual(mockCertifications);
            expect(result.current.certificationCount).toBe(mockCertifications.length);
            expect(context.queryClient.getQueryData(["certifications"])).toEqual(mockCertifications);
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/certifications");
        });

        test("should accept an empty list", async () => {
            fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: [] }));
            const { result } = renderHook(useCertifications, { wrapper: context.wrapper });

            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(result.current.certifications).toEqual([]);
            expect(result.current.certificationCount).toBe(0);
            expect(result.current.isError).toBe(false);
        });

        test("coerces serialized API dates into Date objects in the cache", async () => {
            fetchMock.mockResolvedValueOnce(Response.json({
                success: true,
                data: [{
                    ...mockCertifications[0],
                    issueDate: "2025-01-01T00:00:00.000Z",
                    expirationDate: "2027-01-01",
                }],
            }));
            const { result } = renderHook(useCertifications, { wrapper: context.wrapper });
            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(result.current.certifications[0]).toEqual(mockCertifications[0]);
            expect(result.current.certifications[0].issueDate).toBeInstanceOf(Date);
            expect(result.current.certifications[0].expirationDate).toBeInstanceOf(Date);
        });

        test.each(["issueDate", "expirationDate"])("exposes an invalid %s without returning corrupt data", async (field) => {
            fetchMock.mockResolvedValueOnce(Response.json({
                success: true, data: [{ ...mockCertifications[0], [field]: "invalid" }],
            }));
            const { result } = renderHook(useCertifications, { wrapper: context.wrapper });
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.name).toBe("ZodError");
            expect(result.current.certifications).toEqual([]);
        });

        test.each([200, 503])("should expose unsuccessful responses with status %i without retrying", async (status) => {
            fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Unavailable" }, { status }));
            const { result } = renderHook(useCertifications, { wrapper: context.wrapper });

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.message).toBe(status === 200 ? "Failed to fetch certifications" : "Network response was not ok");
            expect(result.current.certifications).toEqual([]);
            expect(result.current.certificationCount).toBe(0);
            expect(result.current.isLoading).toBe(false);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        test.each([
            { name: "JSON", response: () => new Response("invalid JSON"), errorName: "SyntaxError" },
            {
                name: "schema",
                response: () => Response.json({ success: true, data: [{ ...mockCertifications[0], title: "" }] }),
                errorName: "ZodError",
            },
        ])("should expose $name parsing errors", async ({ response, errorName }) => {
            fetchMock.mockResolvedValueOnce(response());
            const { result } = renderHook(useCertifications, { wrapper: context.wrapper });

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.name).toBe(errorName);
            expect(result.current.certifications).toEqual([]);
        });

        test("should recover from a network error when the query is invalidated", async () => {
            const error = new Error("Offline");
            fetchMock
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce(Response.json({ success: true, data: mockCertifications }));
            const { result } = renderHook(useCertifications, { wrapper: context.wrapper });
            await waitFor(() => expect(result.current.error).toBe(error));

            await act(async () => {
                await context.queryClient.invalidateQueries({ queryKey: ["certifications"] });
            });

            await waitFor(() => expect(result.current.certificationCount).toBe(mockCertifications.length));
            expect(result.current.isError).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe.each<MutationMode>(["add", "update", "delete"])("%s certification", (mode) => {
        const method = mode === "add" ? "POST" : mode === "update" ? "PUT" : "DELETE";
        const url = mode === "add" ? "/api/certifications" : `/api/certifications/${mockCertifications[0]._id}`;
        const success = { success: true, message: "Saved successfully" };

        test("should expose pending state, send the expected request and invalidate only certifications", async () => {
            context.queryClient.setQueryData(["certifications"], mockCertifications);
            context.queryClient.setQueryData(["skills"], []);
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            const onSuccess = vi.fn();
            const { promise, resolve } = Promise.withResolvers<Response>();
            fetchMock.mockReturnValueOnce(promise);
            const { result } = renderHook(() => useCertificationMutation(mode), { wrapper: context.wrapper });
            expect(result.current.isLoading).toBe(false);
            expect(result.current.isError).toBe(false);
            expect(result.current.error).toBeNull();

            act(() => result.current.mutate({ onSuccess }));
            try {
                await waitFor(() => expect(result.current.isLoading).toBe(true));
                expect(invalidate).not.toHaveBeenCalled();
            } finally {
                resolve(Response.json(success));
            }

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(onSuccess.mock.calls[0][0]).toEqual(success);
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith(url, mode === "delete" ? { method } : {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mockCertifications[0]),
            });
            expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["certifications"] });
            expect(context.queryClient.getQueryState(["certifications"])?.isInvalidated).toBe(true);
            expect(context.queryClient.getQueryState(["skills"])?.isInvalidated).toBe(false);
            await waitFor(() => expect(result.current.isLoading).toBe(false));
        });

        test.each([200, 500])("should expose failures with status %i without invalidating cache", async (status) => {
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            const onError = vi.fn();
            fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Failed" }, { status }));
            const { result } = renderHook(() => useCertificationMutation(mode), { wrapper: context.wrapper });

            act(() => result.current.mutate({ onError }));

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.message).toBe(status === 200 ? `Failed to ${mode} certification` : "Network response was not ok");
            expect(result.current.isLoading).toBe(false);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(invalidate).not.toHaveBeenCalled();
        });

        test.each(["network", "JSON"])("should expose %s errors", async (kind) => {
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            if (kind === "network") {
                fetchMock.mockRejectedValueOnce(new TypeError("Offline"));
            } else {
                fetchMock.mockResolvedValueOnce(new Response("invalid JSON"));
            }
            const { result } = renderHook(() => useCertificationMutation(mode), { wrapper: context.wrapper });

            act(() => result.current.mutate());

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.name).toBe(kind === "network" ? "TypeError" : "SyntaxError");
            expect(invalidate).not.toHaveBeenCalled();
        });

        test("should clear errors after a successful retry", async () => {
            fetchMock
                .mockRejectedValueOnce(new Error("Offline"))
                .mockResolvedValueOnce(Response.json(success));
            const onSuccess = vi.fn();
            const { result } = renderHook(() => useCertificationMutation(mode), { wrapper: context.wrapper });
            act(() => result.current.mutate());
            await waitFor(() => expect(result.current.isError).toBe(true));

            act(() => result.current.mutate({ onSuccess }));

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(result.current.isError).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    test("should refetch active certification queries after a successful mutation", async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({ success: true, data: mockCertifications }))
            .mockResolvedValueOnce(Response.json({ success: true, message: "Deleted" }))
            .mockResolvedValueOnce(Response.json({ success: true, data: [] }));
        const { result } = renderHook(() => ({ query: useCertifications(), mutation: useDeleteCertifications() }), {
            wrapper: context.wrapper,
        });
        await waitFor(() => expect(result.current.query.certificationCount).toBe(mockCertifications.length));

        act(() => result.current.mutation.deleteCertification(mockCertifications[0]._id!));

        await waitFor(() => expect(result.current.query.certificationCount).toBe(0));
        expect(result.current.query.certifications).toEqual([]);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });
});