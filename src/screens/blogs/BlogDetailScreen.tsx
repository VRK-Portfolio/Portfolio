'use client';
import { useParams } from "next/navigation";
import { useBlogById, useBlogListing } from "@/hooks/useBlogListing";
import Image from "next/image";
import Badge from "@/block/ui/badge/Badge";
import { formatDate, truncateText } from "@/libs/utils";
import './blog-screen.css'
import { MoveUpRight } from "lucide-react";
import Link from "next/link";
import Card from "@/block/ui/card/Card";
import CardLoading from "@/block/ui/card/CardLoading";
import BlogDetailLoading from "./BlogDetailLoading";

const BlogDetailScreen = () => {
    const { id } = useParams();
    const { blogDetail, isLoading, isError, error } = useBlogById(id);
    const { blogs, isLoading: isBlogsLoading, isError: isBlogsError, error: blogsError } = useBlogListing(id);

    if (isLoading) {
        return <BlogDetailLoading />;
    }

    if (isError) {
        return (
            <div className="cmp-blog-detail">
                <div className="container">
                    <p role="alert" className="col-span-12">{error?.message}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="cmp-blog-detail">
                {blogDetail && (
                    <div className="container">
                        <div className="col-span-12 lg:col-span-8">
                            {
                                blogDetail.coverImage && (
                                    <Image className="cmp-blog-detail__cover-image" src={blogDetail.coverImage} alt={blogDetail.title} width={800} height={100} />
                                )
                            }
                            <h1>{blogDetail.title}</h1>
                            <p className="cmp-blog-detail__date mb-3"><strong>Published on: </strong>{formatDate(blogDetail.createdAt)}</p>
                            <div className="cmp-blog-detail__skills">
                                {
                                    blogDetail.skills?.map((skill, index) => (
                                        <Badge key={index}>{skill.name}</Badge>
                                    ))
                                }
                            </div>
                            <div className="rich-text" dangerouslySetInnerHTML={{ __html: blogDetail.content }}></div>
                        <hr/>
                        </div>
                        <div className="col-span-12 lg:col-span-4">
                            <h4 className="mb-3">Similar Blogs</h4>
                            {isBlogsLoading && (
                                <div role="status" aria-label="Loading similar blogs" aria-busy="true" className="flex flex-col gap-3">
                                    {Array.from({ length: 3 }, (_, index) => <CardLoading key={index} />)}
                                </div>
                            )}
                            {isBlogsError && <p role="alert">{blogsError?.message}</p>}
                            <div className="cmp-recent-blogs inline-flex w-full flex-col gap-3">
                            {blogs?.map((blog) => (
                                <Card Tag="article" key={blog._id ?? blog.slug}>
                                    {blog.coverImage && <Card.Image imageUrl={blog.coverImage} />}
                                    <Card.Heading Tag="h3">{blog.title}</Card.Heading>
                                    <Card.Body>
                                        <div className="cmp-recent-blogs__technologies">
                                            <div className="cmp-recent-blogs__technologies-list inline-flex gap-3 my-4">
                                                {blog.skills?.map(skill => (
                                                    <Badge key={skill._id}>{skill.name}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <p>
                                            {truncateText(blog.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim(), 100)}
                                        </p>
                                    </Card.Body>
                                    <Card.Footer>
                                        <Link className="cmp-recent-blogs__link-detail inline-flex gap-2 items-center" href={`/blogs/${blog.slug}`}>
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
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default BlogDetailScreen;