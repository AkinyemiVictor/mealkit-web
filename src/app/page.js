"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import products from "@/data/products";
import categories, { getCategoryHref } from "@/data/categories";
import {
  formatProductPrice,
  normaliseProductCatalogue,
  pickInSeasonProducts,
  pickMostPopularProducts,
  pickNewestProducts,
  resolveStockClass,
} from "@/lib/catalogue";
import { getProductHref } from "@/lib/products";

const heroSlides = [
  {
    heading: ["Fresh From the Farm,", "Delivered to Your Doorstep"],
    tag: "#Market On The Go!",
    description: "Shop same-day harvests, pantry staples, and ready-to-cook bundles in one basket.",
    accent: "#FF7A59",
    accentSoft: "rgba(255, 122, 89, 0.25)",
  },
  {
    heading: ["Quality Produce,", "Trusted Farmers"],
    tag: "#EatFreshLiveWell",
    description: "We team up with local growers to keep your weekly staples nutrient-packed and traceable.",
    accent: "#8E7CFF",
    accentSoft: "rgba(142, 124, 255, 0.22)",
  },
  {
    heading: ["From Soil to Shelf,", "With Love"],
    tag: "#SupportLocal",
    description: "Seasonal fruits, organic veggies, and artisanal pantry picks�curated for busy home cooks.",
    accent: "#00C9A7",
    accentSoft: "rgba(0, 201, 167, 0.25)",
  },
  {
    heading: ["Freshness That", "Speaks for Itself"],
    tag: "#FarmFresh",
    description: "Plan meals faster with chef-tested bundles and handy serving guides built into every order.",
    accent: "#FFB74D",
    accentSoft: "rgba(255, 183, 77, 0.28)",
  },
];

const categoryCards = categories.map((category) => ({
  id: category.slug,
  label: category.label,
  icon: category.icon,
  href: getCategoryHref(category),
}));

