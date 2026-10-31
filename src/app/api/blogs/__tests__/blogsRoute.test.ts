import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BlogListingSchema } from "@/@types/Blogs.types";
import { BlogModel } from "@/models/blogs.model";
import { MySkillsModel } from "@/models/my-skills.model";
import { mockMySkills } from "@/mocks/my-skills";
import { GET, POST } from "../route";

const { connectDB } = vi.hoisted(() => ({ connectDB: vi.fn() }));
vi.mock("@/libs/db", () => ({ connectDB }));

const blog = {
    title: "Type-safe React",
    slug: "type-safe-react",
    category: "Frontend",
    content: "Building reliable React applications.",
};
const context = { params: Promise.resolve({}) };
const createRequest = (data: unknown) => new Request("http://localhost:3000/api/blogs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
});

describe("Blog API routes", () => {
    beforeEach(() => {
        connectDB.mockReset();
        connectDB.mockResolvedValue(undefined);
    });
    afterEach(() => vi.restoreAllMocks());

    test("creates a blog using the updated required fields and model defaults", async () => {
        const response = await POST(createRequest(blog), context);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, message: "Blog created successfully" });
        const saved = await BlogModel.findOne({ slug: blog.slug }).orFail();
        expect(saved.title).toBe(blog.title);
        expect(saved.content).toBe(blog.content);
        expect(saved.status).toBe("draft");
        expect(saved.author).toBe("Vijay Rameshkumar");
    });

    test("lists populated skill names and serialized document IDs", async () => {
        const skill = await MySkillsModel.create(mockMySkills[0]);
        await BlogModel.create({
            ...blog,
            skills: [String(skill._id)],
            status: "published",
            coverImage: "/images/blog.png",
            createdAt: "2026-10-31T00:00:00.000Z",
        });
        const response = await GET();
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).toMatchObject({
            ...blog,
            _id: expect.any(String),
            skills: [{ _id: String(skill._id), name: skill.name }],
            coverImage: "/images/blog.png",
            createdAt: "2026-10-31T00:00:00.000Z",
        });
        expect(BlogListingSchema.array().safeParse(body.data).success).toBe(true);
    });

    test("returns an empty successful listing when no blogs exist", async () => {
        const response = await GET();
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true, data: [], message: "Blogs fetched successfully",
        });
        expect(connectDB).toHaveBeenCalledTimes(1);
    });

    test.each([
        { title: "Old Blog", description: "An old blog shape", id: 1 },
        { ...blog, status: "archived" },
        { ...blog, skills: [42] },
    ])("rejects invalid request fields without saving: %j", async (data) => {
        const response = await POST(createRequest(data), context);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
            success: false, error: "Invalid request body", errors: expect.any(Array),
        });
        expect(connectDB).not.toHaveBeenCalled();
        expect(await BlogModel.countDocuments()).toBe(0);
    });

    test("checks referenced skill IDs before database access", async () => {
        const response = await POST(createRequest({ ...blog, skills: ["invalid"] }), context);
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ success: false, error: "Invalid skill ID" });
        expect(connectDB).not.toHaveBeenCalled();
    });

    test("exposes listing database errors instead of returning an empty success", async () => {
        connectDB.mockRejectedValueOnce(new Error("Database unavailable"));
        const response = await GET();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ success: false, error: "Database unavailable" });
    });

    test("requires authentication before creating a blog", async () => {
        const store = await cookies();
        vi.spyOn(store, "get").mockReturnValue(undefined);
        const response = await POST(createRequest(blog), context);
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ success: false, error: "Unauthorized" });
        expect(connectDB).not.toHaveBeenCalled();
    });
});
