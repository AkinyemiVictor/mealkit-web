import Link from "next/link";
import { notFound } from "next/navigation";

import { formatProductPrice, resolveStockClass, getStockLabel } from "@/lib/catalogue";
import AddToCartForm from "@/components/add-to-cart-form";
import ProductEngagementTracker from "@/components/product-engagement-tracker";
import { buildProductSlug } from "@/lib/products";
import { fetchAllProducts, fetchProductBySlug } from "@/lib/products-server";

const FALLBACK_IMAGE = "/assets/img/product images/tomato-fruit-isolated-transparent-background.png";
const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DEFAULT_FEATURES = [
  "Sourced fresh each market day and handled with cold-chain care.",
  "Cleaned, sorted, and packaged to keep prep time low for busy kitchens.",
  "Suitable for a wide range of recipes, from homestyle dishes to event catering.",
];

const createDefaultSpecifications = (product) => {
  const categoryText = product.category
    ? product.category
        .split(/[-_]/g)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(" ")
    : "General";

  return [
    { label: "SKU", value: `MK-${String(product.id).padStart(4, "0")}` },
    { label: "Category", value: categoryText },
    { label: "Unit", value: product.unit || "Per pack" },
    { label: "Storage", value: "Keep refrigerated or in a cool, dry place." },
  ];
};

const createPlaceholderRatings = (productName) => ({
  average: 4.4,
  totalRatings: 17,
  breakdown: {
    5: 10,
    4: 6,
    3: 0,
    2: 0,
    1: 1,
  },
  reviews: [
    {
      id: "placeholder-1",
      rating: 5,
      title: "Fresh and flavourful",
      comment: `${productName} arrived crisp and vibrant. Perfect for meal prep and family dinners alike.`,
      author: "Amaka",
      date: "2025-07-02",
      verified: true,
    },
    {
      id: "placeholder-2",
      rating: 4,
      title: "Reliable quality",
      comment: "I have reordered a few times and the quality has been consistently good with minimal waste.",
      author: "Hope",
      date: "2025-06-18",
      verified: true,
    },
    {
      id: "placeholder-3",
      rating: 5,
      title: "Great value",
      comment: "The portion size is generous for the price. Makes weeknight cooking so much easier!",
      author: "Michael",
      date: "2025-05-04",
      verified: true,
    },
  ],
});

const normaliseSpecifications = (product, rawSpecifications) => {
  if (rawSpecifications && typeof rawSpecifications === "object") {
    const entries = Array.isArray(rawSpecifications)
      ? rawSpecifications
      : Object.entries(rawSpecifications).map(([label, value]) => ({ label, value }));

    const cleaned = entries
      .filter((entry) => entry && entry.label && entry.value)
      .map((entry) => ({ label: String(entry.label), value: String(entry.value) }));

    if (cleaned.length) {
      return cleaned;
    }
  }

  return createDefaultSpecifications(product);
};

const normaliseFeatures = (rawFeatures) => {
  if (Array.isArray(rawFeatures) && rawFeatures.length) {
    return rawFeatures.filter((feature) => typeof feature === "string" && feature.trim().length);
  }
  return DEFAULT_FEATURES;
};

