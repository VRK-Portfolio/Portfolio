import { connectDB } from "@/libs/db";
import { BlogModel } from "@/models/blogs.model";

export function isCurrentBlogQuestion(prompt: string): boolean {
    return /\b(?:current|this)\s+(?:blog(?:\s+post)?|article|post|page)\b|\b(?:blog|article|post|page)\s+(?:i(?:'m| am)\s+(?:reading|viewing))\b/i.test(prompt);
}

export function isCurrentBlogSkillsQuestion(prompt: string): boolean {
    const asksSkills = /\b(?:skills?|technolog(?:y|ies)|tech\s+stack|libraries|frameworks?|tools?)\b/i.test(prompt);
    const asksOtherDetails = /\b(?:author|summary|summari[sz]e|explain|content|dates?|published|updated|links?|urls?|related|other|recommend|compare)\b/i.test(prompt);
    return asksSkills && isCurrentBlogQuestion(prompt) && !asksOtherDetails;
}

export async function getCurrentBlogSkills(slug?: string): Promise<string> {
    if (!slug) return "No current blog page is available.";

    await connectDB();
    const blog = await BlogModel.findOne({ slug, status: "published" })
        .select("skills")
        .populate<{ skills: ({ name: string } | null)[] }>({ path: "skills", select: "name" })
        .lean().exec();
    if (!blog) return "The current blog was not found or is not published.";

    const skills = [...new Set(blog.skills?.flatMap(skill => {
        const name = skill?.name.trim();
        return name ? [name] : [];
    }) ?? [])];
    return skills.length
        ? skills.map(name => `- ${name}`).join("\n")
        : "No skills are recorded for the current blog.";
}
