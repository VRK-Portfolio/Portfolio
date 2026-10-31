import { describe, expect, test } from "vitest";
import { BlogListingSchema, BlogsTypeSchema } from "../Blogs.types";
import { mockBlogListingData } from "@/mocks/recent-blogs";

const blog = {
    title: "Type-safe React",
    slug: "type-safe-react",
    category: "Frontend",
    content: "Building reliable React applications.",
};

describe("blog schemas", () => {
    test("accepts the updated creation fields and supplies default status and author", () => {
        expect(BlogsTypeSchema.parse(blog)).toEqual({
            ...blog,
            status: "draft",
            author: "Vijay Rameshkumar",
        });
    });

    test("accepts optional IDs, skill references, images, and string timestamps", () => {
        const data = {
            ...blog,
            _id: "507f1f77bcf86cd799439011",
            skills: ["507f1f77bcf86cd799439021"],
            status: "published",
            author: "Example Author",
            coverImage: "/images/blog.png",
            createdAt: "2026-10-31T00:00:00.000Z",
            updatedAt: "2026-10-31T01:00:00.000Z",
        };
        expect(BlogsTypeSchema.parse(data)).toEqual(data);
    });

    test.each(["title", "slug", "category", "content"] as const)("rejects a missing required %s", (field) => {
        const { [field]: omitted, ...incomplete } = blog;
        expect(omitted).toBeDefined();
        expect(BlogsTypeSchema.safeParse(incomplete).success).toBe(false);
    });

    test.each([
        { status: "archived" },
        { skills: [42] },
        { createdAt: new Date() },
        { coverImage: 42 },
    ])("rejects invalid updated fields: %j", (invalid) => {
        expect(BlogsTypeSchema.safeParse({ ...blog, ...invalid }).success).toBe(false);
    });

    test("validates populated listing skills while keeping creation skill IDs distinct", () => {
        expect(BlogListingSchema.array().parse(mockBlogListingData)).toEqual(mockBlogListingData);
        expect(BlogsTypeSchema.safeParse(mockBlogListingData[0]).success).toBe(false);
        expect(BlogListingSchema.safeParse({
            ...blog, skills: ["507f1f77bcf86cd799439021"],
        }).success).toBe(false);
        expect(BlogListingSchema.safeParse({
            ...blog, skills: [{ _id: "507f1f77bcf86cd799439021" }],
        }).success).toBe(false);
    });

    test("accepts an empty blog list", () => {
        expect(BlogListingSchema.array().parse([])).toEqual([]);
    });

    test("rejects the old blog shape instead of accepting missing new fields", () => {
        expect(BlogsTypeSchema.safeParse({
            id: 1,
            title: "Old Blog",
            description: "Old description",
            image_url: "/images/blog.png",
            technologies: ["React"],
            published_at: new Date(),
        }).success).toBe(false);
    });
});
