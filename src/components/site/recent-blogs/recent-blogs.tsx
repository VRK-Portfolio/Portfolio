import SectionHeading from "@/block/site/section-heading/section-heading";
import Badge from "@/block/ui/badge/Badge";
import Button from "@/block/ui/button/Button";
import Card from "@/block/ui/card/Card";
import { formatDate, truncateText } from "@/libs/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BlogType } from "@/@types/Blogs.types";
import './recent-blogs.css';
import { MoveUpRight } from "lucide-react";

const RecentBlogsComponent = ({ maxCount, className }: { maxCount?: number, className?: string }) => {
    const [blogs, setBlogs] = useState<BlogType[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchBlogs = async () => {
        const response = await fetch('/api/blogs')
        try {
            const data = await response.json();
            if (!response.ok) {
                throw new Error('Failed to fetch blogs');
            }
            if (!data.success) {
                throw new Error('Failed to fetch blogs');
            }

            if (maxCount !== undefined) {
                setBlogs(data.data.slice(0, maxCount));
            } else {
                setBlogs(data.data);
            }
        } catch (error) {
            setError('Failed to fetch blogs');
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            await fetchBlogs();
        }
        fetchData();
    }, []);

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
                    {/* {blogs?.map(blog => (
                        <Card Tag="article" key={blog.id}>
                            <Card.Image imageUrl={blog.image_url} />
                            <Card.Heading>{blog.title}</Card.Heading>
                            <Card.Body>
                                <div className="cmp-recent-blogs__technologies">
                                    <div className="cmp-recent-blogs__technologies-list">
                                        {blog.technologies.map(tech => (
                                            <Badge key={tech}>{tech}</Badge>
                                        ))}
                                    </div>
                                    <div className="cmp-recent-blogs__publish-date">
                                        {formatDate(blog.published_at)}
                                    </div>
                                </div>
                                <p>
                                    {truncateText(blog.description)}
                                </p>
                            </Card.Body>
                            <Card.Footer>
                                <Link className="cmp-recent-blogs__link-detail" href={`/blogs/${blog.id}`} target="_blank" rel="noopener noreferrer">
                                    Click Here
                                    <span>
                                        <MoveUpRight className="size-4" />
                                        <span className="sr-only">View Blog in new tab</span>
                                    </span>
                                </Link>
                            </Card.Footer>
                        </Card>
                    ))} */}
                </div>

                <div className="cmp-recent-blogs__view-more">
                    {
                        maxCount !== undefined &&
                        blogs.length >= maxCount && (
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