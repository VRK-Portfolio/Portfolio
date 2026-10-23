import { describe, expect, test } from "vitest";
import { ExperiencePropsSchema, PositionPropsSchema } from "../Experience.types";

const position = {
    role: "Engineer",
    startDate: "2024-02-29",
    isCurrentPosition: true,
    description: "Building applications.",
};
const experience = {
    company: "Example Company",
    location: "Remote",
    responsibilites: ["Architecture"],
    positions: [position],
};

describe("experience schemas", () => {
    test("coerces serialized dates and preserves company and position IDs", () => {
        const result = ExperiencePropsSchema.parse({
            ...experience,
            _id: "company-id",
            positions: [{ ...position, _id: "position-id", endDate: "2025-03-01" }],
        });
        expect(result._id).toBe("company-id");
        expect(result.positions[0]).toEqual({
            ...position,
            _id: "position-id",
            startDate: new Date("2024-02-29T00:00:00.000Z"),
            endDate: new Date("2025-03-01T00:00:00.000Z"),
        });
    });

    test("accepts a current position without an end date or generated IDs", () => {
        const result = ExperiencePropsSchema.parse(experience);
        expect(result.positions[0].endDate).toBeUndefined();
        expect(result.positions[0].isCurrentPosition).toBe(true);
        expect(result._id).toBeUndefined();
    });

    test.each(["role", "startDate", "isCurrentPosition", "description"] as const)("rejects a position missing %s", (field) => {
        const { [field]: omitted, ...incomplete } = position;
        expect(omitted).toBeDefined();
        expect(PositionPropsSchema.safeParse(incomplete).success).toBe(false);
    });

    test.each([
        { startDate: "invalid" },
        { endDate: "invalid" },
        { isCurrentPosition: "true" },
        { role: 42 },
    ])("rejects invalid position fields: %j", (invalid) => {
        expect(PositionPropsSchema.safeParse({ ...position, ...invalid }).success).toBe(false);
    });

    test.each(["company", "location", "responsibilites", "positions"] as const)("rejects experience missing %s", (field) => {
        const { [field]: omitted, ...incomplete } = experience;
        expect(omitted).toBeDefined();
        expect(ExperiencePropsSchema.safeParse(incomplete).success).toBe(false);
    });

    test("reports the nested position path for invalid date values", () => {
        const result = ExperiencePropsSchema.safeParse({ ...experience, positions: [{ ...position, startDate: "invalid" }] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].path).toEqual(["positions", 0, "startDate"]);
        }
    });
});
