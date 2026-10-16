import { describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/react";
import LoginPage  from "../page";

vi.mock('next/navigation');

describe("Login  Page", () => {
    const renderSite = () => {
        const { container } = render(<LoginPage />);
        return container.querySelector(".cmp-login-page");
    };
    test("should render the site page correctly", () => {
        const sitePage = renderSite();
        expect(sitePage).toBeInTheDocument();
    });
});