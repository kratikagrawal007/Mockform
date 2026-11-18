import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

// next/font downloads these at build time and serves them from our own origin.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mockform — Device mockups from screenshots",
  description:
    "Turn screenshots into polished device mockups, right in your browser. No uploads, no sign-up.",
  applicationName: "Mockform",
  authors: [{ name: "Kratik Agrawal" }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      {/* Browser extensions often add attributes to <body>; don't let that trip hydration. */}
      <body className="h-full overflow-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
