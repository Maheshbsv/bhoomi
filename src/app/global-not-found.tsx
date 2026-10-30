import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found / ಪುಟ ಸಿಗಲಿಲ್ಲ — Hale Dakhale",
};

/* eslint-disable @next/next/no-html-link-for-pages -- the 404 is served outside any locale, so plain links are the right tool */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <p
          style={{ margin: 0, padding: "8px 16px", background: "#fef3c7", color: "#78350f", fontSize: 14 }}
        >
          Demo — sample data, no messages are sent /{" "}
          <span lang="kn">ಡೆಮೊ — ಮಾದರಿ ಮಾಹಿತಿ, ಯಾವುದೇ ಸಂದೇಶ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ</span>
        </p>
        <main style={{ padding: 16, maxWidth: 560, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24 }}>Page not found</h1>
          <p>This page does not exist in the demo. The link may be old.</p>
          <p>
            <a href="/bhoomi/en/" style={{ display: "inline-block", minHeight: 44, lineHeight: "44px" }}>
              Go to the home page
            </a>
          </p>
          <h1 lang="kn" style={{ fontSize: 24 }}>ಪುಟ ಸಿಗಲಿಲ್ಲ</h1>
          <p lang="kn">ಈ ಪುಟ ಡೆಮೊದಲ್ಲಿ ಇಲ್ಲ. ಲಿಂಕ್ ಹಳೆಯದಾಗಿರಬಹುದು.</p>
          <p>
            <a lang="kn" href="/bhoomi/kn/" style={{ display: "inline-block", minHeight: 44, lineHeight: "44px" }}>
              ಮುಖಪುಟಕ್ಕೆ ಹೋಗಿ
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
