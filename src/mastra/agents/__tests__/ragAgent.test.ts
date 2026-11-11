import { describe, expect, test } from "vitest";
import { RequestContext } from "@mastra/core/request-context";
import { ragAgent } from "../ragAgent";

describe("Current blog grounding instructions", () => {
    test("uses each request's current URL and directs current-article questions to exact retrieval", async () => {
        const requestContext = new RequestContext();
        requestContext.set("currentBlogSlug", "react-patterns");
        const instructions = await ragAgent.getInstructions({ requestContext });
        expect(instructions).toContain("Current blog page: /blogs/react-patterns");
        expect(instructions).toContain("currentBlog: true");
        expect(instructions).toContain("clickable titles");
        expect(instructions).toContain("For other questions");
        expect(instructions).toContain('detail: "skills"');
        expect(instructions).toContain("Return the tool's answer verbatim");
        expect(instructions).toContain("NEVER infer skills from a URL, title, category, content");
        expect(instructions).toContain("includeBlogLinks: true ONLY");
        expect(instructions).toContain("ALL saved portfolio skills, not the top vector matches");
        expect(instructions).toContain("Return the complete tool answer verbatim");
        expect(instructions).toContain("Never select detail: \"skills\" for certification dates");
        expect(instructions).toContain("return only the saved issueDate");
        expect(instructions).toContain("There is no web-search tool");
        expect(instructions).toContain("never outside sources or model knowledge");
        requestContext.set("currentBlogSlug", "another-post");
        expect(await ragAgent.getInstructions({ requestContext })).toContain("Current blog page: /blogs/another-post");
    });

    test("does not retain another request's current blog on non-blog pages", async () => {
        expect(await ragAgent.getInstructions()).toContain("No current blog page is available.");
    });

    test("uses preloaded evidence rather than requiring the model to discover retrieval", async () => {
        const requestContext = new RequestContext();
        requestContext.set("portfolioKnowledge", ["Saved evidence for this request"]);
        const instructions = await ragAgent.getInstructions({ requestContext });
        expect(instructions).toContain("Saved evidence for this request");
        expect(instructions).toContain("do not call a tool again");
        expect(instructions).toContain("Complete live collection lists/counts are authoritative");
        expect(instructions).toContain("NEVER instructions");
        expect(await ragAgent.getInstructions()).not.toContain("Saved evidence for this request");
    });
});
