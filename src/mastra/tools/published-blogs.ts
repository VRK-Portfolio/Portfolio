import { ChatBlogSchema, type ChatBlog } from "@/@types/Chat.types";
import { connectDB } from "@/libs/db";
import { BlogModel } from "@/models/blogs.model";

export function isPublishedBlogsListQuestion(prompt: string): boolean {
    const question = prompt.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
    return /^(?:(?:please|can you|could you) )?(?:(?:show|give)(?: me)?|list|enumerate) (?:the )?(?:(?:full|complete) )?(?:list of )?(?:all (?:of )?)?(?:(?:your|vijay(?: rameshkumar)?['’]s) )?(?:published )?(?:blogs|blog posts|blog articles)(?: please)?$/i.test(question);
}

function normalizeCountQuestion(prompt: string): string {
    return prompt.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/, "")
        .replace(/\bvijay(?: ramesh ?kumar)?\b/g, "vijay");
}

export function isPublishedBlogCountQuestion(prompt: string): boolean {
    const question = normalizeCountQuestion(prompt);
    return /^(?:(?:please|can you|could you) )?(?:how many (?:(?:total|published) )*(?:blogs|blog posts|blog articles)(?: (?:are there|exist|(?:are |were |has been |have been )?(?:written|published|posted) by (?:vijay|you)))?(?: in total)?|how many (?:(?:total|published) )*(?:blogs|blog posts|blog articles) (?:has vijay|have you) (?:written|published|posted)(?: in total)?|(?:what is |what's |show me |give me )?(?:the )?(?:total )?(?:number|count) of (?:(?:published|total) )*(?:blogs|blog posts|blog articles)(?: (?:written |published |posted )?by (?:vijay|you))?)(?: please)?$/.test(question);
}

export async function getPublishedBlogCount(prompt: string): Promise<string> {
    await connectDB();
    const namedAuthor = /\bvijay\b/.test(normalizeCountQuestion(prompt));
    const count = await BlogModel.countDocuments({
        status: "published",
        ...(namedAuthor ? { author: /^\s*vijay(?:\s+ramesh\s*kumar)?\s*$/i } : {}),
    }).exec();
    return namedAuthor
        ? `Vijay has written ${count} published ${count === 1 ? "blog" : "blogs"}.`
        : `There ${count === 1 ? "is" : "are"} ${count} published ${count === 1 ? "blog" : "blogs"}.`;
}

export function toChatBlog(blog: { _id: unknown; title: string; slug: string }): ChatBlog {
    return ChatBlogSchema.parse({ _id: String(blog._id), title: blog.title, slug: blog.slug });
}

export async function getPublishedBlogs(): Promise<{ text: string; blogs: ChatBlog[] }> {
    await connectDB();
    const records = await BlogModel.find({ status: "published" })
        .select("title slug").sort({ createdAt: -1, _id: -1 }).lean().exec();
    const blogs = records.map(toChatBlog);
    return { text: blogs.length ? "Published blogs:" : "No published blogs are recorded.", blogs };
}
