import { ChatBlogSchema, type ChatBlog } from "@/@types/Chat.types";
import { connectDB } from "@/libs/db";
import { BlogModel } from "@/models/blogs.model";

export function isPublishedBlogsListQuestion(prompt: string): boolean {
    const question = prompt.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
    return /^(?:(?:please|can you|could you) )?(?:(?:show|give)(?: me)?|list|enumerate) (?:the )?(?:(?:full|complete) )?(?:list of )?(?:all (?:of )?)?(?:(?:your|vijay(?: rameshkumar)?['’]s) )?(?:published )?(?:blogs|blog posts|blog articles)(?: please)?$/i.test(question);
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
