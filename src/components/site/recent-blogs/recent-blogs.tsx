'use client';

import SectionHeading from "@/block/site/section-heading/section-heading";
import Badge from "@/block/ui/badge/Badge";
import Button from "@/block/ui/button/Button";
import Card from "@/block/ui/card/Card";
import CardLoading from "@/block/ui/card/CardLoading";
import { htmlToPlainText, truncateText } from "@/libs/utils";
import { TransitionLink as Link } from "@/components/site/page-transition/PageTransition";
import './recent-blogs.css';
import { MoveUpRight } from "lucide-react";
import { useBlogListing } from "@/hooks/useBlogListing";
import StructuredData from "@/components/site/structured-data/StructuredData";
import { blogsStructuredData } from "@/libs/structured-data";

interface RecentBlogsProps {
    title?: string;
    headingTag?: 'h1' | 'h2';
    maxCount?: number;
    className?: string;
    type?: 'site' | 'admin';
    modalOpen?: (id?: string) => void;
    onDelete?: (id: string) => void;
    isDeleting?: boolean;
    deletingId?: string;
    deleteError?: string;
}

const RecentBlogsComponent = ({ title = 'Recent Blogs', headingTag = 'h2', maxCount, className, type = 'site', modalOpen, onDelete, isDeleting = false, deletingId, deleteError }: RecentBlogsProps) => {
    const { blogs, isLoading, isError, error } = useBlogListing();
    const filteredBlogs = type === 'admin' ? blogs : blogs?.filter(blog => blog.status === 'published');
    const visibleBlogs = maxCount === undefined ? filteredBlogs : filteredBlogs?.slice(0, maxCount);
    if (isLoading) {
        if (type === 'site') {
            return (
                <section id="Blogs" role="status" aria-label="Loading blogs" aria-busy="true" className={`cmp-recent-blogs ${className ?? ''}`}>
                    <div className="container">
                        <SectionHeading Tag={headingTag} title={title} subtitle="Check out my latest blog posts" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: maxCount ?? 6 }, (_, index) => <CardLoading key={index} />)}
                        </div>
                    </div>
                </section>
            );
        }
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
        <section id="Blogs" className={`cmp-recent-blogs ${className ?? ''} ${type === 'admin' ? 'cmp-admin__type' : ''}`}>
            {type === 'site' && visibleBlogs && (
                <StructuredData data={blogsStructuredData(visibleBlogs, headingTag === 'h1')} />
            )}
            <div className="container">

                {
                    type === 'admin' ? (
                        <>
                            <div className="cmp-admin__heading-actions">
                                <SectionHeading Tag={headingTag} title={title} subtitle="Check out my latest blog posts" />
                                <Button variant="primary" className='cmp-my-skills__add-skill w-40' onClick={() => modalOpen?.()}>New Blog</Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <SectionHeading Tag={headingTag} title={title} subtitle="Check out my latest blog posts" />
                        </>
                    )
                }


                {type === 'admin' && deleteError && <p role="alert" className="mb-4 text-red-500">{deleteError}</p>}
                {type === 'site' && filteredBlogs?.length === 0 && <p>No published blogs yet.</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleBlogs && visibleBlogs.map(blog => (
                        <Card Tag="article" key={blog._id ?? blog.slug}>
                            {blog.coverImage && <Card.Image imageUrl={blog.coverImage} alt={blog.title} sizes="(min-width: 1024px) 26vw, (min-width: 768px) 48vw, 100vw" />}
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
                                    {truncateText(htmlToPlainText(blog.content), 150)}
                                </p>
                            </Card.Body>
                            <Card.Footer>
                                <Link className="cmp-recent-blogs__link-detail" href={`/blogs/${blog.slug}`} aria-label={`Click Here: ${blog.title}`}>
                                    Click Here
                                    <span className="sr-only">: {blog.title}</span>
                                    <span>
                                        <MoveUpRight className="size-4" />
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
                        filteredBlogs && filteredBlogs.length > maxCount && (
                            <Link href="/blogs" className="cmp-button cmp-button__primary cmp-button__medium inline-block">
                                View More
                            </Link>
                        )
                    }
                </div>
            </div>

        </section>
    );
}

export default RecentBlogsComponent;
