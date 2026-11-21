import type { Metadata } from "next";
import RecentBlogsComponent from "@/components/site/recent-blogs/recent-blogs";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getPublicProfile, getPublishedBlogs } from "@/libs/public-data";
import { SITE_ORIGIN } from "@/libs/site-url";
import { truncateText } from "@/libs/utils";

export async function generateMetadata(): Promise<Metadata> {
    const [profile, blogs] = await Promise.all([getPublicProfile(), getPublishedBlogs()]);
    const title = `Mastra AI, EDS & Frontend Blogs${profile ? ` | ${profile.name}` : ""}`;
    const topics = [...new Set(blogs.map(blog => blog.category))].join(", ");
    const description = truncateText(
        `Explore ${profile ? `${profile.name}'s` : "the portfolio's"} ${blogs.length} published technical ${blogs.length === 1 ? "article" : "articles"}${topics ? ` on ${topics}` : ""}. Discover practical tutorials, implementation guides, and real-world frontend engineering insights.`,
        157,
    );
    const url = `${SITE_ORIGIN}/blogs`;
    const images = profile ? [{ url: profile.avatar_url, alt: profile.name }] : [];
    return {
        title: { absolute: title }, description,
        alternates: { canonical: url },
        openGraph: { type: "website", title, description, url, images },
        twitter: { card: "summary", title, description, images },
    };
}

export default async function BlogsPage() {
    const blogs = await getPublishedBlogs();
    const queryClient = new QueryClient();
    queryClient.setQueryData(["blogListing", undefined], blogs);
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <RecentBlogsComponent title="Blogs" headingTag="h1" className="section" />
        </HydrationBoundary>
    );
}
