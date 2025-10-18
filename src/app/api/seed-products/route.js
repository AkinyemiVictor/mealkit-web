import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import productsCatalogue from "@/data/products";

const flattenProducts = (catalogue) =>
  Object.values(catalogue || {})
    .flatMap((group) => (Array.isArray(group) ? group : []))
    .filter(Boolean)
    .map(({ variations, ...product }) => product);

export async function POST() {
  const records = flattenProducts(productsCatalogue);

  if (records.length === 0) {
    return NextResponse.json({ error: "No products available to seed." }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.from("products").insert(records);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        message: "Products inserted successfully!",
        count: data.length,
        data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error inserting products:", error);
    return NextResponse.json(
      { error: error.message || "Failed to seed products." },
      { status: 500 },
    );
  }
}

export function GET() {
  return NextResponse.json(
    { message: "Use POST to seed products." },
    { status: 405, headers: { Allow: "POST" } },
  );
}

