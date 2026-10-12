import { describe, expect, test } from "vitest";
import Home from "../page";
import { render } from "@testing-library/react";

describe("Site Page", () => {
    const renderSite = () => {
        const { container } = render(<Home />);
        return container.querySelector(".home-page");
    };
    test("should render the site page correctly", () => {
        const sitePage = renderSite();
        expect(sitePage).toBeInTheDocument();
    });
});