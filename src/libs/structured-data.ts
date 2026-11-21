import type { BasicInfoType } from "@/@types/BasicInfo.types";
import type { BlogType } from "@/@types/Blogs.types";
import type { CertificationType } from "@/@types/Certification.types";
import type { ExperienceType } from "@/@types/Experience.types";
import type { MySkillsType } from "@/@types/MySkills.types";
import { SITE_ORIGIN } from "./site-url";

export const STRUCTURED_DATA_ORIGIN = SITE_ORIGIN;

type Profile = Pick<BasicInfoType, "name" | "bio" | "avatar_url" | "github_url" | "linked_in_url">;
type StructuredBlog = Pick<BlogType, "title" | "slug" | "category" | "status" | "author" | "coverImage"> & {
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
type StructuredCertification = Pick<CertificationType, "title" | "issuer" | "credentialID" | "credentialURL" | "skillsCoverd">;
type JsonValue = string | number | boolean | null | JsonLd | JsonValue[];
export type JsonLd = { [key: string]: JsonValue | undefined };

const absoluteUrl = (path: string) => new URL(path, `${STRUCTURED_DATA_ORIGIN}/`).href;
const personId = absoluteUrl("/#person");
const websiteId = absoluteUrl("/#website");
const homeUrl = absoluteUrl("/");
const blogsUrl = absoluteUrl("/blogs");

const graph = (nodes: JsonLd[]): JsonLd => ({ "@context": "https://schema.org", "@graph": nodes });

function sectionStructuredData(id: string, name: string, person: JsonLd): JsonLd {
    return graph([
        { "@type": "Person", "@id": personId, ...person },
        {
            "@type": "WebPageElement", "@id": absoluteUrl(`/#${id}`), name,
            isPartOf: { "@id": homeUrl }, about: { "@id": personId },
        },
    ]);
}

export function profileStructuredData(profile: Profile): JsonLd {
    return graph([
        { "@type": "WebSite", "@id": websiteId, url: homeUrl, name: `${profile.name} | Portfolio`, publisher: { "@id": personId } },
        {
            "@type": "Person", "@id": personId,
            name: profile.name, description: profile.bio, url: homeUrl,
            image: absoluteUrl(profile.avatar_url),
            sameAs: [profile.github_url, profile.linked_in_url],
        },
        {
            "@type": "ProfilePage", "@id": homeUrl, url: homeUrl,
            name: `${profile.name} | Portfolio`, mainEntity: { "@id": personId },
            isPartOf: { "@id": websiteId }, inLanguage: "en",
        },
    ]);
}

export function skillsStructuredData(skills: Pick<MySkillsType, "name" | "capabilities">[]): JsonLd {
    return sectionStructuredData("Skills", "My Skills", {
        knowsAbout: [...new Set(skills.flatMap(skill => [skill.name, ...skill.capabilities]))],
    });
}

export function experienceStructuredData(experiences: ExperienceType[]): JsonLd {
    return sectionStructuredData("Experience", "My Experience", {
        memberOf: experiences.flatMap(experience => experience.positions.map(position => ({
            "@type": "OrganizationRole",
            roleName: position.role,
            startDate: new Date(position.startDate).toISOString().slice(0, 10),
            endDate: position.isCurrentPosition || !position.endDate
                ? undefined : new Date(position.endDate).toISOString().slice(0, 10),
            description: position.description,
            memberOf: { "@type": "Organization", name: experience.company },
        }))),
    });
}

export function certificationsStructuredData(certifications: StructuredCertification[]): JsonLd {
    return sectionStructuredData("Certifications", "Certifications", {
        hasCredential: certifications.map(certification => ({
            "@type": "EducationalOccupationalCredential",
            name: certification.title,
            identifier: certification.credentialID,
            url: absoluteUrl(certification.credentialURL),
            recognizedBy: { "@type": "Organization", name: certification.issuer },
            competencyRequired: certification.skillsCoverd,
        })),
    });
}

function blogPosting(blog: StructuredBlog): JsonLd {
    const url = absoluteUrl(`/blogs/${encodeURIComponent(blog.slug)}`);
    const author = blog.author?.trim();
    return {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        url,
        headline: blog.title,
        articleSection: blog.category,
        image: blog.coverImage ? absoluteUrl(blog.coverImage) : undefined,
        datePublished: blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
        dateModified: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
        author: author ? { "@type": "Person", name: author } : undefined,
        publisher: { "@id": personId },
        mainEntityOfPage: { "@id": url },
        isPartOf: { "@id": `${blogsUrl}#blog` },
        inLanguage: "en",
    };
}

function breadcrumbStructuredData(url: string, blog?: StructuredBlog): JsonLd {
    const crumbs = [
        { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
        { "@type": "ListItem", position: 2, name: "Blogs", item: blogsUrl },
    ];
    if (blog) {
        crumbs.push({ "@type": "ListItem", position: 3, name: blog.title, item: url });
    }
    return { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: crumbs };
}

export function blogsStructuredData(blogs: StructuredBlog[], isListing: boolean): JsonLd {
    const url = isListing ? blogsUrl : homeUrl;
    const listId = `${url}#blog-list`;
    const articles = blogs.filter(blog => blog.status === "published").map(blogPosting);
    const nodes: JsonLd[] = [
        {
            "@type": "Blog", "@id": `${blogsUrl}#blog`, url: blogsUrl, name: "Blogs",
            publisher: { "@id": personId }, blogPost: articles.map(article => ({ "@id": article["@id"] })),
        },
        {
            "@type": "ItemList", "@id": listId,
            numberOfItems: articles.length,
            itemListElement: articles.map((article, index) => ({
                "@type": "ListItem", position: index + 1, item: { "@id": article["@id"] },
            })),
        },
    ];
    if (isListing) {
        nodes.push({
            "@type": "CollectionPage", "@id": blogsUrl, url: blogsUrl, name: "Blogs",
            isPartOf: { "@id": websiteId }, mainEntity: { "@id": listId },
            breadcrumb: { "@id": `${blogsUrl}#breadcrumb` }, inLanguage: "en",
        }, breadcrumbStructuredData(blogsUrl));
    } else {
        nodes.push({
            "@type": "WebPageElement", "@id": absoluteUrl("/#Blogs"), name: "Recent Blogs",
            isPartOf: { "@id": homeUrl }, mainEntity: { "@id": listId },
        });
    }
    return graph([...nodes, ...articles]);
}

export function blogDetailStructuredData(blog: StructuredBlog): JsonLd {
    const article = blogPosting(blog);
    const url = absoluteUrl(`/blogs/${encodeURIComponent(blog.slug)}`);
    return graph([
        article,
        {
            "@type": "WebPage", "@id": url, url, name: blog.title,
            isPartOf: { "@id": websiteId }, mainEntity: { "@id": article["@id"] },
            breadcrumb: { "@id": `${url}#breadcrumb` }, inLanguage: "en",
        },
        breadcrumbStructuredData(url, blog),
    ]);
}

export function serializeStructuredData(data: JsonLd): string {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}
