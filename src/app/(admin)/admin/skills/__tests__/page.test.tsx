import { renderWithQueryClient } from "@/tests/tan-query";
import Skills from "../page";
import { describe, expect, test } from "vitest";

describe("Admin Skills Page", () => {
    test("should render the admin skills page and load its content", async () => {
        const { container } = renderWithQueryClient(<Skills />);
        expect(container).toBeTruthy();
    });
});
