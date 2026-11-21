import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { BlogListingType } from "@/@types/Blogs.types";
import { mockBlogListingData } from "@/mocks/recent-blogs";
import BlogDetailScreen from "../BlogDetailScreen";

const hooks = vi.hoisted(() => ({
    detail: {
        blogDetail: undefined as BlogListingType | undefined,
        isLoading: false,
        isError: false,
        error: null as Error | null,
    },
    listing: {
        blogs: undefined as BlogListingType[] | undefined,
        isLoading: false,
        isError: false,
        error: null as Error | null,
    },
}));

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "blog-1" }) }));
vi.mock("@/hooks/useBlogListing", () => ({
    useBlogById: () => hooks.detail,
    useBlogListing: () => hooks.listing,
}));

describe("Blog detail loading", () => {
    beforeEach(() => {
        hooks.detail = { blogDetail: mockBlogListingData[0], isLoading: false, isError: false, error: null };
        hooks.listing = { blogs: mockBlogListingData.slice(1), isLoading: false, isError: false, error: null };
    });

    test("keeps the article schema inside the detail component and excludes drafts", () => {
        const { container, rerender } = render(<BlogDetailScreen />);
        const script = container.querySelector('.cmp-blog-detail .container script[type="application/ld+json"]')!;
        const data = JSON.parse(script.textContent!);
        expect(data["@graph"][0]).toMatchObject({ "@type": "BlogPosting", headline: "Blog 1" });
        const share = screen.getByRole("link", { name: /^Share on LinkedIn/ });
        expect(new URL(share.getAttribute("href")!).searchParams.get("url")).toBe(`https://www.vijayrameshkumar.dev/blogs/${mockBlogListingData[0].slug}`);
        hooks.detail.blogDetail = { ...mockBlogListingData[0], status: "draft" };
        rerender(<BlogDetailScreen />);
        expect(container.querySelector('script[type="application/ld+json"]')).not.toBeInTheDocument();
        expect(screen.queryByRole("navigation", { name: "Share this page" })).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Blog 1", level: 1 })).toBeInTheDocument();
    });

    test("shows the article and sidebar shimmers before the blog detail is available", () => {
        hooks.detail.blogDetail = undefined;
        hooks.detail.isLoading = true;
        const { container, rerender } = render(<BlogDetailScreen />);
        const loading = screen.getByRole("status", { name: "Loading blog detail" });
        expect(loading.querySelector(".shimmer")).toBeInTheDocument();
        expect(loading).toHaveAttribute("aria-busy", "true");
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
        expect(container.querySelector('script[type="application/ld+json"]')).not.toBeInTheDocument();

        hooks.detail.blogDetail = mockBlogListingData[0];
        hooks.detail.isLoading = false;
        rerender(<BlogDetailScreen />);
        expect(screen.getByRole("heading", { name: "Blog 1", level: 1 })).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(container.querySelector(".shimmer")).not.toBeInTheDocument();
    });

    test("loads similar blogs independently without hiding the article", () => {
        hooks.listing.blogs = undefined;
        hooks.listing.isLoading = true;
        const { rerender } = render(<BlogDetailScreen />);
        expect(screen.getByRole("heading", { name: "Blog 1", level: 1 })).toBeInTheDocument();
        expect(screen.getByRole("status", { name: "Loading similar blogs" }).querySelector(".shimmer")).toBeInTheDocument();

        hooks.listing.blogs = mockBlogListingData.slice(1);
        hooks.listing.isLoading = false;
        rerender(<BlogDetailScreen />);
        expect(screen.getAllByRole("article")).toHaveLength(3);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    test("replaces the article shimmer with an error if loading fails without data", () => {
        hooks.detail.blogDetail = undefined;
        hooks.detail.isLoading = true;
        const { rerender } = render(<BlogDetailScreen />);
        hooks.detail.isLoading = false;
        hooks.detail.isError = true;
        hooks.detail.error = new Error("Blog unavailable");
        rerender(<BlogDetailScreen />);
        expect(screen.getByRole("alert")).toHaveTextContent("Blog unavailable");
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    test("replaces the similar blogs shimmer with an error without hiding the article", () => {
        hooks.listing.blogs = undefined;
        hooks.listing.isLoading = true;
        const { rerender } = render(<BlogDetailScreen />);
        hooks.listing.isLoading = false;
        hooks.listing.isError = true;
        hooks.listing.error = new Error("Similar blogs unavailable");
        rerender(<BlogDetailScreen />);
        expect(screen.getByRole("alert")).toHaveTextContent("Similar blogs unavailable");
        expect(screen.getByRole("heading", { name: "Blog 1", level: 1 })).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
});
