"use client";

import { useReportWebVitals } from "next/web-vitals";

const enabled = process.env.NEXT_PUBLIC_WEB_VITALS_ENABLED === "true";
const configuredSampleRate = Number(
  process.env.NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE ?? "0.1"
);
const sampleRate =
  Number.isFinite(configuredSampleRate) &&
  configuredSampleRate >= 0 &&
  configuredSampleRate <= 1
    ? configuredSampleRate
    : 0.1;

const getRouteClass = (pathname: string): string => {
  if (pathname === "/") return "home";
  if (pathname === "/projects") return "projects-list";
  if (pathname.startsWith("/projects/")) return "project-detail";
  if (pathname === "/articles") return "articles-list";
  if (pathname.startsWith("/articles/")) return "article-detail";
  if (pathname === "/contact") return "contact";
  if (pathname.startsWith("/admin")) return "admin";
  return "public-other";
};

export const WebVitalsReporter = () => {
  useReportWebVitals((metric) => {
    if (!enabled || Math.random() > sampleRate) return;
    const payload = JSON.stringify({
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      rating: metric.rating,
      navigation_type: metric.navigationType,
      route_class: getRouteClass(window.location.pathname),
      device_class: window.matchMedia("(max-width: 767px)").matches
        ? "mobile"
        : "desktop",
      release: process.env.NEXT_PUBLIC_RELEASE_ID || "unversioned",
    });
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon("/api/observability/vitals", blob)) {
      void fetch("/api/observability/vitals", {
        method: "POST",
        body: payload,
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => undefined);
    }
  });
  return null;
};
