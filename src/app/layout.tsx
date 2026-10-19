import "./globals.css";

import { DM_Sans, JetBrains_Mono } from "next/font/google";

import type { Metadata, Viewport } from "next";
import { THEME_SCRIPT } from "@/features/theme/theme-script";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  axes: ["opsz"],
  display: "swap",
});

// Only the app uses the mono face: the landing must not wait for it.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Better Tasks",
  description:
    "Better Tasks is a task management app that helps you manage your tasks efficiently.",
};

// Android shrinks the page under its keyboard, so the Line stays above it.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The theme script may swap "dark" for "light" before hydration.
    <html lang="en" className={`dark ${dmSans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* Browser extensions inject attributes into <body> before hydration. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
