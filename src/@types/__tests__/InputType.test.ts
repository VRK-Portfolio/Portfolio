import { describe, expect, it } from "vitest";
import { InputTypeSchema } from "../Input.types";

describe("InputTypeSchema", () => {
  it("should successfully parse an empty object since all fields are optional", () => {
    const result = InputTypeSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should successfully parse when label and error are valid strings", () => {
    const validData = {
      label: "Username",
      error: "Field is required",
    };
    const result = InputTypeSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should fail if label is not a string", () => {
    const invalidData = {
      label: 123, // Invalid type
    };
    const result = InputTypeSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should fail if error is not a string", () => {
    const invalidData = {
      error: true, // Invalid type
    };
    const result = InputTypeSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});