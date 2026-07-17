import { CachedPayload } from "@/lib/types";

const APP_PREFIX = "basho-tomo";

function isBrowser() {
  return typeof window !== "undefined";
}

export function readCache<T>(key: string, version: string): T | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(`${APP_PREFIX}:${key}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (parsed.version !== version) {
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, version: string, payload: T) {
  if (!isBrowser()) {
    return;
  }

  const value: CachedPayload<T> = {
    version,
    savedAt: new Date().toISOString(),
    payload,
  };

  window.localStorage.setItem(`${APP_PREFIX}:${key}`, JSON.stringify(value));
}

export function readTimedCache<T>(
  key: string,
  version: string,
  maxAgeMs: number,
): T | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(`${APP_PREFIX}:${key}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (parsed.version !== version) {
      return null;
    }

    const ageMs = Date.now() - new Date(parsed.savedAt).getTime();
    if (ageMs > maxAgeMs) {
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
}

export function writePreference<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(`${APP_PREFIX}:pref:${key}`, JSON.stringify(value));
}

export function readPreference<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(`${APP_PREFIX}:pref:${key}`);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
