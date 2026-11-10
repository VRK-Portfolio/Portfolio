import { beforeEach, describe, expect, test, vi } from "vitest";
import { getPortfolioSkills, isPortfolioSkillsListQuestion } from "../portfolio-skills";

const mocks = vi.hoisted(() => ({ connectDB: vi.fn(), find: vi.fn() }));
vi.mock("@/libs/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/my-skills.model", () => ({ MySkillsModel: { find: mocks.find } }));

function queryResult(records: { name: string }[]) {
    const query = { select: vi.fn(), sort: vi.fn(), lean: vi.fn(), exec: vi.fn().mockResolvedValue(records) };
    query.select.mockReturnValue(query);
    query.sort.mockReturnValue(query);
    query.lean.mockReturnValue(query);
    return query;
}

beforeEach(() => vi.resetAllMocks());

describe("Exhaustive portfolio skills", () => {
    test.each([
        "show me the list of skills of vijay rameshkumar",
        "List all skills",
        "Show me the complete list of skills",
        "What are your skills?",
        "What skills does Vijay Rameshkumar have?",
        "Vijay's skills",
        "Could you list all of your skills?",
        "  SHOW ME THE LIST OF SKILLS OF VIJAY RAMESHKUMAR!  ",
    ])("recognizes an unfiltered skill-list request: %s", prompt => {
        expect(isPortfolioSkillsListQuestion(prompt)).toBe(true);
    });

    test.each([
        "Skills used in the current blog",
        "List skills in this article",
        "List Azure skills",
        "Show frontend technologies",
        "List skills and experience",
        "List skills of someone else",
        "How do I learn these skills?",
    ])("does not replace scoped or compound requests: %s", prompt => {
        expect(isPortfolioSkillsListQuestion(prompt)).toBe(false);
    });

    test("returns every saved skill rather than a top-four subset", async () => {
        const names = [
            "JavaScript", "TypeScript", "ReactJS", "NextJS", "NodeJS", "ExpressJS", "MongoDB",
            "PostgreSQL", "Docker", "Git", "Storybook", "React Hook Form", "i18n", "HTML", "CSS", "Jest",
        ].sort();
        const query = queryResult(names.map(name => ({ name })));
        mocks.find.mockReturnValue(query);
        const answer = await getPortfolioSkills();
        expect(answer).toBe(names.map(name => `- ${name}`).join("\n"));
        expect(answer.split("\n")).toHaveLength(16);
        expect(mocks.find).toHaveBeenCalledWith();
        expect(query.select).toHaveBeenCalledWith("name");
        expect(query.sort).toHaveBeenCalledWith({ name: 1 });
    });

    test("deduplicates saved names without adding guessed skills", async () => {
        mocks.find.mockReturnValue(queryResult([{ name: " ReactJS " }, { name: "ReactJS" }, { name: "TypeScript" }, { name: "" }]));
        expect(await getPortfolioSkills()).toBe("- ReactJS\n- TypeScript");
    });

    test("reports an empty collection explicitly", async () => {
        mocks.find.mockReturnValue(queryResult([]));
        expect(await getPortfolioSkills()).toBe("No skills are recorded in the portfolio.");
    });

    test("propagates database failures without falling back to partial vector results", async () => {
        mocks.connectDB.mockRejectedValue(new Error("Database unavailable"));
        await expect(getPortfolioSkills()).rejects.toThrow("Database unavailable");
        expect(mocks.find).not.toHaveBeenCalled();
    });
});
