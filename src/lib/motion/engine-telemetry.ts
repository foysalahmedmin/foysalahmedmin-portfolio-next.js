/**
 * One privacy-safe reliability event (docs plan 3.7.1, F13): an engine chunk failed to load. It carries
 * no identifier, no URL and no user data; the server only logs the counts. It reuses the Web Vitals
 * endpoint and its switch (`NEXT_PUBLIC_WEB_VITALS_ENABLED`), so with telemetry off nothing is sent.
 */
const enabled = process.env.NEXT_PUBLIC_WEB_VITALS_ENABLED === "true";

export type EngineFailureTarget = "gsap" | "palette";

export function reportEngineFailure(target: EngineFailureTarget): void {
  if (!enabled || typeof window === "undefined") return;
  const payload = JSON.stringify({
    event: "engine_load_failed",
    target,
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
}
