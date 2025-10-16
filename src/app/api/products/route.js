import { NextResponse } from "next/server";

import { getProductById, listProducts } from "@/app/api/_lib/mock-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });

export function GET(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const id = searchParams.get("id");
  if (id) {
    const product = getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ product });
  }

  const category = searchParams.get("category");
  const query = searchParams.get("q")?.trim().toLowerCase();

  let products = listProducts({ category });
  if (query) {
    products = products.filter((product) => {
      const haystack = `${product.name ?? ""} ${product.description ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  return NextResponse.json({
    count: products.length,
    products,
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
