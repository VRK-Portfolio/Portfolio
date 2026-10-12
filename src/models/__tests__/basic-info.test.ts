import { describe, test, expect } from "vitest";
import { BasicInfoModel } from "../basic-info.model";

describe("BasicInfo Model", () => {
    
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
        expect(schemaPaths).toContain("favicon_url");
        expect(schemaPaths).toContain("github_url");
        expect(schemaPaths).toContain("linked_in_url");
        expect(schemaPaths).toContain("created_at");
        expect(schemaPaths).toContain("updated_at");
        expect(schemaPaths).toContain("singleton_key");
    });
});