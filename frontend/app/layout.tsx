import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PaisaTrack — Personal Finance Manager",
  description:
    "Track accounts, transactions, budgets and recurring payments in one place.",
};

// Runs before paint to apply the persisted (or OS) theme and the persisted
// sidebar state, so neither flashes on first render.
// Same storage keys as `lib/theme.ts` and `lib/sidebar.ts` (paisatrack-theme,
// paisatrack-sidebar).
const themeScript = `(function(){try{var t=localStorage.getItem('paisatrack-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);var s=localStorage.getItem('paisatrack-sidebar');document.documentElement.dataset.sidebar=s==='collapsed'?'collapsed':'expanded';}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
