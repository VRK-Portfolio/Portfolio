import { describe, expect, test } from "vitest";
import { Experience, ExperienceSchema, PositionSchema } from "../experience.model";

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

describe("Experience model", () => {
    test("declares the company fields and typed position schema", () => {
        expect(Object.keys(ExperienceSchema.paths)).toEqual(expect.arrayContaining([
            "company", "location", "responsibilites", "positions",
        ]));
        expect(PositionSchema.path("startDate").instance).toBe("Date");
        expect(PositionSchema.path("endDate").instance).toBe("Date");
        expect(PositionSchema.path("isCurrentPosition").instance).toBe("Boolean");
    });

    test("casts date strings and generates position IDs", async () => {
        const document = new Experience(experience);
        await expect(document.validate()).resolves.toBeUndefined();
        expect(document.positions[0].startDate).toEqual(new Date("2024-02-29"));
        expect(document.positions[0]._id).toBeDefined();
        expect(document.positions[0].endDate).toBeUndefined();
    });

    test.each(["company", "location"] as const)("requires %s", async (field) => {
        const document = new Experience({ ...experience, [field]: "" });
        await expect(document.validate()).rejects.toMatchObject({ errors: { [field]: expect.anything() } });
    });

    test("requires at least one position", async () => {
        await expect(new Experience({ ...experience, positions: [] }).validate()).rejects.toMatchObject({
            errors: { positions: expect.anything() },
        });
    });

    test("rejects invalid nested dates and missing role descriptions", async () => {
        const document = new Experience({ ...experience, positions: [{ ...position, startDate: "invalid", description: "" }] });
        await expect(document.validate()).rejects.toMatchObject({
            errors: {
                "positions.0.startDate": expect.anything(),
                "positions.0.description": expect.anything(),
            },
        });
    });

    test("persists and reloads multiple positions with optional end dates", async () => {
        const document = await Experience.create({
            ...experience,
            positions: [{ ...position, isCurrentPosition: false, endDate: "2025-01-31" }, position],
        });
        const saved = await Experience.findById(document._id).orFail();
        expect(saved.positions).toHaveLength(2);
        expect(saved.positions[0].endDate).toEqual(new Date("2025-01-31"));
        expect(saved.positions[1].endDate).toBeUndefined();
    });
});
