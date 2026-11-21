import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import Home from "../page";
import { render, screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import { QueryProvider } from "@/providers/QueryProvider";
import { getHomepageData } from "@/libs/public-data";
import basicInfoHandlers, { basicInfoMock } from "@/mocks/basic-info";
import { mySkillsHandlers, mockMySkills } from "@/mocks/my-skills";
import { handlers as projectHandlers } from "@/mocks/project-listing";
import { handlers as blogHandlers } from "@/mocks/recent-blogs";
import { certificationHandlers, mockCertifications } from "@/mocks/certifications";
import { mockBlogListingData } from "@/mocks/recent-blogs";

vi.mock("@/libs/public-data", () => ({ getHomepageData: vi.fn() }));

const server = setupServer(...basicInfoHandlers, ...mySkillsHandlers, ...projectHandlers, ...blogHandlers, ...certificationHandlers);

describe("Site Page", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    beforeEach(() => vi.mocked(getHomepageData).mockResolvedValue({
        skills: mockMySkills, certifications: mockCertifications, blogs: mockBlogListingData,
        experiences: [{
            company: "Example Company", location: "Remote", responsibilites: ["Frontend"],
            positions: [{ role: "Engineer", startDate: new Date("2020-01-01"), isCurrentPosition: true, description: "Building accessible apps." }],
        }],
    }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("renders preloaded section content immediately while retaining profile loading", async () => {
        const { container } = render(<QueryProvider>{await Home()}</QueryProvider>);
        expect(container.querySelector(".home-page")).toBeInTheDocument();

        const content = await Promise.all([
            screen.findByRole("heading", { name: `${basicInfoMock[0].name} - Mastra AI & EDS Frontend Engineer` }),
            screen.findByText(mockMySkills[0].name, { selector: ".cmp-my-skills__list-item-title" }),
            screen.findByText("Example Company"),
            screen.findByText("Blog 1"),
            screen.findByRole("heading", { name: mockCertifications[0].title }),
        ]);
        for (const element of content) {
            expect(element).toBeInTheDocument();
        }
        expect(screen.queryByRole("status", { name: "Loading experience" })).not.toBeInTheDocument();
    });
});