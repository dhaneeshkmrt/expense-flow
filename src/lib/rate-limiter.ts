import { NextRequest } from "next/server";
import { db } from "@/lib/firebase";
import { doc, runTransaction } from "firebase/firestore";

export const USER_DAILY_LIMIT = 100;
export const GLOBAL_DAILY_LIMIT = 1000;

export interface RateLimitResult {
  allowed: boolean;
  reason?: "user_limit_exceeded" | "global_limit_exceeded";
  userLimit: number;
  userRemaining: number;
  globalLimit: number;
  globalRemaining: number;
  resetInSeconds: number;
}

interface MemoryEntry {
  globalCount: number;
  userCounts: Map<string, number>;
  date: string;
}

let memoryCache: MemoryEntry = {
  globalCount: 0,
  userCounts: new Map(),
  date: "",
};

function getUtcDateString(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

function getSecondsUntilNextUtcDay(): number {
  const now = new Date();
  const nextDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return Math.ceil((nextDay.getTime() - now.getTime()) / 1000);
}

export function extractUserIdentifier(request: NextRequest): string {
  // 1. x-user-id header
  const xUserId = request.headers.get("x-user-id");
  if (xUserId && xUserId.trim()) return xUserId.trim();

  // 2. Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // 3. Query param userId or uid
  const url = new URL(request.url);
  const qUserId = url.searchParams.get("userId") || url.searchParams.get("uid");
  if (qUserId && qUserId.trim()) return qUserId.trim();

  // 4. IP address fallback
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return `ip_${ip}`;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return `ip_${realIp.trim()}`;

  return "anonymous";
}

/**
 * Checks and increments rate limit counts for the download API.
 * Enforces:
 * - 100 calls per user per day
 * - 1000 calls overall (all users) per day
 */
export async function checkDownloadRateLimit(
  request: NextRequest
): Promise<RateLimitResult> {
  const userId = extractUserIdentifier(request);
  const today = getUtcDateString();
  const resetInSeconds = getSecondsUntilNextUtcDay();

  // Ensure memory cache is reset on a new UTC day
  if (memoryCache.date !== today) {
    memoryCache = {
      globalCount: 0,
      userCounts: new Map(),
      date: today,
    };
  }

  try {
    const sanitizedUserId = encodeURIComponent(userId);
    const globalDocRef = doc(db, "rate_limits", `download_global_${today}`);
    const userDocRef = doc(
      db,
      "rate_limits",
      `download_user_${sanitizedUserId}_${today}`
    );

    const result = await runTransaction(db, async (transaction) => {
      const globalDoc = await transaction.get(globalDocRef);
      const userDoc = await transaction.get(userDocRef);

      const currentGlobalCount = globalDoc.exists()
        ? globalDoc.data().count || 0
        : 0;
      const currentUserCount = userDoc.exists()
        ? userDoc.data().count || 0
        : 0;

      // Check limits before incrementing
      if (currentUserCount >= USER_DAILY_LIMIT) {
        return {
          allowed: false,
          reason: "user_limit_exceeded" as const,
          userCount: currentUserCount,
          globalCount: currentGlobalCount,
        };
      }

      if (currentGlobalCount >= GLOBAL_DAILY_LIMIT) {
        return {
          allowed: false,
          reason: "global_limit_exceeded" as const,
          userCount: currentUserCount,
          globalCount: currentGlobalCount,
        };
      }

      // Increment counts
      const newGlobalCount = currentGlobalCount + 1;
      const newUserCount = currentUserCount + 1;

      transaction.set(
        globalDocRef,
        { count: newGlobalCount, date: today, updatedAt: new Date() },
        { merge: true }
      );
      transaction.set(
        userDocRef,
        {
          count: newUserCount,
          userId,
          date: today,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return {
        allowed: true,
        userCount: newUserCount,
        globalCount: newGlobalCount,
      };
    });

    // Sync memory cache
    memoryCache.globalCount = Math.max(
      memoryCache.globalCount,
      result.globalCount
    );
    memoryCache.userCounts.set(
      userId,
      Math.max(memoryCache.userCounts.get(userId) || 0, result.userCount)
    );

    return {
      allowed: result.allowed,
      reason: result.reason,
      userLimit: USER_DAILY_LIMIT,
      userRemaining: Math.max(0, USER_DAILY_LIMIT - result.userCount),
      globalLimit: GLOBAL_DAILY_LIMIT,
      globalRemaining: Math.max(0, GLOBAL_DAILY_LIMIT - result.globalCount),
      resetInSeconds,
    };
  } catch (error) {
    console.warn(
      "[RateLimiter] Firestore check failed, using fallback in-memory rate limiter:",
      error
    );
    return checkMemoryRateLimit(userId, resetInSeconds);
  }
}

function checkMemoryRateLimit(
  userId: string,
  resetInSeconds: number
): RateLimitResult {
  const currentUserCount = memoryCache.userCounts.get(userId) || 0;
  const currentGlobalCount = memoryCache.globalCount;

  if (currentUserCount >= USER_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "user_limit_exceeded",
      userLimit: USER_DAILY_LIMIT,
      userRemaining: 0,
      globalLimit: GLOBAL_DAILY_LIMIT,
      globalRemaining: Math.max(0, GLOBAL_DAILY_LIMIT - currentGlobalCount),
      resetInSeconds,
    };
  }

  if (currentGlobalCount >= GLOBAL_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "global_limit_exceeded",
      userLimit: USER_DAILY_LIMIT,
      userRemaining: Math.max(0, USER_DAILY_LIMIT - currentUserCount),
      globalLimit: GLOBAL_DAILY_LIMIT,
      globalRemaining: 0,
      resetInSeconds,
    };
  }

  const newUserCount = currentUserCount + 1;
  const newGlobalCount = currentGlobalCount + 1;

  memoryCache.userCounts.set(userId, newUserCount);
  memoryCache.globalCount = newGlobalCount;

  return {
    allowed: true,
    userLimit: USER_DAILY_LIMIT,
    userRemaining: USER_DAILY_LIMIT - newUserCount,
    globalLimit: GLOBAL_DAILY_LIMIT,
    globalRemaining: GLOBAL_DAILY_LIMIT - newGlobalCount,
    resetInSeconds,
  };
}
