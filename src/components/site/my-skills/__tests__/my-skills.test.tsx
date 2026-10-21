import { act, waitFor, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi, afterEach } from "vitest";
import MySkillsComponent from "../My-Skills";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { mockMySkills, mySkillsHandlers } from "@/mocks/my-skills";
import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { MySkillsType } from "@/@types/MySkills.types";
import { renderWithQueryClient } from "@/tests/tan-query";

const server = setupServer(...mySkillsHandlers);

describe("MySkillsComponent", () => {

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
    const renderSkillComponent = (props: ComponentProps<typeof MySkillsComponent> = {}) =>
        renderWithQueryClient(<MySkillsComponent {...props} />);
    test("should show loading placeholders until skills load", async () => {
        const { container } = renderSkillComponent();
        expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: mockMySkills[0].name })).not.toBeInTheDocument();

        await screen.findByRole("heading", { name: mockMySkills[0].name });
        expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    });

    test("should show the site heading without admin controls by default", async () => {
        renderSkillComponent();
        await screen.findByRole("heading", { name: mockMySkills[0].name });
        expect(screen.getByRole("heading", { name: "My Skills", level: 2 })).toBeInTheDocument();
        expect(screen.getByText("Skilled full-stack engineer developing efficient frontend, backend, and database solutions.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Add Skill" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    });

    test("should hide admin controls when the site type is explicitly provided", async () => {
        const modalOpen = vi.fn();
        const { container } = renderSkillComponent({ type: "site", modalOpen });
        await screen.findByRole("heading", { name: mockMySkills[0].name });

        expect(screen.getByRole("heading", { name: "My Skills", level: 2 })).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(container.querySelector(".cmp-card-footer")).not.toBeInTheDocument();
        expect(container.querySelector("section")).not.toHaveClass("cmp-my-skills--admin");
        expect(modalOpen).not.toHaveBeenCalled();
    });

    test("should display all fetched skills and their capabilities", async () => {
        renderSkillComponent();
        await screen.findByRole("heading", { name: mockMySkills[0].name });
        expect(screen.getAllByRole("listitem")).toHaveLength(mockMySkills.length);
        for (const [index, skill] of mockMySkills.entries()) {
            const item = within(screen.getAllByRole("listitem")[index]);
            expect(item.getByRole("heading", { name: skill.name })).toBeInTheDocument();
            expect(item.getByRole("img", { name: `${skill.name} Skill Icon` })).toBeInTheDocument();
            expect(item.getByText(skill.category)).toBeInTheDocument();
            for (const capability of skill.capabilities) {
                expect(item.getByText(capability)).toBeInTheDocument();
            }
        }
    });

    test.each([200, 500])('does not set skills when API returns success = false with status %i', async (status) => {
        server.use(
            http.get("*/api/my-skills", () => {
                return HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                    success: false,
                    error: "Failed to fetch my skills",
                }, { status });
            })
        );

        const { container, queryClient } = renderSkillComponent();
        await waitFor(() => {
            expect(queryClient.getQueryState(["skills"])?.status).toBe("error");
            expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
        });
        expect(screen.queryAllByRole("listitem")).toHaveLength(0);

    });

    test.each([
        {
            scenario: "a network error",
            response: () => HttpResponse.error(),
        },
        {
            scenario: "invalid JSON",
            response: () => new HttpResponse("invalid JSON", {
                headers: { "Content-Type": "application/json" },
            }),
        },
        {
            scenario: "schema-invalid skill data",
            response: () => HttpResponse.json({
                success: true,
                data: [{ ...mockMySkills[0], capabilities: "not an array" }],
            }),
        },
    ])("should stop loading without rendering skills after $scenario", async ({ response }) => {
        server.use(http.get("*/api/my-skills", response));
        const { container, queryClient } = renderSkillComponent();

        await waitFor(() => {
            expect(queryClient.getQueryState(["skills"])?.status).toBe("error");
            expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
        });
        expect(screen.getByRole("heading", { name: "My Skills" })).toBeInTheDocument();
        expect(screen.getByRole("list")).toBeEmptyDOMElement();
    });

    test("should render a skill without capability badges when its capabilities are empty", async () => {
        const skill = { ...mockMySkills[0], capabilities: [] };
        server.use(
            http.get("*/api/my-skills", () => HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                success: true,
                data: [skill],
            }))
        );
        const { container } = renderSkillComponent();
        await screen.findByRole("heading", { name: skill.name });

        expect(screen.getAllByRole("listitem")).toHaveLength(1);
        expect(screen.getByRole("img", { name: `${skill.name} Skill Icon` })).toBeInTheDocument();
        expect(screen.getByText(skill.category)).toBeInTheDocument();
        expect(container.querySelector(".cmp-my-skills__list-item-capability")).not.toBeInTheDocument();
    });

    test("should retain existing skills during a background refetch and then render updated data", async () => {
        const { container, queryClient } = renderSkillComponent();
        await screen.findByRole("heading", { name: mockMySkills[0].name });
        const updatedSkill = { ...mockMySkills[0], name: "Updated HTML", capabilities: ["Updated capability"] };
        const { promise: responseReady, resolve: completeRefetch } = Promise.withResolvers<void>();
        server.use(
            http.get("*/api/my-skills", async () => {
                await responseReady;
                return HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                    success: true,
                    data: [updatedSkill],
                });
            })
        );

        act(() => {
            void queryClient.invalidateQueries({ queryKey: ["skills"] });
        });
        try {
            await waitFor(() => {
                expect(queryClient.getQueryState(["skills"])?.fetchStatus).toBe("fetching");
            });
            expect(screen.getAllByRole("listitem")).toHaveLength(mockMySkills.length);
            expect(screen.getByRole("heading", { name: mockMySkills[0].name })).toBeInTheDocument();
            expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
        } finally {
            completeRefetch();
        }

        expect(await screen.findByRole("heading", { name: updatedSkill.name })).toBeInTheDocument();
        expect(screen.getByText(updatedSkill.capabilities[0])).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: mockMySkills[0].name })).not.toBeInTheDocument();
        expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    test("should apply a custom class after loading", async () => {
        const { container } = renderSkillComponent({ className: "custom-skills" });
        await screen.findByRole("heading", { name: mockMySkills[0].name });
        expect(container.querySelector("section")).toHaveClass("cmp-my-skills", "custom-skills");
        expect(container.querySelector("section")).not.toHaveClass("cmp-my-skills--admin");
    });

    test("should render an empty list when the API returns no skills", async () => {
        server.use(
            http.get("*/api/my-skills", () => HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                success: true,
                data: [],
            }))
        );

        const { container, queryClient } = renderSkillComponent();
        await waitFor(() => {
            expect(queryClient.getQueryState(["skills"])?.status).toBe("success");
            expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
        });
        expect(screen.getByRole("heading", { name: "My Skills" })).toBeInTheDocument();
        expect(screen.getByRole("list")).toBeEmptyDOMElement();
    });

    describe("admin view", () => {
        const skills = mockMySkills.map((skill, index) => ({
            ...skill,
            _id: `skill-${index + 1}`,
        }));

        beforeEach(() => {
            server.use(
                http.get("*/api/my-skills", () => HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                    success: true,
                    data: skills,
                }))
            );
        });

        test("should preserve admin styling while loading and show admin controls after loading", async () => {
            const { container } = renderSkillComponent({ type: "admin" });
            expect(container.querySelector("section")).toHaveClass("cmp-my-skills", "cmp-admin__type");
            expect(container.querySelector(".animate-pulse")).toBeInTheDocument();

            await screen.findByRole("heading", { name: skills[0].name });
            expect(container.querySelector("section")).toHaveClass("cmp-my-skills", "cmp-admin__type");
            expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Admin View of My Skills", level: 4 })).toBeInTheDocument();
            expect(screen.queryByRole("heading", { name: "My Skills" })).not.toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Add Skill" })).toBeEnabled();
            expect(container.querySelectorAll(".cmp-card-footer")).toHaveLength(skills.length);
            for (const listItem of screen.getAllByRole("listitem")) {
                expect(within(listItem).getByRole("button", { name: "Edit" })).toBeEnabled();
                expect(within(listItem).getByRole("button", { name: "Delete" })).toBeEnabled();
            }
        });

        test("should open the add modal without a skill ID", async () => {
            const user = userEvent.setup();
            const modalOpen = vi.fn();
            renderSkillComponent({ type: "admin", modalOpen });

            await user.click(await screen.findByRole("button", { name: "Add Skill" }));

            expect(modalOpen).toHaveBeenCalledExactlyOnceWith();
        });

        test("should allow adding a skill when the admin list is empty", async () => {
            const user = userEvent.setup();
            const modalOpen = vi.fn();
            server.use(
                http.get("*/api/my-skills", () => HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                    success: true,
                    data: [],
                }))
            );
            const { container } = renderSkillComponent({ type: "admin", modalOpen });
            const addButton = await screen.findByRole("button", { name: "Add Skill" });

            expect(screen.getByRole("heading", { name: "Admin View of My Skills", level: 4 })).toBeInTheDocument();
            expect(screen.getByRole("list")).toBeEmptyDOMElement();
            expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
            await user.click(addButton);
            expect(modalOpen).toHaveBeenCalledExactlyOnceWith();
        });

        test("should open the edit modal with the selected skill ID", async () => {
            const user = userEvent.setup();
            const modalOpen = vi.fn();
            renderSkillComponent({ type: "admin", modalOpen });
            await screen.findByRole("heading", { name: skills[1].name });

            await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: "Edit" }));

            expect(modalOpen).toHaveBeenCalledExactlyOnceWith(skills[1]._id);
        });

        test("should allow add and edit clicks without a modal callback", async () => {
            const user = userEvent.setup();
            renderSkillComponent({ type: "admin" });

            await user.click(await screen.findByRole("button", { name: "Add Skill" }));
            await user.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Edit" }));

            expect(screen.getAllByRole("listitem")).toHaveLength(skills.length);
        });

        test("should disable delete buttons while deleting and refetch skills after success", async () => {
            const user = userEvent.setup();
            const selectedSkill = skills[1];
            const deleteRequest = vi.fn();
            const { promise: deleteResponse, resolve: completeDelete } = Promise.withResolvers<void>();
            let currentSkills = [...skills];
            server.use(
                http.get("*/api/my-skills", () => HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                    success: true,
                    data: currentSkills,
                })),
                http.delete("*/api/my-skills/:id", async ({ params }) => {
                    deleteRequest(params.id);
                    await deleteResponse;
                    currentSkills = currentSkills.filter((skill) => skill._id !== params.id);
                    return HttpResponse.json<ApiGetResponse<null>>({ success: true, data: null });
                })
            );
            renderSkillComponent({ type: "admin" });
            await screen.findByRole("heading", { name: selectedSkill.name });

            await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: "Delete" }));

            try {
                await waitFor(() => {
                    expect(deleteRequest).toHaveBeenCalledExactlyOnceWith(selectedSkill._id);
                    const buttons = screen.getAllByRole("button", { name: "Deleting..." });
                    expect(buttons).toHaveLength(skills.length);
                    for (const button of buttons) {
                        expect(button).toBeDisabled();
                    }
                });
                await user.click(screen.getAllByRole("button", { name: "Deleting..." })[1]);
                expect(deleteRequest).toHaveBeenCalledTimes(1);
            } finally {
                completeDelete();
            }

            await waitFor(() => {
                expect(screen.queryByRole("heading", { name: selectedSkill.name })).not.toBeInTheDocument();
                expect(screen.getAllByRole("listitem")).toHaveLength(skills.length - 1);
            });
            for (const skill of currentSkills) {
                expect(screen.getByRole("heading", { name: skill.name })).toBeInTheDocument();
            }
            for (const button of screen.getAllByRole("button", { name: "Delete" })) {
                expect(button).toBeEnabled();
            }
        });

        test("should render an empty admin list after deleting the final skill", async () => {
            const user = userEvent.setup();
            const selectedSkill = skills[0];
            const deleteRequest = vi.fn();
            let currentSkills = [selectedSkill];
            server.use(
                http.get("*/api/my-skills", () => HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                    success: true,
                    data: currentSkills,
                })),
                http.delete("*/api/my-skills/:id", ({ params }) => {
                    deleteRequest(params.id);
                    currentSkills = [];
                    return HttpResponse.json<ApiGetResponse<null>>({ success: true, data: null });
                })
            );
            renderSkillComponent({ type: "admin" });
            await screen.findByRole("heading", { name: selectedSkill.name });

            await user.click(screen.getByRole("button", { name: "Delete" }));

            await waitFor(() => {
                expect(screen.getByRole("list")).toBeEmptyDOMElement();
            });
            expect(deleteRequest).toHaveBeenCalledExactlyOnceWith(selectedSkill._id);
            expect(screen.queryByRole("heading", { name: selectedSkill.name })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Add Skill" })).toBeEnabled();
        });

        test("should successfully retry deletion after a failed request", async () => {
            const user = userEvent.setup();
            const selectedSkill = skills[1];
            const deleteRequest = vi.fn();
            let currentSkills = [...skills];
            let shouldFail = true;
            server.use(
                http.get("*/api/my-skills", () => HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                    success: true,
                    data: currentSkills,
                })),
                http.delete("*/api/my-skills/:id", ({ params }) => {
                    deleteRequest(params.id);
                    if (shouldFail) {
                        return HttpResponse.json<ApiGetResponse<null>>({
                            success: false,
                            error: "Failed to delete skill",
                        }, { status: 500 });
                    }
                    currentSkills = currentSkills.filter((skill) => skill._id !== params.id);
                    return HttpResponse.json<ApiGetResponse<null>>({ success: true, data: null });
                })
            );
            const { queryClient } = renderSkillComponent({ type: "admin" });
            await screen.findByRole("heading", { name: selectedSkill.name });
            await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: "Delete" }));

            await waitFor(() => {
                expect(queryClient.getMutationCache().getAll()[0]?.state.status).toBe("error");
                expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(skills.length);
            });
            expect(screen.getByRole("heading", { name: selectedSkill.name })).toBeInTheDocument();
            shouldFail = false;
            await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: "Delete" }));

            await waitFor(() => {
                expect(screen.queryByRole("heading", { name: selectedSkill.name })).not.toBeInTheDocument();
                expect(screen.getAllByRole("listitem")).toHaveLength(skills.length - 1);
            });
            expect(deleteRequest).toHaveBeenCalledTimes(2);
            expect(deleteRequest).toHaveBeenNthCalledWith(1, selectedSkill._id);
            expect(deleteRequest).toHaveBeenNthCalledWith(2, selectedSkill._id);
        });

        test.each([200, 500])("should keep skills and re-enable delete buttons when deletion fails with status %i", async (status) => {
            const user = userEvent.setup();
            const deleteRequest = vi.fn();
            server.use(
                http.delete("*/api/my-skills/:id", ({ params }) => {
                    deleteRequest(params.id);
                    return HttpResponse.json<ApiGetResponse<null>>({
                        success: false,
                        error: "Failed to delete skill",
                    }, { status });
                })
            );
            const { queryClient } = renderSkillComponent({ type: "admin" });
            const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
            await screen.findByRole("heading", { name: skills[1].name });

            await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: "Delete" }));

            await waitFor(() => {
                expect(queryClient.getMutationCache().getAll()[0]?.state.status).toBe("error");
                expect(screen.queryByRole("button", { name: "Deleting..." })).not.toBeInTheDocument();
            });
            expect(deleteRequest).toHaveBeenCalledExactlyOnceWith(skills[1]._id);
            expect(invalidateQueries).not.toHaveBeenCalled();
            expect(screen.getAllByRole("listitem")).toHaveLength(skills.length);
            expect(screen.getByRole("heading", { name: skills[1].name })).toBeInTheDocument();
            for (const button of screen.getAllByRole("button", { name: "Delete" })) {
                expect(button).toBeEnabled();
            }
        });
    });
});