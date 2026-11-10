'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Button from "@/block/ui/button/Button";
import Badge from "@/block/ui/badge/Badge";
import { ChatErrorResponseSchema, ChatResponseSchema, type ChatBlog } from "@/@types/Chat.types";
import { CHAT_PROVIDER_LABELS, type PublicChatSettings } from "@/@types/ChatSettings.types";
import "./Footer.css";

const menuItems = [
    { label: "Home", href: "/#" },
    { label: "Skills", href: "/#Skills" },
    { label: "Experience", href: "/#Experience" },
    { label: "Certifications", href: "/#Certifications" },
    { label: "Blogs", href: "/#Blogs" },
];
const chatUnavailableMessage = "The chatbot is unavailable right now. Please try again. Your question has been kept.";

export default function Footer({ year, chatEnabled = true, modelConfig }: {
    year: number;
    chatEnabled?: boolean;
    modelConfig?: Pick<PublicChatSettings, "provider" | "model">;
}) {
    const pathname = usePathname();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isLauncherDocked, setIsLauncherDocked] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState<{ prompt: string; answer: string; blogs: ChatBlog[] }[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const launcherSlotRef = useRef<HTMLDivElement>(null);
    const launcherDockedRef = useRef(false);
    const launcherPositionRef = useRef<DOMRect | null>(null);
    const launcherAnimationRef = useRef<Animation | null>(null);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const slot = launcherSlotRef.current;
        if (!slot) return;

        const observer = new IntersectionObserver(([entry]) => {
            const docked = entry.isIntersecting && entry.intersectionRatio >= 1;
            if (docked === launcherDockedRef.current) return;
            launcherPositionRef.current = toggleRef.current?.getBoundingClientRect() ?? null;
            launcherAnimationRef.current?.cancel();
            launcherDockedRef.current = docked;
            setIsLauncherDocked(docked);
        }, { threshold: 1 });
        observer.observe(slot);

        return () => {
            observer.disconnect();
            launcherAnimationRef.current?.cancel();
        };
    }, [chatEnabled]);

    useLayoutEffect(() => {
        const button = toggleRef.current;
        const previous = launcherPositionRef.current;
        launcherPositionRef.current = null;
        if (!button || !previous || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const current = button.getBoundingClientRect();
        // Keep the same button and focus while animating between viewport and footer coordinates.
        launcherAnimationRef.current = button.animate([
            { transform: `translate(${previous.left - current.left}px, ${previous.top - current.top}px)` },
            { transform: "translate(0, 0)" },
        ], { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }, [isLauncherDocked]);

    useEffect(() => {
        if (isChatOpen) inputRef.current?.focus();
    }, [isChatOpen]);

    useEffect(() => {
        const log = logRef.current;
        if (log) log.scrollTop = log.scrollHeight;
    }, [messages, isSending, isChatOpen]);

    const closeChat = () => {
        setIsChatOpen(false);
        toggleRef.current?.focus();
    };

    const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const question = prompt.trim();
        if (!question || isSending) return;

        setIsSending(true);
        setError("");
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: question, pathname }),
                signal: AbortSignal.timeout(60000),
            });
            const body: unknown = await response.json();
            if (!response.ok) {
                const failure = ChatErrorResponseSchema.safeParse(body);
                setError(failure.success ? `${failure.data.error} Your question has been kept.` : chatUnavailableMessage);
                return;
            }
            const result = ChatResponseSchema.parse(body);
            setMessages((previous) => [...previous, { prompt: question, answer: result.text, blogs: result.blogs }]);
            setPrompt("");
        } catch {
            setError(chatUnavailableMessage);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <footer className="cmp-footer">
            <div className="container">
                <div className="cmp-footer__content">
                    <p className="cmp-footer__copyright">
                        &copy; {year} Vijay Rameshkumar. All rights reserved.
                    </p>
                    <nav aria-label="Footer navigation">
                        <ul className="cmp-footer__menu">
                            {menuItems.map(({ label, href }) => (
                                <li key={label}><Link href={href}>{label}</Link></li>
                            ))}
                        </ul>
                    </nav>
                    {chatEnabled && <div className="cmp-footer__chat-slot" ref={launcherSlotRef}>
                      <button
                        ref={toggleRef}
                        type="button"
                        className={`cmp-footer__chat-toggle ${isLauncherDocked ? "cmp-footer__chat-toggle--docked" : ""}`}
                        aria-expanded={isChatOpen}
                        aria-controls="footer-chat"
                        onClick={() => isChatOpen ? closeChat() : setIsChatOpen(true)}
                    >
                        <MessageCircle className="size-4" aria-hidden="true" />
                        Chat with me
                      </button>
                    </div>}
                </div>
                {chatEnabled && <section
                    id="footer-chat"
                    className="cmp-footer__chat"
                    aria-labelledby="footer-chat-title"
                    hidden={!isChatOpen}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") closeChat();
                    }}
                >
                    <div className="flex items-center justify-between gap-4">
                        <h2 id="footer-chat-title" className="text-lg font-semibold">Portfolio assistant</h2>
                        <Button variant="ghost" onClick={closeChat} aria-label="Close chatbot">
                            <X className="size-4" aria-hidden="true" />
                        </Button>
                    </div>
                    <p className="cmp-footer__hint">Ask about my skills, experience, or projects. AI answers may be inaccurate.</p>
                    <div ref={logRef} className="cmp-footer__messages" role="log" aria-label="Chat messages">
                        {messages.map((message, index) => (
                            <div key={index} className="cmp-footer__exchange">
                                <p className="cmp-footer__message cmp-footer__message--user">
                                    <strong className="cmp-footer__message-label">You:</strong>
                                    {message.prompt}
                                </p>
                                <div className="cmp-footer__message cmp-footer__message--assistant">
                                    <p>
                                        <strong className="cmp-footer__message-label">Assistant:</strong>
                                        {message.answer}
                                    </p>
                                    {message.blogs.length > 0 && (
                                        <ul className="cmp-footer__blog-links" aria-label="Related blogs">
                                            {message.blogs.map(blog => (
                                                <li key={blog._id}>
                                                    <Link
                                                        href={`/blogs/${blog.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        aria-label={`${blog.title} (opens in a new tab)`}
                                                    >
                                                        {blog.title}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p role="status">{isSending ? "Thinking..." : ""}</p>
                    {error && <p role="alert" className="cmp-footer__error">{error}</p>}
                    <form onSubmit={sendMessage} className="cmp-footer__form">
                        <label htmlFor="footer-chat-prompt" className="sr-only">Your question</label>
                        <input
                            ref={inputRef}
                            id="footer-chat-prompt"
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            placeholder="Ask a question..."
                            disabled={isSending}
                            required
                        />
                        <Button type="submit" disabled={isSending || !prompt.trim()} aria-label="Send question">
                            <Send className="size-4" aria-hidden="true" />
                        </Button>
                    </form>
                    {modelConfig && <div className="cmp-footer__model" role="group" aria-label="Chat model configuration">
                        <Badge className="cmp-footer__model-badge">
                            <span className="sr-only">LLM provider:</span>
                            <span>{CHAT_PROVIDER_LABELS[modelConfig.provider]}</span>
                        </Badge>
                        <Badge className="cmp-footer__model-badge">
                            <span className="sr-only">Model:</span>
                            <span>{modelConfig.model}</span>
                        </Badge>
                    </div>}
                </section>}
            </div>
        </footer>
    );
}
