import z from "zod";
import { urlOrRelativePath } from "@/libs/utils";

export const BlogsTypeSchema = z.object({
    _id: z.string().optional(),
    title: z.string(),
    slug: z.string(),
    category: z.string(),
    skills: z.array(z.string()).optional(),
    content: z.string(),
    status: z.enum(["draft", "published"]).default("draft").optional(),
    author: z.string().default("Vijay Rameshkumar").optional(),
    createdAt: z.date().optional(),
    coverImage: z.string().optional(),
    updatedAt: z.date().optional()
})

export type BlogType = z.infer<typeof BlogsTypeSchema>;

export const BlogWriteSchema = BlogsTypeSchema.omit({
    _id: true, createdAt: true, updatedAt: true,
}).extend({
    title: z.string().trim().min(1, "Title is required"),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug with words separated by hyphens"),
    category: z.string().trim().min(1, "Category is required"),
    content: z.string().refine(
        value => /<(?:img|table|hr)\b/i.test(value) || !!value.replace(/<[^>]*>/g, "").replace(/&(?:nbsp|#160|#xA0);/gi, " ").trim(),
        "Blog content is required"
    ),
    skills: z.array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid skill ID")).default([]),
    coverImage: z.string().trim().pipe(urlOrRelativePath.or(z.literal(""))).optional(),
});

export type BlogWriteType = z.infer<typeof BlogWriteSchema>;

export const BlogListingSchema = BlogsTypeSchema.extend({
    skills: z.array(z.object({
        _id: z.string(),
        name: z.string(),
    })).optional(),
});

export type BlogListingType = z.infer<typeof BlogListingSchema>;
