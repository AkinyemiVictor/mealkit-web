import { NextResponse } from "next/server";

import { findUserByEmail, listUsers } from "@/app/api/_lib/mock-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });

export function GET(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const email = searchParams.get("email");
  const id = searchParams.get("id");
  const query = searchParams.get("q")?.toLowerCase().trim();

  const users = listUsers();

  if (email) {
    const user = findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const { password, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  }

  if (id) {
    const user = users.find((candidate) => candidate.id === id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  }

  const filteredUsers = query
    ? users.filter((user) => {
        const haystack = `${user.firstName ?? ""} ${user.lastName ?? ""} ${user.email ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
    : users;

  return NextResponse.json({
    count: filteredUsers.length,
    users: filteredUsers,
  });
}

export function POST() {
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
        Allow: "GET",
      },
    }
  );
}
