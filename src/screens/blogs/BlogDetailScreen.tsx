'use client';
import { useParams } from "next/navigation";
import { useBlogById, useBlogListing } from "@/hooks/useBlogListing";
import Image from "next/image";
import Badge from "@/block/ui/badge/Badge";
import { formatDate, htmlToPlainText, truncateText } from "@/libs/utils";
import './blog-screen.css'
import { MoveUpRight } from "lucide-react";
import Link from "next/link";
import Card from "@/block/ui/card/Card";
import CardLoading from "@/block/ui/card/CardLoading";
import BlogDetailLoading from "./BlogDetailLoading";
import StructuredData from "@/components/site/structured-data/StructuredData";
import { blogDetailStructuredData } from "@/libs/structured-data";
import ShareLinks from "@/components/site/share-links/ShareLinks";
import { SITE_ORIGIN } from "@/libs/site-url";

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
                        {blogDetail.status === 'published' && <StructuredData data={blogDetailStructuredData(blogDetail)} />}
                        <div className="col-span-12 lg:col-span-8">
                            {
                                blogDetail.coverImage && (
                                    <Image className="cmp-blog-detail__cover-image" src={blogDetail.coverImage} alt={blogDetail.title} width={800} height={400} sizes="(min-width: 1024px) 53vw, 100vw" loading="eager" fetchPriority="high" />
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
                            {blogDetail.status === 'published' && <ShareLinks title={blogDetail.title} url={`${SITE_ORIGIN}/blogs/${blogDetail.slug}`} />}
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
                            {blogs?.filter(blog => blog.status === 'published').map((blog) => (
                                <Card Tag="article" key={blog._id ?? blog.slug}>
                                    {blog.coverImage && <Card.Image imageUrl={blog.coverImage} alt={blog.title} sizes="(min-width: 1024px) 26vw, 100vw" />}
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
                                            {truncateText(htmlToPlainText(blog.content), 100)}
                                        </p>
                                    </Card.Body>
                                    <Card.Footer>
                                        <Link className="cmp-recent-blogs__link-detail inline-flex gap-2 items-center" href={`/blogs/${blog.slug}`}>
                                            Read {blog.title}
                                            <span>
                                                <MoveUpRight className="size-4" />
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