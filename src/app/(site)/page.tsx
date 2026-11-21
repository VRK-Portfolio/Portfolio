import HomePage from "@/screens/home-page";
import type { Metadata } from "next";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getHomepageData } from "@/libs/public-data";
import { SITE_ORIGIN } from "@/libs/site-url";

export const metadata: Metadata = { alternates: { canonical: `${SITE_ORIGIN}/` } };

export default async function Home() {
  const data = await getHomepageData();
  const queryClient = new QueryClient();
  queryClient.setQueryData(["skills"], data.skills);
  queryClient.setQueryData(["experience"], data.experiences);
  queryClient.setQueryData(["certifications"], data.certifications);
  queryClient.setQueryData(["blogListing", undefined], data.blogs);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomePage />
    </HydrationBoundary>
  );
}
