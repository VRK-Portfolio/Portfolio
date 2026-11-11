import { describe, expect, test } from "vitest";
import { BasicInfoSchema, BasicInfoType } from "../BasicInfo.types";

describe("BasicInfoTypes Tests", () => {
   const getValidPayload = (): BasicInfoType => {
       return {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '9876543210',
            address: '123 Main Street, City',
            bio: 'Software engineer who loves building web applications with Next.js and TypeScript.',
            avatar_url: 'https://example.com/avatar.jpg',
            website_url: 'https://example.com',
            favicon_url: 'https://example.com/favicon.ico',
            github_url: 'https://github.com/johndoe',
            linked_in_url: 'https://linkedin.com/in/johndoe',
            about_me: 'a'.repeat(350), // Exactly 350 characters to satisfy min(300)
            created_at: new Date('2024-01-01'),
            updated_at: new Date('2024-01-02'),
       };
   };

   describe("Happy Path", () => {
       test.each([150, 191, 220])("accepts a separate SEO description of %i characters", length => {
           const payload = { ...getValidPayload(), meta_description: `  ${"a".repeat(length)}  ` };
           expect(BasicInfoSchema.parse(payload).meta_description).toBe("a".repeat(length));
       });

       test.each([1, 149, 221])("rejects a nonempty SEO description of %i characters", length => {
           expect(BasicInfoSchema.safeParse({ ...getValidPayload(), meta_description: "a".repeat(length) }).success).toBe(false);
       });

       test.each(["", "  ", undefined])("preserves compatibility for an omitted or blank SEO description: %j", meta_description => {
           expect(BasicInfoSchema.safeParse({ ...getValidPayload(), meta_description }).success).toBe(true);
       });

       test("should return a valid payload", () => {
           const payload = getValidPayload();
           const result = BasicInfoSchema.parse(payload);
           expect(result).toEqual(payload);
       });

       test("should validate the payload successfully", () => {
           const payload = getValidPayload();
           const result = BasicInfoSchema.safeParse(payload);
           expect(result.success).toBe(true);
           if (result.success) {
               expect(result.data.name).toBe(payload.name);
           }
       });

       test("should validate and pass with removing the optional fields", () => {
           const payload = getValidPayload();
           delete payload.created_at;
           delete payload.updated_at;
           const result = BasicInfoSchema.safeParse(payload);
           expect(result.success).toBe(true);
           if (result.success) {
               expect(result.data.name).toBe(payload.name);
           }
       });
   });
});