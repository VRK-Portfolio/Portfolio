import { render, waitFor, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import RecentBlogsComponent from "../recent-blogs";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { mockBlogListingData } from "@/mocks/recent-blogs";
import { BlogType } from "@/@types/Blogs.types";
import { ApiGetResponse } from "@/@types/ApiResponse.types";

const server = setupServer(
    http.get("*/api/blogs", () => {
        return HttpResponse.json({
            data: mockBlogListingData,
            success: true,
            message: "Blogs fetched successfully",
        });
    })
);
describe('Recent Blogs Component', () => {
    beforeAll(() => {
        server.listen();
    });

    afterEach(() => {
        server.resetHandlers();
    });

    afterAll(() => {
        server.close();
    });

    const renderRecentBlogs = () => {
        const { container } = render(<RecentBlogsComponent maxCount={3} />);
        const recentBlogs = container.querySelector('.cmp-recent-blogs') as HTMLElement;
        return {recentBlogs};
    }

    test("should render the recent blogs component", () => {
        const { recentBlogs } = renderRecentBlogs();
        expect(recentBlogs).toBeInTheDocument();
    });

    test("fetch and display all blogs with correct heading", async () => {
        renderRecentBlogs();

        await waitFor(() => {
            expect(screen.getByText("Blog 1")).toBeInTheDocument();
            expect(screen.getByText("Blog 2")).toBeInTheDocument();
        })
    })


    test("technology for a project should be minimum of one", async () => {
        const { recentBlogs } = renderRecentBlogs();
        await waitFor(() => {
            const badges = recentBlogs.querySelectorAll('.cmp-badge') as NodeListOf<HTMLElement>;
            expect(badges?.length).not.toBe(0);
        });
    });

    test("each project should have a link", async () => {
        const { recentBlogs } = renderRecentBlogs();
        await waitFor(() => {
            const links = recentBlogs.querySelectorAll('.cmp-card .cmp-card-footer a') as NodeListOf<HTMLElement>;
            const url = links[0]?.getAttribute('href');
            expect(url).toBeTruthy();
        });
    });

    test("on error should display an error message", async () => {
        server.use(
            http.get("*/api/blogs", () => {
                return HttpResponse.json<ApiGetResponse<BlogType>>({
                    success: false,
                    error: "Failed to fetch blogs",
                }, { status: 500 });
            })
        );

        renderRecentBlogs();
        const errorEl = await screen.findByText("Failed to fetch blogs");
        expect(errorEl).toBeInTheDocument();
        expect(errorEl).toHaveTextContent("Failed to fetch blogs");
    });

    test("display error message when API returns an empty data", async () => {
        server.use(
            http.get("*/api/blogs", () => {
                return HttpResponse.json<ApiGetResponse<BlogType>>({
                    success: false,
                    error: "Failed to fetch blogs",
                }, { status: 200 });
            })
        );

        renderRecentBlogs();
        const errorEl = await screen.findByText("Failed to fetch blogs");
        expect(errorEl).toBeInTheDocument();
        expect(errorEl).toHaveTextContent("Failed to fetch blogs");
    });

    test("should respect the maxCount prop", async () => {
        render(<RecentBlogsComponent maxCount={1} />);
        await waitFor(() => {
            expect(screen.getByText("Blog 1")).toBeInTheDocument();
            expect(screen.queryByText("Blog 2")).not.toBeInTheDocument();
        });
    });

    test("show view more button when blogs exceed maxCount", async () => {
        render(<RecentBlogsComponent maxCount={1} />);
        await waitFor(() => {
            const viewMoreButton = screen.getByText("View More");
            expect(viewMoreButton).toBeInTheDocument();
        });
    });

    test("don't show view more button when blogs do not exceed maxCount", async () => {
        render(<RecentBlogsComponent maxCount={3} />);
        await waitFor(() => {
            const viewMoreButton = screen.queryByText("View More");
            expect(viewMoreButton).not.toBeInTheDocument();
        });
    });

    test("should show all the blogs if the maxCount is not specified", async () => {
        render(<RecentBlogsComponent />);
        await waitFor(() => {
            expect(screen.getByText("Blog 1")).toBeInTheDocument();
            expect(screen.getByText("Blog 2")).toBeInTheDocument();
        });
    });
});