import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Footer from "../Footer";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

class MockIntersectionObserver implements IntersectionObserver {
    static latest: MockIntersectionObserver;
    root = null;
    rootMargin = "0px";
    thresholds = [1];
    observe = vi.fn<(target: Element) => void>();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = () => [];

    constructor(private callback: IntersectionObserverCallback) {
        MockIntersectionObserver.latest = this;
    }

    setVisibility(ratio: number) {
        const bounds = new DOMRect();
        this.callback([{
            target: this.observe.mock.calls[0][0],
            isIntersecting: ratio > 0,
            intersectionRatio: ratio,
            boundingClientRect: bounds,
            intersectionRect: bounds,
            rootBounds: bounds,
            time: 0,
        }], this);
    }
}

beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});
afterEach(() => vi.unstubAllGlobals());

describe("Footer", () => {
    test.each([
        ["ollama", "llama3.2", "Ollama"],
        ["google", "gemini-2.5-flash", "Google Gemini"],
        ["openai", "gpt-4.1-mini", "OpenAI"],
        ["anthropic", "claude-sonnet-4-5", "Anthropic"],
        ["groq", "llama-3.3-70b-versatile", "Groq"],
    ] as const)("shows configured provider %s and model only inside the open chat window", async (provider, model, label) => {
        const user = userEvent.setup();
        render(<Footer year={2026} modelConfig={{ provider, model }} />);
        expect(screen.getByText(model)).not.toBeVisible();
        await user.click(screen.getByRole("button", { name: "Chat with me" }));
        const badges = screen.getByRole("group", { name: "Chat model configuration" });
        expect(badges).toBeVisible();
        const input = screen.getByRole("textbox", { name: "Your question" });
        expect(input.compareDocumentPosition(badges) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByText("LLM provider:")).toHaveClass("sr-only");
        expect(screen.getByText(label)).toBeVisible();
        expect(screen.getByText(label).closest(".cmp-badge")).toHaveClass("cmp-footer__model-badge");
        expect(screen.getByText("Model:")).toHaveClass("sr-only");
        expect(screen.getByText(model)).toBeVisible();
        expect(screen.getByText(model).closest(".cmp-badge")).toHaveClass("cmp-footer__model-badge");
    });

    test("retains footer links but removes the launcher and panel when chat is disabled", () => {
        render(<Footer year={2026} chatEnabled={false} />);
        expect(screen.getByRole("navigation", { name: "Footer navigation" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Chat with me" })).not.toBeInTheDocument();
        expect(screen.queryByText("Portfolio assistant")).not.toBeInTheDocument();
    });
    test("renders copyright and the site's section links", () => {
        render(<Footer year={2026} />);
        expect(screen.getByText(/2026 Vijay Rameshkumar. All rights reserved./)).toBeInTheDocument();
        const nav = screen.getByRole("navigation", { name: "Footer navigation" });
        for (const [label, href] of [
            ["Home", "/#"], ["Skills", "/#Skills"], ["Experience", "/#Experience"],
            ["Certifications", "/#Certifications"], ["Blogs", "/#Blogs"],
        ]) {
            expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", href);
        }
        expect(screen.queryByRole("region", { name: "Portfolio assistant" })).not.toBeInTheDocument();
    });

    test("opens the chatbot, focuses the input, and closes with Escape", async () => {
        const user = userEvent.setup();
        render(<Footer year={2026} />);
        const toggle = screen.getByRole("button", { name: "Chat with me" });
        await user.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("textbox", { name: "Your question" })).toHaveFocus();
        expect(screen.getByRole("button", { name: "Send question" })).toBeDisabled();
        await user.keyboard("{Escape}");
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(toggle).toHaveFocus();
    });

    test("animates the same focused launcher into the footer only when fully visible and back out", async () => {
        const { unmount } = render(<Footer year={2026} />);
        const toggle = screen.getByRole<HTMLButtonElement>("button", { name: "Chat with me" });
        const cancel = vi.fn();
        const animate = vi.fn().mockReturnValue({ cancel });
        toggle.animate = animate;
        toggle.focus();

        expect(toggle).not.toHaveClass("cmp-footer__chat-toggle--docked");
        act(() => MockIntersectionObserver.latest.setVisibility(0.5));
        expect(toggle).not.toHaveClass("cmp-footer__chat-toggle--docked");
        expect(animate).not.toHaveBeenCalled();

        act(() => MockIntersectionObserver.latest.setVisibility(1));
        expect(toggle).toHaveClass("cmp-footer__chat-toggle--docked");
        expect(toggle).toHaveFocus();
        expect(screen.getAllByRole("button", { name: "Chat with me" })).toHaveLength(1);
        expect(animate).toHaveBeenCalledWith(expect.any(Array), {
            duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        });

        act(() => MockIntersectionObserver.latest.setVisibility(1));
        expect(animate).toHaveBeenCalledOnce();
        act(() => MockIntersectionObserver.latest.setVisibility(0));
        expect(toggle).not.toHaveClass("cmp-footer__chat-toggle--docked");
        expect(toggle).toHaveFocus();
        expect(animate).toHaveBeenCalledTimes(2);
        expect(cancel).toHaveBeenCalled();
        unmount();
        expect(MockIntersectionObserver.latest.disconnect).toHaveBeenCalledOnce();
    });

    test("docks without animation for reduced motion and preserves an open chat draft", async () => {
        vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
        const user = userEvent.setup();
        render(<Footer year={2026} />);
        const toggle = screen.getByRole<HTMLButtonElement>("button", { name: "Chat with me" });
        const animate = vi.fn();
        toggle.animate = animate;
        await user.click(toggle);
        const input = screen.getByRole("textbox");
        await user.type(input, "My draft");
        act(() => MockIntersectionObserver.latest.setVisibility(1));
        expect(toggle).toHaveClass("cmp-footer__chat-toggle--docked");
        expect(animate).not.toHaveBeenCalled();
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(input).toHaveValue("My draft");
        expect(input).toHaveFocus();
        act(() => MockIntersectionObserver.latest.setVisibility(0));
        expect(animate).not.toHaveBeenCalled();
        expect(input).toHaveValue("My draft");
    });

    test("sends a trimmed question and displays the response as plain text", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            success: true, text: "<b>React and Next.js</b>",
        })));
        vi.stubGlobal("fetch", fetchMock);
        const user = userEvent.setup();
        render(<Footer year={2026} />);
        await user.click(screen.getByRole("button", { name: "Chat with me" }));
        const input = screen.getByRole("textbox", { name: "Your question" });
        await user.type(input, "  What are your skills?  ");
        await user.click(screen.getByRole("button", { name: "Send question" }));
        expect(fetchMock).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "What are your skills?", pathname: "/" }),
        }));
        const answer = await screen.findByText("<b>React and Next.js</b>", { exact: false });
        expect(answer.parentElement).toHaveClass("cmp-footer__message", "cmp-footer__message--assistant");
        expect(screen.getByText("What are your skills?")).toHaveClass("cmp-footer__message", "cmp-footer__message--user");
        expect(input).toHaveValue("");
        await user.click(screen.getByRole("button", { name: "Close chatbot" }));
        await user.click(screen.getByRole("button", { name: "Chat with me" }));
        expect(screen.getByRole("log")).toHaveTextContent("What are your skills?");
    });

    test.each([
        ["HTTP error", () => Promise.resolve(new Response("{}", { status: 503 }))],
        ["network error", () => Promise.reject(new Error("Network failure"))],
        ["invalid response", () => Promise.resolve(new Response('{"success":true,"text":""}'))],
        ["invalid JSON", () => Promise.resolve(new Response("not JSON"))],
    ])("keeps the question and allows retry after %s", async (_name, response) => {
        const fetchMock = vi.fn().mockImplementationOnce(response).mockResolvedValue(
            new Response('{"success":true,"text":"Try again succeeded"}'),
        );
        vi.stubGlobal("fetch", fetchMock);
        const user = userEvent.setup();
        render(<Footer year={2026} />);
        await user.click(screen.getByRole("button", { name: "Chat with me" }));
        const input = screen.getByRole("textbox", { name: "Your question" });
        await user.type(input, "Tell me about your experience");
        await user.click(screen.getByRole("button", { name: "Send question" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Please try again");
        expect(input).toHaveValue("Tell me about your experience");
        await user.click(screen.getByRole("button", { name: "Send question" }));
        expect(await screen.findByText(/Try again succeeded/)).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    test("shows safe provider configuration errors while keeping the draft for retry", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
            success: false, error: "The configured AI model is unavailable. Choose a supported model in Chatbot Settings.",
        }), { status: 503 })));
        const user = userEvent.setup();
        render(<Footer year={2026} />);
        await user.click(screen.getByRole("button", { name: "Chat with me" }));
        await user.type(screen.getByRole("textbox"), "show me the list of blogs");
        await user.click(screen.getByRole("button", { name: "Send question" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Choose a supported model in Chatbot Settings.");
        expect(screen.getByRole("textbox")).toHaveValue("show me the list of blogs");
        expect(screen.getByRole("button", { name: "Send question" })).toBeEnabled();
    });

    test("prevents duplicate submissions while waiting", async () => {
        let resolveResponse!: (response: Response) => void;
        const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((resolve) => {
            resolveResponse = resolve;
        }));
        vi.stubGlobal("fetch", fetchMock);
        const user = userEvent.setup();
        render(<Footer year={2026} />);
        await user.click(screen.getByRole("button", { name: "Chat with me" }));
        await user.type(screen.getByRole("textbox"), "Hello");
        await user.click(screen.getByRole("button", { name: "Send question" }));
        expect(screen.getByRole("status")).toHaveTextContent("Thinking...");
        expect(screen.getByRole("button", { name: "Send question" })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Send question" }));
        expect(fetchMock).toHaveBeenCalledOnce();
        await act(async () => {
            resolveResponse(new Response('{"success":true,"text":"Hello!"}'));
        });
        expect(await screen.findByText(/Hello!/)).toBeInTheDocument();
    });

    test("renders only clickable blog titles with safe new-tab links and preserves them after reopening", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
            success: true,
            text: "Here is a related blog.",
            blogs: [{
                _id: "507f1f77bcf86cd799439011",
                title: "React patterns",
                slug: "react-patterns",
                excerpt: "Reusable components and hooks.",
                coverImage: "/images/react.png",
                skills: ["React", "TypeScript"],
            }, {
                _id: "507f1f77bcf86cd799439012",
                title: "Minimal blog",
                slug: "minimal-blog",
                excerpt: "A simple preview.",
                skills: [],
            }],
        }))));
        const user = userEvent.setup();
        render(<Footer year={2026} />);
        await user.click(screen.getByRole("button", { name: "Chat with me" }));
        await user.type(screen.getByRole("textbox"), "Show your React blogs");
        await user.click(screen.getByRole("button", { name: "Send question" }));
        const links = await screen.findByRole("list", { name: "Related blogs" });
        expect(links.closest(".cmp-footer__message--assistant")).toBeInTheDocument();
        expect(within(links).getAllByRole("link")).toHaveLength(2);
        const link = within(links).getByRole("link", { name: "React patterns (opens in a new tab)" });
        expect(link).toHaveAttribute("href", "/blogs/react-patterns");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
        const log = within(screen.getByRole("log"));
        expect(log.queryByRole("article")).not.toBeInTheDocument();
        expect(log.queryByRole("img")).not.toBeInTheDocument();
        expect(log.queryByText("Reusable components and hooks.")).not.toBeInTheDocument();
        expect(log.queryByText("React")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Close chatbot" }));
        await user.click(screen.getByRole("button", { name: "Chat with me" }));
        expect(within(screen.getByRole("list", { name: "Related blogs" })).getAllByRole("link")).toHaveLength(2);
    });

    test("rejects malformed blog links rather than rendering untrusted URLs", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
            success: true, text: "A blog",
            blogs: [{
                _id: "507f1f77bcf86cd799439011", title: "Bad link",
                slug: "../../other-page", excerpt: "Invalid", skills: [],
            }],
        }))));
        const user = userEvent.setup();
        render(<Footer year={2026} />);
        await user.click(screen.getByRole("button", { name: "Chat with me" }));
        await user.type(screen.getByRole("textbox"), "Show blogs");
        await user.click(screen.getByRole("button", { name: "Send question" }));
        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.queryByRole("article")).not.toBeInTheDocument();
        expect(screen.getByRole("textbox")).toHaveValue("Show blogs");
    });

    test("sends the latest page path when navigating between blog pages and home", async () => {
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
            new Response('{"success":true,"text":"Current page answer","blogs":[]}'),
        ));
        vi.stubGlobal("fetch", fetchMock);
        vi.mocked(usePathname).mockReturnValue("/blogs/react-patterns");
        const user = userEvent.setup();
        const { rerender } = render(<Footer year={2026} />);
        await user.click(screen.getByRole("button", { name: "Chat with me" }));

        for (const pathname of ["/blogs/react-patterns", "/blogs/another-post", "/"]) {
            vi.mocked(usePathname).mockReturnValue(pathname);
            rerender(<Footer year={2026} />);
            await user.type(screen.getByRole("textbox"), "Summarize this blog");
            await user.click(screen.getByRole("button", { name: "Send question" }));
            expect(fetchMock).toHaveBeenLastCalledWith("/api/chat", expect.objectContaining({
                body: JSON.stringify({ prompt: "Summarize this blog", pathname }),
            }));
        }
    });
});
