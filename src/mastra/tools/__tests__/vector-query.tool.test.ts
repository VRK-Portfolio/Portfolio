import { beforeEach, describe, expect, test, vi } from "vitest";
import { RequestContext } from "@mastra/core/request-context";
import { customVectorQueryTool } from "../vector-query.tool";

const mocks = vi.hoisted(() => ({
    retrieve: vi.fn(), currentSkills: vi.fn(), portfolioSkills: vi.fn(), certificate: vi.fn(),
    capabilities: vi.fn(), blogs: vi.fn(), count: vi.fn(),
}));
vi.mock("../portfolio-knowledge", () => ({ retrievePortfolioKnowledge: mocks.retrieve }));
vi.mock("../current-blog-skills", async original => ({
    ...await original<typeof import("../current-blog-skills")>(), getCurrentBlogSkills: mocks.currentSkills,
}));
vi.mock("../portfolio-skills", async original => ({
    ...await original<typeof import("../portfolio-skills")>(), getPortfolioSkills: mocks.portfolioSkills,
}));
vi.mock("../certification-issue-date", async original => ({
    ...await original<typeof import("../certification-issue-date")>(), getCertificationIssueDate: mocks.certificate,
}));
vi.mock("../skill-capabilities", async original => ({
    ...await original<typeof import("../skill-capabilities")>(), getSkillCapabilities: mocks.capabilities,
}));
vi.mock("../published-blogs", async original => ({
    ...await original<typeof import("../published-blogs")>(), getPublishedBlogs: mocks.blogs, getPublishedBlogCount: mocks.count,
}));

function run(question: string, slug?: string) {
    const requestContext = new RequestContext();
    requestContext.set("userPrompt", question);
    if (slug) requestContext.set("currentBlogSlug", slug);
    return customVectorQueryTool.execute?.({
        query: "A model rewrite that must not override the question",
        currentBlog: true, detail: "skills", includeBlogLinks: true,
    }, { requestContext });
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.retrieve.mockResolvedValue({ success: true, matches: ["Saved facts"], blogs: [] });
});

describe("Shared MongoDB retrieval tool", () => {
    test.each([
        "Where does Vijay work?", "List certifications and their issuers",
        "What is his GitHub URL?", "Summarize the current blog",
        "Compare React and NextJS capabilities", "What is the certificate expiration date?",
    ])("uses the general retrieval pipeline for %s", async question => {
        expect(await run(question, "react-patterns")).toEqual({ success: true, matches: ["Saved facts"], blogs: [] });
        expect(mocks.retrieve).toHaveBeenCalledWith({ question, currentBlogSlug: "react-patterns" });
        expect(mocks.portfolioSkills).not.toHaveBeenCalled();
    });

    test.each([
        ["how many total blogs written by vijay", "count", "Vijay has written 7 published blogs."],
        ["Skills used in the current blog", "currentSkills", "- React"],
        ["List all skills", "portfolioSkills", "- React\n- TypeScript"],
        ["what is the core capabilities of Mongodb", "capabilities", "- Saved capability"],
        ["what is the issue date of the Adobe certificate", "certificate", "Issue date: 2025-03-19."],
    ] as const)("preserves exact deterministic answers for %s", async (question, key, answer) => {
        mocks[key].mockResolvedValue(answer);
        expect(await run(question, "react-patterns")).toEqual({ success: true, matches: [answer], blogs: [], answer });
        expect(mocks.retrieve).not.toHaveBeenCalled();
    });

    test("lists all published titles without a model-selected page filter", async () => {
        const blogs = [{ _id: "507f1f77bcf86cd799439011", title: "React patterns", slug: "react-patterns" }];
        mocks.blogs.mockResolvedValue({ text: "Published blogs:", blogs });
        expect(await run("show me the list of blogs")).toEqual({
            success: true, matches: ["Published blogs:", "React patterns"], blogs,
        });
    });

    test("uses the full live certification collection when an exact title is not in the question", async () => {
        mocks.certificate.mockResolvedValue("I could not find that information in the database.");
        await run("When was the Adobe certificate issued?");
        expect(mocks.retrieve).toHaveBeenCalledOnce();
    });

    test("propagates retrieval failure instead of disguising it as missing knowledge", async () => {
        mocks.retrieve.mockRejectedValue(new Error("Database unavailable"));
        await expect(run("Where does he work?")).rejects.toThrow("Database unavailable");
    });

    test("works without an API context, using the supplied original query", async () => {
        await customVectorQueryTool.execute?.({ query: "His experience?" }, { requestContext: new RequestContext() });
        expect(mocks.retrieve).toHaveBeenCalledWith({ question: "His experience?", currentBlogSlug: undefined });
    });
});
