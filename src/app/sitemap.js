import categories, { getCategoryHref } from "@/data/categories";
import { getAllProducts, buildProductSlug } from "@/lib/products";

export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const urls = [];

  // Core pages
  const staticPaths = [
    '/',
    '/cart',
    '/checkout',
    '/help-center',
    '/sign-in',
  ];
  for (const p of staticPaths) {
    urls.push({ url: `${baseUrl}${p}`, lastModified: new Date() });
  }

  // Categories
  for (const c of categories) {
    urls.push({ url: `${baseUrl}${getCategoryHref(c)}`, lastModified: new Date() });
  }

  // Products
  try {
    const products = getAllProducts();
    for (const product of products) {
      const slug = buildProductSlug(product);
      urls.push({ url: `${baseUrl}/products/${slug}`, lastModified: new Date() });
    }
  } catch (_) {}

  return urls;
}

