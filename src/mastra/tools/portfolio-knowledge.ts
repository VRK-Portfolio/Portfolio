import { connectDB } from "@/libs/db";
import { BasicInfoModel } from "@/models/basic-info.model";
import { BlogModel } from "@/models/blogs.model";
import { CertificationModel } from "@/models/certifications.model";
import { Experience } from "@/models/experience.model";
import { MySkillsModel } from "@/models/my-skills.model";
import { toPlainText } from "../ingestion/seed-documents";
import { isCurrentBlogQuestion } from "./current-blog-skills";
import { toChatBlog } from "./published-blogs";
import type { ChatBlog } from "@/@types/Chat.types";

export interface PortfolioKnowledge {
    success: true;
    matches: string[];
    blogs: ChatBlog[];
    answer?: string;
}

const stopWords = new Set("a an and are as at be by can could do does for from has have he his how i in is it me my of on or please show tell that the their there these they this to total us was were what when where which who with written you your vijay ramesh rameshkumar kumar blog blogs article articles post posts".split(" "));

function terms(value: string): Set<string> {
    return new Set(value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
        .match(/[a-z0-9]+/g)?.filter(term => term.length > 1 && !stopWords.has(term)));
}

function overlap(question: Set<string>, text: string): number {
    const words = terms(text);
    return [...question].filter(word => words.has(word)).length;
}

export function wantsBlogLinks(question: string): boolean {
    return /\b(?:blogs?|articles?|posts?)\b/i.test(question)
        && /\b(?:links?|urls?|recommend\w*|list|show|suggest\w*|find)\b/i.test(question)
        && !isCurrentBlogQuestion(question);
}

export async function retrievePortfolioKnowledge({
    question, currentBlogSlug,
}: { question: string; currentBlogSlug?: string }): Promise<PortfolioKnowledge> {
    await connectDB();
    const [basicInfo, skills, certifications, experiences, blogs] = await Promise.all([
        Promise.resolve().then(() => BasicInfoModel.findOne().select("name email phone bio about_me website_url github_url linked_in_url address").lean().exec()),
        Promise.resolve().then(() => MySkillsModel.find().select("name category capabilities proficiency").sort({ name: 1 }).lean().exec()),
        Promise.resolve().then(() => CertificationModel.find().select("title issuer issueDate expirationDate credentialID credentialURL skillsCoverd").sort({ title: 1 }).lean().exec()),
        Promise.resolve().then(() => Experience.find().select("company location responsibilites positions").lean().exec()),
        Promise.resolve().then(() => BlogModel.find({ status: "published" }).select("title slug category author createdAt updatedAt skills content")
            .populate<{ skills: ({ name: string } | null)[] }>({ path: "skills", select: "name" })
            .sort({ createdAt: -1, _id: -1 }).lean().exec()),
    ]);

    const currentBlog = blogs.find(blog => blog.slug === currentBlogSlug);
    if (isCurrentBlogQuestion(question) && !currentBlog) {
        const answer = currentBlogSlug
            ? "The current blog was not found or is not published."
            : "No current blog page is available.";
        return { success: true, matches: [answer], blogs: [], answer };
    }

    if (!basicInfo && !skills.length && !certifications.length && !experiences.length && !blogs.length) {
        return { success: true, matches: [], blogs: [] };
    }

    const catalog = blogs.map(blog => ({
        ...toChatBlog(blog),
        category: blog.category,
        author: blog.author,
        published: blog.createdAt,
        updated: blog.updatedAt,
        savedSkills: blog.skills?.flatMap(skill => skill?.name ? [skill.name] : []) ?? [],
    }));
    const matches = [JSON.stringify({
        source: "live-portfolio-collections",
        asOf: new Date().toISOString().slice(0, 10),
        scope: "All saved portfolio facts and all published blog metadata. Blog bodies are separate reference passages. No drafts are included.",
        counts: { skills: skills.length, certifications: certifications.length, companies: experiences.length,
            positions: experiences.reduce((count, experience) => count + experience.positions.length, 0), publishedBlogs: blogs.length },
        basicInfo, skills, certifications, experiences, publishedBlogs: catalog,
    })];

    if (isCurrentBlogQuestion(question) && currentBlog) {
        matches.push(JSON.stringify({
            source: "current-blog", ...catalog.find(blog => blog.slug === currentBlogSlug),
            content: toPlainText(currentBlog.content),
        }));
        return { success: true, matches, blogs: [] };
    }

    const queryTerms = terms(question);
    const rankedBlogs = blogs.map(blog => ({
        blog,
        titleScore: overlap(queryTerms, `${blog.title} ${blog.slug} ${blog.category}`),
    }));
    const passages = rankedBlogs.flatMap(({ blog, titleScore }) => {
        const content = toPlainText(blog.content);
        const chunks = Array.from({ length: Math.ceil(content.length / 1600) }, (_, index) =>
            content.slice(index * 1600, (index + 1) * 1600));
        return chunks.map((text, index) => ({
            blog, text, index, score: titleScore * 3 + overlap(queryTerms, text),
        }));
    }).filter(passage => passage.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
    for (const passage of passages) {
        matches.push(JSON.stringify({
            source: "published-blog-passage", ...toChatBlog(passage.blog), part: passage.index + 1, content: passage.text,
        }));
    }
    const relevantIds = new Set(passages.map(passage => String(passage.blog._id)));
    const links = wantsBlogLinks(question) ? blogs.filter(blog => relevantIds.has(String(blog._id))).map(toChatBlog) : [];
    return { success: true, matches, blogs: links };
}
