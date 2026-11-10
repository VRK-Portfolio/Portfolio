import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getCurrentBlogSkills, isCurrentBlogSkillsQuestion } from "../current-blog-skills";

const mocks = vi.hoisted(() => ({ connectDB: vi.fn(), findOne: vi.fn() }));
vi.mock("@/libs/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/blogs.model", () => ({ BlogModel: { findOne: mocks.findOne } }));

function queryResult(result: unknown) {
    const query = { select: vi.fn(), populate: vi.fn(), lean: vi.fn(), exec: vi.fn().mockResolvedValue(result) };
    query.select.mockReturnValue(query);
    query.populate.mockReturnValue(query);
    query.lean.mockReturnValue(query);
    return query;
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("Exact current-blog skills", () => {
    test.each([
        "Skills used in the current blog",
        "What technologies are used in this article?",
        "List frameworks and libraries for this blog post",
        "Show the tech stack of the current page",
        "What skills are used in the article I am reading?",
    ])("recognizes a current-article skill-only question: %s", prompt => {
        expect(isCurrentBlogSkillsQuestion(prompt)).toBe(true);
    });

    test.each([
        "What are your skills?",
        "Show React blogs",
        "Summarize this blog",
        "List the skills and author of the current blog",
        "Skills in this blog and related article links",
        "Compare technologies used in this article and other blogs",
    ])("does not narrow other or compound requests: %s", prompt => {
        expect(isCurrentBlogSkillsQuestion(prompt)).toBe(false);
    });

    test("returns only unique saved skill names, never facts inferred from title, slug, category, or content", async () => {
        const query = queryResult({
            title: "React i18n and Storybook", slug: "react-typescript-storybook", category: "Frontend",
            content: "<p>Use JavaScript, React, and Storybook</p>",
            skills: [{ name: " TypeScript " }, { name: "React Hook Form" }, { name: "TypeScript" }, null],
        });
        mocks.findOne.mockReturnValue(query);
        expect(await getCurrentBlogSkills("react-typescript-storybook")).toBe("- TypeScript\n- React Hook Form");
        expect(mocks.findOne).toHaveBeenCalledWith({ slug: "react-typescript-storybook", status: "published" });
        expect(query.select).toHaveBeenCalledWith("skills");
        expect(query.populate).toHaveBeenCalledWith({ path: "skills", select: "name" });
    });

    test.each([
        { skills: undefined }, { skills: [] }, { skills: [null] }, { skills: [{ name: " " }] },
    ])("reports missing saved skills instead of inferring them: %j", async ({ skills }) => {
        mocks.findOne.mockReturnValue(queryResult({
            title: "React TypeScript", content: "React and Storybook", category: "Frontend", skills,
        }));
        expect(await getCurrentBlogSkills("react-typescript")).toBe("No skills are recorded for the current blog.");
    });

    test("does not guess which article is current when no URL is available", async () => {
        expect(await getCurrentBlogSkills()).toBe("No current blog page is available.");
        expect(mocks.connectDB).not.toHaveBeenCalled();
        expect(mocks.findOne).not.toHaveBeenCalled();
    });

    test("does not expose missing or unpublished articles", async () => {
        mocks.findOne.mockReturnValue(queryResult(null));
        expect(await getCurrentBlogSkills("removed-blog")).toBe("The current blog was not found or is not published.");
    });

    test("propagates database failures rather than pretending no skills are saved", async () => {
        mocks.connectDB.mockRejectedValue(new Error("Database unavailable"));
        await expect(getCurrentBlogSkills("react-typescript")).rejects.toThrow("Database unavailable");
    });
});
