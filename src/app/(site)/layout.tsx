import "./../styles/globals.css";
import './../styles/site.css';
import HeaderComponent from "@/components/site/header/Header";
import PublicFooter from "@/components/site/footer/PublicFooter";
import PageTransition from "@/components/site/page-transition/PageTransition";
import { QueryProvider } from "@/providers/QueryProvider";
import type { Metadata } from "next";
import { BasicInfoSchema } from "@/@types/BasicInfo.types";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getPublicProfile, getPublicProfileRecord } from "@/libs/public-data";
import { SITE_ORIGIN } from "@/libs/site-url";
export const dynamic = 'force-dynamic';

const siteMetadataSchema = BasicInfoSchema.pick({
  name: true,
  bio: true,
  meta_description: true,
  website_url: true,
  avatar_url: true,
  favicon_url: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const record = await getPublicProfileRecord();
  if (!record) {
    console.warn("Basic info is not configured; using the default portfolio metadata.");
    return { title: "Portfolio", icons: { apple: "/apple-touch-icon.png" } };
  }
  const info = siteMetadataSchema.parse(record);
  const metadataBase = new URL(SITE_ORIGIN);
  const title = `${info.name} | Mastra AI & EDS Frontend Engineer`;
  const description = info.meta_description || info.bio.trim();

  return {
    metadataBase,
    title: { default: title, template: `%s | ${info.name}` },
    description,
    authors: [{ name: info.name, url: SITE_ORIGIN }],
    creator: info.name,
    icons: { icon: info.favicon_url, shortcut: info.favicon_url, apple: "/apple-touch-icon.png" },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: title,
      url: SITE_ORIGIN,
      images: [{ url: info.avatar_url, alt: info.name }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [{ url: info.avatar_url, alt: info.name }],
    },
  };
}


export default async function RootLayout({ children }: LayoutProps<"/">) {
  const profile = await getPublicProfile();
  const queryClient = new QueryClient();
  if (profile) queryClient.setQueryData(["basicInfo"], profile);
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <HydrationBoundary state={dehydrate(queryClient)}>
          <PageTransition>
          <HeaderComponent />
          <main className="flex-1">
            {children}
          </main>
          <PublicFooter year={new Date().getFullYear()} />
          </PageTransition>
          </HydrationBoundary>
        </QueryProvider>
      </body>
    </html>
  );
}
