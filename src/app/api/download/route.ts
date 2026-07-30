import { NextRequest, NextResponse } from "next/server";
import { checkDownloadRateLimit } from "@/lib/rate-limiter";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  "https://pm2-stock-portfolio.netlify.app",
  "http://localhost:4200",
  "http://localhost:3000",
  "http://localhost:9002",
] as const;

function getCorsHeaders(origin?: string) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
    Vary: "Origin",
  };

  if (origin && ALLOWED_ORIGINS.includes(origin as typeof ALLOWED_ORIGINS[number])) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim() || "download";
  return trimmed.replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^\.+/, "");
}

function getFilenameFromUrl(url: URL): string {
  const pathname = url.pathname.split("/").filter(Boolean);
  const fallback = pathname[pathname.length - 1] || "download";
  return sanitizeFilename(fallback || "download");
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request.headers.get("origin") || undefined),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing required 'url' query parameter." },
      { status: 400, headers: getCorsHeaders(request.headers.get("origin") || undefined) }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL provided." },
      { status: 400, headers: getCorsHeaders(request.headers.get("origin") || undefined) }
    );
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json(
      { error: "Only http and https URLs are supported." },
      { status: 400, headers: getCorsHeaders(request.headers.get("origin") || undefined) }
    );
  }

  // Rate Limiting Check
  const rateLimit = await checkDownloadRateLimit(request);
  const corsHeaders = getCorsHeaders(request.headers.get("origin") || undefined);

  const rateLimitHeaders: Record<string, string> = {
    ...corsHeaders,
    "X-RateLimit-Limit-User": rateLimit.userLimit.toString(),
    "X-RateLimit-Remaining-User": rateLimit.userRemaining.toString(),
    "X-RateLimit-Limit-Global": rateLimit.globalLimit.toString(),
    "X-RateLimit-Remaining-Global": rateLimit.globalRemaining.toString(),
  };

  if (!rateLimit.allowed) {
    const isUserLimit = rateLimit.reason === "user_limit_exceeded";
    const errorMessage = isUserLimit
      ? `Rate limit exceeded. Maximum ${rateLimit.userLimit} downloads allowed per user per day.`
      : `Global daily rate limit reached. Maximum ${rateLimit.globalLimit} downloads allowed per day overall.`;

    return NextResponse.json(
      {
        error: errorMessage,
        limitType: rateLimit.reason,
        resetInSeconds: rateLimit.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": rateLimit.resetInSeconds.toString(),
        },
      }
    );
  }

  try {
    const upstreamResponse = await fetch(parsedUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Remote file request failed with status ${upstreamResponse.status}.` },
        { status: 502, headers: rateLimitHeaders }
      );
    }

    const contentType =
      upstreamResponse.headers.get("content-type")?.split(";")[0] ||
      "application/octet-stream";

    const filename = getFilenameFromUrl(parsedUrl);
    const responseHeaders = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      ...rateLimitHeaders,
    });

    const contentLength = upstreamResponse.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    return new NextResponse(upstreamResponse.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Download proxy failed:", error);
    return NextResponse.json(
      { error: "Unable to download the requested file." },
      { status: 502, headers: rateLimitHeaders }
    );
  }
}

