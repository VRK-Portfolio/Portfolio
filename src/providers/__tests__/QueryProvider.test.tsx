import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vitest";
import { QueryProvider } from "../QueryProvider";

describe("QueryProvider", () => {
    const clients = new Set<QueryClient>();

    const useClient = () => {
        const client = useQueryClient();
        clients.add(client);
        return client;
    };

    const QueryConsumer = ({ queryFn }: { queryFn: () => Promise<string> }) => {
        useClient();
        const query = useQuery({ queryKey: ["provider-test"], queryFn });
        return <output>{query.isPending ? "Loading" : query.error?.message ?? query.data}</output>;
    };

    afterEach(() => {
        cleanup();
        for (const client of clients) {
            client.clear();
        }
        clients.clear();
        vi.restoreAllMocks();
    });

    test("should render its children and expose a query client through context", () => {
        render(<QueryProvider><p>Provider children</p></QueryProvider>);
        const { result } = renderHook(useClient, { wrapper: QueryProvider });

        expect(screen.getByText("Provider children")).toBeInTheDocument();
        expect(result.current).toBeInstanceOf(QueryClient);
    });

    test("should configure exactly five minutes of stale time with query retries disabled", () => {
        const { result } = renderHook(useClient, { wrapper: QueryProvider });

        expect(result.current.getDefaultOptions().queries?.staleTime).toBe(300000);
        expect(result.current.getDefaultOptions().queries?.retry).toBe(false);
    });

    test("should preserve the same query client and cached data across rerenders", () => {
        const { result, rerender } = renderHook(useClient, { wrapper: QueryProvider });
        const originalClient = result.current;
        originalClient.setQueryData(["skills"], ["Cached skill"]);

        rerender();

        expect(result.current).toBe(originalClient);
        expect(result.current.getQueryData(["skills"])).toEqual(["Cached skill"]);
    });

    test("should isolate caches between provider instances", () => {
        const first = renderHook(useClient, { wrapper: QueryProvider });
        const second = renderHook(useClient, { wrapper: QueryProvider });
        first.result.current.setQueryData(["skills"], ["First provider skill"]);

        expect(second.result.current).not.toBe(first.result.current);
        expect(second.result.current.getQueryData(["skills"])).toBeUndefined();
        second.result.current.setQueryData(["skills"], ["Second provider skill"]);
        expect(first.result.current.getQueryData(["skills"])).toEqual(["First provider skill"]);
    });

    test("should share one client between sibling consumers", () => {
        const useSiblingClients = () => ({ first: useClient(), second: useClient() });
        const { result } = renderHook(useSiblingClients, { wrapper: QueryProvider });

        expect(result.current.first).toBe(result.current.second);
    });

    test("should reuse fresh cached results when a query consumer remounts", async () => {
        const queryFn = vi.fn<() => Promise<string>>().mockResolvedValue("Cached result");
        const { rerender } = render(<QueryProvider><QueryConsumer queryFn={queryFn} /></QueryProvider>);
        expect(await screen.findByText("Cached result")).toBeInTheDocument();
        expect(queryFn).toHaveBeenCalledTimes(1);

        rerender(<QueryProvider><p>Consumer unmounted</p></QueryProvider>);
        rerender(<QueryProvider><QueryConsumer queryFn={queryFn} /></QueryProvider>);

        expect(screen.getByText("Cached result")).toBeInTheDocument();
        expect(screen.queryByText("Loading")).not.toBeInTheDocument();
        expect(queryFn).toHaveBeenCalledTimes(1);
    });

    test("should refetch cached results after the five-minute freshness window expires", async () => {
        const now = Date.now();
        const clock = vi.spyOn(Date, "now").mockReturnValue(now);
        const queryFn = vi.fn<() => Promise<string>>()
            .mockResolvedValueOnce("Original result")
            .mockResolvedValueOnce("Refreshed result");
        const { rerender } = render(<QueryProvider><QueryConsumer queryFn={queryFn} /></QueryProvider>);
        await screen.findByText("Original result");
        rerender(<QueryProvider><p>Consumer unmounted</p></QueryProvider>);

        clock.mockReturnValue(now + 300001);
        rerender(<QueryProvider><QueryConsumer queryFn={queryFn} /></QueryProvider>);

        expect(await screen.findByText("Refreshed result")).toBeInTheDocument();
        expect(queryFn).toHaveBeenCalledTimes(2);
    });

    test("should expose a failed query without retrying", async () => {
        const error = new Error("Query unavailable");
        const queryFn = vi.fn<() => Promise<string>>().mockRejectedValue(error);
        const { result } = renderHook(() => ({
            client: useClient(),
            query: useQuery({ queryKey: ["failing-query"], queryFn }),
        }), { wrapper: QueryProvider });

        await waitFor(() => expect(result.current.query.isError).toBe(true));
        expect(result.current.query.error).toBe(error);
        expect(result.current.query.failureCount).toBe(1);
        expect(result.current.query.fetchStatus).toBe("idle");
        expect(queryFn).toHaveBeenCalledTimes(1);
    });
});
