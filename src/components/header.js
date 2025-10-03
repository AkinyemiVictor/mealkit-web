"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CART_STORAGE_KEY = "mealkit_cart";
const MIN_CART_QUANTITY = 0.01;

const normaliseCartQuantity = (value, fallback = MIN_CART_QUANTITY) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.round(numeric * 100) / 100;
};

const formatCartQuantity = (value) => {
  const numeric = normaliseCartQuantity(value, 0);
  if (!numeric) return "0";
  const isWhole = Math.abs(Math.round(numeric) - numeric) < 0.005;
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const countStoredCartUnits = () => {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((sum, item) => sum + normaliseCartQuantity(item?.quantity, 0), 0);
  } catch (error) {
    console.warn("Unable to read stored cart", error);
    return 0;
  }
};

function SearchBar({ idSuffix, className = "" }) {
  const inputId = `site-header-search-${idSuffix}`;
  const classes = ["site-header__search", className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="search">
      <label htmlFor={inputId} className="sr-only">
        Search MealKit
      </label>
      <input
        id={inputId}
        type="search"
        placeholder="Search MealKit..."
        className="site-header__search-input"
      />
      <button type="button" className="site-header__search-button">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <span className="sr-only">Submit search</span>
      </button>
    </div>
  );
}

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0);
  const dropdownRef = useRef(null);
  const accountMenuId = "site-header-account-menu";
  const mobilePanelId = "site-header-mobile-panel";

  const toggleAccountDropdown = () => {
    setMobileMenuOpen(false);
    setDropdownOpen((state) => !state);
  };

  const closeAccountDropdown = () => {
    setDropdownOpen(false);
  };

  const toggleMobileMenu = () => {
    setDropdownOpen(false);
    setMobileMenuOpen((state) => !state);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleAccountKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleAccountDropdown();
    }

    if (event.key === "Escape") {
      closeAccountDropdown();
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateCartQuantity = () => {
      setCartQuantity(countStoredCartUnits());
    };

    updateCartQuantity();

    window.addEventListener("storage", updateCartQuantity);
    window.addEventListener("cart-updated", updateCartQuantity);

    return () => {
      window.removeEventListener("storage", updateCartQuantity);
      window.removeEventListener("cart-updated", updateCartQuantity);
    };
  }, []);

  useEffect(() => {
    const handleClickAway = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeAccountDropdown();
      }
    };

    if (dropdownOpen) {
      document.addEventListener("click", handleClickAway);
    }

    return () => {
      document.removeEventListener("click", handleClickAway);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeAccountDropdown();
        closeMobileMenu();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleNavAction = () => {
    closeAccountDropdown();
    closeMobileMenu();
  };

  return (
    <header className="site-header">
      <div className="site-header__container">
        <Link href="/" className="site-header__brand" onClick={handleNavAction}>
          <img src="/assets/logo/LOGO NO BACKGROUND.png" alt="MealKit logo" />
          <span className="site-header__brand-text">
            <span className="site-header__brand-name">MealKit</span>
            <span className="site-header__brand-tagline">Real meal, real fast.</span>
          </span>
        </Link>

        <div className="site-header__search-wrapper">
          <SearchBar idSuffix="desktop" />
        </div>

        <div className="site-header__actions" role="navigation" aria-label="Primary">
          <div
            className={`site-header__account${dropdownOpen ? " is-open" : ""}`}
            ref={dropdownRef}
          >
            <button
              type="button"
              className="site-header__action site-header__action--account"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              aria-controls={accountMenuId}
              onClick={toggleAccountDropdown}
              onKeyDown={handleAccountKeyDown}
            >
              <span className="site-header__icon" aria-hidden="true">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6.75C13.79 6.75 15.25 8.21 15.25 10C15.25 11.79 13.79 13.25 12 13.25C10.21 13.25 8.75 11.79 8.75 10C8.75 8.21 10.21 6.75 12 6.75ZM12 20C9.97 20 8.17 19.21 6.86 17.9C7.64 16.73 9.42 16 12 16C14.58 16 16.36 16.73 17.14 17.9C15.83 19.21 14.03 20 12 20Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="site-header__action-label">Account</span>
              <svg
                className="site-header__caret"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div
              id={accountMenuId}
              role="menu"
              aria-hidden={!dropdownOpen}
              className={`site-header__account-menu${dropdownOpen ? " is-visible" : ""}`}
            >
              <Link
                className="site-header__account-link"
                href="/sign-in"
                role="menuitem"
                onClick={handleNavAction}
              >
                Login
              </Link>
              <Link
                className="site-header__account-link"
                href="/sign-in#signupForm"
                role="menuitem"
                onClick={handleNavAction}
              >
                Sign Up
              </Link>
            </div>
          </div>

          <Link
            href="/help-center"
            className="site-header__action"
            onClick={handleNavAction}
          >
            <span className="site-header__icon" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M10.5 8.67709C10.8665 8.26188 11.4027 8 12 8C13.1046 8 14 8.89543 14 10C14 10.9337 13.3601 11.718 12.4949 11.9383C12.2273 12.0064 12 12.2239 12 12.5V13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="site-header__action-label">Help</span>
          </Link>

          <Link
            href="/cart"
            className="site-header__action site-header__action--cart"
            aria-label="View cart"
            onClick={handleNavAction}
          >
            <span className="site-header__icon" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="8" cy="19" r="1.5" fill="currentColor" />
                <circle cx="17" cy="19" r="1.5" fill="currentColor" />
                <path
                  d="M3 5H5L6.2 13.1C6.33347 13.983 7.07703 14.6425 7.96984 14.6425H17.4C18.1232 14.6425 18.753 14.1615 18.9363 13.4605L21 6.14246H6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="site-header__action-label">Cart</span>
            <span className="site-header__cart-count" aria-live="polite">
              {formatCartQuantity(cartQuantity)}
            </span>
          </Link>
        </div>

        <button
          type="button"
          className={`site-header__menu-toggle${mobileMenuOpen ? " is-open" : ""}`}
          aria-expanded={mobileMenuOpen}
          aria-controls={mobilePanelId}
          onClick={toggleMobileMenu}
        >
          <span className="sr-only">{mobileMenuOpen ? "Close menu" : "Open menu"}</span>
          <span className="site-header__menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <button
        type="button"
        className={`site-header__mobile-backdrop${mobileMenuOpen ? " is-visible" : ""}`}
        onClick={closeMobileMenu}
        aria-hidden={!mobileMenuOpen}
        tabIndex={mobileMenuOpen ? 0 : -1}
      >
        <span className="sr-only">Close menu</span>
      </button>

      <div
        className={`site-header__mobile-panel${mobileMenuOpen ? " is-visible" : ""}`}
        id={mobilePanelId}
        aria-hidden={!mobileMenuOpen}
      >
        <SearchBar idSuffix="mobile" className="site-header__search--mobile" />

        <div className="site-header__mobile-section">
          <span className="site-header__mobile-heading">Account</span>
          <div className="site-header__mobile-links">
            <Link href="/sign-in" onClick={handleNavAction}>
              Login
            </Link>
            <Link href="/sign-in#signupForm" onClick={handleNavAction}>
              Sign Up
            </Link>
          </div>
        </div>

        <Link href="/help-center" className="site-header__mobile-link" onClick={handleNavAction}>
          Help Center
        </Link>

        <Link
          href="/cart"
          className="site-header__mobile-link site-header__mobile-link--cart"
          onClick={handleNavAction}
        >
          Cart
          <span className="site-header__mobile-badge">{formatCartQuantity(cartQuantity)}</span>
        </Link>
      </div>
    </header>
  );
}
