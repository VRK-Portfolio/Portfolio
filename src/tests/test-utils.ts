import { vi } from "vitest";

export const setViewPortWidth = (width: number) => {
    window.innerWidth = width;
    window.matchMedia = (query: string) => ({
        matches: width >= 768,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    });
}