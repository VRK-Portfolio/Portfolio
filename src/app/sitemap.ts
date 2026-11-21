import type { MetadataRoute } from "next";
import { BlogsTypeSchema, BlogWriteSchema } from "@/@types/Blogs.types";
import { SITE_ORIGIN } from "@/libs/site-url";
import { connectDB } from "@/libs/db";
import { BlogModel } from "@/models/blogs.model";

export const dynamic = "force-dynamic";

const sitemapBlogSchema = BlogsTypeSchema.pick({
    slug: true,
    createdAt: true,
    updatedAt: true,
}).extend({ slug: BlogWriteSchema.shape.slug });

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    await connectDB();
    const blogs = await BlogModel.find({ status: "published" })
        .select("slug createdAt updatedAt").sort({ slug: 1 }).lean().exec();

    return [
        { url: new URL("/", SITE_ORIGIN).href },
        { url: new URL("/blogs", SITE_ORIGIN).href },
        ...blogs.map(record => {
            const blog = sitemapBlogSchema.parse(record);
            return {
                url: new URL(`/blogs/${blog.slug}`, SITE_ORIGIN).href,
                lastModified: blog.updatedAt ?? blog.createdAt,
            };
        }),
    ];
}
