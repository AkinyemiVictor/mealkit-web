import { NextResponse } from "next/server";

import { createUser, findUserByEmail } from "@/app/api/_lib/mock-database";

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
  const firstName = payload?.firstName?.toString().trim() || "";
  const lastName = payload?.lastName?.toString().trim() || "";
  const phone = payload?.phone?.toString().trim() || "";
  const address = payload?.address?.toString().trim() || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  try {
    const user = createUser({ email, password, firstName, lastName, phone, address });
    const token = Buffer.from(`${user.id}:${user.email}`).toString("base64");
    return NextResponse.json(
      {
        user,
        token,
        message: "Signup successful",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to create user" }, { status: 400 });
  }
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
