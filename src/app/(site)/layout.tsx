import "./../styles/globals.css";
import HeaderComponent from "@/components/site/header/Header";
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
          <main>
            {children}
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}
