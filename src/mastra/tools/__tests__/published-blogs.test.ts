import { beforeEach, describe, expect, test, vi } from "vitest";
import { BlogModel } from "@/models/blogs.model";
import { getPublishedBlogs, isPublishedBlogsListQuestion } from "../published-blogs";

vi.mock("@/libs/db", () => ({ connectDB: vi.fn() }));
beforeEach(() => vi.restoreAllMocks());

describe("Complete published blog lists", () => {
    test.each([
        "show me the list of blogs",
        "Show blogs",
        "List all blogs",
        "Could you show me all of your blog posts?",
        "Please give me the complete list of published blog articles.",
        "List Vijay Rameshkumar's blogs",
    ])("recognizes unfiltered listings: %s", prompt => {
        expect(isPublishedBlogsListQuestion(prompt)).toBe(true);
    });

    test.each([
        "Show React blogs", "List draft blogs", "List blogs and skills",
        "Summarize this blog", "Show blogs about MongoDB", "Show five blogs",
    ])("does not replace scoped or compound questions: %s", prompt => {
        expect(isPublishedBlogsListQuestion(prompt)).toBe(false);
    });

    test("returns all published titles with safe links, independent of vectors and embeddings", async () => {
        const published = Array.from({ length: 7 }, (_, index) => ({
            title: `Saved blog ${index}`, slug: `saved-blog-${index}`, content: "Saved content",
            category: "Frontend", status: "published" as const, createdAt: `2026-01-0${index + 1}T00:00:00.000Z`,
        }));
        await BlogModel.create([...published, {
            title: "Unpublished draft", slug: "unpublished-draft", content: "Private content",
            category: "Frontend", status: "draft" as const,
        }]);
        const result = await getPublishedBlogs();
        expect(result.text).toBe("Published blogs:");
        expect(result.blogs.map(blog => blog.title)).toEqual(published.map(blog => blog.title).reverse());
        expect(result.blogs).toHaveLength(7);
        for (const blog of result.blogs) {
            expect(Object.keys(blog).sort()).toEqual(["_id", "slug", "title"]);
        }
    });

    test("reports an empty published collection without fabricating links", async () => {
        expect(await getPublishedBlogs()).toEqual({ text: "No published blogs are recorded.", blogs: [] });
    });

    test("propagates database failures", async () => {
        vi.spyOn(BlogModel, "find").mockImplementation(() => { throw new Error("Database unavailable"); });
        await expect(getPublishedBlogs()).rejects.toThrow("Database unavailable");
    });
});
