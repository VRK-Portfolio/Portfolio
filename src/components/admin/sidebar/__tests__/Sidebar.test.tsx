import { fireEvent, render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import Sidebar from "../Sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

describe("Sidebar component", () => {
    const renderSidebar = (className = '') => {
        const { container } = render(
        <QueryClientProvider client={new QueryClient()}>
            <Sidebar className={className} />
        </QueryClientProvider>
        );

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
});