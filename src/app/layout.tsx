import AnimationApplier from "@/components/appliers/animation-applier";
import ThemeApplier from "@/components/appliers/theme-applier";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";
import { readPublishedSite } from "@/lib/site/published-site";
import MotionProvider from "@/providers/motion-provider";
import ParallaxProvider from "@/providers/parallax-provider";
import { WebVitalsReporter } from "@/components/observability/web-vitals-reporter";
import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata(await readPublishedSite());
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="max-w-screen overflow-x-hidden"
      data-motion="reduced"
      data-motion-capability="static"
      data-document-visible="false"
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

                    // ---- Surface: the public site is monochrome, the admin keeps its legacy tokens until Phase 7 ----
                    var path = window.location.pathname;
                    var admin = path === '/admin' || path.indexOf('/admin/') === 0;
                    if (!admin) root.setAttribute('data-surface', 'public');

                    // ---- Theme (first visit: dark on the public site, system in the admin) ----
                    var theme = s && s.theme ? s.theme : (admin ? 'system' : 'dark');
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
        <MotionProvider>
          <ParallaxProvider>
            {/* Appliers */}
            <ThemeApplier />
            {children}
            <AnimationApplier />
            <WebVitalsReporter />
          </ParallaxProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
