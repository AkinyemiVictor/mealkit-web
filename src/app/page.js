"use client";

import Link from "next/link";
// import ScaledSection from "@/components/scaled-section";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useProducts from "@/lib/use-products";
import categories, { getCategoryHref } from "@/data/categories";
import {
  formatProductPrice,
  pickInSeasonProducts,
  pickMostPopularProducts,
  pickNewestProducts,
  resolveStockClass,
  getStockLabel,
} from "@/lib/catalogue";
import { recordProductClick, recordProductView, pickTopEngagedProducts } from "@/lib/engagement";
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
  const stockLabel = getStockLabel(product.stock);
  const hasOldPrice = product.oldPrice && product.oldPrice > product.price;
  const href = getProductHref(product);

  return (
    <Link
      href={href}
      className="product-card"
      aria-label={`View ${product.name}`}
      prefetch={false}
      role="listitem"
      onClick={() => { recordProductClick(product.id); recordProductView(product.id); }}
    >
      
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

function ProductSection({ title, products, gridId, variant = "plain", eyebrow, ctaLabel = "See all", ctaHref }) {
  const sectionClasses = ["home-section"];
  if (variant && variant !== "plain") {
    sectionClasses.push(`home-section--${variant}`);
  }

  const viewportRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const evaluateScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { scrollLeft, clientWidth, scrollWidth } = viewport;
    const threshold = 8;
    setCanScrollPrev(scrollLeft > threshold);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - threshold);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      window.requestAnimationFrame(evaluateScroll);
    };

    evaluateScroll();
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [evaluateScroll, products.length]);

  useEffect(() => {
    evaluateScroll();
  }, [evaluateScroll, products.length]);

  const scrollByAmount = useCallback((direction) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const card = viewport.querySelector(".product-card");
    if (!card) return;

    const grid = viewport.querySelector(".product-card-grid");
    const cardWidth = card.getBoundingClientRect().width;

    let gap = 24;
    if (grid) {
      const styles = window.getComputedStyle(grid);
      const gapValue = styles.columnGap || styles.gap || styles.rowGap || "0";
      const parsedGap = parseFloat(gapValue);
      if (!Number.isNaN(parsedGap)) {
        gap = parsedGap;
      }
    }

    const trackSize = cardWidth + gap;
    if (!(trackSize > 0)) {
      viewport.scrollBy({ left: direction * viewport.clientWidth, behavior: "smooth" });
      return;
    }

    const visibleWidth = viewport.clientWidth;
    const cardsPerViewport = Math.max(1, Math.round(visibleWidth / trackSize));
    const baseStep = cardsPerViewport * trackSize;
    const maxScroll = Math.max(0, viewport.scrollWidth - visibleWidth);

    let target = viewport.scrollLeft + direction * baseStep;
    if (direction > 0) {
      target = Math.min(target, maxScroll);
    } else {
      target = Math.max(target, 0);
    }

    const snapped = Math.round(target / trackSize) * trackSize;
    const finalTarget = Number.isFinite(snapped)
      ? (direction > 0 ? Math.min(snapped, maxScroll) : Math.max(snapped, 0))
      : target;

    viewport.scrollTo({ left: finalTarget, behavior: "smooth" });
  }, []);

  const handlePrev = useCallback(() => scrollByAmount(-1), [scrollByAmount]);
  const handleNext = useCallback(() => scrollByAmount(1), [scrollByAmount]);

  return (
    <section className={sectionClasses.join(" ")}>
      <div className="home-section__inner">
        <header className="home-section__header">
          <div className="home-section__titles">
            {eyebrow ? <span className="home-section__eyebrow">{eyebrow}</span> : null}
            <h2 className="home-section__title">{title}</h2>
          </div>
          {ctaHref ? (
            <Link href={ctaHref} className="home-section__cta">
              {ctaLabel}
            </Link>
          ) : (
            <button type="button" className="home-section__cta">{ctaLabel}</button>
          )}
        </header>

        <div className="home-section__rail">
          <button
            type="button"
            className="home-section__nav home-section__nav--prev"
            onClick={handlePrev}
            disabled={!canScrollPrev}
            aria-label={`Scroll ${title} backwards`}
            aria-controls={gridId}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M15 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="home-section__viewport" ref={viewportRef}>
            <div className="product-card-grid" id={gridId} role="list">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>

          <button
            type="button"
            className="home-section__nav home-section__nav--next"
            onClick={handleNext}
            disabled={!canScrollNext}
            aria-label={`Scroll ${title} forwards`}
            aria-controls={gridId}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef(null);
  const categoryRef = useRef(null);
  // Ensure client-only personalization (localStorage-driven) does not
  // change the initial HTML that the server rendered. We gate those
  // computations behind a client-ready flag to avoid hydration mismatch.
  const [isClient, setIsClient] = useState(false);

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
    setIsClient(true);
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

  const { ordered: catalogueList } = useProducts();

  const popularProducts = useMemo(() => {
    const engaged = isClient ? pickTopEngagedProducts(catalogueList) : [];
    return engaged.length ? engaged : pickMostPopularProducts(catalogueList);
  }, [catalogueList, isClient]);
  const freshInStockProducts = useMemo(() => {
    const notOut = catalogueList.filter((p) => !String(p.stock || "").toLowerCase().includes("out"));
    const engaged = isClient ? pickTopEngagedProducts(notOut) : [];
    return engaged.length ? engaged : pickNewestProducts(catalogueList);
  }, [catalogueList, isClient]);
  const inSeasonProducts = useMemo(() => {
    const seasonal = catalogueList.filter((p) => p.inSeason);
    const engaged = isClient ? pickTopEngagedProducts(seasonal) : [];
    return engaged.length ? engaged : pickInSeasonProducts(catalogueList);
  }, [catalogueList, isClient]);

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
                      {slide.tag ? <p className="home-hero__tag">{slide.tag}</p> : null}
                      <h1 className="home-hero__title">
                        {Array.isArray(slide.heading) ? (
                          <>
                            <span>{slide.heading[0]}</span>
                            <span>{slide.heading[1]}</span>
                          </>
                        ) : (
                          <span>{slide.heading}</span>
                        )}
                      </h1>
                      {slide.description ? (
                        <p className="home-hero__description">{slide.description}</p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <nav className="home-hero__controls" aria-label="Hero navigation">
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
          </nav>
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
        title="Popular Items"
        eyebrow="Top Picks"
        products={popularProducts}
        gridId="homepagePopularGrid"
        variant="emphasis"
        ctaHref="/section/popular"
      />

      <section className="advert-section">
        <div className="advert-section-content">
          <img src="/assets/ads/01.jpg" alt="Promotional banner" />
        </div>
      </section>
      <ProductSection
        title="Fresh In Stock"
        eyebrow="Just Arrived"
        products={freshInStockProducts}
        gridId="homepageNewStockGrid"
        variant="emphasis"
        ctaHref="/section/new"
      />
      <ProductSection
        title="In Season"
        eyebrow="Peak Harvest"
        products={inSeasonProducts}
        gridId="homepageInSeasonGrid"
        variant="emphasis"
        ctaHref="/section/in-season"
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





