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
  },
  {
    heading: ["Quality Produce,", "Trusted Farmers"],
    tag: "#EatFreshLiveWell",
  },
  {
    heading: ["From Soil to Shelf,", "With Love"],
    tag: "#SupportLocal",
  },
  {
    heading: ["Freshness That", "Speaks for Itself"],
    tag: "#FarmFresh",
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

function ProductSection({ sectionClass, containerClass, headerClass, gridId, title, products }) {
  return (
    <section className={sectionClass}>
      <div className={containerClass}>
        <div className={headerClass}>
          <p>{title}</p>
          <button type="button" className="section-view-button">
            See all
          </button>
        </div>

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
      <section id="heroSec" className="heroSec">
        <div id="boardShape" className="boardShape">
          <div className="slider" style={heroTransform}>
            {heroSlides.map((slide, index) => (
              <div
                key={slide.tag}
                className={`slide${currentSlide === index ? " active" : ""}`}
              >
                <div className="heroCon">
                  <h1>
                    {slide.heading[0]}
                    <br />
                    {slide.heading[1]}
                  </h1>
                  <p>{slide.tag}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="nav prev" type="button" onClick={handlePrev} aria-label="Previous slide">
            <svg viewBox="0 0 24 24" className="arrow-icon" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18l-6-6 6-6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="nav next" type="button" onClick={handleNext} aria-label="Next slide">
            <svg viewBox="0 0 24 24" className="arrow-icon" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 6l6 6-6 6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="dots">
            {heroSlides.map((slide, index) => (
              <span
                key={slide.tag}
                className={`dot${currentSlide === index ? " active" : ""}`}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="categoriesSec" className="categoriesSec">
        <div id="cartTextandIcon" className="cartTextandIcon">
          <p>Categories</p>
          <div id="categoryNav" className="categoryNav">
            <button
              type="button"
              className="arrow-btn left"
              onClick={() => scrollCategories(-250)}
              aria-label="Scroll categories left"
            >
              <svg viewBox="0 0 24 24" className="arrow-icon" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="arrow-btn right"
              onClick={() => scrollCategories(250)}
              aria-label="Scroll categories right"
            >
              <svg viewBox="0 0 24 24" className="arrow-icon" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 6l6 6-6 6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div id="categoryCont" className="categoryCont" ref={categoryRef}>
          <div className="categoryTrack">
            {categoryCards.map((category) => (
              <Link key={category.id} id={category.id} className="categoryCard" href={category.href}>
                <span className="categoryCard__icon">
                  <i className={`fa-solid ${category.icon}`} aria-hidden="true" />
                </span>
                <span className="categoryCard__label">{category.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductSection
        sectionClass="popular-section"
        containerClass="popular-section-content"
        headerClass="popular-section-header"
        gridId="homepagePopularGrid"
        title="Popular Combo Packs"
        products={popularProducts}
      />

      <section className="advert-section">
        <div className="advert-section-content">
          <img src="/assets/ads/01.jpg" alt="Promotional banner" />
        </div>
      </section>

      <ProductSection
        sectionClass="new-stock-section"
        containerClass="new-stock-content"
        headerClass="new-stock-header"
        gridId="homepageNewStockGrid"
        title="New Stocks"
        products={newestProducts}
      />

      <ProductSection
        sectionClass="inSeasonSec"
        containerClass="inSeasonFlex"
        headerClass="inSeason"
        gridId="homepageInSeasonGrid"
        title="In Season"
        products={inSeasonProducts}
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







