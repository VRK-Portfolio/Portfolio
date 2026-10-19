import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { MySkillsType } from "@/@types/MySkills.types";
import { mockMySkills } from "@/mocks/my-skills";
import { createTestQueryWrapper } from "@/tests/tan-query";
import { useCreateSkill, useDeleteSkills, useSkills, useUpdateSkill } from "../useSkills";

type MutationMode = "create" | "update";

const useSkillMutation = (mode: MutationMode) => {
    const create = useCreateSkill();
    const update = useUpdateSkill();
    return mode === "create"
        ? { mutate: create.createSkill, isPending: create.isCreating, isError: create.isCreateError, error: create.createError }
        : { mutate: update.updateSkill, isPending: update.isUpdating, isError: update.isUpdateError, error: update.updateError };
};

const skill: MySkillsType = { ...mockMySkills[0], _id: "skill-1" };

const UploadForm = ({ mode, onSuccess, onError }: {
    mode: MutationMode;
    onSuccess: () => void;
    onError: (error: Error) => void;
}) => {
    const mutation = useSkillMutation(mode);
    const { register, handleSubmit } = useForm<MySkillsType>({ defaultValues: skill });

    return (
        <form onSubmit={handleSubmit((data) => mutation.mutate(data, { onSuccess, onError }))}>
            <input type="file" aria-label="Skill icon" {...register("icon")} />
            <button type="submit">Save skill</button>
            <output>{mutation.isPending ? "Saving" : mutation.error?.message}</output>
        </form>
    );
};

