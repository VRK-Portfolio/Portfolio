import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Sidebar from "../Sidebar";

const counts = vi.hoisted(() => ({ skillsCount: 3, certificationCount: 2, totalExperience: 9 }));
vi.mock("@/hooks/useSkills", () => ({ useSkills: () => counts }));
vi.mock("@/hooks/useCertifications", () => ({ useCertifications: () => counts }));
vi.mock("@/hooks/useExperience", () => ({ useGetExpericence: () => counts }));

describe("Sidebar component", () => {
    beforeEach(() => {
        counts.skillsCount = 3;
        counts.certificationCount = 2;
        counts.totalExperience = 9;
    });

    const renderSidebar = (className = '') => {
        const { container } = render(<Sidebar className={className} />);

        return container;
    };
    test("should render the sidebar component", () => {
        const container = renderSidebar();
        expect(container).toBeInTheDocument();
    });

    test("should contain the correct class name", () => {
        const container = renderSidebar();
        expect(container.firstChild).toHaveClass("cmp-sidebar");
    });

    test("should show the custom classname", () => {
        const customClass = "my-custom-class";
        const container = renderSidebar(customClass);
        expect(container.firstChild).toHaveClass(customClass);
    });


    test("should toggle the sidebar collapse state", () => {
        const container = renderSidebar();
        const button = container.querySelector(".cmp-sidebar--footer-button");
        expect(container.firstChild).not.toHaveClass("cmp-sidebar--collapse");
        fireEvent.click(button!);
        expect(container.firstChild).toHaveClass("cmp-sidebar--collapse");
        fireEvent.click(button!);
        expect(container.firstChild).not.toHaveClass("cmp-sidebar--collapse");
    });

    test("links to experience management and displays live query counts", () => {
        renderSidebar();
        expect(screen.getByRole("link", { name: /Experience/ })).toHaveAttribute("href", "/admin/experience");
        expect(screen.getByText("3 Skills")).toBeInTheDocument();
        expect(screen.getByText("2 Certs")).toBeInTheDocument();
        expect(screen.getByText("Exper 9 Yrs")).toBeInTheDocument();
    });

    test("updates all badges when query results change, including zero counts", () => {
        const { rerender } = render(<Sidebar />);
        counts.skillsCount = 0;
        counts.certificationCount = 0;
        counts.totalExperience = 0;
        rerender(<Sidebar />);
        expect(screen.getByText("0 Skills")).toBeInTheDocument();
        expect(screen.getByText("0 Certs")).toBeInTheDocument();
        expect(screen.getByText("Exper 0 Yrs")).toBeInTheDocument();
        expect(screen.getByText("1 Proj")).toBeInTheDocument();
    });
});