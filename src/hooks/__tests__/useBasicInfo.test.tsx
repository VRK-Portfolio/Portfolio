import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { basicInfoMock } from "@/mocks/basic-info";
import { createTestQueryWrapper } from "@/tests/tan-query";
import { useBasicInfo } from "../useBasicInfo";

describe("useBasicInfo", () => {
    const fetchMock = vi.fn<typeof fetch>();
    let context: ReturnType<typeof createTestQueryWrapper>;
    const successResponse = (data = basicInfoMock) => Response.json({ success: true, data });

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

    test("should initially be loading with no data and then cache the first basic info record", async () => {
        fetchMock.mockResolvedValueOnce(successResponse([
            basicInfoMock[0],
            { ...basicInfoMock[0], name: "Another Developer" },
        ]));
        const { result } = renderHook(useBasicInfo, { wrapper: context.wrapper });

        expect(result.current.basicInfo).toBeNull();
        expect(result.current.isBasicInfoLoading).toBe(true);
        expect(result.current.isBasicInfoError).toBe(false);
        expect(result.current.basicInfoError).toBeNull();
        await waitFor(() => expect(result.current.isBasicInfoLoading).toBe(false));

        expect(result.current.basicInfo).toEqual(basicInfoMock[0]);
        expect(result.current.isBasicInfoError).toBe(false);
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/basic-info");
        expect(context.queryClient.getQueryData(["basicInfo"])).toEqual(basicInfoMock[0]);
    });

    test("should parse optional API timestamps into Date values", async () => {
        fetchMock.mockResolvedValueOnce(Response.json({
            success: true,
            data: [{
                ...basicInfoMock[0],
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-02T00:00:00.000Z",
            }],
        }));
        const { result } = renderHook(useBasicInfo, { wrapper: context.wrapper });

        await waitFor(() => expect(result.current.basicInfo).not.toBeNull());
        expect(result.current.basicInfo?.created_at).toEqual(new Date("2026-01-01T00:00:00.000Z"));
        expect(result.current.basicInfo?.updated_at).toEqual(new Date("2026-01-02T00:00:00.000Z"));
    });

    test.each([
        {
            scenario: "an HTTP error",
            response: () => Response.json({ error: "Unavailable" }, { status: 503 }),
            message: "Network response was not ok",
        },
        {
            scenario: "an unsuccessful API response",
            response: () => Response.json({ success: false, error: "Not found" }),
            message: "Failed to fetch basic info",
        },
    ])("should expose $scenario without retrying", async ({ response, message }) => {
        fetchMock.mockResolvedValueOnce(response());
        const { result } = renderHook(useBasicInfo, { wrapper: context.wrapper });

        await waitFor(() => expect(result.current.isBasicInfoError).toBe(true));
        expect(result.current.basicInfoError).toEqual(new Error(message));
        expect(result.current.basicInfo).toBeNull();
        expect(result.current.isBasicInfoLoading).toBe(false);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test.each([
        {
            scenario: "invalid JSON",
            response: () => new Response("not JSON"),
            errorName: "SyntaxError",
        },
        {
            scenario: "schema-invalid data",
            response: () => Response.json({ success: true, data: [{ ...basicInfoMock[0], email: "invalid" }] }),
            errorName: "ZodError",
        },
    ])("should expose parsing errors for $scenario", async ({ response, errorName }) => {
        fetchMock.mockResolvedValueOnce(response());
        const { result } = renderHook(useBasicInfo, { wrapper: context.wrapper });

        await waitFor(() => expect(result.current.isBasicInfoError).toBe(true));
        expect(result.current.basicInfoError?.name).toBe(errorName);
        expect(result.current.basicInfo).toBeNull();
        expect(result.current.isBasicInfoLoading).toBe(false);
    });

    test("should expose a network rejection", async () => {
        const error = new TypeError("Network unavailable");
        fetchMock.mockRejectedValueOnce(error);
        const { result } = renderHook(useBasicInfo, { wrapper: context.wrapper });

        await waitFor(() => expect(result.current.isBasicInfoError).toBe(true));
        expect(result.current.basicInfoError).toBe(error);
        expect(result.current.basicInfo).toBeNull();
    });

    test("should return null without a query error when the API returns an empty array", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        fetchMock.mockResolvedValueOnce(successResponse([]));
        const { result } = renderHook(useBasicInfo, { wrapper: context.wrapper });

        await waitFor(() => expect(result.current.isBasicInfoLoading).toBe(false));
        expect(result.current.basicInfo).toBeNull();
        expect(result.current.isBasicInfoError).toBe(false);
        expect(result.current.basicInfoError).toBeNull();
        expect(context.queryClient.getQueryData(["basicInfo"])).toBeNull();
        expect(consoleError).not.toHaveBeenCalled();
    });

    test("should recover from an error when refetch succeeds", async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({ success: false, error: "Unavailable" }))
            .mockResolvedValueOnce(successResponse());
        const { result } = renderHook(useBasicInfo, { wrapper: context.wrapper });
        await waitFor(() => expect(result.current.isBasicInfoError).toBe(true));

        await act(async () => {
            await result.current.refetch();
        });

        await waitFor(() => expect(result.current.basicInfo).toEqual(basicInfoMock[0]));
        expect(result.current.isBasicInfoError).toBe(false);
        expect(result.current.basicInfoError).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test("should retain cached data when a background refetch fails", async () => {
        fetchMock
            .mockResolvedValueOnce(successResponse())
            .mockRejectedValueOnce(new Error("Refetch failed"));
        const { result } = renderHook(useBasicInfo, { wrapper: context.wrapper });
        await waitFor(() => expect(result.current.basicInfo).toEqual(basicInfoMock[0]));

        await act(async () => {
            await result.current.refetch();
        });

        await waitFor(() => expect(result.current.isBasicInfoError).toBe(true));
        expect(result.current.basicInfo).toEqual(basicInfoMock[0]);
        expect(result.current.isBasicInfoLoading).toBe(false);
        expect(result.current.basicInfoError?.message).toBe("Refetch failed");
    });
});
