import { render, waitFor, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test, vi, afterEach } from "vitest";
import MySkillsComponent from "../My-Skills";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { mockMySkills } from "@/mocks/my-skills";
import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { MySkillsType } from "@/@types/MySkills.types";

const server = setupServer(
    http.get("*/api/my-skills", () => {
        return HttpResponse.json({
            data: mockMySkills,
            success: true,
            message: "Projects fetched successfully",
        });
    })
)
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

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
    const renderSkillComponent = () => {
        const {container} = render(<MySkillsComponent />);
        return container;
    };
   test("should render MySkillsComponent correctly", () => {
       const container = renderSkillComponent();
       expect(container).toBeTruthy();
   });

   test("should have a section Heading component", () => {
       const container = renderSkillComponent();
       const heading = container.querySelector("[data-testid='mocked-section-heading']");
       expect(heading)?.toBeTruthy();
   });

   test("should have atleast one skill item", async () => {
       const container = renderSkillComponent();
       await waitFor(() => container.querySelector("li.cmp-my-skills__list-item"));
       const listItem = container.querySelector("li.cmp-my-skills__list-item");
       expect(listItem).toBeTruthy();
   });

   test('does not set skills when API returns success = false', async () => {
    // Mock fetch returning success: false (clears the 'E' branch warning)
        server.use(
            http.get("*/api/my-skills", () => {
                return HttpResponse.json<ApiGetResponse<MySkillsType>>({
                    success: false,
                    error: "Failed to fetch my skills",
                }, { status: 500 });
            })
        );

    const container  = renderSkillComponent();

    await waitFor(() => {
      const listItem = container.querySelector("li.cmp-my-skills__list-item");
      expect(listItem).not.toBeTruthy();
    });

  });
});