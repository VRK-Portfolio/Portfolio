import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "../route";
import { DEFAULT_CHAT_CONFIG } from "@/@types/ChatSettings.types";
import { ChatConfigurationError } from "@/libs/chat-configuration-error";

const mocks = vi.hoisted(() => ({
    generate: vi.fn(), getAgentById: vi.fn(), getCurrentBlogSkills: vi.fn(), getPortfolioSkills: vi.fn(), getCertificationIssueDate: vi.fn(), getSkillCapabilities: vi.fn(), getChatSettings: vi.fn(), getPublishedBlogs: vi.fn(),
}));
vi.mock("@/mastra/tools/published-blogs", async importOriginal => ({
    ...await importOriginal<typeof import("@/mastra/tools/published-blogs")>(),
    getPublishedBlogs: mocks.getPublishedBlogs,
}));
vi.mock("@/libs/chat-settings", () => ({ getChatSettings: mocks.getChatSettings }));
vi.mock("@/mastra/index", () => ({ mastra: { getAgentById: mocks.getAgentById } }));
vi.mock("@/mastra/tools/current-blog-skills", async importOriginal => ({
    ...await importOriginal<typeof import("@/mastra/tools/current-blog-skills")>(),
    getCurrentBlogSkills: mocks.getCurrentBlogSkills,
}));
vi.mock("@/mastra/tools/portfolio-skills", async importOriginal => ({
    ...await importOriginal<typeof import("@/mastra/tools/portfolio-skills")>(),
    getPortfolioSkills: mocks.getPortfolioSkills,
}));
vi.mock("@/mastra/tools/certification-issue-date", async importOriginal => ({
    ...await importOriginal<typeof import("@/mastra/tools/certification-issue-date")>(),
    getCertificationIssueDate: mocks.getCertificationIssueDate,
}));
vi.mock("@/mastra/tools/skill-capabilities", async importOriginal => ({
    ...await importOriginal<typeof import("@/mastra/tools/skill-capabilities")>(),
    getSkillCapabilities: mocks.getSkillCapabilities,
}));

const blog = {
    _id: "507f1f77bcf86cd799439011", title: "React patterns", slug: "react-patterns",
};
const request = (body: unknown) => new Request("http://localhost/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const toolResult = (blogs: unknown[], toolName = "customVectorQueryTool") => ({
    type: "tool-result",
    payload: { toolName, result: { success: true, matches: ["Retrieved context"], blogs } },
});

