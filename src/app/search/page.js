"use client";

import Link from "next/link";
import { Fragment } from "react";

import SearchHistoryRecorder from "@/components/search-history-recorder";
import categories from "@/data/categories";
import copy from "@/data/copy";
import useProducts from "@/lib/use-products";
import { formatProductPrice, resolveStockClass, getStockLabel } from "@/lib/catalogue";
import { getProductHref } from "@/lib/products";

const PAGE_SIZE = 12;

// Product catalogue is fetched on the client via API to use DB source

const categoryLabelMap = new Map(
  (categories || []).map((entry) => [String(entry.slug || "").toLowerCase(), entry.label || ""])
);

const normalise = (value) => value?.toString().toLowerCase().trim() ?? "";

const buildTokens = (value) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchText = (product) =>
  [
    normalise(product.name),
    normalise(product.category),
    normalise(categoryLabelMap.get(normalise(product.category)) || ""),
    normalise(product.unit),
  ]
    .filter(Boolean)
    .join(" ");

const getCategoryLabel = (slug, fallback) => {
  const normalisedSlug = normalise(slug);
  return categoryLabelMap.get(normalisedSlug) || fallback || "More staples";
};

function matchesProduct(product, tokens) {
  if (!tokens.length) return false;
  const haystack = buildSearchText(product);
  return tokens.every((token) => haystack.includes(token));
}

function levenshtein(a, b) {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const dp = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));
  for (let i = 0; i <= lenA; i += 1) dp[i][0] = i;
  for (let j = 0; j <= lenB; j += 1) dp[0][j] = j;

  for (let i = 1; i <= lenA; i += 1) {
    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[lenA][lenB];
}

function getSuggestions(query, limit = 3, list = []) {
  const normalisedQuery = normalise(query);
  if (!normalisedQuery) return [];

  const scored = list.map((product) => {
    const name = normalise(product.name);
    const category = normalise(product.category);
    const label = normalise(getCategoryLabel(product.category, product.category));

    const distances = [
      levenshtein(name, normalisedQuery),
      category ? levenshtein(category, normalisedQuery) : Infinity,
      label ? levenshtein(label, normalisedQuery) : Infinity,
    ];

    const includesPenalty = name.includes(normalisedQuery) ? -2 : 0;
    const score = Math.min(...distances) + includesPenalty;
    return {
      term: product.name,
      score,
    };
  });

  scored.sort((a, b) => a.score - b.score);

  const unique = [];
  const seen = new Set();
  for (const candidate of scored) {
    const key = candidate.term.toLowerCase();
    if (seen.has(key)) continue;
    if (candidate.score > Math.max(5, normalisedQuery.length)) continue;
    if (candidate.term.toLowerCase() === normalisedQuery) continue;
    seen.add(key);
    unique.push(candidate.term);
    if (unique.length >= limit) break;
  }

  return unique;
}

function HighlightedText({ text, tokens }) {
  if (!tokens.length) return text;

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const isMatch = tokens.some((token) => part.toLowerCase() === token.toLowerCase());
        return isMatch ? (
          <mark key={`highlight-${index}`}>{part}</mark>
        ) : (
          <Fragment key={`text-${index}`}>{part}</Fragment>
        );
      })}
    </>
  );
}

function ProductResultCard({ product, tokens }) {
  const stockClass = resolveStockClass(product.stock);
  const stockLabel = getStockLabel(product.stock);
  const hasOldPrice = product.oldPrice && product.oldPrice > product.price;
  const href = getProductHref(product);

  return (
    <Link href={href} className="product-card" aria-label={`View ${product.name}`} prefetch={false}>
      <div>
        <img
          src={
            product.image ||
            "/assets/img/product images/tomato-fruit-isolated-transparent-background.png"
          }
          alt={product.name}
          className="productImg"
          loading="lazy"
        />
        <div className="product-card-details">
          <h4>
            <HighlightedText text={product.name} tokens={tokens} />
          </h4>
          <span>
            <p className="price">{formatProductPrice(product.price, product.unit)}</p>
          </span>
          {hasOldPrice ? (
            <span className="old-price">{formatProductPrice(product.oldPrice, product.unit)}</span>
          ) : null}
          {stockLabel ? (
            <p className={`product-stock ${stockClass}`.trim()}>{stockLabel}</p>
          ) : null}
          <span className="product-card-badges" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
            {product.discount ? (
              <div className="product-card-discount">
                <p>- {product.discount}%</p>
              </div>
            ) : <span />}
            <div className={`product-card-season ${product.inSeason ? 'is-in' : 'is-out'}`}>
              <p>{product.inSeason ? "In Season" : "Out of Season"}</p>
            </div>
          </span>
        </div>
      </div>
    </Link>
  );
}

