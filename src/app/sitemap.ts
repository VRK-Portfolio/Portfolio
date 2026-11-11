import type { MetadataRoute } from "next";
import { BlogsTypeSchema, BlogWriteSchema } from "@/@types/Blogs.types";
import { getSiteOrigin } from "@/libs/site-url";
import { BlogModel } from "@/models/blogs.model";

export const dynamic = "force-dynamic";

const sitemapBlogSchema = BlogsTypeSchema.pick({
    slug: true,
    createdAt: true,
    updatedAt: true,
}).extend({ slug: BlogWriteSchema.shape.slug });

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const origin = await getSiteOrigin();
    const blogs = await BlogModel.find({ status: "published" })
        .select("slug createdAt updatedAt").sort({ slug: 1 }).lean().exec();

    return [
        { url: new URL("/", origin).href },
        ...blogs.map(record => {
            const blog = sitemapBlogSchema.parse(record);
            return {
                url: new URL(`/blogs/${blog.slug}`, origin).href,
                lastModified: blog.updatedAt ?? blog.createdAt,
            };
        }),
    ];
}
