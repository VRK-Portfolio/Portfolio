import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import PageTransition, { TransitionLink } from "../PageTransition";
import Loading from "@/app/(site)/loading";

const linkState = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", async importOriginal => ({
    ...await importOriginal<typeof import("next/link")>(),
    default: ({ children, onClick, ...props }: ComponentProps<"a">) => (
        <a {...props} onClick={event => {
            onClick?.(event);
            event.preventDefault();
        }}>{children}</a>
    ),
    useLinkStatus: () => linkState,
}));

describe("Public page transitions", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        linkState.pending = false;
        window.history.replaceState(null, "", "/");
    });
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    test("shows the loader during route loading and hides it when content is ready", () => {
        const { container, rerender } = render(
            <PageTransition><Loading /></PageTransition>
        );
        const overlay = container.querySelector(".cmp-page-transition");
        expect(overlay).toHaveClass("cmp-page-transition--loading");
        expect(screen.getByRole("status")).toHaveTextContent("Loading page...");
        expect(container.querySelector("[aria-busy]")).toHaveAttribute("aria-busy", "true");
        expect(overlay).toHaveAttribute("aria-hidden", "false");

        rerender(<PageTransition><h1>Destination page</h1></PageTransition>);
        act(() => vi.advanceTimersByTime(599));
        expect(overlay).toHaveClass("cmp-page-transition--loading");
        expect(screen.getByRole("heading")).toHaveTextContent("Destination page");
        act(() => vi.advanceTimersByTime(1));
        expect(overlay).not.toHaveClass("cmp-page-transition--loading");
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(container.querySelector("[aria-busy]")).toHaveAttribute("aria-busy", "false");
        expect(screen.getByRole("heading")).toHaveTextContent("Destination page");
    });

    test("does not cover ready content and can show loading again on subsequent navigation", () => {
        const { container, rerender } = render(
            <PageTransition><h1>Home</h1></PageTransition>
        );
        const overlay = container.querySelector(".cmp-page-transition");
        expect(overlay).not.toHaveClass("cmp-page-transition--loading");

        rerender(<PageTransition><Loading /></PageTransition>);
        expect(overlay).toHaveClass("cmp-page-transition--loading");
        rerender(<PageTransition><h1>Blog</h1></PageTransition>);
        act(() => vi.advanceTimersByTime(600));
        expect(overlay).not.toHaveClass("cmp-page-transition--loading");
        rerender(<PageTransition><Loading /></PageTransition>);
        expect(overlay).toHaveClass("cmp-page-transition--loading");
    });

    test("shows feedback before the route fallback arrives and waits for overlapping loads", () => {
        linkState.pending = true;
        const { container, rerender } = render(
            <PageTransition><TransitionLink href="/blogs">Blogs</TransitionLink></PageTransition>
        );
        const overlay = container.querySelector(".cmp-page-transition");
        expect(overlay).toHaveClass("cmp-page-transition--loading");
        expect(screen.getByRole("link", { name: "Blogs" })).toHaveAttribute("href", "/blogs");

        rerender(
            <PageTransition><TransitionLink href="/blogs">Blogs</TransitionLink><Loading /></PageTransition>
        );
        linkState.pending = false;
        rerender(
            <PageTransition><TransitionLink href="/blogs">Blogs</TransitionLink><Loading /></PageTransition>
        );
        expect(overlay).toHaveClass("cmp-page-transition--loading");
        act(() => vi.advanceTimersByTime(1000));
        expect(overlay).toHaveClass("cmp-page-transition--loading");
        rerender(
            <PageTransition><TransitionLink href="/blogs">Blogs</TransitionLink></PageTransition>
        );
        act(() => vi.advanceTimersByTime(0));
        expect(overlay).not.toHaveClass("cmp-page-transition--loading");
    });

    test("cancels a scheduled exit if another navigation starts during the hold", () => {
        const { container, rerender } = render(<PageTransition><Loading /></PageTransition>);
        const overlay = container.querySelector(".cmp-page-transition");
        rerender(<PageTransition><h1>First page</h1></PageTransition>);
        act(() => vi.advanceTimersByTime(300));
        rerender(<PageTransition><Loading /></PageTransition>);
        act(() => vi.advanceTimersByTime(1000));
        expect(overlay).toHaveClass("cmp-page-transition--loading");
        rerender(<PageTransition><h1>Second page</h1></PageTransition>);
        act(() => vi.advanceTimersByTime(0));
        expect(overlay).not.toHaveClass("cmp-page-transition--loading");
    });

    test("does not impose the minimum hold when reduced motion is requested", () => {
        vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
        const { container, rerender } = render(<PageTransition><Loading /></PageTransition>);
        rerender(<PageTransition><h1>Ready</h1></PageTransition>);
        act(() => vi.advanceTimersByTime(0));
        expect(container.querySelector(".cmp-page-transition")).not.toHaveClass("cmp-page-transition--loading");
    });

    test.each(["/#Skills", "/#", "#Experience"])("never shows a loader for same-page section link %s", href => {
        const { container, rerender } = render(
            <PageTransition><TransitionLink href={href}>Section</TransitionLink></PageTransition>
        );
        fireEvent.click(screen.getByRole("link", { name: "Section" }));
        linkState.pending = true;
        rerender(<PageTransition><TransitionLink href={href}>Section</TransitionLink></PageTransition>);
        expect(container.querySelector(".cmp-page-transition")).not.toHaveClass("cmp-page-transition--loading");
        act(() => vi.advanceTimersByTime(600));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    test.each(["/blogs#article", "/?filter=new#Skills"])("keeps the loader for a different document %s", href => {
        const { container, rerender } = render(
            <PageTransition><TransitionLink href={href}>Destination</TransitionLink></PageTransition>
        );
        fireEvent.click(screen.getByRole("link", { name: "Destination" }));
        linkState.pending = true;
        rerender(<PageTransition><TransitionLink href={href}>Destination</TransitionLink></PageTransition>);
        expect(container.querySelector(".cmp-page-transition")).toHaveClass("cmp-page-transition--loading");
    });
});
