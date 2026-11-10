import z from "zod";
import { BlogWriteSchema } from "./Blogs.types";

export const ChatBlogSchema = z.object({
    _id: z.string().regex(/^[a-f\d]{24}$/i),
    title: z.string().min(1),
    slug: BlogWriteSchema.shape.slug,
});

export type ChatBlog = z.infer<typeof ChatBlogSchema>;

export const ChatErrorResponseSchema = z.object({
    success: z.literal(false),
    error: z.string().trim().min(1),
});

export const ChatResponseSchema = z.object({
    success: z.literal(true),
    text: z.string().refine(value => !!value.trim(), "Chat response must not be empty"),
    blogs: z.array(ChatBlogSchema).default([]),
});
