import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { createRef } from "react";
import Button from "../Button";

describe("Button Component", () => {
    let user: UserEvent;
    // Initialize userEvent instance before each test
    beforeEach(() => {
        user = userEvent.setup();
    });
    // Helper function to render the button with default props
    const renderButton = (props = {}, children = "Click Me") => {
        render(<Button {...props}>{children}</Button>);
        const button = screen.getByRole("button", { name: String(children) });
        return { button };
    };

    test("should render correctly", () => {
        const { button } = renderButton();
        expect(button).toBeInTheDocument();
    });

    test("should have the correct text", () => {
        const { button } = renderButton();
        expect(button).toHaveTextContent("Click Me");
    });

    test("should be disabled when the disabled prop is set", () => {
        const { button } = renderButton({ disabled: true });
        expect(button).toBeDisabled();
    });

    test("should have the correct class when the className prop is set", () => {
        const { button } = renderButton({ className: "custom-class" });
        expect(button).toHaveClass("custom-class cmp-button cmp-button__primary");
    });

    test("should have the correct button type when type is set", () => {
        const { button } = renderButton({ type: "submit" });
        expect(button).toHaveAttribute("type", "submit");
    });

    test("should have the correct class when the outline prop is set", () => {
        const { button } = renderButton({ outline: true });
        expect(button).toHaveClass("cmp-button cmp-button__primary-outline");
    });

    test("should have the correct class when the variant prop is set", () => {
        const { button } = renderButton({ variant: "secondary" });
        expect(button).toHaveClass("cmp-button cmp-button__secondary");
    });

    test("should have the correct class when both variant and outline props are set", () => {
        const { button } = renderButton({ variant: "secondary", outline: true });
        expect(button).toHaveClass("cmp-button cmp-button__secondary-outline");
    });

    test("should have the correct class when both variant and outline props are set along with a custom class", () => {
        const { button } = renderButton({ variant: "secondary", outline: true, className: "custom-class" });
        expect(button).toHaveClass("custom-class cmp-button cmp-button__secondary-outline");
    });

    test("should have the correct class when a custom class is set without variant or outline", () => {
        const { button } = renderButton({ className: "custom-class" });
        expect(button).toHaveClass("custom-class cmp-button cmp-button__primary");
    });

    test("should render correctly with no props", () => {
        const { button } = renderButton();
        expect(button).toHaveClass("cmp-button cmp-button__primary");
    });

    test("should click the button", async () => {
        const handleClick = vi.fn();
        const { button } = renderButton({ onClick: handleClick });
        await user.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test("should not click when the disabled prop is set", async () => {
        const handleClick = vi.fn();
        const { button } = renderButton({ onClick: handleClick, disabled: true });
        await user.click(button);
        expect(handleClick).not.toHaveBeenCalled();
    });

    test("should trigger onClick when pressing Enter or Space Key", async () => {
        const handleClick = vi.fn();
        const { button } = renderButton({ onClick: handleClick });

        button.focus();
        expect(button).toHaveFocus();
        await user.keyboard("{Enter}");
        expect(handleClick).toHaveBeenCalledTimes(1);
        await user.keyboard(" ");
        expect(handleClick).toHaveBeenCalledTimes(2);
    });

    test("forwards ref to the button element", () => {
        const ref = createRef<HTMLButtonElement>();
        renderButton({ ref }, 'Button Text');
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
        expect(ref.current).toHaveTextContent('Button Text');
    });

    test("should have the correct class when the fullWidth prop is set", () => {
        const { button } = renderButton({ fullWidth: true });
        expect(button).toHaveClass("cmp-button cmp-button__primary cmp-button__full-width");
    });

    test("should have the correct class when the rounded prop is set", () => {
        const { button } = renderButton({ rounded: true });
        expect(button).toHaveClass("cmp-button cmp-button__primary cmp-button__rounded");
    });

    test("should have the correct class when the size prop is set to small", () => {
        const { button } = renderButton({ size: "small" });
        expect(button).toHaveClass("cmp-button cmp-button__primary cmp-button__small");
    });
    
    test("should have the correct class when the size prop is set to medium", () => {
        const { button } = renderButton({ size: "medium" });
        expect(button).toHaveClass("cmp-button cmp-button__primary cmp-button__medium");
    });

    test("should have the correct class when the size prop is set to large", () => {
        const { button } = renderButton({ size: "large" });
        expect(button).toHaveClass("cmp-button cmp-button__primary cmp-button__large");
    });

    test("should show the medium size by default", () => {
        const { button } = renderButton();
        expect(button).not.toHaveClass("cmp-button__small");
        expect(button.classList).toContain("cmp-button__medium");
        expect(button).not.toHaveClass("cmp-button__large");
    });
});