beforeEach(() => {
    vi.resetAllMocks();
    mocks.getChatSettings.mockResolvedValue({ ...DEFAULT_CHAT_CONFIG, hasApiKey: false });
    mocks.getPublishedBlogs.mockResolvedValue({ text: "Published blogs:", blogs: [blog] });
    mocks.getAgentById.mockReturnValue({ generate: mocks.generate });
    mocks.getCurrentBlogSkills.mockResolvedValue("- React\n- TypeScript");
    mocks.getPortfolioSkills.mockResolvedValue("- JavaScript\n- TypeScript\n- ReactJS\n- NextJS\n- NodeJS\n- Docker");
    vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("Chat blog links and page context API", () => {
    test.each(["/", "/blogs/react-patterns"])("lists every published blog directly without a model or embeddings on %s", async pathname => {
        mocks.generate.mockRejectedValue(new Error("No model or local embeddings are available in this deployment"));
        const response = await POST(request({ prompt: "show me the list of blogs", pathname }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, text: "Published blogs:", blogs: [blog] });
        expect(mocks.getPublishedBlogs).toHaveBeenCalledOnce();
        expect(mocks.getAgentById).not.toHaveBeenCalled();
    });

    test("does not bypass the disabled-chat setting for blog lists", async () => {
        mocks.getChatSettings.mockResolvedValue({ ...DEFAULT_CHAT_CONFIG, chatEnabled: false });
        expect((await POST(request({ prompt: "show me the list of blogs" }))).status).toBe(403);
        expect(mocks.getPublishedBlogs).not.toHaveBeenCalled();
    });

    test("reports a blog-list database failure instead of using model knowledge", async () => {
        mocks.getPublishedBlogs.mockRejectedValue(new Error("Database unavailable"));
        expect((await POST(request({ prompt: "show me the list of blogs" }))).status).toBe(500);
        expect(mocks.getAgentById).not.toHaveBeenCalled();
    });

    test.each([
        "CHAT_ENCRYPTION_KEY_MISSING",
        "CHAT_ENCRYPTION_KEY_INVALID",
        "CHAT_API_KEY_DECRYPTION_FAILED",
        "CHAT_API_KEY_MISSING",
    ] as const)("identifies deployment configuration errors without revealing credentials: %s", async code => {
        mocks.generate.mockRejectedValue({ cause: new ChatConfigurationError(code) });
        const response = await POST(request({ prompt: "Recommend React blogs" }));
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({ success: false, code, error: expect.any(String) });
        expect(console.error).toHaveBeenCalledWith("Chat response error:", expect.objectContaining({ phase: "generation", errorType: code }));
    });

    test("rejects all chat requests when disabled, including direct fact lookups", async () => {
        mocks.getChatSettings.mockResolvedValue({ ...DEFAULT_CHAT_CONFIG, chatEnabled: false });
        const response = await POST(request({ prompt: "what is the core capabilities of Mongodb" }));
        expect(response.status).toBe(403);
        expect(mocks.getSkillCapabilities).not.toHaveBeenCalled();
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test("applies saved generation settings and does not expose provider errors or keys", async () => {
        mocks.getChatSettings.mockResolvedValue({ ...DEFAULT_CHAT_CONFIG, temperature: 0.3, maxOutputTokens: 512 });
        mocks.generate.mockRejectedValue(new Error("provider failure with secret-api-key"));
        const response = await POST(request({ prompt: "Tell me about experience" }));
        expect(response.status).toBe(500);
        expect(mocks.generate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            modelSettings: { temperature: 0.3, maxOutputTokens: 512 },
        }));
        expect(JSON.stringify(await response.json())).not.toContain("secret-api-key");
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("secret-api-key");
    });
    test("returns grounded, deduplicated blogs across retrieval tool calls", async () => {
        mocks.generate.mockResolvedValue({
            text: "Here is a related blog.",
            toolResults: [toolResult([blog]), toolResult([blog]), toolResult([{ invalid: true }], "anotherTool")],
        });
        const response = await POST(request({ prompt: " Show React blogs " }));
        expect(response.status).toBe(200);
        expect(mocks.getAgentById).toHaveBeenCalledWith("rag-agent");
        expect(mocks.generate).toHaveBeenCalledWith("Show React blogs", expect.objectContaining({ requestContext: expect.anything() }));
        expect(await response.json()).toEqual({ success: true, text: "Here is a related blog.", blogs: [blog] });
    });

    test("keeps ordinary text replies without blog links", async () => {
        mocks.generate.mockResolvedValue({ text: "Developer experience", toolResults: [toolResult([])] });
        expect(await (await POST(request({ prompt: "Experience?" }))).json())
            .toEqual({ success: true, text: "Developer experience", blogs: [] });
    });

    test("does not return links from failed tools", async () => {
        mocks.generate.mockResolvedValue({
            text: "No information found.",
            toolResults: [{
                payload: { toolName: "customVectorQueryTool", result: { success: false, blogs: [] } },
            }],
        });
        expect(await (await POST(request({ prompt: "Blogs?" }))).json())
            .toMatchObject({ blogs: [] });
    });

    test("reports malformed link data rather than returning an invalid success response", async () => {
        mocks.generate.mockResolvedValue({ text: "Blog", toolResults: [toolResult([{ ...blog, slug: "../bad" }])] });
        const response = await POST(request({ prompt: "Blogs?" }));
        expect(response.status).toBe(500);
        expect(await response.json()).toMatchObject({ success: false });
        expect(console.error).toHaveBeenCalled();
    });

    test.each([{}, { prompt: "" }, { prompt: "  " }, { prompt: 123 }])("validates prompt %j", async body => {
        expect((await POST(request(body))).status).toBe(400);
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test("rejects malformed JSON", async () => {
        expect((await POST(new Request("http://localhost/api/chat", { method: "POST", body: "{" }))).status).toBe(400);
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test("resolves current blog paths into isolated request contexts and clears them after navigation", async () => {
        mocks.generate.mockResolvedValue({ text: "Answer", toolResults: [] });
        for (const [pathname, slug] of [
            ["/blogs/react-patterns", "react-patterns"],
            ["/blogs/another-post/", "another-post"],
            ["/", undefined],
            ["/blogs/nested/page", undefined],
            ["/blogs/../admin", undefined],
            [undefined, undefined],
        ]) {
            const response = await POST(request({ prompt: "Summarize this blog", pathname }));
            expect(response.status).toBe(200);
            const context = mocks.generate.mock.lastCall?.[1].requestContext;
            expect(context.get("currentBlogSlug")).toBe(slug);
            expect(context.get("userPrompt")).toBe("Summarize this blog");
        }
        const contexts = mocks.generate.mock.calls.map(call => call[1].requestContext);
        expect(new Set(contexts).size).toBe(contexts.length);
    });

    test.each(["https://example.com/blogs/test", "//example.com/blogs/test", 123, null])("rejects invalid page paths %j", async pathname => {
        expect((await POST(request({ prompt: "This blog", pathname }))).status).toBe(400);
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test.each([{ status: 503 }, { code: 503 }])("preserves service-unavailable errors %j", async error => {
        mocks.generate.mockRejectedValue(error);
        const response = await POST(request({ prompt: "Blogs?" }));
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({ success: false, error: expect.stringContaining("high traffic") });
    });

    test.each([
        [400, 502, "generation settings"],
        [401, 503, "API key"],
        [403, 503, "denied access"],
        [404, 503, "supported model"],
        [429, 429, "quota"],
        [503, 503, "high traffic"],
    ])("maps provider status %i to a safe actionable response", async (statusCode, status, message) => {
        mocks.generate.mockRejectedValue({
            statusCode, message: "private-key and provider request details",
            requestHeaders: { authorization: "private-key" },
        });
        const response = await POST(request({ prompt: "Recommend React blogs" }));
        const body = await response.json();
        expect(response.status).toBe(status);
        expect(body).toMatchObject({ success: false, error: expect.stringContaining(message) });
        expect(JSON.stringify(body)).not.toContain("private-key");
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private-key");
    });

    test.each([
        { cause: { statusCode: 404 } },
        { lastError: { statusCode: 429 } },
    ])("recognizes wrapped provider failures %j", async error => {
        mocks.generate.mockRejectedValue(error);
        const response = await POST(request({ prompt: "Recommend React blogs" }));
        expect(response.status).toBe("cause" in error ? 503 : 429);
    });

    test.each([
        "Skills used in the current blog",
        "What technologies are used in this article?",
        "List skills in this blog",
    ])("returns only exact skills without model commentary or unrelated links: %s", async prompt => {
        const response = await POST(request({ prompt, pathname: "/blogs/react-patterns" }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, text: "- React\n- TypeScript", blogs: [] });
        expect(mocks.getCurrentBlogSkills).toHaveBeenCalledWith("react-patterns");
        expect(mocks.generate).not.toHaveBeenCalled();
        expect(mocks.getAgentById).not.toHaveBeenCalled();
    });

    test("reports absent skills without inferring technologies or calling the model", async () => {
        mocks.getCurrentBlogSkills.mockResolvedValue("No skills are recorded for the current blog.");
        expect(await (await POST(request({
            prompt: "Skills used in the current blog", pathname: "/blogs/react-patterns",
        }))).json()).toEqual({ success: true, text: "No skills are recorded for the current blog.", blogs: [] });
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test("does not fall back to other blogs when a current-blog URL is unavailable", async () => {
        mocks.getCurrentBlogSkills.mockResolvedValue("No current blog page is available.");
        expect(await (await POST(request({ prompt: "Skills used in the current blog", pathname: "/" }))).json())
            .toEqual({ success: true, text: "No current blog page is available.", blogs: [] });
        expect(mocks.getCurrentBlogSkills).toHaveBeenCalledWith(undefined);
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test("uses a skill tool's canonical answer instead of a hallucinated model response", async () => {
        mocks.generate.mockResolvedValue({
            text: "Note that skills were inferred from URLs, titles, and categories. Extra blog links...",
            toolResults: [{
                payload: {
                    toolName: "customVectorQueryTool",
                    result: { success: true, matches: ["- React"], answer: "- React", blogs: [blog] },
                },
            }],
        });
        expect(await (await POST(request({
            prompt: "Which stack does it use?", pathname: "/blogs/react-patterns",
        }))).json()).toEqual({ success: true, text: "- React", blogs: [] });
    });

    test("preserves compound requests instead of answering only their skills portion", async () => {
        mocks.generate.mockResolvedValue({ text: "Skills: React. Author: Author.", toolResults: [toolResult([])] });
        expect(await (await POST(request({
            prompt: "List skills and author of this blog", pathname: "/blogs/react-patterns",
        }))).json()).toMatchObject({ text: "Skills: React. Author: Author." });
        expect(mocks.getCurrentBlogSkills).not.toHaveBeenCalled();
    });

    test("reports skill lookup failures instead of returning a success-shaped fallback", async () => {
        mocks.getCurrentBlogSkills.mockRejectedValue(new Error("Database unavailable"));
        const response = await POST(request({ prompt: "Skills used in the current blog", pathname: "/blogs/react-patterns" }));
        expect(response.status).toBe(500);
        expect(await response.json()).toMatchObject({ success: false });
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test.each(["/", "/blogs/react-patterns"])("returns the complete owner skills list on %s without generation or blog scoping", async pathname => {
        const response = await POST(request({
            prompt: "show me the list of skills of vijay rameshkumar", pathname,
        }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true, text: "- JavaScript\n- TypeScript\n- ReactJS\n- NextJS\n- NodeJS\n- Docker", blogs: [],
        });
        expect(mocks.getPortfolioSkills).toHaveBeenCalledOnce();
        expect(mocks.getCurrentBlogSkills).not.toHaveBeenCalled();
        expect(mocks.generate).not.toHaveBeenCalled();
        expect(mocks.getAgentById).not.toHaveBeenCalled();
    });

    test("preserves current-blog skill scoping instead of returning the owner's full list", async () => {
        const response = await POST(request({ prompt: "Skills used in the current blog", pathname: "/blogs/react-patterns" }));
        expect(await response.json()).toMatchObject({ text: "- React\n- TypeScript" });
        expect(mocks.getPortfolioSkills).not.toHaveBeenCalled();
    });

    test("does not let the model shorten an exhaustive skill-list tool answer", async () => {
        const completeList = "- JavaScript\n- TypeScript\n- ReactJS\n- NextJS\n- NodeJS\n- Docker";
        mocks.generate.mockResolvedValue({
            text: "Based on the tool output: JavaScript, TypeScript, ReactJS, NextJS.",
            toolResults: [{
                payload: {
                    toolName: "customVectorQueryTool",
                    result: { success: true, matches: [completeList], answer: completeList, blogs: [] },
                },
            }],
        });
        const response = await POST(request({ prompt: "Which programming skills has he mastered?" }));
        expect(await response.json()).toEqual({ success: true, text: completeList, blogs: [] });
    });

    test("reports full-list database failures rather than returning a partial answer", async () => {
        mocks.getPortfolioSkills.mockRejectedValue(new Error("Database unavailable"));
        const response = await POST(request({ prompt: "List all skills" }));
        expect(response.status).toBe(500);
        expect(await response.json()).toMatchObject({ success: false });
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test.each(["/", "/blogs/react-patterns"])("answers the exact reported certification question without skills on %s", async pathname => {
        const prompt = "what is the issue date of Adobe Experience Manager Edge Delivery Services - Developer Professional certficate";
        mocks.getCertificationIssueDate.mockResolvedValue("Issue date: 2025-03-19.");
        const response = await POST(request({ prompt, pathname }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, text: "Issue date: 2025-03-19.", blogs: [] });
        expect(mocks.getCertificationIssueDate).toHaveBeenCalledWith(prompt);
        expect(mocks.getPortfolioSkills).not.toHaveBeenCalled();
        expect(mocks.getCurrentBlogSkills).not.toHaveBeenCalled();
        expect(mocks.getAgentById).not.toHaveBeenCalled();
    });

    test("reports certification database failures instead of substituting skills", async () => {
        mocks.getCertificationIssueDate.mockRejectedValue(new Error("Database unavailable"));
        const response = await POST(request({ prompt: "What is the issue date of the Adobe certificate?" }));
        expect(response.status).toBe(500);
        expect(await response.json()).toMatchObject({ success: false, error: expect.stringContaining("Check the server configuration") });
        expect(mocks.getPortfolioSkills).not.toHaveBeenCalled();
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test.each(["/", "/blogs/react-patterns"])("answers the exact MongoDB capabilities prompt using saved vector facts on %s", async pathname => {
        const text = "- Saved capability one\n- Saved capability two";
        mocks.getSkillCapabilities.mockResolvedValue(text);
        const response = await POST(request({ prompt: "what is the core capabilities of Mongodb", pathname }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, text, blogs: [] });
        expect(mocks.getSkillCapabilities).toHaveBeenCalledWith("Mongodb");
        expect(mocks.getAgentById).not.toHaveBeenCalled();
        expect(mocks.getPortfolioSkills).not.toHaveBeenCalled();
    });

    test("does not generate general capabilities when a skill is not in the vector collection", async () => {
        const text = "I could not find that information in the database.";
        mocks.getSkillCapabilities.mockResolvedValue(text);
        expect(await (await POST(request({ prompt: "What are the core capabilities of UnknownDB?" }))).json())
            .toEqual({ success: true, text, blogs: [] });
        expect(mocks.generate).not.toHaveBeenCalled();
    });

    test.each([
        { toolResults: [] },
        { toolResults: [toolResult([], "unrelatedTool")] },
        { toolResults: [{ payload: { toolName: "customVectorQueryTool", result: { success: true, matches: [], blogs: [] } } }] },
        { toolResults: [{ payload: { toolName: "customVectorQueryTool", result: { success: false, matches: ["Not usable"], blogs: [] } } }] },
        { toolResults: [{ payload: { toolName: "customVectorQueryTool", isError: true, result: { success: true, matches: ["Not usable"], blogs: [] } } }] },
    ])("blocks unsupported model answers without successful retrieval: %j", async ({ toolResults }) => {
        mocks.generate.mockResolvedValue({ text: "Based on the search results, here are invented facts.", toolResults });
        expect(await (await POST(request({ prompt: "Tell me about an unknown technology" }))).json())
            .toEqual({ success: true, text: "I could not find that information in the database.", blogs: [] });
    });

    test("reports vector database errors instead of using external knowledge", async () => {
        mocks.getSkillCapabilities.mockRejectedValue(new Error("Vector database unavailable"));
        const response = await POST(request({ prompt: "what is the core capabilities of Mongodb" }));
        expect(response.status).toBe(500);
        expect(await response.json()).toMatchObject({ success: false, error: expect.stringContaining("Check the server configuration") });
        expect(mocks.generate).not.toHaveBeenCalled();
    });
});
