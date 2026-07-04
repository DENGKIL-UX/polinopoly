import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dewan Rakyat: Pilihan Raya Edition — Malaysian Political Satire Monopoly",
  description: "Navigate the Malaysian political landscape! Buy influence, collect rent, avoid jail, and outmaneuver 5 AI-controlled coalitions in this satirical board game.",
  keywords: ["Malaysia", "politics", "monopoly", "board game", "Dewan Rakyat", "Pilihan Raya", "satire", "game"],
  authors: [{ name: "DENGKIL-UX" }],
  openGraph: {
    title: "Dewan Rakyat: Pilihan Raya Edition",
    description: "A Malaysian Political Satire Monopoly Game — Buy influence, collect rent, and control Dewan Rakyat!",
    siteName: "Polinopoly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dewan Rakyat: Pilihan Raya Edition",
    description: "A Malaysian Political Satire Monopoly Game",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
