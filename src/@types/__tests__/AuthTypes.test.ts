import { describe, expect, test } from "vitest";
import { AuthTypeSchema, AuthType } from "../Auth.types";
import z from "zod";

describe("AuthType", () => {

    const validAuth = (): AuthType => {
        return {
            email: "test@example.com",
            password: "Test1234"
        };
    }
    test("should have a valid AuthType structure", () => {
        expect(AuthTypeSchema.parse(validAuth())).toEqual(validAuth());
    });

    test("should fail for an invalid AuthType structure", () => {
        expect(() => AuthTypeSchema.parse({ email: "test@example.com" })).toThrow();
        expect(() => AuthTypeSchema.parse({ password: "Test1234" })).toThrow();
    });

});