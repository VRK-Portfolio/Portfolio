import { describe, expect, test } from "vitest";
import { PHONE_REGEX } from "../regex";

describe("Regex Tests", () => {
    const validNumbers = ["7893987998", "7893987998", "7899879981"];
    const invalidNumbers = ["123", "abc", "78939879989"];
    test("check a sample regex pattern", () => {
        validNumbers.forEach((number) => {
            expect(PHONE_REGEX.test(number)).toBe(true);
        });
    });

    test("check invalid numbers against the regex pattern", () => {
        invalidNumbers.forEach((number) => {
            expect(PHONE_REGEX.test(number)).toBe(false);
        });
    });
});