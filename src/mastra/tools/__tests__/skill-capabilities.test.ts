import { beforeEach, describe, expect, test, vi } from "vitest";
import { getCapabilitySkillName, getSkillCapabilities } from "../skill-capabilities";

const mocks = vi.hoisted(() => ({ connectDB: vi.fn(), find: vi.fn() }));
vi.mock("@/libs/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/vector-store.model", () => ({ VectorStoreModel: { find: mocks.find } }));

function queryResult(records: { text: string; skill?: { name: string; capabilities: string[] } }[]) {
    const query = { select: vi.fn(), lean: vi.fn(), exec: vi.fn().mockResolvedValue(records) };
    query.select.mockReturnValue(query);
    query.lean.mockReturnValue(query);
    return query;
}

beforeEach(() => vi.resetAllMocks());

describe("Vector-only skill capabilities", () => {
    test.each([
        ["what is the core capabilities of Mongodb", "Mongodb"],
        ["What are the capabilities of MongoDB?", "MongoDB"],
        ["List core capabilities for ReactJS.", "ReactJS"],
        ["  Show me the core capabilities of C++! ", "C++"],
    ])("recognizes named capability questions: %s", (prompt, name) => {
        expect(getCapabilitySkillName(prompt)).toBe(name);
    });

    test.each([
        "List all skills", "Core capabilities of MongoDB and ReactJS",
        "List capabilities and experience", "What is MongoDB?",
    ])("does not hijack other questions: %s", prompt => {
        expect(getCapabilitySkillName(prompt)).toBeUndefined();
    });

    test("returns only exact saved capabilities, preserving commas and excluding unrelated technology facts", async () => {
        const skill = { name: "MongoDB", capabilities: ["Saved capability one, with a comma", "Saved capability two"] };
        const query = queryResult([
            { text: "Other facts that must not be added", skill },
            { text: "Overlapping chunk", skill },
            { text: "React", skill: { name: "ReactJS", capabilities: ["Components"] } },
            { text: "MongoDB", skill: { name: "MongoDB Atlas", capabilities: ["Unrequested Atlas capability"] } },
        ]);
        mocks.find.mockReturnValue(query);
        expect(await getSkillCapabilities("Mongodb")).toBe("- Saved capability one, with a comma\n- Saved capability two");
        expect(mocks.find).toHaveBeenCalledWith({ source: "skills" });
        expect(query.select).toHaveBeenCalledWith("text skill");
    });

    test("uses only the capabilities field in legacy skill text without inferring additional features", async () => {
        mocks.find.mockReturnValue(queryResult([{
            text: "Skill Name is MongoDB, Core Capabilities are Saved one,Saved two, Category is Backend, Proficiency is Advanced",
        }]));
        expect(await getSkillCapabilities("Mongodb")).toBe("- Saved one,Saved two");
    });

    test.each([
        { records: [] },
        { records: [{ text: "General MongoDB article with lots of features" }] },
        { records: [{ text: "Unrelated skill", skill: { name: "ReactJS", capabilities: ["Components"] } }] },
        { records: [{ text: "MongoDB", skill: { name: "MongoDB", capabilities: ["", "  "] } }] },
    ])("reports missing evidence without generating technology knowledge: %j", async ({ records }) => {
        mocks.find.mockReturnValue(queryResult(records));
        expect(await getSkillCapabilities("MongoDB")).toBe("I could not find that information in the database.");
    });

    test("propagates database failures instead of substituting model knowledge", async () => {
        mocks.connectDB.mockRejectedValue(new Error("Database unavailable"));
        await expect(getSkillCapabilities("MongoDB")).rejects.toThrow("Database unavailable");
        expect(mocks.find).not.toHaveBeenCalled();
    });
});
