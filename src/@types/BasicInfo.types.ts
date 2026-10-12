import z from "zod";
import { PHONE_REGEX } from "../libs/regex";


export const BasicInfoSchema = z.object({
    name: z.string()
          .min(3, "Name is required")
          .trim(),
    email: z.string()
          .trim()
          .min(1, "Email is required")
          .pipe(z.email("Invalid email address")),
    phone: z.string()
          .min(10, "Phone number must be at least 10 digits")
          .max(10, "Phone number must be at most 10 digits")
          .regex(PHONE_REGEX, "Invalid phone number"),
    address: z.string()
          .min(1, "Address is required"),
    bio: z.string()
          .min(1, "Bio is required")
          .max(150, "Bio must be at most 100 letters"),
    avatar_url: z.string()
          .min(1, "Avatar URL is required")
          .pipe(z.url("Invalid URL for profile picture")),
    website_url: z.string()
          .min(1, "Website URL is required")
          .pipe(z.url("Invalid URL for website")),
    favicon_url: z.string()
          .min(1, "Favicon URL is required")
          .pipe(z.url("Invalid URL for favicon")),
    github_url: z.string()
          .min(1, "GitHub URL is required")
          .pipe(z.url("Invalid URL for GitHub profile")),
    linked_in_url: z.string()
          .min(1, "LinkedIn URL is required")
          .pipe(z.url("Invalid URL for LinkedIn profile")),
    about_me: z.string("About me is required")
          .trim()
          .min(300, "About me must be at least 300 letters")
          .max(1000, "About me must be at most 1000 letters"),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
})

export type BasicInfoType = z.infer<typeof BasicInfoSchema>;
