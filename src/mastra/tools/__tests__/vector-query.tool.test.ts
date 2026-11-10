import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { customVectorQueryTool } from "../vector-query.tool";
import { RequestContext } from "@mastra/core/request-context";

const mocks = vi.hoisted(() => ({
    connectDB: vi.fn(), embed: vi.fn(), vectors: vi.fn(), blogs: vi.fn(), currentBlog: vi.fn(), portfolioSkills: vi.fn(), certificationIssueDate: vi.fn(), skillCapabilities: vi.fn(),
}));
vi.mock("@/libs/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/vector-store.model", () => ({ VectorStoreModel: { find: mocks.vectors } }));
vi.mock("@/models/blogs.model", () => ({ BlogModel: { find: mocks.blogs, findOne: mocks.currentBlog } }));
vi.mock("ai", () => ({ embed: mocks.embed }));
vi.mock("ollama-ai-provider-v2", () => ({ ollama: { embedding: () => "nomic-embed-text" } }));
vi.mock("../portfolio-skills", async importOriginal => ({
    ...await importOriginal<typeof import("../portfolio-skills")>(),
    getPortfolioSkills: mocks.portfolioSkills,
}));
vi.mock("../certification-issue-date", async importOriginal => ({
    ...await importOriginal<typeof import("../certification-issue-date")>(),
    getCertificationIssueDate: mocks.certificationIssueDate,
}));
vi.mock("../skill-capabilities", async importOriginal => ({
    ...await importOriginal<typeof import("../skill-capabilities")>(),
    getSkillCapabilities: mocks.skillCapabilities,
}));

