import { supabase } from "@/lib/supabaseClient";
import productsCatalogue from "@/data/products";

const flattenProducts = (catalogue) =>
  Object.values(catalogue || {})
    .flatMap((group) => Array.isArray(group) ? group : [])
    .filter(Boolean)
    .map(({ variations, ...product }) => product);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const records = flattenProducts(productsCatalogue);

  if (records.length === 0) {
    return res.status(400).json({ error: "No products available to seed." });
  }

  try {
    const { data, error } = await supabase.from("products").insert(records);

    if (error) {
      throw error;
    }

    res.status(200).json({
      message: "Products inserted successfully!",
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error inserting products:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
}
