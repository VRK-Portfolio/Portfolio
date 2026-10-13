import { vi } from 'vitest';

vi.mock('next/headers', () => ({
    cookies: vi.fn().mockResolvedValue({
        get: (name: string) => {
            if (name === 'accessToken') {
                return { value: 'mock-valid-token' };
            }
            return undefined;
        },
    }),
}));

vi.mock('@/libs/jwt', () => ({
    verifyAccessToken: async (token: string) => {
        if (token === 'mock-valid-token') {
            return { userId: '12345', email: 'admin@example.com', role: 'admin' };
        }
        return null;
    },
}));