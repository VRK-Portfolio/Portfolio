
import BlogDetailScreen from "@/screens/blogs/BlogDetailScreen";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getPublishedBlog, getPublishedBlogs } from "@/libs/public-data";
import { SITE_ORIGIN } from "@/libs/site-url";
import { htmlToPlainText, truncateText } from "@/libs/utils";

type BlogPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
    const { id } = await params;
    const blog = await getPublishedBlog(id);
    if (!blog) notFound();
    const headline = blog.title.trim();
    const titleEnd = headline.lastIndexOf(" ", 57);
    const title = headline.length > 60 ? `${headline.slice(0, titleEnd > 0 ? titleEnd : 57)}...` : headline;
    const description = truncateText(htmlToPlainText(blog.content) || blog.title, 157);
    const url = `${SITE_ORIGIN}/blogs/${encodeURIComponent(blog.slug)}`;
    const images = blog.coverImage ? [{ url: blog.coverImage, alt: blog.title }] : [];
    return {
        title: { absolute: title }, description,
        authors: blog.author ? [{ name: blog.author }] : undefined,
        keywords: [blog.category, ...(blog.skills?.map(skill => skill.name) ?? [])],
        alternates: { canonical: url },
        openGraph: {
            type: "article", title, description, url, images,
            publishedTime: blog.createdAt?.toISOString(),
            modifiedTime: blog.updatedAt?.toISOString(),
            tags: [blog.category, ...(blog.skills?.map(skill => skill.name) ?? [])],
        },
        twitter: { card: blog.coverImage ? "summary_large_image" : "summary", title, description, images },
    };
}

const BlogDetailPage = async ({ params }: BlogPageProps) => {
    const { id } = await params;
    const blog = await getPublishedBlog(id);
    if (!blog) notFound();
    const blogs = await getPublishedBlogs();
    const queryClient = new QueryClient();
    queryClient.setQueryData(["blogDetail", id], blog);
    queryClient.setQueryData(["blogListing", id], blogs.filter(item => item.slug !== id).slice(0, 3));
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <BlogDetailScreen />
        </HydrationBoundary>
    );
};

export default BlogDetailPage;