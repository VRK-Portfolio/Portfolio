import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { basicInfoMock } from "@/mocks/basic-info";
import { mockMySkills } from "@/mocks/my-skills";
import { mockCertifications } from "@/mocks/certifications";
import { mockBlogListingData } from "@/mocks/recent-blogs";
import RootLayout from "../layout";
import Home from "../page";
import { generateMetadata as listingMetadata } from "../blogs/page";
import BlogPage, { generateMetadata as articleMetadata } from "../blogs/[id]/page";
import { getHomepageData, getPublicProfile, getPublishedBlog, getPublishedBlogs } from "@/libs/public-data";

vi.mock("@/libs/public-data", () => ({
    getHomepageData: vi.fn(), getPublicProfile: vi.fn(), getPublishedBlogs: vi.fn(), getPublishedBlog: vi.fn(),
}));

const post = {
    ...mockBlogListingData[0], author: "Guest Author",
    content: `<h2>Mastra &amp; EDS</h2><p>${"Build reliable frontend applications and AI workflows. ".repeat(8)}</p>`,
    createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-02-01"),
    coverImage: "/cover.png",
};

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPublicProfile).mockResolvedValue(basicInfoMock[0]);
    vi.mocked(getPublishedBlog).mockResolvedValue(post);
    vi.mocked(getPublishedBlogs).mockResolvedValue([post]);
    vi.mocked(getHomepageData).mockResolvedValue({
        skills: mockMySkills, certifications: mockCertifications, blogs: [post],
        experiences: [{
            company: "Example Company", location: "Remote", responsibilites: ["Frontend"],
            positions: [{ role: "Engineer", startDate: new Date("2020-01-01"), isCurrentPosition: true, description: "Building accessible apps." }],
        }],
    });
});

describe("Public SEO rendering and page metadata", () => {
    test("includes the homepage H1, content, and five separate component schema scripts before hydration", async () => {
        const element = await RootLayout({ children: await Home(), params: Promise.resolve({}) });
        const document = new DOMParser().parseFromString(renderToStaticMarkup(element), "text/html");
        expect(document.querySelectorAll("h1")).toHaveLength(1);
        expect(document.querySelector("h1")?.textContent).toBe(`${basicInfoMock[0].name} - Mastra AI & EDS Frontend Engineer`);
        expect(document.querySelector("h1")?.textContent?.length).toBeGreaterThanOrEqual(20);
        expect(document.querySelector("#Skills h3")).toBeNull();
        expect(document.querySelector("#Experience h4")).toBeNull();
        expect(document.querySelector('nav[aria-label="Share this page"]')).toBeNull();
        expect(document.body.textContent).toContain("Example Company");
        expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(5);
        for (const selector of [".cmp-basic-info-banner", "#Skills", "#Experience", "#Certifications", "#Blogs"]) {
            expect(document.querySelector(`${selector} script[type="application/ld+json"]`)).not.toBeNull();
        }
        expect(document.querySelector(".shimmer")).toBeNull();
    });

    test("generates article-specific canonical, plain-text description, author, social image, and dates", async () => {
        const metadata = await articleMetadata({ params: Promise.resolve({ id: post.slug }) });
        expect(getPublishedBlog).toHaveBeenCalledWith(post.slug);
        expect(metadata.title).toEqual({ absolute: post.title });
        expect(metadata.description).toMatch(/^Mastra & EDS Build reliable/);
        expect(metadata.description?.length).toBeLessThanOrEqual(160);
        expect(metadata.description).not.toMatch(/<[^>]*>|&amp;/);
        expect(metadata.authors).toEqual([{ name: "Guest Author" }]);
        expect(metadata.alternates).toEqual({ canonical: `https://www.vijayrameshkumar.dev/blogs/${post.slug}` });
        expect(metadata.openGraph).toMatchObject({
            type: "article", title: post.title, images: [{ url: "/cover.png", alt: post.title }],
            publishedTime: "2026-01-01T00:00:00.000Z", modifiedTime: "2026-02-01T00:00:00.000Z",
        });
        expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: post.title, description: metadata.description });
    });

    test("does not invent article images or dates and rejects unavailable published articles", async () => {
        vi.mocked(getPublishedBlog).mockResolvedValue({ ...post, coverImage: "", createdAt: undefined, updatedAt: undefined });
        const metadata = await articleMetadata({ params: Promise.resolve({ id: post.slug }) });
        expect(metadata.openGraph).toMatchObject({ images: [], publishedTime: undefined, modifiedTime: undefined });
        expect(metadata.twitter).toMatchObject({ card: "summary" });
        vi.mocked(getPublishedBlog).mockResolvedValue(null);
        await expect(articleMetadata({ params: Promise.resolve({ id: "draft" }) })).rejects.toThrow();
        await expect(BlogPage({ params: Promise.resolve({ id: "draft" }) })).rejects.toThrow();
    });

    test("shortens long SEO titles at a word boundary without changing the saved article headline", async () => {
        const headline = "Building Modular React Blocks with WCAG AAA Accessibility Using Agent Skills";
        vi.mocked(getPublishedBlog).mockResolvedValue({ ...post, title: headline });
        const metadata = await articleMetadata({ params: Promise.resolve({ id: post.slug }) });
        const title = metadata.title;
        if (!title || typeof title === "string" || !("absolute" in title)) throw new Error("Expected an absolute article title");
        expect(title.absolute.length).toBeGreaterThanOrEqual(50);
        expect(title.absolute.length).toBeLessThanOrEqual(60);
        expect(title.absolute).toBe("Building Modular React Blocks with WCAG AAA Accessibility...");
        expect(metadata.openGraph).toMatchObject({ title: title.absolute });
        expect(metadata.twitter).toMatchObject({ title: title.absolute });
    });

    test("generates listing-specific metadata using the actual published count and categories", async () => {
        const metadata = await listingMetadata();
        expect(metadata.title).toEqual({ absolute: `Mastra AI, EDS & Frontend Blogs | ${basicInfoMock[0].name}` });
        expect(metadata.description).toContain("1 published technical article");
        expect(metadata.description).toContain(post.category);
        expect(metadata.alternates).toEqual({ canonical: "https://www.vijayrameshkumar.dev/blogs" });
        expect(metadata.openGraph).toMatchObject({ type: "website", url: "https://www.vijayrameshkumar.dev/blogs" });
    });
});
