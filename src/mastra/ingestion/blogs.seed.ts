import { connectDB } from "@/libs/db";
import { BlogModel } from "@/models/blogs.model";
import { seedDocuments, toPlainText } from "./seed-documents";

export async function seedBlogs() {
    await connectDB();
    const blogs = await BlogModel.find({ status: "published" })
        .populate<{ skills: { name: string }[] }>({ path: "skills", select: "name" })
        .lean().exec();

    return seedDocuments("blogs", blogs.map(blog => ({
        id: String(blog._id),
        context: `Blog: ${blog.title}\nURL: /blogs/${blog.slug}`,
        text: [
            `Title: ${blog.title}`,
            `Category: ${blog.category}`,
            blog.author && `Author: ${blog.author}`,
            blog.createdAt && `Published: ${new Date(blog.createdAt).toISOString().slice(0, 10)}`,
            blog.updatedAt && `Updated: ${new Date(blog.updatedAt).toISOString().slice(0, 10)}`,
            blog.skills?.length && `Skills: ${blog.skills.map(skill => skill.name).join(", ")}`,
            `Content: ${toPlainText(blog.content)}`,
        ].filter(Boolean).join("\n"),
    })));
}