function ProductCard({ product }) {
  const stockClass = resolveStockClass(product.stock);
  const hasOldPrice = product.oldPrice && product.oldPrice > product.price;
  const href = getProductHref(product);

  return (
    <Link href={href} className="product-card" aria-label={`View ${product.name}`} prefetch={false}>
      <span className="product-card-badges">
        {product.discount ? (
          <div className="product-card-discount">
            <p>- {product.discount}%</p>
          </div>
        ) : null}
        <div className="product-card-season">
          <p>{product.inSeason ? "In Season" : "Off Season"}</p>
        </div>
      </span>
      <div>
        <img
          src={product.image || "/assets/img/product images/tomato-fruit-isolated-transparent-background.png"}
          alt={product.name}
          className="productImg"
          loading="lazy"
        />
        <div className="product-card-details">
          <h4>{product.name}</h4>
          <span>
            <p className="price">{formatProductPrice(product.price, product.unit)}</p>
          </span>
          {hasOldPrice ? (
            <span className="old-price">
              {formatProductPrice(product.oldPrice, product.unit)}
            </span>
          ) : null}
          {product.stock ? (
            <p className={`product-stock ${stockClass}`.trim()}>{product.stock}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function ProductSection({ title, products, gridId, variant = "plain", eyebrow, ctaLabel = "See all" }) {
  const sectionClasses = ["home-section"];
  if (variant && variant !== "plain") {
    sectionClasses.push(`home-section--${variant}`);
  }

  return (
    <section className={sectionClasses.join(" ")}>
      <div className="home-section__inner">
        <header className="home-section__header">
          <div className="home-section__titles">
            {eyebrow ? <span className="home-section__eyebrow">{eyebrow}</span> : null}
            <h2 className="home-section__title">{title}</h2>
          </div>
          <button type="button" className="home-section__cta">
            {ctaLabel}
          </button>
        </header>

        <div className="product-card-grid" id={gridId}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef(null);
  const categoryRef = useRef(null);

  const heroLength = heroSlides.length;

  const restartAutoSlide = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroLength);
    }, 5000);
  }, [heroLength]);

  useEffect(() => {
    restartAutoSlide();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [restartAutoSlide]);

  const goToSlide = useCallback(
    (index) => {
      setCurrentSlide(((index % heroLength) + heroLength) % heroLength);
      restartAutoSlide();
    },
    [heroLength, restartAutoSlide]
  );

  const handlePrev = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  const handleNext = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const scrollCategories = useCallback((offset) => {
    categoryRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  }, []);

  const catalogueList = useMemo(() => {
    const { ordered } = normaliseProductCatalogue(products);
    return ordered;
  }, []);

  const popularProducts = useMemo(
    () => pickMostPopularProducts(catalogueList),
    [catalogueList]
  );
  const newestProducts = useMemo(
    () => pickNewestProducts(catalogueList),
    [catalogueList]
  );
  const inSeasonProducts = useMemo(
    () => pickInSeasonProducts(catalogueList),
    [catalogueList]
  );

  const heroTransform = {
    transform: `translateX(-${currentSlide * 100}%)`,
  };

  return (
    <main>
      <section className="home-hero" aria-labelledby="home-hero-heading">
        <div className="home-hero__inner">
          <div className="home-hero__viewport" aria-live="polite">
            <div className="home-hero__track" style={heroTransform}>
              {heroSlides.map((slide, index) => {
                const isActive = currentSlide === index;
                const slideStyles = {
                  "--hero-accent": slide.accent,
                  "--hero-accent-soft": slide.accentSoft,
                };

                return (
                  <article
                    key={slide.tag}
                    className={`home-hero__slide${isActive ? " is-active" : ""}`}
                    style={slideStyles}
                    aria-hidden={!isActive}
                  >
                    <div className="home-hero__content">
                      <h1
                        id={isActive ? "home-hero-heading" : undefined}
                        className="home-hero__title"
                      >
                        <span>{slide.heading[0]}</span>
                        <span>{slide.heading[1]}</span>
                      </h1>
                      {slide.description ? (
                        <p className="home-hero__description">{slide.description}</p>
                      ) : null}
                      <p className="home-hero__tag">{slide.tag}</p>
                    </div>

                    <div className="home-hero__visual" aria-hidden="true">
                      <span className="home-hero__bubble home-hero__bubble--primary" />
                      <span className="home-hero__bubble home-hero__bubble--secondary" />
                      <span className="home-hero__badge">Fresh Today</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="home-hero__controls">
            <div className="home-hero__arrows">
              <button
                className="home-hero__arrow home-hero__arrow--prev"
                type="button"
                onClick={handlePrev}
                aria-label="Previous slide"
              >
                <svg viewBox="0 0 24 24" className="home-hero__arrow-icon" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18l-6-6 6-6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                className="home-hero__arrow home-hero__arrow--next"
                type="button"
                onClick={handleNext}
                aria-label="Next slide"
              >
                <svg viewBox="0 0 24 24" className="home-hero__arrow-icon" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 6l6 6-6 6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <ol className="home-hero__dots" role="list">
              {heroSlides.map((slide, index) => {
                const isActive = currentSlide === index;
                return (
                  <li key={slide.tag}>
                    <button
                      type="button"
                      className={`home-hero__dot${isActive ? " is-active" : ""}`}
                      onClick={() => goToSlide(index)}
                      aria-label={`Go to slide ${index + 1}`}
                      aria-pressed={isActive}
                    />
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className="category-carousel" aria-labelledby="category-carousel-heading">
        <div className="category-carousel__header">
          <h2 id="category-carousel-heading">Categories</h2>
          <div className="category-carousel__actions">
            <button
              type="button"
              className="category-carousel__arrow category-carousel__arrow--prev"
              onClick={() => scrollCategories(-280)}
              aria-label="Scroll categories left"
            >
              <svg viewBox="0 0 24 24" className="category-carousel__arrow-icon" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="category-carousel__arrow category-carousel__arrow--next"
              onClick={() => scrollCategories(280)}
              aria-label="Scroll categories right"
            >
              <svg viewBox="0 0 24 24" className="category-carousel__arrow-icon" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 6l6 6-6 6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="category-carousel__viewport" ref={categoryRef} role="presentation">
          <ul className="category-carousel__track" role="list">
            {categoryCards.map((category) => (
              <li key={category.id} className="category-carousel__item">
                <Link id={category.id} className="category-carousel__card" href={category.href}>
                  <span className="category-carousel__card-icon" aria-hidden="true">
                    <i className={`fa-solid ${category.icon}`} aria-hidden="true" />
                  </span>
                  <span className="category-carousel__card-label">{category.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ProductSection
        title="Popular Combo Packs"
        eyebrow="Top Picks"
        products={popularProducts}
        gridId="homepagePopularGrid"
        variant="emphasis"
      />

      <section className="advert-section">
        <div className="advert-section-content">
          <img src="/assets/ads/01.jpg" alt="Promotional banner" />
        </div>
      </section>
      <ProductSection
        title="Fresh In Stock"
        eyebrow="Just Arrived"
        products={newestProducts}
        gridId="homepageNewStockGrid"
        variant="emphasis"
      />
      <ProductSection
        title="In Season"
        eyebrow="Peak Harvest"
        products={inSeasonProducts}
        gridId="homepageInSeasonGrid"
        variant="emphasis"
      />

      <section className="downloadAppSec">
        <div className="downloadAppFlex">
          <div className="downloadAppTB">
            <div className="phoneWrapper">
              <img src="/assets/img/apple.png" alt="Download on App Store" className="phone phone-apple" />
              <img src="/assets/img/android.png" alt="Download on Play Store" className="phone phone-android" />
            </div>
            <div className="appTextndButtons">
              <h2>Download App</h2>
              <p className="appPar">
                Get our mobile app to shop fresh produce, meats, grains, and pantry staples anytime. Track orders, unlock
                exclusive deals, and receive real-time updates right from your phone.
              </p>
              <div className="buttonHolder">
                <img src="/assets/img/apple store.png" alt="Download on the App Store" />
                <img src="/assets/img/play store.png" alt="Get it on Google Play" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}





