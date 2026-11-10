import "./../styles/globals.css";
import './../styles/site.css';
import HeaderComponent from "@/components/site/header/Header";
import PublicFooter from "@/components/site/footer/PublicFooter";
import { QueryProvider } from "@/providers/QueryProvider";
export const dynamic = 'force-dynamic';


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
