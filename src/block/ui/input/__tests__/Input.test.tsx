import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Input from "../Input";

describe("Input component", () => {
    const renderInput = (props = {}) => {
        const {container} = render(<Input {...props} />);
        return container;
    };
    test("should render the input component correctly", () => {
        // Add your test logic here
        const container = renderInput();
        expect(container).toBeInTheDocument();
    });

    test("should show error message and add error class when error prop is provided", () => {
        const errorMessage = "Field is required";
        const container = renderInput({ error: errorMessage });
        expect(container.querySelector(".cmp-input")).toHaveClass("cmp-input--error");
        expect(container).toHaveTextContent(errorMessage);
    });

    test("should show the label when label prop is provided", () => {
        const label = "Test Label";
        const container = renderInput({ label });
        expect(container).toHaveTextContent(label);
    });
});