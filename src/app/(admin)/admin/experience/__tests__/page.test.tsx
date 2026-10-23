import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { renderWithQueryClient } from "@/tests/tan-query";
import ExperiencePage from "../page";

const server = setupServer(http.get("*/api/experience", () => HttpResponse.json({
    success: true,
    data: [{
        _id: "507f1f77bcf86cd799439011",
        company: "Example Company",
        location: "Remote",
        responsibilites: ["Architecture"],
        positions: [{
            role: "Engineer",
            startDate: "2024-02-29",
            isCurrentPosition: true,
            description: "Building applications.",
        }],
    }],
})));

describe("Admin experience page", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("renders its screen, loads experience entries and offers management actions", async () => {
        renderWithQueryClient(<ExperiencePage />);
        expect(screen.getByRole("heading", { name: "Admin Experience" })).toBeInTheDocument();
        expect(await screen.findByRole("heading", { name: "Example Company" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add Experience" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
        expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
    });
});
