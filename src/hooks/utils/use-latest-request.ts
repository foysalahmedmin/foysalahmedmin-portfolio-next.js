"use client";

import { useCallback, useEffect, useRef } from "react";

export const isAbortedRequest = (error: unknown, signal: AbortSignal) =>
  signal.aborted ||
  (typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError") ||
  (error instanceof Error && error.name === "AbortError");

export const useLatestRequest = () => {
  const controllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const start = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller.signal;
  }, []);

  const isCurrent = useCallback(
    (signal: AbortSignal) =>
      controllerRef.current?.signal === signal && !signal.aborted,
    []
  );

  useEffect(() => abort, [abort]);

  return { abort, isCurrent, start };
};
