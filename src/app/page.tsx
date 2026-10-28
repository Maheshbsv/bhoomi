"use client";

import { useEffect } from "react";

export default function RootRedirect() {
  useEffect(() => {
    const target = navigator.language?.toLowerCase().startsWith("kn")
      ? "/bhoomi/kn/"
      : "/bhoomi/en/";
    location.replace(target);
  }, []);
  /* eslint-disable @next/next/no-html-link-for-pages -- static fallback links outside the i18n router */
  return (
    <p style={{ padding: 16 }}>
      <a href="/bhoomi/en/">English</a> · <a href="/bhoomi/kn/">ಕನ್ನಡ</a>
    </p>
  );
}
