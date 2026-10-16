import { vi } from "vitest";

export const pushMock = vi.fn();
export const routerMock  =  {
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
}
