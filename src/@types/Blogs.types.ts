import z from "zod";

export const BlogsTypeSchema = z.object({
    _id: z.string().optional(),
    title: z.string(),
    slug: z.string(),
    category: z.string(),
    skills: z.array(z.string()).optional(),
    content: z.string(),
    status: z.enum(["draft", "published"]).default("draft").optional(),
    author: z.string().default("Vijay Rameshkumar").optional(),
    createdAt: z.string().optional(),
    coverImage: z.string().optional(),
    updatedAt: z.string().optional()
})

export type BlogType = z.infer<typeof BlogsTypeSchema>;

export const BlogListingSchema = BlogsTypeSchema.extend({
    skills: z.array(z.object({
        _id: z.string(),
        name: z.string(),
    })).optional(),
});

export type BlogListingType = z.infer<typeof BlogListingSchema>;