const firstId = "507f1f77bcf86cd799439011";
const secondId = "507f1f77bcf86cd799439012";
const blog = {
    _id: firstId, title: "React patterns", slug: "react-patterns",
    content: "<p>Components &amp; hooks.</p>", coverImage: "/images/react.png", skills: [{ name: "React" }],
};
const vector = (id: string, chunk = 0, embedding = [1, 0]) => ({
    docId: `blogs:${id}:${chunk}`, source: "blogs", text: `Blog ${id} chunk ${chunk}`, vector: embedding,
});
function queryResult(records: unknown) {
    const query = { select: vi.fn(), populate: vi.fn(), lean: vi.fn(), exec: vi.fn().mockResolvedValue(records) };
    query.select.mockReturnValue(query);
    query.populate.mockReturnValue(query);
    query.lean.mockReturnValue(query);
    return query;
}
const runQuery = (options: {
    currentBlog?: boolean; slug?: string; detail?: "all" | "skills"; includeBlogLinks?: boolean; query?: string; userPrompt?: string;
} = {}) => {
    const requestContext = new RequestContext();
    if (options.slug) requestContext.set("currentBlogSlug", options.slug);
    if (options.userPrompt) requestContext.set("userPrompt", options.userPrompt);
    return customVectorQueryTool.execute?.({
        query: options.query ?? "React blogs", currentBlog: options.currentBlog,
        detail: options.detail, includeBlogLinks: options.includeBlogLinks,
    }, { requestContext });
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.embed.mockResolvedValue({ embedding: [1, 0] });
    mocks.portfolioSkills.mockResolvedValue("- JavaScript\n- TypeScript\n- ReactJS\n- NextJS\n- NodeJS\n- Docker");
    vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("Blog retrieval links and current article details", () => {
    test("returns only one published blog title link for multiple matching chunks", async () => {
        mocks.vectors.mockReturnValue(queryResult([vector(firstId), vector(firstId, 1)]));
        const query = queryResult([blog]);
        mocks.blogs.mockReturnValue(query);
        expect(await runQuery({ includeBlogLinks: true })).toEqual({
            success: true,
            matches: [`Blog ${firstId} chunk 0`, `Blog ${firstId} chunk 1`],
            blogs: [{
                _id: firstId, title: blog.title, slug: blog.slug,
            }],
        });
        expect(mocks.blogs).toHaveBeenCalledWith({ _id: { $in: [firstId] }, status: "published" });
        expect(query.populate).toHaveBeenCalledWith({ path: "skills", select: "name" });
    });

    test("preserves similarity order rather than database result order", async () => {
        mocks.vectors.mockReturnValue(queryResult([vector(firstId), vector(secondId, 0, [0.8, 0.6])]));
        mocks.blogs.mockReturnValue(queryResult([{ ...blog, _id: secondId, slug: "second" }, blog]));
        expect(await runQuery({ includeBlogLinks: true })).toMatchObject({ blogs: [{ _id: firstId }, { _id: secondId }] });
    });

    test("removes deleted or unpublished blog chunks but preserves other context", async () => {
        mocks.vectors.mockReturnValue(queryResult([
            vector(firstId), { docId: "experience:1:0", source: "experience", text: "Developer", vector: [1, 0] },
        ]));
        mocks.blogs.mockReturnValue(queryResult([]));
        expect(await runQuery()).toEqual({ success: true, matches: ["Developer"], blogs: [] });
    });

    test("omits links and stale blog context with malformed document IDs", async () => {
        mocks.vectors.mockReturnValue(queryResult([vector("not-an-id")]));
        expect(await runQuery()).toEqual({ success: true, matches: [], blogs: [] });
        expect(mocks.blogs).not.toHaveBeenCalled();
    });

    test("does not include content, images, or skills in blog link metadata", async () => {
        mocks.vectors.mockReturnValue(queryResult([vector(firstId)]));
        mocks.blogs.mockReturnValue(queryResult([{ ...blog, content: "<p>" + "Long content ".repeat(50) + "</p>", coverImage: undefined, skills: undefined }]));
        expect(await runQuery({ includeBlogLinks: true })).toEqual({
            success: true,
            matches: [`Blog ${firstId} chunk 0`],
            blogs: [{ _id: firstId, title: blog.title, slug: blog.slug }],
        });
    });

    test.each([{ vectors: [] }, { vectors: [vector(firstId, 0, [0, 1])] }])("does not load blogs without matching vectors", async ({ vectors }) => {
        mocks.vectors.mockReturnValue(queryResult(vectors));
        expect(await runQuery()).toMatchObject({ matches: [], blogs: [] });
        expect(mocks.blogs).not.toHaveBeenCalled();
    });

    test("surfaces database errors without inventing links", async () => {
        mocks.vectors.mockReturnValue(queryResult([vector(firstId)]));
        mocks.blogs.mockImplementation(() => { throw new Error("Database unavailable"); });
        expect(await runQuery()).toEqual({ success: false, matches: [], blogs: [], error: "Database unavailable" });
        expect(console.error).toHaveBeenCalled();
    });

    test("loads full current article details by URL slug without relying on vectors or embeddings", async () => {
        const content = "Detailed article content. ".repeat(80) + "Unique ending.";
        const query = queryResult({
            ...blog, content: `<p>${content}</p>`, category: "Frontend", author: "Author",
            createdAt: new Date("2026-01-02"), updatedAt: new Date("2026-02-03"),
        });
        mocks.currentBlog.mockReturnValue(query);
        const result = await runQuery({ currentBlog: true, slug: "react-patterns" });
        expect(mocks.currentBlog).toHaveBeenCalledWith({ slug: "react-patterns", status: "published" });
        expect(query.populate).toHaveBeenCalledWith({ path: "skills", select: "name" });
        expect(result).toEqual({
            success: true,
            matches: [[
                "Current blog: React patterns", "URL: /blogs/react-patterns", "Category: Frontend",
                "Author: Author", "Published: 2026-01-02", "Updated: 2026-02-03",
                "Skills: React", `Content: ${content}`,
            ].join("\n")],
            blogs: [],
        });
        expect(mocks.embed).not.toHaveBeenCalled();
        expect(mocks.vectors).not.toHaveBeenCalled();
        expect(mocks.blogs).not.toHaveBeenCalled();
    });

    test("does not guess a current blog when the request has no blog page context", async () => {
        expect(await runQuery({ currentBlog: true })).toEqual({
            success: true, matches: [], blogs: [], message: "No current blog page is available.",
        });
        expect(mocks.currentBlog).not.toHaveBeenCalled();
        expect(mocks.embed).not.toHaveBeenCalled();
    });

    test("does not expose deleted or unpublished current blog details", async () => {
        mocks.currentBlog.mockReturnValue(queryResult(null));
        expect(await runQuery({ currentBlog: true, slug: "removed-post" })).toEqual({
            success: true, matches: [], blogs: [], message: "The current blog was not found or is not published.",
        });
        expect(mocks.currentBlog).toHaveBeenCalledWith({ slug: "removed-post", status: "published" });
        expect(mocks.vectors).not.toHaveBeenCalled();
    });

    test("keeps normal portfolio search for unrelated questions on a blog page", async () => {
        mocks.vectors.mockReturnValue(queryResult([
            { docId: "experience:1:0", source: "experience", text: "Developer", vector: [1, 0] },
        ]));
        expect(await runQuery({ currentBlog: false, slug: "react-patterns" }))
            .toEqual({ success: true, matches: ["Developer"], blogs: [] });
        expect(mocks.currentBlog).not.toHaveBeenCalled();
    });

    test("does not append blog links to factual search results by default", async () => {
        mocks.vectors.mockReturnValue(queryResult([vector(firstId)]));
        mocks.blogs.mockReturnValue(queryResult([blog]));
        expect(await runQuery()).toMatchObject({ success: true, blogs: [], matches: [`Blog ${firstId} chunk 0`] });
    });

    test.each([
        { currentBlog: true, detail: "skills" as const, query: "Skills used in the current blog" },
        { currentBlog: false, query: "Skills used in the current blog" },
    ])("returns verbatim skill-only answers even when the model chooses a broader search: %j", async options => {
        const query = queryResult({ ...blog, skills: [{ name: "React" }, { name: "TypeScript" }] });
        mocks.currentBlog.mockReturnValue(query);
        expect(await runQuery({ ...options, slug: "react-patterns", includeBlogLinks: true })).toEqual({
            success: true, matches: ["- React\n- TypeScript"], blogs: [], answer: "- React\n- TypeScript",
        });
        expect(query.select).toHaveBeenCalledWith("skills");
        expect(mocks.embed).not.toHaveBeenCalled();
        expect(mocks.vectors).not.toHaveBeenCalled();
    });

    test.each([
        { query: "show me the list of skills of vijay rameshkumar" },
        { query: "What are your skills?", currentBlog: false, detail: "skills" as const },
    ])("lists every owner skill without similarity search or a four-match limit: %j", async options => {
        const answer = "- JavaScript\n- TypeScript\n- ReactJS\n- NextJS\n- NodeJS\n- Docker";
        expect(await runQuery({ ...options, slug: "react-patterns" })).toEqual({
            success: true, matches: [answer], blogs: [], answer,
        });
        expect(mocks.portfolioSkills).toHaveBeenCalledOnce();
        expect(mocks.embed).not.toHaveBeenCalled();
        expect(mocks.vectors).not.toHaveBeenCalled();
        expect(mocks.currentBlog).not.toHaveBeenCalled();
    });

    test.each([false, true])("ignores erroneous skill selection for certificate dates, currentBlog=%s", async currentBlog => {
        const userPrompt = "what is the issue date of Adobe Experience Manager Edge Delivery Services - Developer Professional certficate";
        const answer = "Issue date: 2025-03-19.";
        mocks.certificationIssueDate.mockResolvedValue(answer);
        expect(await runQuery({
            query: "List all skills", userPrompt, detail: "skills", currentBlog,
            slug: "react-patterns", includeBlogLinks: true,
        })).toEqual({ success: true, matches: [answer], blogs: [], answer });
        expect(mocks.certificationIssueDate).toHaveBeenCalledWith(userPrompt);
        expect(mocks.portfolioSkills).not.toHaveBeenCalled();
        expect(mocks.currentBlog).not.toHaveBeenCalled();
        expect(mocks.embed).not.toHaveBeenCalled();
    });

    test("does not let a skill detail flag turn a non-skill question into a skills list", async () => {
        const userPrompt = "What is the expiration date of my certificate?";
        mocks.vectors.mockReturnValue(queryResult([
            { docId: "certifications:1:0", source: "certifications", text: "Expires: 2027-01-01", vector: [1, 0] },
        ]));
        expect(await runQuery({ query: "List all skills", userPrompt, detail: "skills" })).toEqual({
            success: true, matches: ["Expires: 2027-01-01"], blogs: [],
        });
        expect(mocks.embed).toHaveBeenCalledWith(expect.objectContaining({ value: userPrompt }));
        expect(mocks.portfolioSkills).not.toHaveBeenCalled();
    });

    test("ignores a skill detail flag even without an API request context", async () => {
        mocks.vectors.mockReturnValue(queryResult([]));
        await runQuery({ query: "What is my experience?", detail: "skills" });
        expect(mocks.portfolioSkills).not.toHaveBeenCalled();
        expect(mocks.embed).toHaveBeenCalled();
    });

    test("returns only indexed capabilities despite a rewritten query and incorrect model flags", async () => {
        mocks.skillCapabilities.mockResolvedValue("- Saved capability");
        expect(await runQuery({
            query: "List all skills", userPrompt: "what is the core capabilities of Mongodb",
            detail: "skills", currentBlog: true, includeBlogLinks: true,
        })).toEqual({
            success: true, matches: ["- Saved capability"], blogs: [], answer: "- Saved capability",
        });
        expect(mocks.skillCapabilities).toHaveBeenCalledWith("Mongodb");
        expect(mocks.portfolioSkills).not.toHaveBeenCalled();
        expect(mocks.currentBlog).not.toHaveBeenCalled();
        expect(mocks.embed).not.toHaveBeenCalled();
    });
});
