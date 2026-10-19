import { describe, expect, test } from "vitest";
import { MySkillsSchema, MySkillsType } from "../MySkills.types";
import z from "zod";

describe("MySkillsType", () => {

    const validMySkillsType = (): MySkillsType[] => {
        return [{
            name: "Example Skill",
            icon: "images/example-icon.png",
            category: "Example Category",
            capabilities: ["Capability 1", "Capability 2"],
            proficiency: "Intermediate"
        }];
    }
    test("should have a valid MySkillsType structure", () => {
        const mySkillsSchema = z.array(MySkillsSchema);
        expect(mySkillsSchema.parse(validMySkillsType())).toEqual(validMySkillsType());
    });

    test("should fail for an invalid MySkillsType structure", () => {
        const mySkillsSchema = z.array(MySkillsSchema);
        expect(() => mySkillsSchema.parse([{ name: "Invalid Skill" }])).toThrow();
    });

    test("should not fail for an empty MySkillsType array", () => {
        const mySkillsSchema = z.array(MySkillsSchema);
        expect(mySkillsSchema.parse([])).toEqual([]);
    });
});