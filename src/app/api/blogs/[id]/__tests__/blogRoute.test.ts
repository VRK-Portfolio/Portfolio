import { cookies } from "next/headers";
import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BlogModel } from "@/models/blogs.model";
import { GET, PUT, DELETE } from "../route";

const { connectDB } = vi.hoisted(() => ({ connectDB: vi.fn() }));
vi.mock("@/libs/db", () => ({ connectDB }));

const blog = {
    title: "Original blog", slug: "original-blog", category: "Frontend",
    content: "<p>Original content</p>", createdAt: "2026-01-01T00:00:00.000Z",
};
const request = (method: string, data?: unknown) => new Request("http://localhost/api/blogs/test", {
    method,
    ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
});
const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe("Blog update and delete API", () => {
    beforeEach(() => {
        connectDB.mockReset();
        connectDB.mockResolvedValue(undefined);
    });
    afterEach(() => vi.restoreAllMocks());

    test("registers and populates skills when the blog route is loaded independently", async () => {
        expect(mongoose.modelNames()).toContain("MySkills");
        const skill = await mongoose.model("MySkills").create({
            name: "React", icon: "/react.svg", category: "Frontend",
            capabilities: ["Components"], proficiency: "Advanced",
        });
        await BlogModel.create({ ...blog, skills: [String(skill._id)] });
        const response = await GET(request("GET"), context(blog.slug));
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            success: true,
            data: { slug: blog.slug, skills: [{ _id: String(skill._id), name: "React" }] },
        });
    });

    test("updates all editable fields while preserving identity and creation time", async () => {
        const saved = await BlogModel.create(blog);
        const other = await BlogModel.create({ ...blog, slug: "other-blog" });
        const skillId = String(new mongoose.Types.ObjectId());
        const updated = {
            ...blog, title: " Updated blog ", slug: "updated-blog", content: "<p><strong>Updated content</strong></p>",
            skills: [skillId], status: "published", author: "Another author", coverImage: "/images/new.png",
            _id: String(other._id), createdAt: "2000-01-01", updatedAt: "2000-01-01",
        };
        const response = await PUT(request("PUT", updated), context(String(saved._id)));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, message: "Blog updated successfully" });
        const result = await BlogModel.findById(saved._id).orFail();
        expect(result).toMatchObject({
            title: "Updated blog", slug: "updated-blog", content: updated.content,
            status: "published", author: updated.author, coverImage: updated.coverImage,
            createdAt: blog.createdAt,
        });
        expect(result.skills?.map(String)).toEqual([skillId]);
        expect(result.updatedAt).not.toBe("2000-01-01");
        expect((await BlogModel.findById(other._id).orFail()).title).toBe(blog.title);
    });

    test.each([
        { title: " " }, { slug: "Bad Slug" }, { category: "" },
        { content: "<p><br></p>" }, { status: "archived" }, { skills: ["invalid"] },
    ])("rejects invalid updates without modifying the blog: %j", async invalid => {
        const saved = await BlogModel.create(blog);
        const response = await PUT(request("PUT", { ...blog, ...invalid }), context(String(saved._id)));
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ success: false, errors: expect.any(Array) });
        expect(connectDB).not.toHaveBeenCalled();
        expect((await BlogModel.findById(saved._id).orFail()).content).toBe(blog.content);
    });

    test("deletes only the selected blog", async () => {
        const first = await BlogModel.create(blog);
        const second = await BlogModel.create({ ...blog, slug: "second-blog" });
        const response = await DELETE(request("DELETE"), context(String(first._id)));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, message: "Blog deleted successfully" });
        expect(await BlogModel.findById(first._id)).toBeNull();
        expect(await BlogModel.findById(second._id)).not.toBeNull();
    });

    test.each(["PUT", "DELETE"] as const)("%s validates IDs and reports missing records", async method => {
        const handler = method === "PUT" ? PUT : DELETE;
        const invalid = await handler(request(method, method === "PUT" ? blog : undefined), context("invalid"));
        expect(invalid.status).toBe(400);
        expect(connectDB).not.toHaveBeenCalled();
        const missing = await handler(request(method, method === "PUT" ? blog : undefined), context(String(new mongoose.Types.ObjectId())));
        expect(missing.status).toBe(404);
        expect(await missing.json()).toEqual({ success: false, error: "Blog not found" });
    });

    test.each(["PUT", "DELETE"] as const)("%s requires authentication and exposes database errors", async method => {
        const handler = method === "PUT" ? PUT : DELETE;
        const id = String(new mongoose.Types.ObjectId());
        connectDB.mockRejectedValueOnce(new Error("Database unavailable"));
        const failed = await handler(request(method, method === "PUT" ? blog : undefined), context(id));
        expect(failed.status).toBe(500);
        expect(await failed.json()).toMatchObject({ success: false, error: "Database unavailable" });
        const store = await cookies();
        vi.spyOn(store, "get").mockReturnValue(undefined);
        connectDB.mockClear();
        expect((await handler(request(method, method === "PUT" ? blog : undefined), context(id))).status).toBe(401);
        expect(connectDB).not.toHaveBeenCalled();
    });

    test("rejects malformed JSON as a bad request", async () => {
        const response = await PUT(new Request("http://localhost/api/blogs/test", {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: "{",
        }), context(String(new mongoose.Types.ObjectId())));
        expect(response.status).toBe(400);
        expect(connectDB).not.toHaveBeenCalled();
    });
});
