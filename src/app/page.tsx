"use client";

import { useEffect } from "react";

/**
 * Entry point for /bhoomi/. The root layout is a pass-through (the locale layout owns <html>),
 * so this page renders its own complete document.
 */
export default function RootRedirect() {
  useEffect(() => {
    const target = navigator.language?.toLowerCase().startsWith("kn")
      ? "/bhoomi/kn/"
      : "/bhoomi/en/";
    location.replace(target);
  }, []);
  /* eslint-disable @next/next/no-html-link-for-pages -- static fallback links outside the i18n router */
  return (
    <html lang="en">
      <head>
        <title>Hale Dakhale / ಹಳೆ ದಾಖಲೆ</title>
      </head>
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 16 }}>
        <p>
          <a href="/bhoomi/en/">English</a> · <a href="/bhoomi/kn/">ಕನ್ನಡ</a>
        </p>
        <noscript>
          <p>
            JavaScript is off. Continue to <a href="/bhoomi/en/">the English site</a> or{" "}
            <a href="/bhoomi/kn/">the Kannada site</a>.
          </p>
        </noscript>
      </body>
    </html>
  );
}
