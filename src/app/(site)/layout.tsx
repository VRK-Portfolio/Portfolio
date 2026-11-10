import "./../styles/globals.css";
import './../styles/site.css';
import HeaderComponent from "@/components/site/header/Header";
import PublicFooter from "@/components/site/footer/PublicFooter";
import { QueryProvider } from "@/providers/QueryProvider";
import type { Metadata } from "next";
import { BasicInfoSchema } from "@/@types/BasicInfo.types";
import { BasicInfoModel } from "@/models/basic-info.model";
import { connectDB } from "@/libs/db";
export const dynamic = 'force-dynamic';

const siteMetadataSchema = BasicInfoSchema.pick({
  name: true,
  bio: true,
  website_url: true,
  avatar_url: true,
  favicon_url: true,
});

export async function generateMetadata(): Promise<Metadata> {
  await connectDB();
  const record = await BasicInfoModel.findOne()
    .select("name bio website_url avatar_url favicon_url").lean().exec();
  if (!record) {
    console.warn("Basic info is not configured; using the default portfolio metadata.");
    return { title: "Portfolio" };
  }
  const info = siteMetadataSchema.parse(record);
  const metadataBase = new URL(info.website_url);
  if (metadataBase.protocol !== "http:" && metadataBase.protocol !== "https:") {
    throw new Error("The basic info website URL must use HTTP or HTTPS.");
  }
  const title = `${info.name} | Portfolio`;
  const description = info.bio.trim();

  return {
    metadataBase,
    title: { default: title, template: `%s | ${info.name}` },
    description,
    authors: [{ name: info.name, url: info.website_url }],
    creator: info.name,
    icons: { icon: info.favicon_url, shortcut: info.favicon_url },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: title,
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


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <HeaderComponent />
          <main className="flex-1">
            {children}
          </main>
          <PublicFooter year={new Date().getFullYear()} />
        </QueryProvider>
      </body>
    </html>
  );
}
