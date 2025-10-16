import { NextResponse } from "next/server";

import { validateUserCredentials } from "@/app/api/_lib/mock-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const email = payload?.email?.toString().trim();
  const password = payload?.password?.toString();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = validateUserCredentials({ email, password });
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = Buffer.from(`${user.id}:${user.email}`).toString("base64");
  return NextResponse.json({
    user,
    token,
    message: "Login successful",
  });
}

export function GET() {
  return methodNotAllowed();
}

export function PUT() {
  return methodNotAllowed();
}

export function PATCH() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}

export function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        Allow: "POST",
      },
    }
  );
}
