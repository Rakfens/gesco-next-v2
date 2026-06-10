"use client";

import { ThemeProvider } from "@/modules/shared/context/ThemeContext";
import { type ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <RootLayoutInner>{children}</RootLayoutInner>
    </ThemeProvider>
  );
}

function RootLayoutInner({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" style={{ height: "100%", colorScheme: "dark" }}>
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#08080c" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
          color: "var(--text)",
          fontFamily: "var(--font)",
          fontSize: 14,
          lineHeight: 1.6,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