function buildPageHref(query, pageNumber = 1) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (pageNumber > 1) params.set("page", String(pageNumber));
  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

function Pagination({ query, currentPage, totalPages }) {
  if (totalPages <= 1) return null;

  const items = [];
  for (let index = 1; index <= totalPages; index += 1) {
    const isActive = index === currentPage;
    items.push(
      <a
        key={index}
        href={buildPageHref(query, index)}
        className={isActive ? "is-active" : undefined}
        aria-label={`Go to page ${index}`}
        aria-current={isActive ? "page" : undefined}
      >
        {index}
      </a>
    );
  }

  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  return (
    <nav className="pagination-nav" aria-label="Search results pages">
      <a
        href={isFirst ? "#" : buildPageHref(query, currentPage - 1)}
        aria-disabled={isFirst ? "true" : undefined}
        tabIndex={isFirst ? -1 : undefined}
      >
        Previous
      </a>
      {items}
      <a
        href={isLast ? "#" : buildPageHref(query, currentPage + 1)}
        aria-disabled={isLast ? "true" : undefined}
        tabIndex={isLast ? -1 : undefined}
      >
        Next
      </a>
    </nav>
  );
}

export default function SearchPage({ searchParams }) {
  const { ordered: allProducts } = useProducts();
  const rawQuery = searchParams?.q ?? "";
  const query = rawQuery.toString().trim();
  const tokens = buildTokens(query);

  const filteredProducts = tokens.length
    ? allProducts.filter((product) => matchesProduct(product, tokens))
    : [];

  const totalResults = filteredProducts.length;
  const totalPages = totalResults ? Math.ceil(totalResults / PAGE_SIZE) : 0;
  const requestedPage = Number.parseInt(searchParams?.page ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.min(requestedPage, Math.max(totalPages, 1))
      : 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedProducts = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);

  const groupedMap = new Map();
  pagedProducts.forEach((product) => {
    const slug = normalise(product.category) || "other";
    if (!groupedMap.has(slug)) {
      groupedMap.set(slug, {
        slug,
        label: getCategoryLabel(product.category, product.category),
        products: [],
      });
    }
    groupedMap.get(slug).products.push(product);
  });
  const groupedResults = Array.from(groupedMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  const suggestionTerms = query && !totalResults ? getSuggestions(query, 3, allProducts) : [];

  return (
    <main className="category-page" data-search-term={query}>
      <header className="category-page__header">
        <div className="category-page__title">
          <div>
            <span className="category-page__eyebrow">Search</span>
            <h1 className="categoryCard__label">
              {query ? `Results for "${query}"` : "Find farm-fresh staples"}
            </h1>
            <p className="category-page__description">
              {query
                ? totalResults
                  ? `Showing ${pagedProducts.length} of ${totalResults} matching items.`
                  : copy.search.emptyDescription(query)
                : copy.search.introDefault}
            </p>
          </div>
        </div>
        <form className="site-header__search" role="search" action="/search" method="get">
          <label htmlFor="searchPageInput" className="sr-only">
            Search MealKit products
          </label>
          <input
            id="searchPageInput"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={copy.search.placeholderPage}
            className="site-header__search-input"
            autoComplete="off"
            spellCheck="false"
          />
          <button type="submit" className="site-header__search-button">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <span className="sr-only">Submit search</span>
          </button>
        </form>
      </header>

      {query ? (
        totalResults ? (
          <>
            <div className="category-products">
              {groupedResults.map((group) => (
                <section key={group.slug} className="search-results-group">
                  <header className="search-results-group__header">
                    <span className="search-results-group__eyebrow">Category</span>
                    <h2>{group.label}</h2>
                  </header>
                  <div className="product-card-grid">
                    {group.products.map((product) => (
                      <ProductResultCard key={product.id} product={product} tokens={tokens} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <Pagination query={query} currentPage={currentPage} totalPages={totalPages} />
          </>
        ) : (
          <div className="category-empty-state">
            <strong>{copy.search.emptyTitle}</strong>
            <p>{copy.search.emptyDescription(query)}</p>
            {suggestionTerms.length ? (
              <ul className="search-empty-suggestions">
                {suggestionTerms.map((term) => (
                  <li key={term}>
                    <Link href={buildPageHref(term)}>{`Search "${term}"`}</Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link href="/categories" className="section-view-button">
              {copy.search.browseCategoriesCta}
            </Link>
          </div>
        )
      ) : (
        <section className="category-empty-state">
          <strong>{copy.search.emptyStartTitle}</strong>
          <p>{copy.search.emptyStartDescription}</p>
          <Link href="/categories" className="section-view-button">
            {copy.search.browseCategoriesCta}
          </Link>
        </section>
      )}

      <SearchHistoryRecorder term={query} enabled={Boolean(query)} />
    </main>
  );
}
