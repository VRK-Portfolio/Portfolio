import { describe, expect, test, vi } from "vitest";
import { BlogModel } from "@/models/blogs.model";
import { MySkillsModel } from "@/models/my-skills.model";
import { getPublishedBlog, getPublishedBlogs } from "../public-data";

const post = {
    title: "Mastra AI guide", slug: "mastra-ai-guide", category: "AI",
    content: "<p>Build a Mastra AI agent.</p>", status: "published",
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z",
} as const;

describe("Server public blog reads", () => {
    test("returns only published articles with populated skill names, serializable IDs, and parsed dates", async () => {
        const skill = await MySkillsModel.create({ name: "TypeScript", icon: "/icon.svg", category: "Frontend", capabilities: ["Types"], proficiency: "Expert" });
        await BlogModel.create([
            { ...post, skills: [skill._id] },
            { ...post, slug: "draft-guide", status: "draft" },
        ]);
        const blogs = await getPublishedBlogs();
        expect(blogs).toHaveLength(1);
        expect(blogs[0]).toMatchObject({
            slug: post.slug, skills: [{ _id: String(skill._id), name: "TypeScript" }],
            createdAt: new Date(post.createdAt), updatedAt: new Date(post.updatedAt),
        });
        expect(typeof blogs[0]._id).toBe("string");
        expect(await getPublishedBlog("draft-guide")).toBeNull();
        expect(await getPublishedBlog("missing-guide")).toBeNull();
        expect(await getPublishedBlog(post.slug)).toMatchObject({ title: post.title });
    });

    test("surfaces query errors rather than serving an empty public list", async () => {
        const spy = vi.spyOn(BlogModel, "find").mockImplementationOnce(() => { throw new Error("Blog database unavailable"); });
        try {
            await expect(getPublishedBlogs()).rejects.toThrow("Blog database unavailable");
        } finally {
            spy.mockRestore();
        }
    });
});
