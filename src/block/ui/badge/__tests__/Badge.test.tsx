import { render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Badge from "../Badge";
import userEvent, { UserEvent } from "@testing-library/user-event";

describe("Badge component", () => {
    let user: UserEvent;
    beforeEach(() => {
        user = userEvent.setup();
    });

    const renderBadge = (props = {}, children: React.ReactNode) => {
        const { container } = render(<Badge {...props}>{children}</Badge>);

        const badge = container.querySelector('.cmp-badge');

        return badge;
    };
    
    test("should render the badge component", () => {
        const badge = renderBadge({}, "Badge");
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent("Badge");
    });

    test("should show the click button when passing the close prop", () => {
        const badge = renderBadge({ close: true }, "Badge");
        const closeButton = badge?.querySelector('.cmp-badge__close');
        expect(closeButton).toBeInTheDocument();
    });

    test("should not show the close button when close prop is not passed", () => {
        const badge = renderBadge({}, "Badge");
        const closeButton = badge?.querySelector('.cmp-badge__close');
        expect(closeButton).not.toBeInTheDocument();
    });

    test("should trigger a click event when the close button is clicked", async () => {
        const onClose = vi.fn();
        const badge = renderBadge({ close: true, onClose }, "Badge");
        const closeButton = badge?.querySelector('.cmp-badge__close') as HTMLButtonElement;
        await user.click(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("should throw error if close prop is false and onClose is provided", () => {
        const onClose = vi.fn();
        const badge = renderBadge({ close: false, onClose }, "Badge");
        const closeButton = badge?.querySelector('.cmp-badge__close') as HTMLButtonElement;
        expect(closeButton).not.toBeInTheDocument();
    });


    test("should throw error if close prop is not provided but onClose is passed", () => {
        const onClose = vi.fn();
        const badge = renderBadge({ onClose }, "Badge");
        const closeButton = badge?.querySelector('.cmp-badge__close') as HTMLButtonElement;
        expect(closeButton).not.toBeInTheDocument();
    });

    test("should render the badge with custom className", () => {
        const badge = renderBadge({ className: "custom-class" }, "Badge");
        expect(badge).toHaveClass("custom-class");
    })
});