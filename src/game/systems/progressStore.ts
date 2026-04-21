import type { SessionProgressData } from "./GameSession";

const STORAGE_KEY = "math-block-academy-progress-v1";

export function loadProgress(): SessionProgressData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as SessionProgressData;
  } catch {
    return null;
  }
}

export function saveProgress(progress: SessionProgressData): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage failures so the game still works in private browsing or restricted environments.
  }
}
