import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import StructuredData from "../StructuredData";
import { blogDetailStructuredData } from "@/libs/structured-data";

const post = {
    title: "A published post", slug: "published-post", category: "Development",
    status: "published" as const, author: "Guest Author", coverImage: "/cover.png",
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z",
};

describe("Component JSON-LD scripts", () => {
    test("escapes stored content while preserving its value in valid JSON", () => {
        const title = '</script><script>alert("injected")</script>';
        const { container } = render(<StructuredData data={blogDetailStructuredData({ ...post, title })} />);
        expect(container.querySelectorAll("script")).toHaveLength(1);
        const script = container.querySelector('script[type="application/ld+json"]')!;
        expect(script.innerHTML).not.toContain(title);
        expect(script.innerHTML).toContain("\\u003c/script>");
        expect(JSON.parse(script.textContent!)["@graph"][0].headline).toBe(title);
    });

    test("handles detail API date strings, relative covers, guest authors, and linked breadcrumbs", () => {
        const { container } = render(<StructuredData data={blogDetailStructuredData(post)} />);
        const data = JSON.parse(container.querySelector("script")!.textContent!);
        const article = data["@graph"][0];
        expect(article).toMatchObject({
            "@type": "BlogPosting", headline: post.title,
            url: "https://www.vijayrameshkumar.dev/blogs/published-post",
            image: "https://www.vijayrameshkumar.dev/cover.png",
            author: { "@type": "Person", name: "Guest Author" },
            datePublished: post.createdAt, dateModified: post.updatedAt,
        });
        expect(data["@graph"][1].mainEntity).toEqual({ "@id": article["@id"] });
        const breadcrumb = data["@graph"][2];
        expect(data["@graph"][1].breadcrumb).toEqual({ "@id": breadcrumb["@id"] });
        expect(breadcrumb.itemListElement[2]).toMatchObject({ position: 3, name: post.title, item: article.url });
    });

    test("does not invent missing dates, images, or author names", () => {
        const { container } = render(<StructuredData data={blogDetailStructuredData({
            ...post, createdAt: undefined, updatedAt: undefined, coverImage: "", author: "",
        })} />);
        const article = JSON.parse(container.querySelector("script")!.textContent!)["@graph"][0];
        expect(article.datePublished).toBeUndefined();
        expect(article.dateModified).toBeUndefined();
        expect(article.image).toBeUndefined();
        expect(article.author).toBeUndefined();
    });
});
