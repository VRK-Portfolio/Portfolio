import { describe, test, expect } from "vitest";
import { AuthModel } from "../auth.model";

describe("authModel", () => {
    test("should have a basic test", () => {
        const schema =  Object.keys(AuthModel.schema.paths)
        expect(schema).toBeDefined();
        expect(schema.length).toBeGreaterThan(0);
        expect(schema).toContain("email"); // Example field, replace with actual fields in your AuthModel schema
        expect(schema).toContain("password"); // Example field, replace with actual fields in your AuthModel schema
    });
});