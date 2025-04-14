import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Rate limiter for API calls
const rateLimiters = new Map<string, number>();

export function isRateLimited(key: string, limitMs: number = 5000): boolean {
  const now = Date.now();
  const lastCall = rateLimiters.get(key);

  if (lastCall && now - lastCall < limitMs) {
    return true;
  }

  rateLimiters.set(key, now);
  return false;
}
