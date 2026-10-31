import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ExperienceType } from "@/@types/Experience.types";
import { MyExperienceComponent } from "../MyExperience";

const hooks = vi.hoisted(() => ({
    experienceList: [] as ExperienceType[],
    totalExperience: 9,
    deleteExperience: vi.fn(),
}));
vi.mock("@/hooks/useExperience", () => ({
    useGetExpericence: () => hooks,
    useDeleteExperience: () => hooks,
}));

const experience: ExperienceType = {
    _id: "507f1f77bcf86cd799439011",
    company: "Example Company",
    location: "Bengaluru",
    responsibilites: ["Architecture", "Mentoring"],
    positions: [
        { role: "Engineer", startDate: new Date("2020-01-01"), endDate: new Date("2022-12-31"), isCurrentPosition: false, description: "Built applications." },
        { role: "Lead Engineer", startDate: new Date("2023-01-01"), isCurrentPosition: true, description: "Led development." },
    ],
};

describe("MyExperienceComponent", () => {
    beforeEach(() => {
        hooks.experienceList = [experience];
        hooks.totalExperience = 9;
        hooks.deleteExperience.mockReset();
    });

    test("renders the default site heading with formatted subtitle markup", () => {
        const { container } = render(<MyExperienceComponent />);
        expect(screen.getByRole("heading", { name: "My Experience", level: 2 })).toBeInTheDocument();
        expect(container.querySelector("strong")).toHaveTextContent("9+ years of expertise");
        expect(container.querySelector("section")).toHaveClass("cmp-my-experience");
        expect(container.querySelector("section")).not.toHaveClass("cmp-admin__type");
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    test("updates the experience subtitle when the query total changes", () => {
        const { container, rerender } = render(<MyExperienceComponent />);
        hooks.totalExperience = 12;
        rerender(<MyExperienceComponent />);
        expect(container.querySelector("strong")).toHaveTextContent("12+ years of expertise");
    });

    test("renders company details, responsibilities, positions and UTC date ranges", () => {
        render(<MyExperienceComponent />);
        const entry = within(screen.getByRole("listitem"));
        expect(entry.getByRole("heading", { name: "Example Company" })).toBeInTheDocument();
        expect(entry.getByText("Bengaluru")).toBeInTheDocument();
        for (const responsibility of experience.responsibilites) {
            expect(entry.getByText(responsibility)).toBeInTheDocument();
        }
        expect(entry.getByText("1 January 2020 - Present")).toBeInTheDocument();
        expect(entry.getByText("1 January 2020 - 31 December 2022")).toBeInTheDocument();
        expect(entry.getByText("1 January 2023 - Present")).toBeInTheDocument();
        for (const position of experience.positions) {
            expect(entry.getByRole("heading", { name: position.role })).toBeInTheDocument();
            expect(entry.getByText(position.description)).toBeInTheDocument();
        }
    });

    test("uses the last position's end date for completed experiences", () => {
        hooks.experienceList = [{ ...experience, positions: [experience.positions[0]] }];
        render(<MyExperienceComponent />);
        expect(screen.getAllByText("1 January 2020 - 31 December 2022")).toHaveLength(2);
    });

    test("supports custom classes for explicit site and admin views", () => {
        const { container, rerender } = render(<MyExperienceComponent type="site" className="custom-experience" />);
        expect(container.querySelector("section")).toHaveClass("custom-experience");
        rerender(<MyExperienceComponent type="admin" className="custom-experience" />);
        expect(container.querySelector("section")).toHaveClass("custom-experience", "cmp-admin__type");
        expect(screen.getByRole("heading", { name: "Admin Experience" })).toBeInTheDocument();
        expect(screen.getByText("Manage your site effectively")).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "My Experience" })).not.toBeInTheDocument();
    });

    test("opens add and edit modals and deletes the selected entry", async () => {
        const user = userEvent.setup();
        const modalOpen = vi.fn();
        render(<MyExperienceComponent type="admin" modalOpen={modalOpen} />);
        await user.click(screen.getByRole("button", { name: "Add Experience" }));
        expect(modalOpen).toHaveBeenNthCalledWith(1);
        await user.click(screen.getByRole("button", { name: "Edit" }));
        expect(modalOpen).toHaveBeenNthCalledWith(2, experience._id);
        await user.click(screen.getByRole("button", { name: "Delete" }));
        expect(hooks.deleteExperience).toHaveBeenCalledExactlyOnceWith(experience._id);
    });

    test("allows admin actions when the optional modal callback is absent", async () => {
        const user = userEvent.setup();
        render(<MyExperienceComponent type="admin" />);
        await user.click(screen.getByRole("button", { name: "Add Experience" }));
        await user.click(screen.getByRole("button", { name: "Edit" }));
        expect(screen.getByRole("heading", { name: "Example Company" })).toBeInTheDocument();
    });

    test("renders an empty list when no experiences exist", () => {
        hooks.experienceList = [];
        render(<MyExperienceComponent />);
        expect(screen.getByRole("list")).toBeEmptyDOMElement();
        expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    });
});
