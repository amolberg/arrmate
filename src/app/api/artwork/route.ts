import { type NextRequest, NextResponse } from "next/server";

const artworkPath = /^\/[A-Za-z0-9/_-]+\.(jpg|jpeg|png|webp)$/i;

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path || !artworkPath.test(path)) {
    return NextResponse.json(
      { error: "Invalid artwork path" },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`https://image.tmdb.org/t/p/w500${path}`, {
      redirect: "error",
      next: { revalidate: 60 * 60 * 24 * 7 },
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = upstream.headers.get("content-type");
    if (!upstream.ok || !contentType?.startsWith("image/")) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "content-security-policy": "default-src 'none'",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
