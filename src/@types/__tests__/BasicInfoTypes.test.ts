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