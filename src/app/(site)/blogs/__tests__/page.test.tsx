import { screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { handlers, mockBlogListingData } from "@/mocks/recent-blogs";
import { renderWithQueryClient } from "@/tests/tan-query";
import BlogsPage from "../page";

const server = setupServer(...handlers);

describe("Blogs page", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("lists every published blog without a homepage limit and excludes drafts", async () => {
        server.use(http.get("*/api/blogs", () => HttpResponse.json({
            success: true,
            data: [
                { ...mockBlogListingData[0], _id: "draft", title: "Draft Blog", slug: "draft-blog", status: "draft" },
                ...mockBlogListingData,
                { ...mockBlogListingData[0], _id: "unspecified", title: "Unspecified Blog", slug: "unspecified-blog", status: undefined },
            ],
        })));
        const { container } = renderWithQueryClient(<BlogsPage />);
        const loading = screen.getByRole("status", { name: "Loading blogs" });
        expect(loading.querySelector(".shimmer")).toBeInTheDocument();
        await screen.findByRole("heading", { name: "Blog 1" });
        expect(await screen.findByRole("heading", { name: "Blogs", level: 1 })).toBeInTheDocument();
        expect(screen.queryByRole("status", { name: "Loading blogs" })).not.toBeInTheDocument();
        expect(screen.getAllByRole("article")).toHaveLength(mockBlogListingData.length);
        for (const blog of mockBlogListingData) {
            expect(screen.getByRole("heading", { name: blog.title })).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: blog.title }).closest("article")?.querySelector("a"))
                .toHaveAttribute("href", `/blogs/${blog.slug}`);
        }
        expect(screen.queryByRole("heading", { name: "Draft Blog" })).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Unspecified Blog" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "View More" })).not.toBeInTheDocument();
        const scripts = container.querySelectorAll('script[type="application/ld+json"]');
        expect(scripts).toHaveLength(1);
        expect(scripts[0].parentElement).toHaveAttribute("id", "Blogs");
        const data = JSON.parse(scripts[0].textContent!);
        expect(data["@graph"]).toContainEqual(expect.objectContaining({ "@type": "CollectionPage" }));
        expect(data["@graph"].filter((node: { "@type": string }) => node["@type"] === "BlogPosting")).toHaveLength(mockBlogListingData.length);
    });

    test("shows an empty state when no published blogs exist", async () => {
        server.use(http.get("*/api/blogs", () => HttpResponse.json({
            success: true,
            data: mockBlogListingData.map(blog => ({ ...blog, status: "draft" })),
        })));
        renderWithQueryClient(<BlogsPage />);
        expect(await screen.findByText("No published blogs yet.")).toBeInTheDocument();
        expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });

    test("reports listing failures instead of showing an empty state", async () => {
        server.use(http.get("*/api/blogs", () => HttpResponse.json({ success: false }, { status: 500 })));
        renderWithQueryClient(<BlogsPage />);
        expect(await screen.findByRole("alert")).toHaveTextContent("Failed to fetch blogs");
        expect(screen.queryByText("No published blogs yet.")).not.toBeInTheDocument();
    });
});
