import type { Metadata } from "next";
import "./../styles/globals.css";
import HeaderComponent from "@/components/site/header/Header";
import { QueryProvider } from "@/providers/QueryProvider";
import type { BasicInfoType } from "@/@types/BasicInfo.types";

const fetchSiteConfig = async (): Promise<BasicInfoType | null> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/basic-info`);
  if (!response.ok) {
    throw new Error('Failed to fetch site config');
  }
  const res = await response.json();
  return res.data?.[0] ?? null;
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchSiteConfig();
  return {
    title: data?.name,
    description: data?.bio,
    icons: {
      icon: [
        {
          url: data?.favicon_url,
          type: "image/x-icon"
        }
      ]
    }
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <HeaderComponent />
          <main>
            {children}
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}
