import "./globals.css";

import { Inter, Nunito } from "next/font/google";

import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Better Tasks",
  description:
    "Better Tasks is a task management app that helps you manage your tasks efficiently.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full">
      <body
        className={`${inter.variable} ${nunito.variable}  antialiased dark`}
        suppressHydrationWarning
        data-lt-installed
      >
        {children}
        <Toaster position="top-right" expand={true} richColors />
      </body>
    </html>
  );
}