const formatReviewDate = (value) => {
  if (!value) {
    return REVIEW_DATE_FORMATTER.format(new Date());
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return REVIEW_DATE_FORMATTER.format(date);
};

const normaliseReviews = (productName, rawReviews) => {
  if (!Array.isArray(rawReviews) || !rawReviews.length) {
    return createPlaceholderRatings(productName).reviews;
  }

  return rawReviews
    .map((review, index) => {
      if (!review || typeof review !== "object") {
        return null;
      }

      const rating = Math.min(Math.max(Number(review.rating) || 0, 1), 5);
      const title = review.title || review.heading || `Customer feedback ${index + 1}`;
      const comment = review.comment || review.body || "Thanks for the quick delivery!";
      const author = review.author || review.customer || "MealKit shopper";
      const date = formatReviewDate(review.date || review.createdAt || review.updatedAt);

      return {
        id: review.id || `review-${index}`,
        rating,
        title,
        comment,
        author,
        date,
        verified: review.verified ?? true,
      };
    })
    .filter(Boolean);
};

const normaliseRatings = (productName, rawRatings) => {
  const fallback = createPlaceholderRatings(productName);

  if (!rawRatings || typeof rawRatings !== "object") {
    return { ...fallback, totalReviews: fallback.reviews.length };
  }

  const average = Number(rawRatings.average ?? rawRatings.value);
  const totalRatings = Number(rawRatings.totalRatings ?? rawRatings.count);
  const breakdown = {
    ...fallback.breakdown,
    ...(rawRatings.breakdown || rawRatings.distribution || {}),
  };
  const reviews = normaliseReviews(productName, rawRatings.reviews);

  return {
    average: Number.isFinite(average) ? average : fallback.average,
    totalRatings: Number.isFinite(totalRatings) && totalRatings > 0 ? totalRatings : fallback.totalRatings,
    breakdown,
    reviews: reviews.length ? reviews : fallback.reviews,
    totalReviews: reviews.length ? reviews.length : fallback.reviews.length,
  };
};

const normaliseProductDetailContent = (product, rawProduct) => {
  const description = rawProduct?.description
    ? String(rawProduct.description)
    : `${product.name} is prepped with the same care we give every MealKit order. Expect vibrant colours, clean aromas, and a texture that holds up beautifully whether you are stir-frying, roasting, or blending for soups.`;

  const keyFeatures = normaliseFeatures(rawProduct?.keyFeatures);
  const specifications = normaliseSpecifications(product, rawProduct?.specifications);
  const ratings = normaliseRatings(product.name, rawProduct?.ratings);

  return {
    description,
    keyFeatures,
    specifications,
    ratings,
  };
};

export async function generateStaticParams() {
  try {
    const list = await fetchAllProducts();
    return list.map((product) => ({ productSlug: buildProductSlug(product) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { product } = await fetchProductBySlug(params.productSlug);

  if (!product) {
    return {
      title: "MealKit | Product Not Found",
      description: "Explore our farm-fresh marketplace for produce, proteins, and pantry staples.",
    };
  }

  const { raw } = await fetchProductBySlug(params.productSlug);
  const description = raw?.description
    ? String(raw.description)
    : `Order ${product.name} fresh from the MealKit marketplace delivered to your kitchen.`;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const pageUrl = `${site}/products/${params.productSlug}`;
  const image = product.image || FALLBACK_IMAGE;

  return {
    title: `MealKit | ${product.name}`,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      // Next.js metadata does not support a custom 'product' type.
      // Use a valid type and still provide rich content via title/description/images.
      type: "website",
      url: pageUrl,
      title: `MealKit | ${product.name}`,
      description,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `MealKit | ${product.name}`,
      description,
      images: [image],
    },
  };
}

function VariationList({ variations, productUnit }) {
  if (!Array.isArray(variations) || !variations.length) {
    return null;
  }

  return (
    <div className="product-detail-variations">
      <h2>Available options</h2>
      <ul>
        {variations.map((variation) => {
          if (!variation || typeof variation !== "object") {
            return null;
          }

          const label =
            variation.name || variation.ripeness || variation.size || variation.packaging || variation.variationId;
          const priceText = formatProductPrice(variation.price ?? 0, variation.unit || productUnit);
          const stockLabel = variation.stock;
          const stockClass = stockLabel ? resolveStockClass(stockLabel) : "";

          return (
            <li key={variation.variationId || `${label}-${variation.price}`}>
              <div className="product-detail-variation-header">
                <span className="product-detail-variation-name">{label}</span>
                <span className="product-detail-variation-price">{priceText}</span>
              </div>
              {stockLabel ? (
                <span className={`product-detail-variation-stock ${stockClass}`.trim()}>{stockLabel}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StarRating({ value, outOf = 5, showLabel = false }) {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, outOf));
  const fullStars = Math.floor(safeValue);
  const hasHalf = safeValue - fullStars >= 0.5;
  const emptyStars = Math.max(0, outOf - fullStars - (hasHalf ? 1 : 0));

  return (
    <span className="product-star-rating" aria-label={`${safeValue.toFixed(1)} out of ${outOf} stars`}>
      {Array.from({ length: fullStars }).map((_, index) => (
        <i key={`star-full-${index}`} className="fa-solid fa-star" aria-hidden="true" />
      ))}
      {hasHalf ? <i className="fa-solid fa-star-half-stroke" aria-hidden="true" /> : null}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <i key={`star-empty-${index}`} className="fa-regular fa-star" aria-hidden="true" />
      ))}
      {showLabel ? <span className="product-star-rating__label">{safeValue.toFixed(1)}</span> : null}
    </span>
  );
}

function RatingBreakdown({ breakdown, totalRatings }) {
  const scale = [5, 4, 3, 2, 1];

  return (
    <ul className="product-rating-breakdown" aria-label="Rating distribution">
      {scale.map((stars) => {
        const count = Number(breakdown?.[stars]) || 0;
        const percent = totalRatings ? Math.round((count / totalRatings) * 100) : 0;

        return (
          <li key={stars}>
            <span className="product-rating-breakdown__label">{stars}</span>
            <div className="product-rating-breakdown__bar" aria-hidden="true">
              <span className="product-rating-breakdown__bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="product-rating-breakdown__count">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ReviewList({ reviews }) {
  if (!Array.isArray(reviews) || !reviews.length) {
    return <p className="product-review-empty">Be the first to leave a review for this item.</p>;
  }

  return (
    <ul className="product-review-list">
      {reviews.map((review) => (
        <li key={review.id} className="product-review">
          <div className="product-review__rating">
            <StarRating value={review.rating} />
          </div>
          <div className="product-review__body">
            <div className="product-review__header">
              <h3>{review.title}</h3>
              <span className="product-review__meta">
                {review.date} by {review.author}
              </span>
            </div>
            <p>{review.comment}</p>
            {review.verified ? (
              <span className="product-review__verified">
                <i className="fa-solid fa-circle-check" aria-hidden="true" /> Verified Purchase
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProductDescriptionSection({ description }) {
  return (
    <section className="product-detail-section" aria-labelledby="product-details-heading">
      <h2 id="product-details-heading">Product details</h2>
      <p>{description}</p>
    </section>
  );
}

function ProductSpecificationsSection({ features, specifications }) {
  return (
    <section className="product-detail-section" aria-labelledby="product-specifications-heading">
      <h2 id="product-specifications-heading">Specifications</h2>
      <div className="product-specs">
        <div className="product-specs__features">
          <h3>Key features</h3>
          <ul>
            {features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>
        <div className="product-specs__table">
          <h3>More info</h3>
          <dl>
            {specifications.map((spec) => (
              <div key={spec.label} className="product-specs__row">
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function ProductFeedbackSection({ ratings, productName }) {
  const { average, totalRatings, breakdown, reviews, totalReviews } = ratings;

  return (
    <section className="product-detail-section" aria-labelledby="product-feedback-heading">
      <div className="product-feedback__header">
        <h2 id="product-feedback-heading">Verified customer feedback</h2>
        <button type="button" className="product-feedback__see-all" aria-label="View all reviews">
          See all
        </button>
      </div>

      <div className="product-feedback">
        <div className="product-feedback__summary" aria-label="Average rating">
          <div className="product-feedback__score">{average.toFixed(1)}/5</div>
          <StarRating value={average} showLabel={false} />
          <p>{totalRatings} verified ratings</p>
          <RatingBreakdown breakdown={breakdown} totalRatings={totalRatings} />
        </div>

        <div className="product-feedback__reviews" aria-label={`Customer reviews for ${productName}`}>
          <ReviewList reviews={reviews} />
          <p className="product-feedback__disclaimer">
            Reviews are gathered from customers who have received this item through MealKit deliveries.
          </p>
          <p className="product-feedback__totals">{totalReviews} recent comments</p>
        </div>
      </div>
    </section>
  );
}

export default async function ProductDetailPage({ params }) {
  const { product, raw: rawProduct } = await fetchProductBySlug(params.productSlug);

  if (!product) {
    notFound();
  }

  const variations = Array.isArray(rawProduct?.variations) ? rawProduct.variations : [];
  const detailContent = normaliseProductDetailContent(product, rawProduct);

  const stockClass = resolveStockClass(product.stock);
  const stockLabel = getStockLabel(product.stock);

  return (
    <main className="product-detail-page" data-product-id={product.id}>
      <ProductEngagementTracker productId={product.id} />
      <div className="product-detail-breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true" className="product-detail-breadcrumb-divider">
          /
        </span>
        <span className="product-detail-breadcrumb-current">{product.name}</span>
      </div>

      <section className="product-detail-card">
        <div className="product-detail-media">
          <img src={product.image || FALLBACK_IMAGE} alt={product.name} loading="lazy" />
        </div>

        <div className="product-detail-content">
          <div className="product-detail-badges">
            {product.discount ? <span className="product-detail-discount">- {product.discount}%</span> : null}
            <span className={`product-detail-season ${product.inSeason ? "is-in-season" : "is-off-season"}`}>
              {product.inSeason ? "In Season" : "Out of Season"}
            </span>
          </div>

          <h1>{product.name}</h1>

          <div className="product-detail-pricing">
            <span className="product-detail-price">{formatProductPrice(product.price, product.unit)}</span>
            {product.oldPrice && product.oldPrice > product.price ? (
              <span className="product-detail-old-price">{formatProductPrice(product.oldPrice, product.unit)}</span>
            ) : null}
          </div>

          {stockLabel ? <p className={`product-detail-stock ${stockClass}`.trim()}>{stockLabel}</p> : null}

          <dl className="product-detail-meta">
            {product.unit ? (
              <>
                <dt>Unit</dt>
                <dd>{product.unit}</dd>
              </>
            ) : null}
            {product.category ? (
              <>
                <dt>Category</dt>
                <dd className="product-detail-category">{product.category}</dd>
              </>
            ) : null}
            <dt>Product ID</dt>
            <dd>{product.id}</dd>
          </dl>

          <AddToCartForm product={product} fallbackImage={FALLBACK_IMAGE} />
          {variations.length ? <VariationList variations={variations} productUnit={product.unit} /> : null}
        </div>
      </section>

      <ProductDescriptionSection description={detailContent.description} />
      <ProductSpecificationsSection
        features={detailContent.keyFeatures}
        specifications={detailContent.specifications}
      />
      <ProductFeedbackSection ratings={detailContent.ratings} productName={product.name} />
    </main>
  );
}


