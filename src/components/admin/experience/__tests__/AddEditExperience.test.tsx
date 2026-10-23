import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ExperienceType } from "@/@types/Experience.types";
import AddEditExperience from "../AddEditExperience";

const hooks = vi.hoisted(() => ({
    experienceList: [] as ExperienceType[],
    isLoading: false,
    isError: false,
    error: null as Error | null,
    isAdding: false,
    isUpdating: false,
    addExperience: vi.fn(),
    updateExperience: vi.fn(),
}));

vi.mock("@/hooks/useExperience", () => ({
    useGetExpericence: () => hooks,
    useCreateExperience: () => ({ addExperience: hooks.addExperience, isLoading: hooks.isAdding }),
    useUpdateExperience: () => ({ updateExperience: hooks.updateExperience, isLoading: hooks.isUpdating }),
}));

const experience: ExperienceType = {
    _id: "507f1f77bcf86cd799439011",
    company: "Example Company",
    location: "Bengaluru",
    responsibilites: ["Architecture", "Mentoring"],
    positions: [
        {
            _id: "507f1f77bcf86cd799439012",
            role: "Engineer",
            startDate: new Date("2020-02-29"),
            endDate: new Date("2022-03-31"),
            isCurrentPosition: false,
            description: "Built accessible applications.",
        },
        {
            _id: "507f1f77bcf86cd799439013",
            role: "Senior Engineer",
            startDate: new Date("2022-04-01"),
            isCurrentPosition: true,
            description: "Leading frontend development.",
        },
    ],
};

type ModalState = ComponentProps<typeof AddEditExperience>["modalState"];
const addModal: ModalState = { isOpen: true, mode: "add", experienceId: null };
const editModal: ModalState = { isOpen: true, mode: "edit", experienceId: experience._id };
const closedModal: ModalState = { isOpen: false, mode: "add", experienceId: null };

const renderForm = (modalState = addModal) => {
    const setModalState = vi.fn();
    return {
        ...render(<AddEditExperience modalState={modalState} setModalState={setModalState} />),
        setModalState,
    };
};

const fillForm = async () => {
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Company" }), "New Company");
    await user.type(screen.getByRole("textbox", { name: "Location" }), "Remote");
    await user.type(screen.getByRole("textbox", { name: "Responsibility" }), "APIs{Enter}");
    await user.type(screen.getByRole("textbox", { name: "Role 1" }), "Developer");
    await user.type(screen.getByLabelText("Start Date 1"), "2024-02-29");
    await user.type(screen.getByRole("textbox", { name: "Description 1" }), "Built applications.");
    return user;
};

