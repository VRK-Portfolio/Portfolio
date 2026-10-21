import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MyExperienceComponent } from "../MyExperience";

describe("MyExperienceComponent", () => {
    test("should render the default site view without admin styling", () => {
        const { container } = render(<MyExperienceComponent />);

        expect(screen.getByRole("heading", { name: "My Experience", level: 2 })).toBeInTheDocument();
        expect(screen.getByText("Full stack developer building scalable applications with modern technologies efficiently.")).toBeInTheDocument();
        expect(container.querySelector("section")).toHaveClass("cmp-my-experience", "section");
        expect(container.querySelector("section")).not.toHaveClass("cmp-admin__type");
    });

    test("should render the admin view and retain a custom class", () => {
        const { container } = render(<MyExperienceComponent type="admin" className="custom-experience" />);

        expect(screen.getByRole("heading", { name: "Admin Experience" })).toBeInTheDocument();
        expect(screen.getByText("Manage your site effectively")).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "My Experience" })).not.toBeInTheDocument();
        expect(container.querySelector("section")).toHaveClass("custom-experience", "cmp-admin__type");
    });

    test("should render an explicit site view with custom styling", () => {
        const { container } = render(<MyExperienceComponent type="site" className="site-experience" />);

        expect(screen.getByRole("heading", { name: "My Experience" })).toBeInTheDocument();
        expect(container.querySelector("section")).toHaveClass("site-experience");
        expect(container.querySelector("section")).not.toHaveClass("cmp-admin__type");
    });

    test("should render experience entries with company details, roles and responsibility badges", () => {
        render(<MyExperienceComponent />);
        const items = screen.getAllByRole("listitem");

        expect(items).toHaveLength(2);
        for (const [index, item] of items.entries()) {
            const entry = within(item);
            expect(entry.getByRole("heading", { name: "Adobe Systems Private Limited", level: 3 })).toBeInTheDocument();
            expect(entry.getByText("Bengaluru, Karnataka")).toBeInTheDocument();
            expect(entry.getAllByRole("heading", { name: "Full Stack Developer", level: 4 })).toHaveLength(index === 0 ? 2 : 1);
            for (let responsibility = 1; responsibility <= 4; responsibility++) {
                expect(entry.getByText(`Responsibility ${responsibility}`)).toBeInTheDocument();
            }
            expect(entry.getAllByText("March 2026 - Present")).toHaveLength(index === 0 ? 3 : 2);
        }
    });
});
