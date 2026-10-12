import { render, waitFor, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import ProjectListingComponent from "../project-listing";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { mockProjectListingData } from "@/mocks/project-listing";
import { ProjectType } from "@/@types/Projects.types";
import { ApiGetResponse } from "@/@types/ApiResponse.types";

const server = setupServer(
    http.get("*/api/projects", () => {
        return HttpResponse.json({
            data: mockProjectListingData,
            success: true,
            message: "Projects fetched successfully",
        });
    })
);
describe('Project Listing Component', () => {
    beforeAll(() => {
        server.listen();
    });

    afterEach(() => {
        server.resetHandlers();
    });

    afterAll(() => {
        server.close();
    });

    const renderProductListing = () => {
        const { container } = render(<ProjectListingComponent />);
        const productListing = container.querySelector('.cmp-project-listing') as HTMLElement;
        return {productListing};
    }

    test("should render the project listing component", () => {
        const { productListing } = renderProductListing();
        expect(productListing).toBeInTheDocument();
    });

    test("fetch and display all projects with correct heading", async () => {
        renderProductListing();

        await waitFor(() => {
            expect(screen.getByText("Project 1")).toBeInTheDocument();
            expect(screen.getByText("Project 2")).toBeInTheDocument();
        })
    })


    test("technology for a project should be minimum of one", async () => {
        const { productListing } = renderProductListing();
        await waitFor(() => {
            const badges = productListing.querySelectorAll('.cmp-badge') as NodeListOf<HTMLElement>;
            expect(badges?.length).not.toBe(0);
        });
    });

    test("each project should have a link", async () => {
        const { productListing } = renderProductListing();
        await waitFor(() => {
            const links = productListing.querySelectorAll('.cmp-card .cmp-card-footer a') as NodeListOf<HTMLElement>;
            const url = links[0]?.getAttribute('href');
            expect(url).toBeTruthy();
        });
    });

    test("on error should display an error message", async () => {
        server.use(
            http.get("*/api/projects", () => {
                return HttpResponse.json<ApiGetResponse<ProjectType>>({
                    success: false,
                    error: "Failed to fetch projects",
                }, { status: 500 });
            })
        );

        renderProductListing();
        const errorEl = await screen.findByText("Failed to fetch projects");
        expect(errorEl).toBeInTheDocument();
        expect(errorEl).toHaveTextContent("Failed to fetch projects");
    });

    test("display error message when API returns an empty data", async () => {
        server.use(
            http.get("*/api/projects", () => {
                return HttpResponse.json<ApiGetResponse<ProjectType>>({
                    success: false,
                    error: "Failed to fetch projects",
                }, { status: 200 });
            })
        );

        renderProductListing();
        const errorEl = await screen.findByText("Failed to fetch projects");
        expect(errorEl).toBeInTheDocument();
        expect(errorEl).toHaveTextContent("Failed to fetch projects");
    });

    test("should respect the maxCount prop", async () => {
        render(<ProjectListingComponent maxCount={1} />);
        await waitFor(() => {
            expect(screen.getByText("Project 1")).toBeInTheDocument();
            expect(screen.queryByText("Project 2")).not.toBeInTheDocument();
        });
    });

    test("show view more button when projects exceed maxCount", async () => {
        render(<ProjectListingComponent maxCount={1} />);
        await waitFor(() => {
            const viewMoreButton = screen.getByText("View More");
            expect(viewMoreButton).toBeInTheDocument();
        });
    });

    test("don't show view more button when projects do not exceed maxCount", async () => {
        render(<ProjectListingComponent maxCount={3} />);
        await waitFor(() => {
            const viewMoreButton = screen.queryByText("View More");
            expect(viewMoreButton).not.toBeInTheDocument();
        });
    });
});