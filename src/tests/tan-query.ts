import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Prevents retries during tests
        gcTime: Infinity,
      },
    },
  });

export const renderWithQueryClient = (ui: ReactNode) => {
  const queryClient = createTestQueryClient();
  const result = render(ui, {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });

  return { ...result, queryClient };
};