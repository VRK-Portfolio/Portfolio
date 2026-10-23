import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ExperienceType } from "@/@types/Experience.types";
import { createTestQueryWrapper } from "@/tests/tan-query";
import { useCreateExperience, useDeleteExperience, useGetExpericence, useUpdateExperience } from "../useExperience";

const experience: ExperienceType = {
    _id: "507f1f77bcf86cd799439011",
    company: "Example Company",
    location: "Remote",
    responsibilites: ["APIs"],
    positions: [{
        role: "Engineer",
        startDate: new Date("2024-02-29"),
        isCurrentPosition: true,
        description: "Building applications.",
    }],
};

type MutationMode = "add" | "update" | "delete";
const useMutationForMode = (mode: MutationMode) => {
    const add = useCreateExperience();
    const update = useUpdateExperience();
    const remove = useDeleteExperience();
    if (mode === "add") return { ...add, mutate: () => add.addExperience(experience) };
    if (mode === "update") return { ...update, mutate: () => update.updateExperience(experience) };
    return { ...remove, mutate: () => remove.deleteExperience(experience._id!) };
};

describe("experience editor hooks", () => {
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
        vi.useRealTimers();
    });

    test("parses API date strings before exposing experiences", async () => {
        fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: [experience] }));
        const { result } = renderHook(useGetExpericence, { wrapper: context.wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.experienceList).toEqual([experience]);
        expect(result.current.experienceList[0].positions[0].startDate).toBeInstanceOf(Date);
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/experience");
    });

    test("exposes invalid API dates as query errors", async () => {
        fetchMock.mockResolvedValueOnce(Response.json({
            success: true,
            data: [{ ...experience, positions: [{ ...experience.positions[0], startDate: "invalid" }] }],
        }));
        const { result } = renderHook(useGetExpericence, { wrapper: context.wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.name).toBe("ZodError");
    });

    test("starts with loading defaults and returns zero years for an empty response", async () => {
        fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: [] }));
        const { result } = renderHook(useGetExpericence, { wrapper: context.wrapper });
        expect(result.current.isLoading).toBe(true);
        expect(result.current.experienceList).toEqual([]);
        expect(result.current.totalExperience).toBe(0);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.totalExperience).toBe(0);
        expect(result.current.isError).toBe(false);
    });

    test("calculates experience for completed, current and open-ended positions", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
        fetchMock.mockResolvedValueOnce(Response.json({
            success: true,
            data: [{
                ...experience,
                positions: [
                    { ...experience.positions[0], startDate: "2020-01-15", endDate: "2022-01-15", isCurrentPosition: false },
                    { ...experience.positions[0], startDate: "2024-01-15", endDate: "2024-02-15", isCurrentPosition: true },
                    { ...experience.positions[0], startDate: "2025-01-15", isCurrentPosition: false },
                ],
            }],
        }));
        const { result } = renderHook(useGetExpericence, { wrapper: context.wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.totalExperience).toBe(5);
    });

    test.each([200, 503])("exposes unsuccessful queries with status %i", async (status) => {
        fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Unavailable" }, { status }));
        const { result } = renderHook(useGetExpericence, { wrapper: context.wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe("Failed to fetch experience");
        expect(result.current.experienceList).toEqual([]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test("recovers a failed query after invalidation", async () => {
        fetchMock.mockRejectedValueOnce(new Error("Offline"))
            .mockResolvedValueOnce(Response.json({ success: true, data: [experience] }));
        const { result } = renderHook(useGetExpericence, { wrapper: context.wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        await act(async () => {
            await context.queryClient.invalidateQueries({ queryKey: ["experience"] });
        });
        await waitFor(() => expect(result.current.experienceList).toEqual([experience]));
        expect(result.current.error).toBeNull();
    });

    test.each(["add", "update"] as const)("%s sends JSON dates and invalidates the experience query on success", async (mode) => {
        fetchMock.mockResolvedValueOnce(Response.json({ success: true, message: "Saved" }));
        context.queryClient.setQueryData(["experience"], [experience]);
        const { result } = renderHook(() => ({
            add: useCreateExperience(),
            update: useUpdateExperience(),
        }), { wrapper: context.wrapper });
        act(() => {
            if (mode === "add") result.current.add.addExperience(experience);
            else result.current.update.updateExperience(experience);
        });
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(context.queryClient.getQueryState(["experience"])?.isInvalidated).toBe(true));
        expect(fetchMock).toHaveBeenCalledWith(
            mode === "add" ? "/api/experience" : `/api/experience/${experience._id}`,
            {
                method: mode === "add" ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(experience),
            }
        );
    });

    test.each(["add", "update"] as const)("%s surfaces API error messages to the form", async (mode) => {
        fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Permission denied" }, { status: 403 }));
        const onError = vi.fn();
        const { result } = renderHook(() => ({
            add: useCreateExperience(),
            update: useUpdateExperience(),
        }), { wrapper: context.wrapper });
        act(() => {
            if (mode === "add") result.current.add.addExperience(experience, { onError });
            else result.current.update.updateExperience(experience, { onError });
        });
        await waitFor(() => expect(onError).toHaveBeenCalled());
        expect(onError.mock.calls[0][0]).toEqual(new Error("Permission denied"));
    });

    describe.each<MutationMode>(["add", "update", "delete"])("%s experience", (mode) => {
        test("exposes pending state and invalidates only the experience cache", async () => {
            context.queryClient.setQueryData(["experience"], [experience]);
            context.queryClient.setQueryData(["skills"], []);
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            const { promise, resolve } = Promise.withResolvers<Response>();
            fetchMock.mockReturnValueOnce(promise);
            const { result } = renderHook(() => useMutationForMode(mode), { wrapper: context.wrapper });
            act(() => result.current.mutate());
            try {
                await waitFor(() => expect(result.current.isLoading).toBe(true));
                expect(invalidate).not.toHaveBeenCalled();
            } finally {
                resolve(Response.json({ success: true, message: "Saved" }));
            }
            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["experience"] });
            expect(context.queryClient.getQueryState(["skills"])?.isInvalidated).toBe(false);
            if (mode === "delete") {
                expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/api/experience/${experience._id}`, { method: "DELETE" });
            }
        });

        test.each([200, 500])("exposes failed responses with status %i without invalidating", async (status) => {
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Rejected" }, { status }));
            const { result } = renderHook(() => useMutationForMode(mode), { wrapper: context.wrapper });
            act(() => result.current.mutate());
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.message).toBe(mode === "delete" ? "Failed to delete experience" : "Rejected");
            expect(invalidate).not.toHaveBeenCalled();
        });

        test.each(["network", "JSON"])("surfaces %s failures", async (kind) => {
            if (kind === "network") fetchMock.mockRejectedValueOnce(new TypeError("Offline"));
            else fetchMock.mockResolvedValueOnce(new Response("invalid JSON"));
            const { result } = renderHook(() => useMutationForMode(mode), { wrapper: context.wrapper });
            act(() => result.current.mutate());
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.name).toBe(kind === "network" ? "TypeError" : "SyntaxError");
        });
    });

    test.each(["add", "update"] as const)("%s rejects non-OK responses even when the body claims success", async (mode) => {
        fetchMock.mockResolvedValueOnce(Response.json({ success: true }, { status: 500 }));
        const { result } = renderHook(() => useMutationForMode(mode), { wrapper: context.wrapper });
        act(() => result.current.mutate());
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe(`Failed to ${mode === "add" ? "create" : "update"} experience`);
    });
});
