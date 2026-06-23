import type { Metadata } from "next";
import "./globals.css";
import { AppSessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "Crash Game",
  description: "Realtime multiplayer crash game challenge",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <AppSessionProvider>
          <QueryProvider>{children}</QueryProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
