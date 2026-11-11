import { beforeEach, describe, expect, test, vi } from "vitest";
import { BlogModel } from "@/models/blogs.model";
import { getPublishedBlogCount, isPublishedBlogCountQuestion, getPublishedBlogs, isPublishedBlogsListQuestion } from "../published-blogs";

vi.mock("@/libs/db", () => ({ connectDB: vi.fn() }));
beforeEach(() => vi.restoreAllMocks());

describe("Complete published blog lists", () => {
    test.each([
        "how many total blogs written by vijay",
        "How many blogs has Vijay Ramesh Kumar written?",
        "How many published blog posts are there?",
        "What is the total number of blogs?",
        "Count of published blogs by Vijay Rameshkumar",
        "How many blogs have you published in total?",
    ])("recognizes complete blog count questions: %s", prompt => {
        expect(isPublishedBlogCountQuestion(prompt)).toBe(true);
    });

    test.each([
        "How many blogs about React?", "How many draft blogs?",
        "How many blogs written by Alice?", "How many blogs and certifications?",
        "How many blogs did Vijay write in 2025?", "List blogs",
    ])("does not replace filtered or compound counts: %s", prompt => {
        expect(isPublishedBlogCountQuestion(prompt)).toBe(false);
    });

    test("counts every published record and respects saved author variants without including drafts", async () => {
        await BlogModel.create(
            [...["Vijay Rameshkumar", "Vijay Ramesh Kumar", "vijay", "Alice"].map((author, index) => ({
                author, title: `Article ${index}`, slug: `article-${index}`,
                content: "Content", category: "Frontend", status: "published" as const,
            })), {
                author: "Vijay Rameshkumar", title: "Draft", slug: "draft",
                content: "Content", category: "Frontend", status: "draft" as const,
            }],
        );
        expect(await getPublishedBlogCount("how many total blogs written by vijay"))
            .toBe("Vijay has written 3 published blogs.");
        expect(await getPublishedBlogCount("How many blogs are there?"))
            .toBe("There are 4 published blogs.");
    });

    test("returns an explicit zero and singular count", async () => {
        expect(await getPublishedBlogCount("How many blogs written by Vijay?")).toBe("Vijay has written 0 published blogs.");
        await BlogModel.create({ title: "Article", slug: "article", content: "Content", category: "Frontend", status: "published" });
        expect(await getPublishedBlogCount("How many blogs has Vijay written?")).toBe("Vijay has written 1 published blog.");
        expect(await getPublishedBlogCount("How many blogs are there?")).toBe("There is 1 published blog.");
    });

    test("propagates count failures rather than returning a false zero", async () => {
        vi.spyOn(BlogModel, "countDocuments").mockImplementation(() => { throw new Error("Count unavailable"); });
        await expect(getPublishedBlogCount("How many blogs are there?")).rejects.toThrow("Count unavailable");
    });

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
