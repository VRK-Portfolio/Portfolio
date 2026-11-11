import { describe, test, expect } from "vitest";
import { BasicInfoModel } from "../basic-info.model";

describe("BasicInfo Model", () => {
    test.each([undefined, "", "  ", "a".repeat(150), "a".repeat(220)])("accepts an optional or valid SEO description: %j", async meta_description => {
        const profile = new BasicInfoModel({ meta_description });
        await expect(profile.validate(["meta_description"])).resolves.toBeUndefined();
        expect(profile.meta_description).toBe(meta_description?.trim());
    });

    test.each([1, 149, 221])("rejects an invalid SEO description of length %i at the model boundary", async length => {
        const profile = new BasicInfoModel({ meta_description: "a".repeat(length) });
        await expect(profile.validate(["meta_description"])).rejects.toHaveProperty("errors.meta_description");
    });
    
    test("should have a valid structure", () => {
        const schemaPaths = Object.keys(BasicInfoModel.schema.paths);
        expect(schemaPaths).toContain("name");
        expect(schemaPaths).toContain("email");
        expect(schemaPaths).toContain("phone");
        expect(schemaPaths).toContain("address");
        expect(schemaPaths).toContain("website_url");
        expect(schemaPaths).toContain("about_me");
        expect(schemaPaths).toContain("avatar_url");
        expect(schemaPaths).toContain("bio");
        expect(schemaPaths).toContain("meta_description");
        expect(schemaPaths).toContain("favicon_url");
        expect(schemaPaths).toContain("github_url");
        expect(schemaPaths).toContain("linked_in_url");
        expect(schemaPaths).toContain("created_at");
        expect(schemaPaths).toContain("updated_at");
        expect(schemaPaths).toContain("singleton_key");
    });
});