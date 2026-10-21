import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MySkillsType } from "@/@types/MySkills.types";
import { mockMySkills } from "@/mocks/my-skills";
import AddEditSkills from "../AddEditSkills";

type SkillMutation = (data: MySkillsType, callbacks: {
    onSuccess: () => void;
    onError: (error: Error) => void;
}) => void;

const hooks = vi.hoisted(() => {
    const skills: MySkillsType[] = [];
    return {
        skills,
        createSkill: vi.fn<SkillMutation>(),
        updateSkill: vi.fn<SkillMutation>(),
    };
});

vi.mock("@/hooks/useSkills", () => ({
    useSkills: () => ({ skills: hooks.skills }),
    useCreateSkill: () => ({ createSkill: hooks.createSkill }),
    useUpdateSkill: () => ({ updateSkill: hooks.updateSkill }),
}));

describe("AddEditSkills", () => {
    const skill: MySkillsType = { ...mockMySkills[0], _id: "skill-1" };
    const addModal: ComponentProps<typeof AddEditSkills>["modalState"] = {
        isOpen: true,
        mode: "add",
        skillId: null,
    };
    const editModal: ComponentProps<typeof AddEditSkills>["modalState"] = {
        isOpen: true,
        mode: "edit",
        skillId: skill._id,
    };
    const closedModal = { isOpen: false, mode: "add", skillId: null };

    const renderForm = (modalState = addModal) => {
        const setModalState = vi.fn();
        return {
            ...render(<AddEditSkills modalState={modalState} setModalState={setModalState} />),
            setModalState,
        };
    };

    const fillAddForm = async () => {
        const user = userEvent.setup();
        const file = new File(["icon contents"], "react.svg", { type: "image/svg+xml" });
        await user.type(screen.getByPlaceholderText("Name"), "React");
        await user.type(screen.getByPlaceholderText("Level"), "Advanced");
        await user.type(screen.getByPlaceholderText("Category"), "Frontend");
        await user.type(screen.getByPlaceholderText("Type and press Enter to add capability..."), "Hooks{Enter}");
        await user.upload(screen.getByPlaceholderText("Icon"), file);
        return { user, file };
    };

    beforeEach(() => {
        hooks.skills = [skill];
        hooks.createSkill.mockReset();
        hooks.updateSkill.mockReset();
    });

    test("should render an empty add form with supported icon formats", () => {
        renderForm();

        expect(screen.getByPlaceholderText("Name")).toHaveValue("");
        expect(screen.getByPlaceholderText("Level")).toHaveValue("");
        expect(screen.getByPlaceholderText("Category")).toHaveValue("");
        expect(screen.getByPlaceholderText("Icon")).toHaveAttribute("type", "file");
        expect(screen.getByPlaceholderText("Icon")).toHaveAttribute("accept", ".svg,.png,.jpg,.jpeg,.webp");
        expect(screen.getByText("Skill Icon / Skill Image")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Update Skill" })).not.toBeInTheDocument();
    });

    test("should validate all required fields before creating a skill", async () => {
        const user = userEvent.setup();
        const { setModalState } = renderForm();
        await user.click(screen.getByRole("button", { name: "Submit" }));

        for (const message of [
            "Skill Name is required",
            "Level is required",
            "Category is required",
            "At least one capability is required",
            "Icon is required",
        ]) {
            expect(await screen.findByText(message)).toBeInTheDocument();
        }
        expect(hooks.createSkill).not.toHaveBeenCalled();
        expect(hooks.updateSkill).not.toHaveBeenCalled();
        expect(setModalState).not.toHaveBeenCalled();
    });

    test("should trim capabilities, prevent duplicates and ignore whitespace-only entries", async () => {
        const user = userEvent.setup();
        renderForm();
        const input = screen.getByPlaceholderText("Type and press Enter to add capability...");

        await user.type(input, "  Hooks  {Enter}");
        expect(screen.getByText("Hooks")).toBeInTheDocument();
        expect(input).toHaveValue("");
        await user.type(input, "Hooks{Enter}");
        expect(screen.getAllByText("Hooks")).toHaveLength(1);
        await user.clear(input);
        await user.type(input, "   {Enter}");
        expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1);
        expect(hooks.createSkill).not.toHaveBeenCalled();
    });

    test("should remove capabilities and validate when the final capability is removed", async () => {
        const user = userEvent.setup();
        renderForm();
        const input = screen.getByPlaceholderText("Type and press Enter to add capability...");
        await user.type(input, "Hooks{Enter}Components{Enter}");

        await user.click(screen.getAllByRole("button", { name: "Close" })[0]);
        expect(screen.queryByText("Hooks")).not.toBeInTheDocument();
        expect(screen.getByText("Components")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Close" }));

        expect(screen.queryByText("Components")).not.toBeInTheDocument();
        expect(await screen.findByText("At least one capability is required")).toBeInTheDocument();
        expect(hooks.createSkill).not.toHaveBeenCalled();
    });

    test("should clear capability validation after adding a capability", async () => {
        const user = userEvent.setup();
        renderForm();
        await user.click(screen.getByRole("button", { name: "Submit" }));
        expect(await screen.findByText("At least one capability is required")).toBeInTheDocument();

        await user.type(screen.getByPlaceholderText("Type and press Enter to add capability..."), "Hooks{Enter}");

        expect(screen.getByText("Hooks")).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.queryByText("At least one capability is required")).not.toBeInTheDocument();
        });
    });

    test("should create a skill with its selected icon and close only after success", async () => {
        const { setModalState } = renderForm();
        const { user, file } = await fillAddForm();
        await user.click(screen.getByRole("button", { name: "Submit" }));

        await waitFor(() => expect(hooks.createSkill).toHaveBeenCalledTimes(1));
        expect(hooks.createSkill).toHaveBeenCalledWith({
            name: "React",
            proficiency: "Advanced",
            category: "Frontend",
            capabilities: ["Hooks"],
            icon: expect.objectContaining({ 0: file, length: 1 }),
        }, {
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
        });
        expect(hooks.updateSkill).not.toHaveBeenCalled();
        expect(setModalState).not.toHaveBeenCalled();

        act(() => hooks.createSkill.mock.calls[0][1].onSuccess());

        expect(setModalState).toHaveBeenCalledExactlyOnceWith(closedModal);
        expect(screen.getByPlaceholderText("Name")).toHaveValue("");
        expect(screen.queryByText("Hooks")).not.toBeInTheDocument();
    });

    test("should preserve form values and show creation errors, then clear the error after a successful retry", async () => {
        const { setModalState } = renderForm();
        const { user } = await fillAddForm();
        await user.click(screen.getByRole("button", { name: "Submit" }));
        await waitFor(() => expect(hooks.createSkill).toHaveBeenCalledTimes(1));

        act(() => hooks.createSkill.mock.calls[0][1].onError(new Error("Failed to create skill")));

        expect(screen.getByText("Failed to create skill")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Name")).toHaveValue("React");
        expect(screen.getByText("Hooks")).toBeInTheDocument();
        expect(setModalState).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "Submit" }));
        await waitFor(() => expect(hooks.createSkill).toHaveBeenCalledTimes(2));

        act(() => hooks.createSkill.mock.calls[1][1].onSuccess());

        expect(screen.queryByText("Failed to create skill")).not.toBeInTheDocument();
        expect(setModalState).toHaveBeenCalledExactlyOnceWith(closedModal);
    });

    test("should prepopulate edit fields and capabilities from the selected skill", async () => {
        renderForm(editModal);

        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name));
        expect(screen.getByPlaceholderText("Level")).toHaveValue(skill.proficiency);
        expect(screen.getByPlaceholderText("Category")).toHaveValue(skill.category);
        for (const capability of skill.capabilities) {
            expect(screen.getByText(capability)).toBeInTheDocument();
        }
        expect(screen.getByText("Update Icon (Optional)")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Update Skill" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
    });

    test("should update a skill using its existing icon when no replacement is selected", async () => {
        const user = userEvent.setup();
        const { setModalState } = renderForm(editModal);
        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name));
        await user.clear(screen.getByPlaceholderText("Name"));
        await user.type(screen.getByPlaceholderText("Name"), "Updated HTML");
        await user.click(screen.getByRole("button", { name: "Update Skill" }));

        await waitFor(() => expect(hooks.updateSkill).toHaveBeenCalledTimes(1));
        expect(hooks.updateSkill.mock.calls[0][0]).toEqual({ ...skill, name: "Updated HTML" });
        expect(hooks.createSkill).not.toHaveBeenCalled();

        act(() => hooks.updateSkill.mock.calls[0][1].onSuccess());

        expect(setModalState).toHaveBeenCalledWith(closedModal);
        expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name);
    });

    test("should update a skill with a replacement icon", async () => {
        const user = userEvent.setup();
        const file = new File(["new icon"], "replacement.png", { type: "image/png" });
        renderForm(editModal);
        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name));
        await user.upload(screen.getByPlaceholderText("Icon"), file);
        await user.click(screen.getByRole("button", { name: "Update Skill" }));

        await waitFor(() => expect(hooks.updateSkill).toHaveBeenCalledTimes(1));
        expect(hooks.updateSkill.mock.calls[0][0]).toEqual({
            ...skill,
            icon: expect.objectContaining({ 0: file, length: 1 }),
        });
        expect(hooks.createSkill).not.toHaveBeenCalled();
    });

    test("should display update errors without clearing entered values", async () => {
        const user = userEvent.setup();
        renderForm(editModal);
        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name));
        await user.click(screen.getByRole("button", { name: "Update Skill" }));
        await waitFor(() => expect(hooks.updateSkill).toHaveBeenCalledTimes(1));

        act(() => hooks.updateSkill.mock.calls[0][1].onError(new Error("Failed to update skill")));

        expect(screen.getByText("Failed to update skill")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name);
        expect(hooks.createSkill).not.toHaveBeenCalled();
    });

    test("should validate edited fields before updating", async () => {
        const user = userEvent.setup();
        renderForm(editModal);
        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name));
        await user.clear(screen.getByPlaceholderText("Name"));
        await user.click(screen.getByRole("button", { name: "Update Skill" }));

        expect(await screen.findByText("Skill Name is required")).toBeInTheDocument();
        expect(screen.queryByText("Icon is required")).not.toBeInTheDocument();
        expect(hooks.updateSkill).not.toHaveBeenCalled();
    });

    test("should populate edit values when skills finish loading", async () => {
        hooks.skills = [];
        const { rerender, setModalState } = renderForm(editModal);
        expect(screen.getByPlaceholderText("Name")).toHaveValue("");

        hooks.skills = [skill];
        rerender(<AddEditSkills modalState={editModal} setModalState={setModalState} />);

        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name));
        expect(screen.getByPlaceholderText("Category")).toHaveValue(skill.category);
    });

    test("should create rather than update when edit mode has no skill ID", async () => {
        renderForm({ ...editModal, skillId: null });
        const { user } = await fillAddForm();

        await user.click(screen.getByRole("button", { name: "Update Skill" }));

        await waitFor(() => expect(hooks.createSkill).toHaveBeenCalledTimes(1));
        expect(hooks.updateSkill).not.toHaveBeenCalled();
    });

    test("should reset edit values when switching to add mode", async () => {
        const { rerender, setModalState } = renderForm(editModal);
        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name));

        rerender(<AddEditSkills modalState={addModal} setModalState={setModalState} />);

        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(""));
        expect(screen.getByPlaceholderText("Level")).toHaveValue("");
        expect(screen.getByPlaceholderText("Category")).toHaveValue("");
        expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    });

    test("should populate a different skill when its ID changes", async () => {
        const otherSkill: MySkillsType = { ...mockMySkills[1], _id: "skill-2" };
        hooks.skills = [skill, otherSkill];
        const { rerender, setModalState } = renderForm(editModal);
        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(skill.name));

        rerender(<AddEditSkills modalState={{ ...editModal, skillId: otherSkill._id }} setModalState={setModalState} />);

        await waitFor(() => expect(screen.getByPlaceholderText("Name")).toHaveValue(otherSkill.name));
        for (const capability of otherSkill.capabilities) {
            expect(screen.getByText(capability)).toBeInTheDocument();
        }
        for (const capability of skill.capabilities) {
            expect(screen.queryByText(capability)).not.toBeInTheDocument();
        }
    });

    test.each([addModal, editModal])("should close the $mode form without saving when Cancel is clicked", async (modalState) => {
        const user = userEvent.setup();
        const { setModalState } = renderForm(modalState);

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(setModalState).toHaveBeenCalledExactlyOnceWith(closedModal);
        expect(hooks.createSkill).not.toHaveBeenCalled();
        expect(hooks.updateSkill).not.toHaveBeenCalled();
    });
});
