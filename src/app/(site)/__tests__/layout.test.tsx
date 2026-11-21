import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { generateMetadata } from "../layout";

const mocks = vi.hoisted(() => ({ connectDB: vi.fn(), findOne: vi.fn() }));
vi.mock("@/libs/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/basic-info.model", () => ({ BasicInfoModel: { findOne: mocks.findOne } }));

const info = {
    name: "Portfolio Author",
    bio: "Building accessible web applications.",
    website_url: "https://portfolio.example",
    avatar_url: "/images/avatar.png",
    favicon_url: "/images/favicon.svg",
};

function queryResult(record: unknown) {
    const query = { select: vi.fn(), lean: vi.fn(), exec: vi.fn().mockResolvedValue(record) };
    query.select.mockReturnValue(query);
    query.lean.mockReturnValue(query);
    return query;
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.findOne.mockReturnValue(queryResult(info));
    vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("Public layout metadata from basic info", () => {
    test("uses saved profile fields for SEO, social sharing, and icons", async () => {
        expect(await generateMetadata()).toEqual({
            metadataBase: new URL("https://www.vijayrameshkumar.dev"),
            title: { default: "Portfolio Author | Mastra AI & EDS Frontend Engineer", template: "%s | Portfolio Author" },
            description: info.bio,
            authors: [{ name: info.name, url: "https://www.vijayrameshkumar.dev" }],
            creator: info.name,
            icons: { icon: info.favicon_url, shortcut: info.favicon_url, apple: "/apple-touch-icon.png" },
            openGraph: {
                type: "website", title: "Portfolio Author | Mastra AI & EDS Frontend Engineer", description: info.bio,
                siteName: "Portfolio Author | Mastra AI & EDS Frontend Engineer", images: [{ url: info.avatar_url, alt: info.name }],
                url: "https://www.vijayrameshkumar.dev",
            },
            twitter: {
                card: "summary", title: "Portfolio Author | Mastra AI & EDS Frontend Engineer", description: info.bio,
                images: [{ url: info.avatar_url, alt: info.name }],
            },
        });
        expect(mocks.connectDB).toHaveBeenCalledOnce();
        expect(mocks.findOne).toHaveBeenCalledWith();
    });

    test("highlights Mastra AI and EDS within 50-60 characters and preserves child title templates", async () => {
        mocks.findOne.mockReturnValue(queryResult({ ...info, name: "Vijay Rameshkumar" }));
        const metadata = await generateMetadata();
        expect(metadata.title).toEqual({
            default: "Vijay Rameshkumar | Mastra AI & EDS Frontend Engineer",
            template: "%s | Vijay Rameshkumar",
        });
        const title = metadata.title;
        if (!title || typeof title === "string" || !("default" in title) || !title.default) {
            throw new Error("Expected a default portfolio title.");
        }
        expect(title.default.length).toBeGreaterThanOrEqual(50);
        expect(title.default.length).toBeLessThanOrEqual(60);
        expect(metadata.openGraph).toMatchObject({ title: title.default });
        expect(metadata.twitter).toMatchObject({ title: title.default });
    });

    test("exposes only the public fields required for metadata from the shared profile read", async () => {
        const query = queryResult({ ...info, email: "private@example.test", phone: "1234567890", address: "Private address" });
        mocks.findOne.mockReturnValue(query);
        const metadata = await generateMetadata();
        expect(query.lean).toHaveBeenCalledOnce();
        expect(JSON.stringify(metadata)).not.toContain("private@example.test");
        expect(JSON.stringify(metadata)).not.toContain("Private address");
        expect(metadata.alternates).toBeUndefined();
    });

    test("uses a separate 150-220 character SEO description consistently without replacing the visible bio", async () => {
        const description = "Explore this developer portfolio featuring React, Next.js, TypeScript, and MongoDB projects, enterprise frontend experience, AI-powered applications, technical blogs, and certifications.";
        expect(description.length).toBeGreaterThanOrEqual(150);
        expect(description.length).toBeLessThanOrEqual(220);
        mocks.findOne.mockReturnValue(queryResult({ ...info, meta_description: `  ${description}  ` }));
        const metadata = await generateMetadata();
        expect(metadata.description).toBe(description);
        expect(metadata.openGraph).toMatchObject({ description });
        expect(metadata.twitter).toMatchObject({ description });
        expect(info.bio).toBe("Building accessible web applications.");
    });

    test.each(["", "  "])("falls back to the existing bio when the SEO description is blank: %j", async meta_description => {
        mocks.findOne.mockReturnValue(queryResult({ ...info, meta_description }));
        expect((await generateMetadata()).description).toBe(info.bio);
    });

    test.each([149, 221])("rejects an invalid saved SEO description of length %i", async length => {
        mocks.findOne.mockReturnValue(queryResult({ ...info, meta_description: "a".repeat(length) }));
        await expect(generateMetadata()).rejects.toThrow();
    });

    test("uses fresh saved values and supports absolute image/icon URLs", async () => {
        await generateMetadata();
        mocks.findOne.mockReturnValue(queryResult({
            ...info, name: "Updated Author", bio: "Updated biography.",
            avatar_url: "https://images.example/avatar.png", favicon_url: "https://images.example/favicon.png",
        }));
        const metadata = await generateMetadata();
        expect(metadata.title).toEqual({ default: "Updated Author | Mastra AI & EDS Frontend Engineer", template: "%s | Updated Author" });
        expect(metadata.description).toBe("Updated biography.");
        expect(metadata.icons).toEqual({ icon: "https://images.example/favicon.png", shortcut: "https://images.example/favicon.png", apple: "/apple-touch-icon.png" });
        expect(metadata.openGraph).toMatchObject({ images: [{ url: "https://images.example/avatar.png", alt: "Updated Author" }] });
    });

    test("explicitly reports missing setup without inventing personal information", async () => {
        mocks.findOne.mockReturnValue(queryResult(null));
        expect(await generateMetadata()).toEqual({ title: "Portfolio", icons: { apple: "/apple-touch-icon.png" } });
        expect(console.warn).toHaveBeenCalledOnce();
    });

    test("uses the canonical deployment origin instead of an outdated saved website URL", async () => {
        mocks.findOne.mockReturnValue(queryResult({ ...info, website_url: "http://vjyramesh.github.io" }));
        const metadata = await generateMetadata();
        expect(metadata.metadataBase).toEqual(new URL("https://www.vijayrameshkumar.dev"));
        expect(metadata.authors).toEqual([{ name: info.name, url: "https://www.vijayrameshkumar.dev" }]);
    });

    test("propagates database failures instead of returning success-shaped metadata", async () => {
        mocks.connectDB.mockRejectedValue(new Error("Database unavailable"));
        await expect(generateMetadata()).rejects.toThrow("Database unavailable");
        expect(mocks.findOne).not.toHaveBeenCalled();
    });
});
