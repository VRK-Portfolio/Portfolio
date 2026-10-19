import type { Metadata } from "next";
import "./../../styles/globals.css";
import './../../styles/admin.css';
import { QueryProvider } from "@/providers/QueryProvider";
import Sidebar from "@/components/admin/sidebar/Sidebar";

export const metadata: Metadata = {
  title: "Vijay Rameshkumar | Admin Panel | Portfolio",
  description: "Full Stack Software Engineer with expertise in building scalable web applications",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-row gap-4">
        <QueryProvider>
          <Sidebar />
          <main>
            {children}
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}
