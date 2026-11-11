import { beforeEach, describe, expect, test, vi } from "vitest";
import type { BlogType } from "@/@types/Blogs.types";
import { BasicInfoModel } from "@/models/basic-info.model";
import { BlogModel } from "@/models/blogs.model";
import { basicInfoMock } from "@/mocks/basic-info";
import sitemap, { dynamic } from "../sitemap";

const blogData = {
    title: "Published article",
    slug: "published-article",
    category: "Engineering",
    content: "<p>Public article content.</p>",
    status: "published",
} satisfies BlogType;

describe("sitemap.xml", () => {
    beforeEach(async () => {
        await BasicInfoModel.create({ ...basicInfoMock[0], website_url: "https://portfolio.example/" });
    });

    test("includes the homepage and every published blog with real saved modification dates", async () => {
        await BlogModel.create([
            { ...blogData, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" },
            { ...blogData, slug: "another-article", createdAt: "2026-01-02T00:00:00.000Z" },
            { ...blogData, slug: "unpublished-article", status: "draft" },
        ]);
        expect(await sitemap()).toEqual([
            { url: "https://portfolio.example/" },
            { url: "https://portfolio.example/blogs/another-article", lastModified: new Date("2026-01-02T00:00:00.000Z") },
            { url: "https://portfolio.example/blogs/published-article", lastModified: new Date("2026-02-01T00:00:00.000Z") },
        ]);
    });

    test("returns only the homepage when there are no published blogs", async () => {
        expect(await sitemap()).toEqual([{ url: "https://portfolio.example/" }]);
    });

    test("does not invent timestamps for blogs without saved dates", async () => {
        await BlogModel.create(blogData);
        const entries = await sitemap();
        expect(entries[1]).toEqual({
            url: "https://portfolio.example/blogs/published-article",
            lastModified: undefined,
        });
    });

    test("reflects publishing, unpublishing, and deletion without rebuilding", async () => {
        expect(dynamic).toBe("force-dynamic");
        const blog = await BlogModel.create({ ...blogData, status: "draft" });
        expect(await sitemap()).toHaveLength(1);
        await BlogModel.updateOne({ _id: blog._id }, { status: "published" });
        expect(await sitemap()).toHaveLength(2);
        await BlogModel.updateOne({ _id: blog._id }, { status: "draft" });
        expect(await sitemap()).toHaveLength(1);
        await BlogModel.updateOne({ _id: blog._id }, { status: "published" });
        await BlogModel.deleteOne({ _id: blog._id });
        expect(await sitemap()).toHaveLength(1);
    });

    test("uses only the configured website origin", async () => {
        await BasicInfoModel.updateOne({}, { website_url: "https://updated.example/portfolio?preview=1#about" });
        await BlogModel.create(blogData);
        expect((await sitemap()).map(entry => entry.url)).toEqual([
            "https://updated.example/",
            "https://updated.example/blogs/published-article",
        ]);
    });

    test("surfaces missing site configuration rather than generating placeholder URLs", async () => {
        await BasicInfoModel.deleteMany({});
        await expect(sitemap()).rejects.toThrow("Configure the Basic Info website URL");
    });

    test.each(["not-a-url", "ftp://portfolio.example"])("rejects an invalid website URL: %s", async website_url => {
        await BasicInfoModel.updateOne({}, { website_url });
        await expect(sitemap()).rejects.toThrow();
    });

    test.each([
        { slug: "bad/slug" },
        { updatedAt: "not-a-date" },
    ])("surfaces invalid saved blog metadata: %j", async fields => {
        await BlogModel.create({ ...blogData, ...fields });
        await expect(sitemap()).rejects.toThrow();
    });

    test("propagates blog query failures instead of returning an incomplete sitemap", async () => {
        const spy = vi.spyOn(BlogModel, "find").mockImplementationOnce(() => {
            throw new Error("Blog database unavailable");
        });
        try {
            await expect(sitemap()).rejects.toThrow("Blog database unavailable");
        } finally {
            spy.mockRestore();
        }
    });
});
