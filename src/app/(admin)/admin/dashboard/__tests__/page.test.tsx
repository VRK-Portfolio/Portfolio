import { renderWithQueryClient } from "@/tests/tan-query";
import Dashboard from "../page";
import { describe, expect, test } from "vitest";

describe("Admin Dashboard Page", () => {
    test("should render the admin dashboard page and load its content", async () => {
        const { container } = renderWithQueryClient(<Dashboard />);
        expect(container.querySelector("h1")).toHaveTextContent("Admin Dashboard Page");
    });
});
