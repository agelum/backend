import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/client/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "@agelum/backend Demo",
  description: "Real-time reactive database with Next.js, Drizzle, and tRPC",
};

// Use environment variable or default organization ID
const ORGANIZATION_ID = process.env.DEMO_ORGANIZATION_ID || "demo-org-123";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers organizationId={ORGANIZATION_ID}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
