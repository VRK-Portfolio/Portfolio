import { waitFor, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test, vi, afterEach } from "vitest";
import MySkillsComponent from "../My-Skills";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { mockMySkills, mySkillsHandlers } from "@/mocks/my-skills";
import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { MySkillsType } from "@/@types/MySkills.types";
import { renderWithQueryClient } from "@/tests/tan-query";

const server = setupServer(...mySkillsHandlers);
vi.mock('@/block/site/section-heading/section-heading', () => ({
  default: ({title, subtitle}: {title: string; subtitle?: string}) => (
            <div className="cmp-section-heading" data-testid="mocked-section-heading">
            <h2 className="cmp-section-heading__title">{title}</h2>
            {subtitle && (
                <p className="cmp-section-heading__subtitle">{subtitle}</p>
            )}
        </div>
  ),
}));
describe("MySkillsComponent", () => {

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
    const renderSkillComponent = () => renderWithQueryClient(<MySkillsComponent />);
   test("should show loading placeholders until skills load", async () => {
       const { container } = renderSkillComponent();
       expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
       expect(screen.queryByRole("heading", { name: mockMySkills[0].name })).not.toBeInTheDocument();

       await screen.findByRole("heading", { name: mockMySkills[0].name });
       expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
   });

   test("should have a section Heading component", async () => {
       renderSkillComponent();
       await screen.findByRole("heading", { name: mockMySkills[0].name });
       expect(screen.getByRole("heading", { name: "My Skills" })).toBeInTheDocument();
   });

   test("should display all fetched skills and their capabilities", async () => {
       renderSkillComponent();
       await screen.findByRole("heading", { name: mockMySkills[0].name });
       expect(screen.getAllByRole("listitem")).toHaveLength(mockMySkills.length);
       for (const skill of mockMySkills) {
           expect(screen.getByRole("heading", { name: skill.name })).toBeInTheDocument();
           expect(screen.getByRole("img", { name: `${skill.name} Skill Icon` })).toBeInTheDocument();
           for (const capability of skill.capabilities) {
               expect(screen.getByText(capability)).toBeInTheDocument();
           }
       }
   });

   test.each([200, 500])('does not set skills when API returns success = false with status %i', async (status) => {
        server.use(
            http.get("*/api/my-skills", () => {
                return HttpResponse.json<ApiGetResponse<MySkillsType[]>>({
                    success: false,
                    error: "Failed to fetch my skills",
                }, { status });
            })
        );

    const { container, queryClient } = renderSkillComponent();

    await waitFor(() => {
      expect(queryClient.getQueryState(["skills"])?.status).toBe("error");
      expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);

  });
});