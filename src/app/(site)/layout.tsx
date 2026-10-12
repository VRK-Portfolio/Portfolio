import type { Metadata } from "next";
import "./../styles/globals.css";
import HeaderComponent from "@/components/site/header/Header";


export const metadata: Metadata = {
  title: "Vijay Rameshkumar | Portfolio",
  description: "Full Stack Software Engineer with expertise in building scalable web applications",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <HeaderComponent />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