describe("skills hooks", () => {
    const fetchMock = vi.fn<typeof fetch>();
    let context: ReturnType<typeof createTestQueryWrapper>;
    const skillsResponse = (data = mockMySkills) => Response.json({ success: true, data });

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

    describe("useSkills", () => {
        test("should expose loading defaults, then return and cache validated skills with their count", async () => {
            fetchMock.mockResolvedValueOnce(skillsResponse());
            const { result } = renderHook(useSkills, { wrapper: context.wrapper });

            expect(result.current.skills).toEqual([]);
            expect(result.current.skillsCount).toBe(0);
            expect(result.current.isSkillsLoading).toBe(true);
            expect(result.current.isSkillsError).toBe(false);
            expect(result.current.skillsError).toBeNull();
            await waitFor(() => expect(result.current.isSkillsLoading).toBe(false));

            expect(result.current.skills).toEqual(mockMySkills);
            expect(result.current.skillsCount).toBe(mockMySkills.length);
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/my-skills");
            expect(context.queryClient.getQueryData(["skills"])).toEqual(mockMySkills);
        });

        test("should accept an empty skills list", async () => {
            fetchMock.mockResolvedValueOnce(skillsResponse([]));
            const { result } = renderHook(useSkills, { wrapper: context.wrapper });

            await waitFor(() => expect(result.current.isSkillsLoading).toBe(false));
            expect(result.current.skills).toEqual([]);
            expect(result.current.skillsCount).toBe(0);
            expect(result.current.isSkillsError).toBe(false);
            expect(context.queryClient.getQueryState(["skills"])?.status).toBe("success");
        });

        test.each([200, 500])("should expose API failures with status %i without retrying", async (status) => {
            fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Unavailable" }, { status }));
            const { result } = renderHook(useSkills, { wrapper: context.wrapper });

            await waitFor(() => expect(result.current.isSkillsError).toBe(true));
            expect(result.current.skillsError).toEqual(new Error("Failed to fetch skills"));
            expect(result.current.skills).toEqual([]);
            expect(result.current.skillsCount).toBe(0);
            expect(result.current.isSkillsLoading).toBe(false);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        test.each([
            { scenario: "invalid JSON", response: () => new Response("invalid JSON"), errorName: "SyntaxError" },
            {
                scenario: "invalid skill data",
                response: () => Response.json({ success: true, data: [{ ...skill, capabilities: null }] }),
                errorName: "ZodError",
            },
        ])("should expose parsing errors for $scenario", async ({ response, errorName }) => {
            fetchMock.mockResolvedValueOnce(response());
            const { result } = renderHook(useSkills, { wrapper: context.wrapper });

            await waitFor(() => expect(result.current.isSkillsError).toBe(true));
            expect(result.current.skillsError?.name).toBe(errorName);
            expect(result.current.skills).toEqual([]);
            expect(result.current.skillsCount).toBe(0);
        });

        test("should expose a network rejection", async () => {
            const error = new TypeError("Network unavailable");
            fetchMock.mockRejectedValueOnce(error);
            const { result } = renderHook(useSkills, { wrapper: context.wrapper });

            await waitFor(() => expect(result.current.isSkillsError).toBe(true));
            expect(result.current.skillsError).toBe(error);
            expect(result.current.isSkillsLoading).toBe(false);
        });

        test("should recover from an error and update the count when refetched", async () => {
            fetchMock
                .mockRejectedValueOnce(new Error("Offline"))
                .mockResolvedValueOnce(skillsResponse([skill]));
            const { result } = renderHook(useSkills, { wrapper: context.wrapper });
            await waitFor(() => expect(result.current.isSkillsError).toBe(true));

            await act(async () => {
                await result.current.refetch();
            });

            await waitFor(() => expect(result.current.skills).toEqual([skill]));
            expect(result.current.skillsCount).toBe(1);
            expect(result.current.isSkillsError).toBe(false);
            expect(result.current.skillsError).toBeNull();
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        test("should retain cached skills and count when a background refetch fails", async () => {
            fetchMock
                .mockResolvedValueOnce(skillsResponse())
                .mockRejectedValueOnce(new Error("Refetch failed"));
            const { result } = renderHook(useSkills, { wrapper: context.wrapper });
            await waitFor(() => expect(result.current.skillsCount).toBe(mockMySkills.length));

            await act(async () => {
                await result.current.refetch();
            });

            await waitFor(() => expect(result.current.isSkillsError).toBe(true));
            expect(result.current.skills).toEqual(mockMySkills);
            expect(result.current.skillsCount).toBe(mockMySkills.length);
            expect(result.current.isSkillsLoading).toBe(false);
        });
    });

    describe("useDeleteSkills", () => {
        test("should expose pending state, delete the requested ID and invalidate only skills", async () => {
            context.queryClient.setQueryData(["skills"], [skill]);
            context.queryClient.setQueryData(["basicInfo"], { name: "Cached developer" });
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            const onSuccess = vi.fn();
            const { promise, resolve } = Promise.withResolvers<Response>();
            fetchMock.mockReturnValueOnce(promise);
            const { result } = renderHook(useDeleteSkills, { wrapper: context.wrapper });

            expect(result.current.isDeleting).toBe(false);
            expect(result.current.isDeleteError).toBe(false);
            expect(result.current.deleteError).toBeNull();
            act(() => result.current.deleteSkill("skill-1", { onSuccess }));
            try {
                await waitFor(() => expect(result.current.isDeleting).toBe(true));
                expect(invalidate).not.toHaveBeenCalled();
            } finally {
                resolve(Response.json({ success: true, data: null }));
            }

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/my-skills/skill-1", { method: "DELETE" });
            expect(onSuccess.mock.calls[0][0]).toBeNull();
            expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["skills"] });
            expect(context.queryClient.getQueryState(["skills"])?.isInvalidated).toBe(true);
            expect(context.queryClient.getQueryState(["basicInfo"])?.isInvalidated).toBe(false);
            await waitFor(() => expect(result.current.isDeleting).toBe(false));
        });

        test.each([200, 500])("should expose deletion failures with status %i without invalidating cache", async (status) => {
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            const onError = vi.fn();
            fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Delete failed" }, { status }));
            const { result } = renderHook(useDeleteSkills, { wrapper: context.wrapper });

            act(() => result.current.deleteSkill("skill-1", { onError }));

            await waitFor(() => expect(result.current.isDeleteError).toBe(true));
            expect(result.current.deleteError).toEqual(new Error("Failed to delete skill"));
            expect(result.current.isDeleting).toBe(false);
            expect(onError.mock.calls[0][0]).toEqual(new Error("Failed to delete skill"));
            expect(invalidate).not.toHaveBeenCalled();
        });

        test.each(["network", "JSON"])("should expose a %s error from deletion", async (kind) => {
            const error = new TypeError("Network unavailable");
            if (kind === "network") {
                fetchMock.mockRejectedValueOnce(error);
            } else {
                fetchMock.mockResolvedValueOnce(new Response("invalid JSON"));
            }
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            const { result } = renderHook(useDeleteSkills, { wrapper: context.wrapper });

            act(() => result.current.deleteSkill("skill-1"));

            await waitFor(() => expect(result.current.isDeleteError).toBe(true));
            expect(result.current.deleteError?.name).toBe(kind === "network" ? "TypeError" : "SyntaxError");
            expect(result.current.isDeleting).toBe(false);
            expect(invalidate).not.toHaveBeenCalled();
        });

        test("should refetch an active skills query after successful deletion", async () => {
            fetchMock
                .mockResolvedValueOnce(skillsResponse([skill]))
                .mockResolvedValueOnce(Response.json({ success: true, data: null }))
                .mockResolvedValueOnce(skillsResponse([]));
            const { result } = renderHook(() => ({ query: useSkills(), mutation: useDeleteSkills() }), {
                wrapper: context.wrapper,
            });
            await waitFor(() => expect(result.current.query.skillsCount).toBe(1));

            act(() => result.current.mutation.deleteSkill("skill-1"));

            await waitFor(() => {
                expect(result.current.query.skillsCount).toBe(0);
                expect(result.current.query.skills).toEqual([]);
                expect(result.current.query.isSkillsLoading).toBe(false);
            });
            expect(fetchMock).toHaveBeenCalledTimes(3);
            expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/my-skills/skill-1", { method: "DELETE" });
        });
    });

    describe.each<MutationMode>(["create", "update"])("%s skill mutation", (mode) => {
        const method = mode === "create" ? "POST" : "PUT";
        const url = mode === "create" ? "/api/my-skills" : "/api/my-skills/skill-1";
        const errorMessage = mode === "create" ? "Failed to create skill" : "Failed to update skill";
        const data = { ...skill, icon: mode === "create" ? "" : skill.icon };

        test("should expose pending state, send JSON data and invalidate skills after success", async () => {
            context.queryClient.setQueryData(["skills"], [skill]);
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            const onSuccess = vi.fn();
            const { promise, resolve } = Promise.withResolvers<Response>();
            fetchMock.mockReturnValueOnce(promise);
            const { result } = renderHook(() => useSkillMutation(mode), { wrapper: context.wrapper });

            expect(result.current.isPending).toBe(false);
            expect(result.current.isError).toBe(false);
            expect(result.current.error).toBeNull();
            act(() => result.current.mutate(data, { onSuccess }));
            try {
                await waitFor(() => expect(result.current.isPending).toBe(true));
                expect(invalidate).not.toHaveBeenCalled();
            } finally {
                resolve(Response.json({ success: true, data }));
            }

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            expect(onSuccess.mock.calls[0][0]).toEqual(data);
            expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["skills"] });
            expect(context.queryClient.getQueryState(["skills"])?.isInvalidated).toBe(true);
            await waitFor(() => expect(result.current.isPending).toBe(false));
        });

        test.each([200, 500])("should expose API failure with status %i without invalidating skills", async (status) => {
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            const onError = vi.fn();
            fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: "Save failed" }, { status }));
            const { result } = renderHook(() => useSkillMutation(mode), { wrapper: context.wrapper });

            act(() => result.current.mutate(data, { onError }));

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toEqual(new Error(errorMessage));
            expect(result.current.isPending).toBe(false);
            expect(onError.mock.calls[0][0]).toEqual(new Error(errorMessage));
            expect(invalidate).not.toHaveBeenCalled();
        });

        test.each(["network", "JSON"])("should expose a %s error from saving", async (kind) => {
            if (kind === "network") {
                fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));
            } else {
                fetchMock.mockResolvedValueOnce(new Response("invalid JSON"));
            }
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            const { result } = renderHook(() => useSkillMutation(mode), { wrapper: context.wrapper });

            act(() => result.current.mutate(data));

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.name).toBe(kind === "network" ? "TypeError" : "SyntaxError");
            expect(result.current.isPending).toBe(false);
            expect(invalidate).not.toHaveBeenCalled();
        });

        test("should clear a mutation error after a successful retry", async () => {
            fetchMock
                .mockRejectedValueOnce(new Error("Offline"))
                .mockResolvedValueOnce(Response.json({ success: true, data }));
            const onSuccess = vi.fn();
            const { result } = renderHook(() => useSkillMutation(mode), { wrapper: context.wrapper });
            act(() => result.current.mutate(data));
            await waitFor(() => expect(result.current.isError).toBe(true));

            act(() => result.current.mutate(data, { onSuccess }));

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(result.current.isError).toBe(false);
            expect(result.current.error).toBeNull();
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        test("should upload a selected file before sending the skill with the returned icon URL", async () => {
            const user = userEvent.setup();
            const file = new File(["image contents"], "icon.png", { type: "image/png" });
            const onSuccess = vi.fn();
            const onError = vi.fn();
            const iconUrl = "/uploads/icon.png";
            const savedSkill = { ...skill, icon: iconUrl };
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            fetchMock
                .mockResolvedValueOnce(Response.json({ fileUrl: iconUrl }))
                .mockResolvedValueOnce(Response.json({ success: true, data: savedSkill }));
            render(<UploadForm mode={mode} onSuccess={onSuccess} onError={onError} />, { wrapper: context.wrapper });

            await user.upload(screen.getByLabelText("Skill icon"), file);
            await user.click(screen.getByRole("button", { name: "Save skill" }));

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/upload", {
                method: "POST",
                body: expect.any(FormData),
            });
            const body = fetchMock.mock.calls[0][1]?.body;
            if (!(body instanceof FormData)) {
                throw new Error("Expected a multipart upload body");
            }
            expect(body.get("file")).toBe(file);
            expect(fetchMock).toHaveBeenNthCalledWith(2, url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(savedSkill),
            });
            expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["skills"] });
            expect(onError).not.toHaveBeenCalled();
        });

        test.each(["HTTP", "network", "JSON"])("should stop saving after an upload %s error", async (kind) => {
            const user = userEvent.setup();
            const file = new File(["image contents"], "icon.png", { type: "image/png" });
            const onSuccess = vi.fn();
            const onError = vi.fn();
            const invalidate = vi.spyOn(context.queryClient, "invalidateQueries");
            if (kind === "network") {
                fetchMock.mockRejectedValueOnce(new TypeError("Upload network failure"));
            } else if (kind === "JSON") {
                fetchMock.mockResolvedValueOnce(new Response("invalid JSON"));
            } else {
                fetchMock.mockResolvedValueOnce(Response.json({ error: "Upload failed" }, { status: 500 }));
            }
            render(<UploadForm mode={mode} onSuccess={onSuccess} onError={onError} />, { wrapper: context.wrapper });

            await user.upload(screen.getByLabelText("Skill icon"), file);
            await user.click(screen.getByRole("button", { name: "Save skill" }));

            await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
            const error: Error = onError.mock.calls[0][0];
            if (kind === "HTTP") {
                expect(error.message).toBe("Failed to upload icon");
            } else {
                expect(error.name).toBe(kind === "network" ? "TypeError" : "SyntaxError");
            }
            expect(screen.getByText(error.message)).toBeInTheDocument();
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(onSuccess).not.toHaveBeenCalled();
            expect(invalidate).not.toHaveBeenCalled();
        });
    });
});
