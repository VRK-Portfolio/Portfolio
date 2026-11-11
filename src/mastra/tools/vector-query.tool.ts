import { createTool } from "@mastra/core/tools";
import z from "zod";
import { getCurrentBlogSkills, isCurrentBlogSkillsQuestion } from "./current-blog-skills";
import { getPortfolioSkills, isPortfolioSkillsListQuestion } from "./portfolio-skills";
import { getCertificationIssueDate, isCertificationIssueDateQuestion } from "./certification-issue-date";
import { getCapabilitySkillName, getSkillCapabilities } from "./skill-capabilities";
import { getPublishedBlogCount, isPublishedBlogCountQuestion, getPublishedBlogs, isPublishedBlogsListQuestion } from "./published-blogs";
import { retrievePortfolioKnowledge } from "./portfolio-knowledge";

export const customVectorQueryTool = createTool({
    id: "query-portfolio-database",
    description: "Retrieve current MongoDB portfolio facts, complete collection lists/counts, and relevant published blog content. No external search or local embedding service is used.",
    inputSchema: z.object({
        query: z.string().describe("Preserve the original user question."),
        currentBlog: z.boolean().optional().describe("The original question and page URL determine current-blog context."),
        detail: z.enum(["all", "skills"]).optional(),
        includeBlogLinks: z.boolean().optional().describe("The original question determines whether blog links are requested."),
    }),
    execute: async ({ query }, { requestContext }) => {
        const userPrompt = requestContext.get("userPrompt");
        const question = typeof userPrompt === "string" ? userPrompt : query;
        if (isPublishedBlogCountQuestion(question)) {
            const answer = await getPublishedBlogCount(question);
            return { success: true, matches: [answer], blogs: [], answer };
        }
        if (isPublishedBlogsListQuestion(question)) {
            const result = await getPublishedBlogs();
            return { success: true, matches: [result.text, ...result.blogs.map(blog => blog.title)], blogs: result.blogs };
        }
        const capabilitySkill = getCapabilitySkillName(question);
        if (capabilitySkill) {
            const answer = await getSkillCapabilities(capabilitySkill);
            return { success: true, matches: [answer], blogs: [], answer };
        }
        if (isCertificationIssueDateQuestion(question)) {
            const answer = await getCertificationIssueDate(question);
            if (answer !== "I could not find that information in the database.") {
                return { success: true, matches: [answer], blogs: [], answer };
            }
        }
        const slug = requestContext.get("currentBlogSlug");
        if (isCurrentBlogSkillsQuestion(question)) {
            const answer = await getCurrentBlogSkills(typeof slug === "string" ? slug : undefined);
            return { success: true, matches: [answer], blogs: [], answer };
        }
        if (isPortfolioSkillsListQuestion(question)) {
            const answer = await getPortfolioSkills();
            return { success: true, matches: [answer], blogs: [], answer };
        }
        return retrievePortfolioKnowledge({
            question,
            currentBlogSlug: typeof slug === "string" ? slug : undefined,
        });
    },
});
