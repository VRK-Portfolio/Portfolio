import SectionHeading from "@/block/site/section-heading/section-heading";
import Badge from "@/block/ui/badge/Badge";
import Button from "@/block/ui/button/Button";
import Card from "@/block/ui/card/Card";
import { formatDate, truncateText } from "@/libs/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BlogListingSchema, BlogListingType } from "@/@types/Blogs.types";
import './recent-blogs.css';
import { MoveUpRight } from "lucide-react";

const RecentBlogsComponent = ({ maxCount, className }: { maxCount?: number, className?: string }) => {
    const [blogs, setBlogs] = useState<BlogListingType[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const fetchData = async () => {
            try {
                const response = await fetch('/api/blogs');
                if (!response.ok) {
                    throw new Error('Failed to fetch blogs');
                }
                const data = await response.json();
                if (!data.success) {
                    throw new Error('Failed to fetch blogs');
                }
                const listing = BlogListingSchema.array().parse(data.data);
                if (active) {
                    setBlogs(listing);
                }
            } catch (error) {
                if (active) {
                    console.error('Failed to fetch blogs:', error);
                    setError('Failed to fetch blogs');
                }
            }
        }
        fetchData();
        return () => {
            active = false;
        };
    }, []);

    const visibleBlogs = maxCount === undefined ? blogs : blogs.slice(0, maxCount);

    if (error) {
        return (
            <section className="cmp-recent-blogs">
                <p className="cmp-recent-blogs__error">{error}</p>
            </section>
        );
    }
    return (
        <section className={`cmp-recent-blogs ${className ?? ''}`}>
            <div className="container">
                <SectionHeading title="Recent Blogs" subtitle="Check out my latest blog posts" />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleBlogs.map(blog => (
                        <Card Tag="article" key={blog._id ?? blog.slug}>
                            {blog.coverImage && <Card.Image imageUrl={blog.coverImage} />}
                            <Card.Heading Tag="h3">{blog.title}</Card.Heading>
                            <Card.Body>
                                <div className="cmp-recent-blogs__technologies">
                                    <div className="cmp-recent-blogs__technologies-list">
                                        {blog.skills?.map(skill => (
                                            <Badge key={skill._id}>{skill.name}</Badge>
                                        ))}
                                    </div>
                                    <div className="cmp-recent-blogs__publish-date">
                                        {blog.createdAt && formatDate(new Date(blog.createdAt))}
                                    </div>
                                </div>
                                <p>
                                    {truncateText(blog.content)}
                                </p>
                            </Card.Body>
                            <Card.Footer>
                                <Link className="cmp-recent-blogs__link-detail" href={`/blogs/${blog.slug}`} target="_blank" rel="noopener noreferrer">
                                    Click Here
                                    <span>
                                        <MoveUpRight className="size-4" />
                                        <span className="sr-only">View Blog in new tab</span>
                                    </span>
                                </Link>
                            </Card.Footer>
                        </Card>
                    ))}
                </div>

                <div className="cmp-recent-blogs__view-more">
                    {
                        maxCount !== undefined &&
                        blogs.length > maxCount && (
                            <Button >
                                View More
                            </Button>
                        )
                    }
                </div>
            </div>

        </section>
    );
}

export default RecentBlogsComponent;