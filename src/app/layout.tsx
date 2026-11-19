import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
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

// Vercel sets this during its builds; local runs and CI leave analytics out.
const onVercel = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Kratik Agrawal" }],
  keywords: [
    "device mockup",
    "mockup generator",
    "screenshot mockup",
    "app store screenshots",
    "phone mockup",
    "laptop mockup",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Mockform: a browser window mockup on a violet gradient",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  icons: { apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
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
        {/* Anonymous, cookie-free visit counts. Only on Vercel, which serves the script. */}
        {onVercel && <Analytics />}
      </body>
    </html>
  );
}
