import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/editor/Logo";

export const metadata: Metadata = {
  title: "Privacy — Mockform",
  description:
    "Mockform runs entirely in your browser. Your screenshots and videos never leave your device.",
};

export default function PrivacyPage() {
  return (
    <div className="h-dvh overflow-y-auto bg-workspace">
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/"
          className="inline-block rounded-md"
          aria-label="Back to the Mockform editor"
        >
          <Logo />
        </Link>
        <h1 className="mt-10 text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          Privacy
        </h1>
        <p className="mt-2 text-label text-faint">
          Last updated 19 November 2026
        </p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-muted [&_h2]:mb-2 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:text-ink">
          <section>
            <h2>Your files stay on your device</h2>
            <p>
              Mockform runs entirely in your browser. Screenshots, videos,
              custom frames and exports are processed on your device and are
              never uploaded to a server. There are no accounts.
            </p>
          </section>
          <section>
            <h2>What is stored, and where</h2>
            <p>
              So your work is still there when you come back, Mockform saves
              your current scene, the files you added and your export settings
              in this browser&rsquo;s own storage (localStorage and IndexedDB).
              Nobody else can see it. Removing a screenshot or frame, using
              &ldquo;Start fresh&rdquo; on the error screen, or clearing this
              site&rsquo;s data in your browser deletes it.
            </p>
          </section>
          <section>
            <h2>No tracking</h2>
            <p>
              Mockform sets no cookies and includes no advertising or tracking
              scripts.
            </p>
          </section>
          <section>
            <h2>Hosting</h2>
            <p>
              Like any website, the server that delivers Mockform&rsquo;s files
              may keep standard technical logs (such as IP address and browser
              type) for security and reliability. These never include your
              files.
            </p>
          </section>
          <section>
            <h2>Questions</h2>
            <p>
              Mockform is open source under the MIT licence. You can read the
              code and raise questions on{" "}
              <a
                href="https://github.com/kratikagrawal007/Mockform"
                className="font-medium text-accent-ink underline underline-offset-2"
              >
                GitHub
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
