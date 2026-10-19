import { afterAll, afterEach, beforeAll, describe, test, expect } from "vitest";
import { screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import HomePage from "..";
import { renderWithQueryClient } from "@/tests/tan-query";
import basicInfoHandlers, { basicInfoMock } from "@/mocks/basic-info";
import { mySkillsHandlers, mockMySkills } from "@/mocks/my-skills";
import { handlers as projectHandlers } from "@/mocks/project-listing";
import { handlers as blogHandlers } from "@/mocks/recent-blogs";

const server = setupServer(...basicInfoHandlers, ...mySkillsHandlers, ...projectHandlers, ...blogHandlers);

describe("HomePage Component", () => {

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("should render the home page and load all sections", async () => {
        const { container } = renderWithQueryClient(<HomePage />);
        expect(container.querySelector(".home-page")).toBeInTheDocument();

        const content = await Promise.all([
            screen.findByRole("heading", { name: basicInfoMock[0].name }),
            screen.findByRole("heading", { name: mockMySkills[0].name }),
            screen.findByText("Project 1"),
            screen.findByText("Blog 1"),
        ]);
        for (const element of content) {
            expect(element).toBeInTheDocument();
        }
    });
});