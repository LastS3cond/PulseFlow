import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, hashPasswordSha256, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
    }

    const expectedHash = process.env.APP_ACCESS_PASSWORD_HASH?.toLowerCase().trim();
    if (!expectedHash) {
      return NextResponse.json(
        { success: false, error: "Server authentication misconfigured" },
        { status: 500 }
      );
    }

    const providedHash = (await hashPasswordSha256(password)).toLowerCase().trim();

    if (providedHash !== expectedHash) {
      return NextResponse.json({ success: false, error: "Invalid access password" }, { status: 401 });
    }

    const sessionSecret = process.env.SESSION_SECRET || "fallback_secret_pulseflow_2026";
    const token = await createSessionToken(sessionSecret);

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
