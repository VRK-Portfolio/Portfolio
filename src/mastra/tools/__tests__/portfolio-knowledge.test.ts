import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BasicInfoModel } from "@/models/basic-info.model";
import { BlogModel } from "@/models/blogs.model";
import { CertificationModel } from "@/models/certifications.model";
import { Experience } from "@/models/experience.model";
import { MySkillsModel } from "@/models/my-skills.model";
import { retrievePortfolioKnowledge } from "../portfolio-knowledge";

vi.mock("@/libs/db", () => ({ connectDB: vi.fn() }));
const embed = vi.hoisted(() => vi.fn(() => { throw new Error("Local embedding service must not be used"); }));
vi.mock("ai", () => ({ embed, embedMany: embed }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

async function seedPortfolio() {
    await BasicInfoModel.collection.insertOne({
        name: "Saved Developer", email: "saved@example.com", phone: "1234567890",
        bio: "Saved biography", about_me: "Saved about text",
        github_url: "https://github.com/saved", linked_in_url: "https://www.linkedin.com/in/saved",
        website_url: "https://example.com", address: "Saved City",
    });
    const skills = await MySkillsModel.create(Array.from({ length: 7 }, (_, index) => ({
        name: `SavedSkill${index}`, category: "Frontend", capabilities: [`Saved capability ${index}`],
        proficiency: "Advanced", icon: "code",
    })));
    await CertificationModel.create(Array.from({ length: 6 }, (_, index) => ({
        title: `Certificate ${index}`, issuer: `Issuer ${index}`, issueDate: new Date("2025-01-02"),
        expirationDate: new Date("2027-01-02"), credentialID: `ID-${index}`,
        credentialURL: `https://example.com/cert-${index}`, skillsCoverd: [skills[index].name],
    })));
    await Experience.create({
        company: "Saved Company", location: "Saved City", responsibilites: ["Saved responsibility"],
        positions: [
            { role: "Previous Developer", startDate: new Date("2020-01-01"), endDate: new Date("2022-01-01"), isCurrentPosition: false, description: "<p>Saved previous duties</p>" },
            { role: "Current Developer", startDate: new Date("2022-01-01"), isCurrentPosition: true, description: "<p>Saved current duties</p>" },
        ],
    });
    await BlogModel.create([
        { title: "React Hook Form validation", slug: "react-hook-form", content: "<p>Saved form guidance.</p>", category: "React", status: "published", skills: [skills[0]._id] },
        { title: "Storybook internationalization", slug: "storybook-i18n", content: "<p>Saved translation guidance.</p>", category: "React", status: "published", skills: [] },
        { title: "Private draft", slug: "private-draft", content: "Never expose this secret draft", category: "Private", status: "draft" },
    ]);
}

describe("Complete live portfolio evidence", () => {
    test.each([
        "Who is Vijay?", "How can I contact him?", "What is his GitHub URL?",
        "Tell me about his expertise", "List his certifications and issuers",
        "Where does he work?", "What were his previous roles?",
        "How many positions has he held?", "What certificates expire in 2027?",
        "Compare his skills and certifications", "How many blogs are published?",
    ])("supplies all structured facts for paraphrased questions: %s", async question => {
        await seedPortfolio();
        const result = await retrievePortfolioKnowledge({ question, currentBlogSlug: "react-hook-form" });
        const facts = JSON.parse(result.matches[0]);
        expect(facts.counts).toEqual({ skills: 7, certifications: 6, companies: 1, positions: 2, publishedBlogs: 2 });
        expect(facts.skills).toHaveLength(7);
        expect(facts.certifications).toHaveLength(6);
        expect(facts.experiences[0].positions).toHaveLength(2);
        expect(facts.basicInfo.github_url).toBe("https://github.com/saved");
        expect(facts.publishedBlogs).toHaveLength(2);
        expect(JSON.stringify(result)).not.toContain("Private draft");
        expect(result.blogs).toEqual([]);
        expect(embed).not.toHaveBeenCalled();
    });

    test("returns the entire current article and only saved skill associations", async () => {
        await seedPortfolio();
        const ending = "END_OF_FULL_CURRENT_ARTICLE";
        const content = "Detailed saved content. ".repeat(160) + ending;
        await BlogModel.updateOne({ slug: "react-hook-form" }, { content: `<p>${content}</p>` });
        const result = await retrievePortfolioKnowledge({ question: "Explain this article and its skills", currentBlogSlug: "react-hook-form" });
        const current = JSON.parse(result.matches[1]);
        expect(current.source).toBe("current-blog");
        expect(current.content).toBe(content);
        expect(current.savedSkills).toEqual(["SavedSkill0"]);
        expect(result.blogs).toEqual([]);
    });

    test("isolates blog contexts and reports absent/unpublished pages instead of substituting an article", async () => {
        await seedPortfolio();
        for (const slug of [undefined, "private-draft", "nonexistent"]) {
            const result = await retrievePortfolioKnowledge({ question: "Summarize the current blog", currentBlogSlug: slug });
            expect(result.answer).toBe(slug ? "The current blog was not found or is not published." : "No current blog page is available.");
            expect(JSON.stringify(result)).not.toContain("Saved form guidance");
            expect(result.blogs).toEqual([]);
        }
        const second = await retrievePortfolioKnowledge({ question: "Summarize this blog", currentBlogSlug: "storybook-i18n" });
        expect(JSON.parse(second.matches[1]).savedSkills).toEqual([]);
        expect(JSON.parse(second.matches[1]).content).toBe("Saved translation guidance.");
    });

    test("finds a named article independently of the current page and renders links only when requested", async () => {
        await seedPortfolio();
        const result = await retrievePortfolioKnowledge({ question: "Recommend blogs about form validation", currentBlogSlug: "storybook-i18n" });
        expect(result.blogs.map(blog => blog.slug)).toEqual(["react-hook-form"]);
        expect(JSON.stringify(result.matches)).toContain("Saved form guidance");
        const factsOnly = await retrievePortfolioKnowledge({ question: "Explain form validation", currentBlogSlug: "storybook-i18n" });
        expect(factsOnly.blogs).toEqual([]);
    });

    test("uses live updates without requiring re-ingestion and removes deleted blogs from evidence", async () => {
        await seedPortfolio();
        await MySkillsModel.updateOne({ name: "SavedSkill6" }, { capabilities: ["Updated capability"] });
        await BlogModel.deleteOne({ slug: "react-hook-form" });
        const result = await retrievePortfolioKnowledge({ question: "Describe his capabilities and blog posts" });
        expect(JSON.stringify(result.matches)).toContain("Updated capability");
        expect(JSON.stringify(result.matches)).not.toContain("Saved form guidance");
        expect(JSON.parse(result.matches[0]).counts.publishedBlogs).toBe(1);
    });

    test("leaves unsupported facts absent instead of fabricating them", async () => {
        await seedPortfolio();
        const result = await retrievePortfolioKnowledge({ question: "What is his salary and PhD thesis?" });
        const facts = JSON.parse(result.matches[0]);
        expect(facts.basicInfo.salary).toBeUndefined();
        expect(facts.basicInfo.education).toBeUndefined();
        expect(result.answer).toBeUndefined();
        expect(result.blogs).toEqual([]);
    });

    test("returns no evidence for an empty database", async () => {
        expect(await retrievePortfolioKnowledge({ question: "Who is Vijay?" })).toEqual({ success: true, matches: [], blogs: [] });
    });

    test("propagates database failures without an empty-result fallback", async () => {
        vi.spyOn(BlogModel, "find").mockImplementation(() => { throw new Error("Database unavailable"); });
        await expect(retrievePortfolioKnowledge({ question: "His blogs?" })).rejects.toThrow("Database unavailable");
    });
});
