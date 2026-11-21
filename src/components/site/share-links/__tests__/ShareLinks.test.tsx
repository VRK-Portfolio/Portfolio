import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ShareLinks from "../ShareLinks";

describe("ShareLinks", () => {
    test("shares the exact canonical URL and title with encoded platform parameters", () => {
        const url = "https://www.vijayrameshkumar.dev/blogs/mastra-eds";
        const title = "Mastra AI & EDS: building reliable agents";
        render(<ShareLinks title={title} url={url} />);
        const links = within(screen.getByRole("navigation", { name: "Share this page" }));
        const linkedIn = links.getByRole("link", { name: /^Share on LinkedIn/ });
        const x = links.getByRole("link", { name: /^Share on X\b/ });
        const whatsapp = links.getByRole("link", { name: /^Share on WhatsApp/ });
        expect(new URL(linkedIn.getAttribute("href")!).searchParams.get("url")).toBe(url);
        const xUrl = new URL(x.getAttribute("href")!);
        expect(xUrl.searchParams.get("url")).toBe(url);
        expect(xUrl.searchParams.get("text")).toBe(title);
        expect(new URL(whatsapp.getAttribute("href")!).searchParams.get("text")).toBe(`${title} ${url}`);
        for (const link of links.getAllByRole("link")) {
            expect(link).toHaveAttribute("target", "_blank");
            expect(link).toHaveAttribute("rel", "noopener noreferrer");
            expect(link).toHaveAccessibleName(/opens in a new tab/);
        }
    });
});
