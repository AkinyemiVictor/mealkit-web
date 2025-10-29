#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const modPath = path.resolve('src/data/products.js');
  const { products } = await import(pathToFileURL(modPath).href);

  const flat = [];
  for (const [categoryKey, items] of Object.entries(products || {})) {
    for (const item of items || []) {
      flat.push({
        id: item.id,
        name: item.name,
        image_url: item.image,
        price: item.price ?? (item.variations?.[0]?.price ?? 0),
        unit: item.unit ?? (item.variations?.[0]?.unit ?? ''),
        stock: String(item.stock ?? ''),
        in_season: item.inSeason ?? true,
        category: item.category ?? categoryKey,
        old_price: item.oldPrice ?? (item.variations?.[0]?.oldPrice ?? null),
      });
    }
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log(`Upserting ${flat.length} products...`);
  const { error } = await supabase.from('products').upsert(flat, { onConflict: 'id' });
  if (error) {
    console.error('Upsert failed:', error.message);
    process.exit(1);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

