"use client";

/**
 * Last line of defence if the root layout itself fails. It replaces the whole
 * document, so it can't rely on the app's styles or fonts: everything is inline.
 */
export default function GlobalError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#0e0e10",
          color: "#f3f2ef",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <title>Mockform — something went wrong</title>
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#b3b1b8", margin: "0 0 20px", lineHeight: 1.5 }}>
            Mockform couldn&rsquo;t start. Your work is saved in this browser.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              background: "#ffffff",
              color: "#111111",
              border: 0,
              borderRadius: 10,
              padding: "10px 16px",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
