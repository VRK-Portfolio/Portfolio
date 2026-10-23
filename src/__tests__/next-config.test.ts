import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import { describe, expect, test } from "vitest";
import nextConfig from "../../next.config";

describe("Next.js configuration", () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];

    test.each([
        "https://vijayrameshkumar.com/uploads/photo.png",
        "https://vijayrameshkumar.com/images/skills/react.svg",
        "https://portfolio.public.blob.vercel-storage.com/uploads/photo.png",
    ])("should allow the configured remote image URL %s", (url) => {
        expect(hasRemoteMatch([], remotePatterns, new URL(url))).toBe(true);
    });

    test.each([
        "http://vijayrameshkumar.com/uploads/photo.png",
        "https://example.com/photo.png",
        "https://images.vijayrameshkumar.com/photo.png",
        "https://vijayrameshkumar.com.example.com/photo.png",
        "http://portfolio.public.blob.vercel-storage.com/uploads/photo.png",
        "https://portfolio.public.blob.vercel-storage.com.example.com/photo.png",
        "https://portfolio.private.blob.vercel-storage.com/photo.png",
    ])("should reject remote images from unconfigured origins such as %s", (url) => {
        expect(hasRemoteMatch([], remotePatterns, new URL(url))).toBe(false);
    });

    test("should allow only the configured LAN development hostname", () => {
        expect(nextConfig.allowedDevOrigins).toEqual(["192.168.1.79"]);
    });

    test("should not hardcode deployment environment variables into the build", () => {
        expect(nextConfig.env).toBeUndefined();
    });
});
