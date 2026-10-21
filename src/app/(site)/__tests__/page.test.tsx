import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import Home from "../page";
import { screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import { renderWithQueryClient } from "@/tests/tan-query";
import basicInfoHandlers, { basicInfoMock } from "@/mocks/basic-info";
import { mySkillsHandlers, mockMySkills } from "@/mocks/my-skills";
import { handlers as projectHandlers } from "@/mocks/project-listing";
import { handlers as blogHandlers } from "@/mocks/recent-blogs";
import { certificationHandlers, mockCertifications } from "@/mocks/certifications";

const server = setupServer(...basicInfoHandlers, ...mySkillsHandlers, ...projectHandlers, ...blogHandlers, ...certificationHandlers);

describe("Site Page", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("should render the site page and load its content", async () => {
        const { container } = renderWithQueryClient(<Home />);
        expect(container.querySelector(".home-page")).toBeInTheDocument();

        const content = await Promise.all([
            screen.findByRole("heading", { name: basicInfoMock[0].name }),
            screen.findByRole("heading", { name: mockMySkills[0].name }),
            screen.findByText("Project 1"),
            screen.findByText("Blog 1"),
            screen.findByRole("heading", { name: mockCertifications[0].title }),
        ]);
        for (const element of content) {
            expect(element).toBeInTheDocument();
        }
    });
});