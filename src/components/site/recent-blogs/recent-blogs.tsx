import SectionHeading from "@/block/site/section-heading/section-heading";
import Badge from "@/block/ui/badge/Badge";
import Button from "@/block/ui/button/Button";
import Card from "@/block/ui/card/Card";
import { formatDate, truncateText } from "@/libs/utils";
import Link from "next/link";
import './recent-blogs.css';
import { MoveUpRight } from "lucide-react";
import { useBlogListing } from "@/hooks/useBlogListing";

interface RecentBlogsProps {
    maxCount?: number;
    className?: string;
    type?: 'site' | 'admin';
    modalOpen?: (id?: string) => void;
    onDelete?: (id: string) => void;
    isDeleting?: boolean;
    deletingId?: string;
    deleteError?: string;
}

const RecentBlogsComponent = ({ maxCount, className, type = 'site', modalOpen, onDelete, isDeleting = false, deletingId, deleteError }: RecentBlogsProps) => {
    const { blogs, isLoading, isError, error } = useBlogListing();
    const visibleBlogs = maxCount === undefined ? blogs : blogs && blogs.slice(0, maxCount);
    if (isLoading) {
        return (
            <section className="cmp-recent-blogs">
                <p>Loading...</p>
            </section>
        );
    }

    if (isError) {
        return (
            <section className="cmp-recent-blogs">
                <p role="alert" className="cmp-recent-blogs__error">{error?.message}</p>
            </section>
        );
    }
    return (
        <section className={`cmp-recent-blogs ${className ?? ''} ${type === 'admin' ? 'cmp-admin__type' : ''}`}>
            <div className="container">

                {
                    type === 'admin' ? (
                        <>
                            <div className="container">
                                <div className="cmp-admin__heading-actions">
                                    <SectionHeading title="Recent Blogs" subtitle="Check out my latest blog posts" />
                                    <Button variant="primary" className='cmp-my-skills__add-skill w-40' onClick={() => modalOpen?.()}>New Blog</Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="container pl-20!">
                                <SectionHeading title="Recent Blogs" subtitle="Check out my latest blog posts" />
                            </div>
                        </>
                    )
                }


                {type === 'admin' && deleteError && <p role="alert" className="mb-4 text-red-500">{deleteError}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleBlogs && visibleBlogs.map(blog => (
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
                                        {/* {blog.createdAt && formatDate(new Date(blog.createdAt))} */}
                                    </div>
                                </div>
                                <p>
                                    {truncateText(blog.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim())}
                                </p>
                            </Card.Body>
                            <Card.Footer>
                                <Link className="cmp-recent-blogs__link-detail" href={`/blogs/${blog.slug}`}>
                                    Click Here
                                    <span>
                                        <MoveUpRight className="size-4" />
                                        <span className="sr-only">View Blog in new tab</span>
                                    </span>
                                </Link>


                {
                    type === 'admin' ? (
                        <>
                        <div className="cmp-admin__blog-actions mt-3 inline-flex gap-2 w-full">
                            <Button variant="primary" outline className='cmp-my-skills__add-skill w-40' disabled={!blog._id || !modalOpen} onClick={() => modalOpen?.(blog._id)}>Edit Blog</Button>
                            <Button variant="danger" outline className='cmp-my-skills__add-skill w-40' disabled={!blog._id || !onDelete || isDeleting} onClick={() => blog._id && onDelete?.(blog._id)}>
                                {isDeleting && deletingId === blog._id ? 'Deleting...' : 'Delete Blog'}
                            </Button>
                        </div>
                        </>
                    ) : null
                }
                            </Card.Footer>
                        </Card>
                    ))}
                </div>

                <div className="cmp-recent-blogs__view-more">
                    {
                        maxCount !== undefined &&
                        blogs && blogs.length > maxCount && (
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