import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import type { ApiGetResponse } from "@/@types/ApiResponse.types";
import type { MySkillsType } from "@/@types/MySkills.types";
import { mockMySkills } from "@/mocks/my-skills";
import { mockDialogMethods } from "@/tests/dialog";
import { renderWithQueryClient } from "@/tests/tan-query";
import MySkillsScreen from "../MySkillsScreen";

const skills = mockMySkills.slice(0, 2).map((skill, index) => ({
    ...skill,
    _id: `skill-${index + 1}`,
}));
const server = setupServer(
    http.get("*/api/my-skills", () => HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
        success: true,
        data: skills,
    }))
);

describe("MySkillsScreen", () => {
    let dialogMethods: ReturnType<typeof mockDialogMethods>;

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    beforeEach(() => {
        dialogMethods = mockDialogMethods();
    });
    afterEach(() => {
        server.resetHandlers();
        dialogMethods.restore();
    });
    afterAll(() => server.close());

    const renderScreen = async () => {
        const result = renderWithQueryClient(<MySkillsScreen />);
        await screen.findByRole("heading", { name: skills[0].name });
        return result;
    };

    test("should render the admin skills list without an initial modal", async () => {
        await renderScreen();

        expect(screen.getByRole("heading", { name: "Admin View of My Skills", level: 4 })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add Skill" })).toBeEnabled();
        expect(screen.getAllByRole("listitem")).toHaveLength(skills.length);
        expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText("Name")).not.toBeInTheDocument();
        expect(dialogMethods.showModal).not.toHaveBeenCalled();
    });

    test("should open an empty Add Skill form from the admin list", async () => {
        const user = userEvent.setup();
        await renderScreen();

        await user.click(screen.getByRole("button", { name: "Add Skill" }));

        const dialog = within(screen.getByRole("dialog"));
        expect(dialog.getByRole("heading", { name: "Add Skill" })).toBeInTheDocument();
        expect(dialog.getByPlaceholderText("Name")).toHaveValue("");
        expect(dialog.getByPlaceholderText("Level")).toHaveValue("");
        expect(dialog.getByPlaceholderText("Category")).toHaveValue("");
        expect(dialog.getByRole("button", { name: "Submit" })).toBeInTheDocument();
        expect(dialog.queryByRole("button", { name: "Update Skill" })).not.toBeInTheDocument();
        expect(dialogMethods.showModal).toHaveBeenCalledTimes(1);
    });

    test.each([0, 1])("should open the Edit Skill form for skill at index %i", async (index) => {
        const user = userEvent.setup();
        await renderScreen();
        const selectedSkill = skills[index];

        await user.click(within(screen.getAllByRole("listitem")[index]).getByRole("button", { name: "Edit" }));

        const dialog = within(screen.getByRole("dialog"));
        expect(dialog.getByRole("heading", { name: "Edit Skill" })).toBeInTheDocument();
        await waitFor(() => expect(dialog.getByPlaceholderText("Name")).toHaveValue(selectedSkill.name));
        expect(dialog.getByPlaceholderText("Level")).toHaveValue(selectedSkill.proficiency);
        expect(dialog.getByPlaceholderText("Category")).toHaveValue(selectedSkill.category);
        for (const capability of selectedSkill.capabilities) {
            expect(dialog.getByText(capability)).toBeInTheDocument();
        }
        expect(dialog.getByRole("button", { name: "Update Skill" })).toBeInTheDocument();
        expect(dialog.getByText("Update Icon (Optional)")).toBeInTheDocument();
        expect(dialog.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
    });

    test.each(["add", "edit"])("should close the %s modal with the close button and reopen in add mode", async (mode) => {
        const user = userEvent.setup();
        await renderScreen();
        if (mode === "add") {
            await user.click(screen.getByRole("button", { name: "Add Skill" }));
        } else {
            await user.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Edit" }));
        }

        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "\u00d7" }));

        expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Add Skill" }));
        const dialog = within(screen.getByRole("dialog"));
        expect(dialog.getByRole("heading", { name: "Add Skill" })).toBeInTheDocument();
        expect(dialog.getByPlaceholderText("Name")).toHaveValue("");
    });

    test.each(["add", "edit"])("should unmount the %s form when Cancel updates modal state", async (mode) => {
        const user = userEvent.setup();
        await renderScreen();
        if (mode === "add") {
            await user.click(screen.getByRole("button", { name: "Add Skill" }));
        } else {
            await user.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Edit" }));
        }

        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));

        expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText("Name")).not.toBeInTheDocument();
        expect(screen.getAllByRole("listitem")).toHaveLength(skills.length);
    });

    test("should close the modal in response to a native dialog close event", async () => {
        const user = userEvent.setup();
        await renderScreen();
        await user.click(screen.getByRole("button", { name: "Add Skill" }));

        fireEvent(screen.getByRole("dialog"), new Event("close"));

        expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText("Name")).not.toBeInTheDocument();
    });

    test("should discard unsaved add values before opening an edit form", async () => {
        const user = userEvent.setup();
        await renderScreen();
        await user.click(screen.getByRole("button", { name: "Add Skill" }));
        await user.type(within(screen.getByRole("dialog")).getByPlaceholderText("Name"), "Unsaved skill");
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));

        await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: "Edit" }));

        const dialog = within(screen.getByRole("dialog"));
        await waitFor(() => expect(dialog.getByPlaceholderText("Name")).toHaveValue(skills[1].name));
        expect(dialog.getByRole("heading", { name: "Edit Skill" })).toBeInTheDocument();
    });
});
