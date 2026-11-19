import type { Metadata } from "next";
import RecentBlogsComponent from "@/components/site/recent-blogs/recent-blogs";

export const metadata: Metadata = {
    title: "Blogs",
    description: "Explore all published blog posts.",
};

export default function BlogsPage() {
    return <RecentBlogsComponent title="Blogs" headingTag="h1" className="section" />;
}
