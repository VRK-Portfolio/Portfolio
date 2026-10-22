import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import { describe, expect, test } from "vitest";
import nextConfig from "../../next.config";

describe("Next.js configuration", () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];

    test.each([
        "https://vijayrameshkumar.com/uploads/photo.png",
        "https://vijayrameshkumar.com/images/skills/react.svg",
    ])("should allow the configured remote image URL %s", (url) => {
        expect(hasRemoteMatch([], remotePatterns, new URL(url))).toBe(true);
    });

    test.each([
        "http://vijayrameshkumar.com/uploads/photo.png",
        "https://example.com/photo.png",
        "https://images.vijayrameshkumar.com/photo.png",
        "https://vijayrameshkumar.com.example.com/photo.png",
    ])("should reject remote images from unconfigured origins such as %s", (url) => {
        expect(hasRemoteMatch([], remotePatterns, new URL(url))).toBe(false);
    });

    test("should allow only the configured LAN development hostname", () => {
        expect(nextConfig.allowedDevOrigins).toEqual(["192.168.1.79"]);
    });

    test("should expose the configured local public base URL", () => {
        expect(nextConfig.env).toEqual({ NEXT_PUBLIC_BASE_URL: "http://localhost:3000" });
    });
});
