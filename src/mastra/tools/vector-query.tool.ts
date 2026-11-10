import { connectDB } from "@/libs/db";
import { VectorStoreModel } from "@/models/vector-store.model";
import { BlogModel } from "@/models/blogs.model";
import { toPlainText } from "../ingestion/seed-documents";
import { createTool } from "@mastra/core/tools";
import { embed } from "ai";
import { ollama } from "ollama-ai-provider-v2";
import z from "zod";
import { getCurrentBlogSkills, isCurrentBlogSkillsQuestion } from "./current-blog-skills";
import { getPortfolioSkills, isPortfolioSkillsListQuestion } from "./portfolio-skills";
import { getCertificationIssueDate, isCertificationIssueDateQuestion } from "./certification-issue-date";
import { getCapabilitySkillName, getSkillCapabilities } from "./skill-capabilities";
import { getPublishedBlogs, isPublishedBlogsListQuestion, toChatBlog } from "./published-blogs";

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const customVectorQueryTool = createTool({
    id: 'query-portfolio-database',
    description: 'Search portfolio knowledge, retrieve the current blog, or list every saved portfolio skill without similarity limits.',
    inputSchema: z.object({
        query: z.string().describe('The query string to search for in the portfolio database'),
        currentBlog: z.boolean().optional().describe('Use true for questions about the current blog, this article, or a summary of the page being read.'),
        detail: z.enum(["all", "skills"]).optional().describe('Use skills only for skill-list questions, never certificate dates or other facts. The original user question determines whether a skills lookup is allowed.'),
        includeBlogLinks: z.boolean().optional().describe('Set true only when the user explicitly asks for blog recommendations, a list of blogs, or blog links. Otherwise omit or use false.'),
    }),
    execute: async ({ query, currentBlog, includeBlogLinks }, { requestContext }) => {
        try {
            const userPrompt = requestContext.get("userPrompt");
            const question = typeof userPrompt === "string" ? userPrompt : query;
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
                return { success: true, matches: [answer], blogs: [], answer };
            }
            if (isCurrentBlogSkillsQuestion(question)) {
                const slug = requestContext.get("currentBlogSlug");
                const answer = await getCurrentBlogSkills(typeof slug === "string" ? slug : undefined);
                return { success: true, matches: [answer], blogs: [], answer };
            }
            if (isPortfolioSkillsListQuestion(question)) {
                const answer = await getPortfolioSkills();
                return { success: true, matches: [answer], blogs: [], answer };
            }
            await connectDB();
            if (currentBlog) {
                const slug = requestContext.get("currentBlogSlug");
                if (typeof slug !== "string") {
                    return { success: true, matches: [], blogs: [], message: "No current blog page is available." };
                }
                const blog = await BlogModel.findOne({ slug, status: "published" })
                    .populate<{ skills: { name: string }[] }>({ path: "skills", select: "name" })
                    .lean().exec();
                if (!blog) {
                    return { success: true, matches: [], blogs: [], message: "The current blog was not found or is not published." };
                }
                const details = [
                    `Current blog: ${blog.title}`,
                    `URL: /blogs/${blog.slug}`,
                    `Category: ${blog.category}`,
                    blog.author && `Author: ${blog.author}`,
                    blog.createdAt && `Published: ${new Date(blog.createdAt).toISOString().slice(0, 10)}`,
                    blog.updatedAt && `Updated: ${new Date(blog.updatedAt).toISOString().slice(0, 10)}`,
                    blog.skills?.length && `Skills: ${blog.skills.map(skill => skill.name).join(", ")}`,
                    `Content: ${toPlainText(blog.content)}`,
                ].filter(Boolean).join("\n");
                return { success: true, matches: [details], blogs: includeBlogLinks ? [toChatBlog(blog)] : [] };
            }
            const { embedding: queryEmbedding } = await embed({
                model: ollama.embedding('nomic-embed-text'),
                value: question
            });

            // Fetch valid documents containing vectors
            const allVectors = await VectorStoreModel.find({
                vector: { $exists: true, $not: { $size: 0 } }
            }).lean().exec();

            if (!allVectors || allVectors.length === 0) {
                return { success: false, matches: [], blogs: [], message: 'No vectors found in the database' };
            }

            const scoredResults = allVectors.map(vector => ({
                docId: vector.docId,
                text: vector.text,
                source: vector.source,
                score: cosineSimilarity(queryEmbedding, vector.vector)
            })).sort((a, b) => b.score - a.score);

            const SIMILARITY_THRESHOLD = 0.3; // Lowered slightly to ensure local embeddings match reliably

            const topMatches = scoredResults
                .filter((m) => m.score >= SIMILARITY_THRESHOLD)
                .slice(0, 4);

            if (topMatches.length === 0) {
                return { success: true, matches: [], blogs: [], message: 'No relevant data found in database.' };
            }

            const getBlogId = (match: { source: string; docId: string }) =>
                match.source === "blogs" ? /^blogs:([a-f\d]{24}):\d+$/i.exec(match.docId)?.[1] : undefined;
            const blogIds = [...new Set(topMatches.flatMap(match => {
                const id = getBlogId(match);
                return id ? [id] : [];
            }))];
            const blogRecords = blogIds.length ? await BlogModel.find({
                _id: { $in: blogIds },
                status: "published",
            }).populate<{ skills: { name: string }[] }>({ path: "skills", select: "name" }).lean().exec() : [];
            const blogsById = new Map(blogRecords.map(blog => [String(blog._id), blog]));
            const blogs = blogIds.flatMap(id => {
                const blog = blogsById.get(id);
                return blog ? [toChatBlog(blog)] : [];
            });
            const matches = topMatches.filter(match => {
                const id = getBlogId(match);
                return match.source !== "blogs" || (id && blogsById.has(id));
            }).map(match => match.text);

            return {
                success: true,
                matches,
                blogs: includeBlogLinks ? blogs : [],
            };
        } catch (error: unknown) {
            console.error('Vector query tool error:', error);
            return { success: false, matches: [], blogs: [], error: error instanceof Error ? error.message : "Vector query failed" };
        }
    }
});