describe("AddEditExperience", () => {
    beforeEach(() => {
        hooks.experienceList = [experience];
        hooks.isLoading = false;
        hooks.isError = false;
        hooks.error = null;
        hooks.isAdding = false;
        hooks.isUpdating = false;
        hooks.addExperience.mockReset();
        hooks.updateExperience.mockReset();
    });

    test("starts with an empty position and requires all mandatory fields", async () => {
        const user = userEvent.setup();
        renderForm();
        expect(screen.getByRole("button", { name: "Remove Position 1" })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Add Experience" }));
        for (const message of [
            "Company is required", "Location is required", "At least one responsibility is required",
            "Role is required", "Start date is required", "Description is required",
        ]) {
            expect(await screen.findByText(message)).toBeInTheDocument();
        }
        expect(hooks.addExperience).not.toHaveBeenCalled();
    });

    test("trims responsibility tags, prevents duplicates and validates their removal", async () => {
        const user = userEvent.setup();
        renderForm();
        const input = screen.getByRole("textbox", { name: "Responsibility" });
        await user.type(input, "  APIs  {Enter}");
        await user.type(input, "APIs{Enter}");
        expect(screen.getAllByText("APIs")).toHaveLength(1);
        await user.clear(input);
        await user.type(input, "   {Enter}");
        expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1);
        await user.click(screen.getByRole("button", { name: "Close" }));
        expect(await screen.findByText("At least one responsibility is required")).toBeInTheDocument();
        await user.clear(input);
        await user.type(input, "Leadership");
        await user.click(screen.getByRole("button", { name: "Add Responsibility" }));
        expect(screen.getByText("Leadership")).toBeInTheDocument();
        expect(hooks.addExperience).not.toHaveBeenCalled();
    });

    test("adds and removes positions without discarding other entries", async () => {
        const user = userEvent.setup();
        renderForm();
        await user.type(screen.getByRole("textbox", { name: "Role 1" }), "First role");
        await user.click(screen.getByRole("button", { name: "Add Position" }));
        await user.type(screen.getByRole("textbox", { name: "Role 2" }), "Second role");
        await user.click(screen.getByRole("button", { name: "Remove Position 1" }));
        expect(screen.getByRole("textbox", { name: "Role 1" })).toHaveValue("Second role");
        expect(screen.getByRole("button", { name: "Remove Position 1" })).toBeDisabled();
    });

    test("submits a new experience with UTC dates and closes only after success", async () => {
        const { setModalState } = renderForm();
        const user = await fillForm();
        await user.click(screen.getByRole("button", { name: "Add Experience" }));
        await waitFor(() => expect(hooks.addExperience).toHaveBeenCalledTimes(1));
        expect(hooks.addExperience.mock.calls[0][0]).toEqual({
            company: "New Company",
            location: "Remote",
            responsibilites: ["APIs"],
            positions: [{
                role: "Developer",
                startDate: new Date("2024-02-29T00:00:00.000Z"),
                endDate: undefined,
                isCurrentPosition: false,
                description: "Built applications.",
            }],
        });
        expect(setModalState).not.toHaveBeenCalled();
        act(() => hooks.addExperience.mock.calls[0][1].onSuccess());
        expect(setModalState).toHaveBeenCalledExactlyOnceWith(closedModal);
    });

    test("populates multiple edit positions and preserves all IDs when updating", async () => {
        const user = userEvent.setup();
        const { setModalState } = renderForm(editModal);
        expect(screen.getByRole("textbox", { name: "Company" })).toHaveValue(experience.company);
        expect(screen.getByLabelText("Start Date 1")).toHaveValue("2020-02-29");
        expect(screen.getByLabelText("End Date 1")).toHaveValue("2022-03-31");
        expect(screen.getByLabelText("Start Date 2")).toHaveValue("2022-04-01");
        expect(screen.getByRole("checkbox", { name: "Current position 2" })).toBeChecked();
        expect(screen.queryByLabelText("End Date 2")).not.toBeInTheDocument();
        expect(screen.getByText("Architecture")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Update Experience" }));
        await waitFor(() => expect(hooks.updateExperience).toHaveBeenCalledTimes(1));
        expect(hooks.updateExperience.mock.calls[0][0]).toEqual(experience);
        expect(setModalState).not.toHaveBeenCalled();
        expect(hooks.addExperience).not.toHaveBeenCalled();
    });

    test("rejects reversed date ranges and clears the end date for a current position", async () => {
        renderForm();
        const user = await fillForm();
        await user.type(screen.getByLabelText("End Date 1"), "2023-12-31");
        await user.click(screen.getByRole("button", { name: "Add Experience" }));
        expect(await screen.findByText("End date must be on or after the start date")).toBeInTheDocument();
        expect(hooks.addExperience).not.toHaveBeenCalled();
        await user.click(screen.getByRole("checkbox", { name: "Current position 1" }));
        expect(screen.queryByLabelText("End Date 1")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Add Experience" }));
        await waitFor(() => expect(hooks.addExperience).toHaveBeenCalledTimes(1));
        expect(hooks.addExperience.mock.calls[0][0].positions[0]).toMatchObject({
            isCurrentPosition: true,
            endDate: undefined,
        });
        await user.click(screen.getByRole("checkbox", { name: "Current position 1" }));
        expect(screen.getByLabelText("End Date 1")).toHaveValue("");
    });

    test("revalidates an existing end date when its start date changes", async () => {
        const user = userEvent.setup();
        renderForm(editModal);
        await user.clear(screen.getByLabelText("Start Date 1"));
        await user.type(screen.getByLabelText("Start Date 1"), "2023-01-01");
        expect(await screen.findByText("End date must be on or after the start date")).toBeInTheDocument();
        await user.clear(screen.getByLabelText("Start Date 1"));
        await user.type(screen.getByLabelText("Start Date 1"), "2021-01-01");
        await waitFor(() => expect(screen.queryByText("End date must be on or after the start date")).not.toBeInTheDocument());
    });

    test("resets company details, tags and positions when switching from edit to add", () => {
        const { rerender, setModalState } = renderForm(editModal);
        expect(screen.getByRole("textbox", { name: "Role 2" })).toBeInTheDocument();
        rerender(<AddEditExperience modalState={addModal} setModalState={setModalState} />);
        expect(screen.getByRole("textbox", { name: "Company" })).toHaveValue("");
        expect(screen.getByLabelText("Start Date 1")).toHaveValue("");
        expect(screen.queryByRole("textbox", { name: "Role 2" })).not.toBeInTheDocument();
        expect(screen.queryByText("Architecture")).not.toBeInTheDocument();
    });

    test("discards a stale end date when loading a position marked current", async () => {
        hooks.experienceList = [{
            ...experience,
            positions: [{ ...experience.positions[0], isCurrentPosition: true }],
        }];
        const user = userEvent.setup();
        renderForm(editModal);
        expect(screen.queryByLabelText("End Date 1")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Update Experience" }));
        await waitFor(() => expect(hooks.updateExperience).toHaveBeenCalledTimes(1));
        expect(hooks.updateExperience.mock.calls[0][0].positions[0].endDate).toBeUndefined();
    });

    test.each(["add", "edit"] as const)("retains the %s form on errors and closes after a successful retry", async (mode) => {
        const { setModalState } = renderForm(mode === "edit" ? editModal : addModal);
        const user = mode === "edit" ? userEvent.setup() : await fillForm();
        const mutation = mode === "edit" ? hooks.updateExperience : hooks.addExperience;
        const button = screen.getByRole("button", { name: mode === "edit" ? "Update Experience" : "Add Experience" });
        await user.click(button);
        await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));
        act(() => mutation.mock.calls[0][1].onError(new Error("Save failed")));
        expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
        expect(screen.getByRole("textbox", { name: "Company" })).not.toHaveValue("");
        expect(setModalState).not.toHaveBeenCalled();
        await user.click(button);
        await waitFor(() => expect(mutation).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        act(() => mutation.mock.calls[1][1].onSuccess());
        expect(setModalState).toHaveBeenCalledExactlyOnceWith(closedModal);
    });

    test("waits for edit data and formats dates once loading completes", () => {
        hooks.experienceList = [];
        hooks.isLoading = true;
        const { rerender, setModalState } = renderForm(editModal);
        expect(screen.getByRole("status")).toHaveTextContent("Loading experience...");
        hooks.isLoading = false;
        hooks.experienceList = [experience];
        rerender(<AddEditExperience modalState={editModal} setModalState={setModalState} />);
        expect(screen.getByLabelText("Start Date 1")).toHaveValue("2020-02-29");
    });

    test("shows loading errors and missing edit records without allowing an accidental create", () => {
        hooks.isError = true;
        hooks.error = new Error("Network unavailable");
        const { rerender, setModalState } = renderForm(editModal);
        expect(screen.getByRole("alert")).toHaveTextContent("Network unavailable");
        hooks.isError = false;
        hooks.experienceList = [];
        rerender(<AddEditExperience modalState={editModal} setModalState={setModalState} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Experience not found.");
        expect(screen.queryByRole("button", { name: "Add Experience" })).not.toBeInTheDocument();
    });

    test("uses an explicit fallback message when a loading error has no message", () => {
        hooks.isError = true;
        hooks.error = new Error("");
        renderForm(editModal);
        expect(screen.getByRole("alert")).toHaveTextContent("Failed to load experience");
    });

    test("disables editing and duplicate submissions while saving", () => {
        hooks.isUpdating = true;
        renderForm(editModal);
        expect(screen.getByRole("textbox", { name: "Company" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Add Position" })).toBeDisabled();
    });

    test("cancels without saving", async () => {
        const user = userEvent.setup();
        const { setModalState } = renderForm();
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(setModalState).toHaveBeenCalledExactlyOnceWith(closedModal);
        expect(hooks.addExperience).not.toHaveBeenCalled();
        expect(hooks.updateExperience).not.toHaveBeenCalled();
    });
});
