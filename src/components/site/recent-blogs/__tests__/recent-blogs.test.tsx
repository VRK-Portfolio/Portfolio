import { render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { handlers, mockBlogListingData } from "@/mocks/recent-blogs";
import RecentBlogsComponent from "../recent-blogs";

const server = setupServer(...handlers);

describe("Recent Blogs Component", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => {
        server.resetHandlers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });
    afterAll(() => server.close());

    test("renders its section heading and custom styling", () => {
        const { container } = render(<RecentBlogsComponent className="custom-blogs" />);
        expect(container.querySelector("section")).toHaveClass("cmp-recent-blogs", "custom-blogs");
        expect(screen.getByRole("heading", { name: "Recent Blogs", level: 2 })).toBeInTheDocument();
    });

    test("renders updated content, images, populated skill names, dates and slug links", async () => {
        render(<RecentBlogsComponent />);
        await screen.findByRole("heading", { name: "Blog 1" });
        const cards = screen.getAllByRole("article");
        expect(cards).toHaveLength(mockBlogListingData.length);
        for (const [index, blog] of mockBlogListingData.entries()) {
            const card = within(cards[index]);
            expect(card.getByRole("heading", { name: blog.title, level: 3 })).toBeInTheDocument();
            expect(card.getByText(blog.content)).toBeInTheDocument();
            expect(card.getByRole("img")).toBeInTheDocument();
            for (const skill of blog.skills || []) {
                expect(card.getByText(skill.name)).toBeInTheDocument();
            }
            const link = card.getByRole("link");
            expect(link).toHaveAttribute("href", `/blogs/${blog.slug}`);
            expect(link).toHaveAttribute("target", "_blank");
            expect(link).toHaveAttribute("rel", "noopener noreferrer");
        }
        expect(within(cards[0]).getByText("1 June 2024")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "View More" })).not.toBeInTheDocument();
    });

    test("handles optional cover images, skills, timestamps and document IDs", async () => {
        server.use(http.get("*/api/blogs", () => HttpResponse.json({
            success: true,
            data: [{ title: "Minimal Blog", slug: "minimal-blog", category: "Frontend", content: "A simple blog." }],
        })));
        render(<RecentBlogsComponent />);
        expect(await screen.findByRole("heading", { name: "Minimal Blog" })).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByRole("link")).toHaveAttribute("href", "/blogs/minimal-blog");
    });

    test("truncates long content for the card preview", async () => {
        const content = "A long blog preview. ".repeat(30);
        server.use(http.get("*/api/blogs", () => HttpResponse.json({
            success: true, data: [{ ...mockBlogListingData[0], content }],
        })));
        render(<RecentBlogsComponent />);
        expect(await screen.findByText(`${content.slice(0, 300)}...`)).toBeInTheDocument();
    });

    test.each([
        { maxCount: 1, visible: 1, viewMore: true },
        { maxCount: 3, visible: 3, viewMore: true },
        { maxCount: 4, visible: 4, viewMore: false },
        { maxCount: 5, visible: 4, viewMore: false },
        { maxCount: undefined, visible: 4, viewMore: false },
    ])("shows $visible cards and correct View More state for maxCount=$maxCount", async ({ maxCount, visible, viewMore }) => {
        render(<RecentBlogsComponent maxCount={maxCount} />);
        await screen.findByRole("heading", { name: "Blog 1" });
        expect(screen.getAllByRole("article")).toHaveLength(visible);
        expect(!!screen.queryByRole("button", { name: "View More" })).toBe(viewMore);
    });

    test("updates the display limit when maxCount changes", async () => {
        const { rerender } = render(<RecentBlogsComponent maxCount={1} />);
        await screen.findByRole("heading", { name: "Blog 1" });
        expect(screen.queryByRole("heading", { name: "Blog 2" })).not.toBeInTheDocument();
        rerender(<RecentBlogsComponent maxCount={3} />);
        expect(screen.getByRole("heading", { name: "Blog 3" })).toBeInTheDocument();
        expect(screen.getAllByRole("article")).toHaveLength(3);
    });

    test("accepts an empty successful listing without reporting an error", async () => {
        const fetched = vi.fn();
        server.use(http.get("*/api/blogs", () => {
            fetched();
            return HttpResponse.json({ success: true, data: [] });
        }));
        render(<RecentBlogsComponent maxCount={3} />);
        await waitFor(() => expect(fetched).toHaveBeenCalled());
        expect(screen.queryByRole("article")).not.toBeInTheDocument();
        expect(screen.queryByText("Failed to fetch blogs")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "View More" })).not.toBeInTheDocument();
    });

    test.each([
        { name: "HTTP failure", response: () => HttpResponse.json({ success: false }, { status: 500 }) },
        { name: "API failure", response: () => HttpResponse.json({ success: false }, { status: 200 }) },
        { name: "malformed JSON", response: () => new HttpResponse("{") },
        { name: "invalid schema", response: () => HttpResponse.json({ success: true, data: [{ title: "Incomplete" }] }) },
    ])("reports and logs $name", async ({ response }) => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        server.use(http.get("*/api/blogs", response));
        render(<RecentBlogsComponent />);
        expect(await screen.findByText("Failed to fetch blogs")).toBeInTheDocument();
        expect(log).toHaveBeenCalledWith("Failed to fetch blogs:", expect.any(Error));
        expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });

    test("reports network rejections rather than leaving an unhandled promise", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Offline")));
        render(<RecentBlogsComponent />);
        expect(await screen.findByText("Failed to fetch blogs")).toBeInTheDocument();
        expect(log).toHaveBeenCalledWith("Failed to fetch blogs:", new TypeError("Offline"));
    });
});
