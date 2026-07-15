import AnimationApplier from "@/components/appliers/animation-applier";
import ThemeApplier from "@/components/appliers/theme-applier";
import ReduxProvider from "@/providers/redux-provider";
import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOYSAL AHMED",
  description: "A full-stack developer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="max-w-screen overflow-x-hidden scroll-smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
                (function () {
                  try {
                    var raw = localStorage.getItem('setting');
                    var s = raw ? JSON.parse(raw) : null;
                    var root = document.documentElement;

                    // ---- Theme ----
                    var theme = s && s.theme ? s.theme : 'system';
                    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    var mode =
                      theme === 'dark'
                        ? 'dark'
                        : theme === 'light'
                        ? 'light'
                        : prefersDark
                        ? 'dark'
                        : 'light';
                    if (root.classList) {
                      root.classList.remove('light', 'dark');
                      root.classList.add(mode);
                    } else {
                      root.setAttribute('class', mode);
                    }

                    // ---- Direction ----
                    var dir = s && s.direction ? s.direction : 'ltr';
                    root.setAttribute('dir', dir);

                    // ---- Language ----
                    var lang = s && s.language ? s.language : 'en';
                    root.setAttribute('lang', lang);
                  } catch (e) {}
                })();
              `,
          }}
        />
      </head>
      <body className="antialiased">
        <ReduxProvider>
          {/* Appliers */}
          <ThemeApplier />
          {children}
          <AnimationApplier />
        </ReduxProvider>
      </body>
    </html>
  );
}
