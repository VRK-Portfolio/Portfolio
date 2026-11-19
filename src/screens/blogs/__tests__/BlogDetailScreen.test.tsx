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

    test("shows the article and sidebar shimmers before the blog detail is available", () => {
        hooks.detail.blogDetail = undefined;
        hooks.detail.isLoading = true;
        const { container, rerender } = render(<BlogDetailScreen />);
        const loading = screen.getByRole("status", { name: "Loading blog detail" });
        expect(loading.querySelector(".shimmer")).toBeInTheDocument();
        expect(loading).toHaveAttribute("aria-busy", "true");
        expect(screen.queryByRole("link")).not.toBeInTheDocument();

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
