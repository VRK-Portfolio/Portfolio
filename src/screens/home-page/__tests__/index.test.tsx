import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import HomePage from "..";

describe("HomePage Component", () => {

    const renderHomePage = () => {
        const {container} = render(<HomePage />);
        const homePageElement = container.querySelector(".home-page");
        return { container, homePageElement };
    }
    test("should render the home page", () => {
        // Add your test logic here
        const { homePageElement } = renderHomePage();
        expect(homePageElement).toBeTruthy();
    });
});