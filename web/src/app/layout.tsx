import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-thai"
});

export const metadata: Metadata = {
  title: "ORGL Notes Bot",
  description: "AI-powered chat summarization dashboard for LINE Official Accounts",
};

// Force Railway redeploy - Updated UI with shadcn components

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${notoSansThai.variable} font-sans`} suppressHydrationWarning>
        <main className="min-h-screen bg-white">
          {children}
        </main>
      </body>
    </html>
  );
}