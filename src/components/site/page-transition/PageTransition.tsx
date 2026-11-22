"use client";

import Link, { useLinkStatus } from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import "./page-transition.css";

const LoadingContext = createContext<((id: string, loading: boolean) => void) | null>(null);
const MINIMUM_LOADING_MS = 600;

export default function PageTransition({ children }: { children: ReactNode }) {
    const [pendingLoads, setPendingLoads] = useState<Set<string>>(() => new Set());
    const [holdLoader, setHoldLoader] = useState(false);
    const startedAt = useRef<number | null>(null);
    const isLoading = pendingLoads.size > 0 || holdLoader;
    const setIsLoading = useCallback((id: string, loading: boolean) => {
        if (loading) {
            startedAt.current ??= Date.now();
            setHoldLoader(true);
        }
        setPendingLoads(previous => {
            const next = new Set(previous);
            if (loading) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    useEffect(() => {
        if (pendingLoads.size > 0 || !holdLoader) return;
        const reducedMotion = typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const elapsed = Date.now() - (startedAt.current ?? Date.now());
        const remaining = reducedMotion ? 0 : Math.max(0, MINIMUM_LOADING_MS - elapsed);
        const timeout = window.setTimeout(() => {
            startedAt.current = null;
            setHoldLoader(false);
        }, remaining);
        return () => window.clearTimeout(timeout);
    }, [pendingLoads, holdLoader]);

    return (
        <LoadingContext.Provider value={setIsLoading}>
            {children}
            <div
                className={`cmp-page-transition${isLoading ? " cmp-page-transition--loading" : ""}`}
                role="status"
                aria-live="polite"
                aria-busy={isLoading}
                aria-hidden={!isLoading}
            >
                <div className="cmp-page-transition__content">
                    <span className="cmp-page-transition__spinner" aria-hidden="true" />
                    <span>{isLoading ? "Loading page..." : null}</span>
                </div>
            </div>
        </LoadingContext.Provider>
    );
}

function usePageLoading(loading: boolean) {
    const setIsLoading = useContext(LoadingContext);
    const id = useId();

    useEffect(() => {
        // Standalone components (including Storybook and admin reuse) keep native links.
        if (!setIsLoading || !loading) return;
        setIsLoading(id, true);
        return () => setIsLoading(id, false);
    }, [id, loading, setIsLoading]);
}

export function PageLoading() {
    usePageLoading(true);
    return <p className="text-center py-12">Loading page...</p>;
}

function PendingLink({ isSectionNavigation }: { isSectionNavigation: boolean }) {
    const { pending } = useLinkStatus();
    usePageLoading(pending && !isSectionNavigation);
    return null;
}

export function TransitionLink({ children, onClick, ...props }: ComponentProps<typeof Link>) {
    const [isSectionNavigation, setIsSectionNavigation] = useState(false);

    return (
        <Link {...props} onClick={event => {
            onClick?.(event);
            if (event.defaultPrevented) return;
            const destination = new URL(event.currentTarget.href);
            const current = window.location;
            setIsSectionNavigation(
                destination.href.includes("#")
                && destination.origin === current.origin
                && destination.pathname === current.pathname
                && destination.search === current.search
            );
        }}>
            {children}<PendingLink isSectionNavigation={isSectionNavigation} />
        </Link>
    );
}
