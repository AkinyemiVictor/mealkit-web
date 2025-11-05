"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { readRecentSearches, storeRecentSearch } from "@/lib/search-history";
import copy from "@/data/copy";
import { AUTH_EVENT, clearStoredUser, readStoredUser } from "@/lib/auth";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { readCartItems } from "@/lib/cart-storage";

const MIN_ORDER_SIZE = 0.01;
const RECENT_SEARCHES_LIMIT_DISPLAY = 6;

const roundTo = (value, precision = 2) => {
  if (!Number.isFinite(value)) return 0;
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

const normaliseOrderSize = (value, fallback = MIN_ORDER_SIZE) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return roundTo(numeric);
};

const normaliseOrderCount = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.max(1, Math.round(numeric));
};

const deriveCartMetrics = (entry) => {
  if (!entry || typeof entry !== "object") {
    return { orderCount: 0 };
  }
  const orderSize = normaliseOrderSize(entry.orderSize ?? entry.quantity ?? MIN_ORDER_SIZE, MIN_ORDER_SIZE);
  const storedCount = normaliseOrderCount(entry.orderCount ?? 0, 0);
  const fallbackCount = orderSize > 0
    ? Math.round((Number.parseFloat(entry.quantity) || orderSize) / orderSize)
    : 0;
  const orderCount = storedCount > 0 ? storedCount : Math.max(0, fallbackCount);
  return {
    orderCount,
  };
};

const formatCartCount = (value) => {
  const count = normaliseOrderCount(value, 0);
  return count.toLocaleString();
};

const countStoredCartItems = () => {
  const items = readCartItems();
  return items
    .map(deriveCartMetrics)
    .reduce((sum, entry) => sum + entry.orderCount, 0);
};

function SearchBar({ idSuffix, className = "", defaultValue = "" }) {
  const formRef = useRef(null);
  const inputId = `site-header-search-${idSuffix}`;
  const classes = ["site-header__search", className].filter(Boolean).join(" ");
  const [value, setValue] = useState(defaultValue);
  const [recentTerms, setRecentTerms] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const trimmedLowerValue = value.trim().toLowerCase();
  const visibleRecentTerms = recentTerms.filter((term) => term.toLowerCase() !== trimmedLowerValue);
  const listboxId = `search-suggestions-${idSuffix}`;

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const stored = readRecentSearches().slice(0, RECENT_SEARCHES_LIMIT_DISPLAY);
    setRecentTerms(stored);
  }, []);

  const refreshRecentTerms = () => {
    setRecentTerms(readRecentSearches().slice(0, RECENT_SEARCHES_LIMIT_DISPLAY));
  };

  const handleSubmit = (event) => {
    const trimmed = value.trim();
    if (!trimmed) {
      event.preventDefault();
      return;
    }
    storeRecentSearch(trimmed);
    refreshRecentTerms();
  };

  const handleFocus = () => {
    refreshRecentTerms();
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    window.setTimeout(() => setShowSuggestions(false), 120);
  };

  const handleSuggestionSelect = (term) => {
    setValue(term);
    window.requestAnimationFrame(() => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    });
  };

  return (
    <div className="site-header__search-wrapper-inner">
      <form ref={formRef} className={classes} role="search" action="/search" method="get" onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="sr-only">
          Search MealKit
        </label>
        <input
          id={inputId}
          type="search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={copy.search.placeholderHeader}
          className="site-header__search-input"
          autoComplete="off"
          spellCheck="false"
          aria-controls={showSuggestions && visibleRecentTerms.length ? listboxId : undefined}
          aria-expanded={showSuggestions && visibleRecentTerms.length ? "true" : "false"}
          role="combobox"
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        <button type="submit" className="site-header__search-button">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <span className="sr-only">Submit search</span>
        </button>
      </form>
      {showSuggestions && visibleRecentTerms.length ? (
        <div
          className="site-header__search-suggestions"
          role="listbox"
          aria-label={copy.search.suggestionsLabel}
          id={listboxId}
        >
          {visibleRecentTerms.map((term) => (
            <button
              type="button"
              key={term}
              className="site-header__search-suggestion"
              role="option"
              aria-selected="false"
              onMouseDown={(event) => {
                event.preventDefault();
                handleSuggestionSelect(term);
              }}
            >
              <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
              <span>{term}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const ACCOUNT_MENU = [
  { href: "/account?tab=overview", label: "My Account", iconClass: "fa-solid fa-user" },
  { href: "/account?tab=orders", label: "Orders", iconClass: "fa-solid fa-box" },
  { href: "/account?tab=inbox", label: "Inbox", iconClass: "fa-solid fa-envelope" },
  { href: "/account?tab=wishlist", label: "Wishlist", iconClass: "fa-regular fa-heart" },
  { href: "/account?tab=voucher", label: "Voucher", iconClass: "fa-solid fa-ticket" },
];

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const isAdmin = (user) => {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(String(user.email).toLowerCase());
};

const MAX_GREETING_NAME = 6;

const normaliseDisplayName = (value) => {
  const str = String(value || "").trim();
  if (!str) return "";
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const getFirstName = (user) => {
  if (!user) return "";
  if (user.firstName && typeof user.firstName === "string" && user.firstName.trim()) {
    const formatted = normaliseDisplayName(user.firstName);
    return formatted.length > MAX_GREETING_NAME ? `${formatted.slice(0, MAX_GREETING_NAME)}…` : formatted;
  }
  let source = "";
  if (user.fullName && typeof user.fullName === "string") {
    source = user.fullName.trim();
  } else if (user.email && typeof user.email === "string") {
    source = user.email.split("@")[0];
  }
  if (!source) return "";

  // Prefer whitespace-delimited first token
  let first = source.split(/\s+/)[0];
  // If there are no spaces (e.g., PascalCase or snake/kebab), try to split sensibly
  if (!first || first.length === source.length) {
    const deCamel = source.replace(/([a-z])([A-Z])/g, "$1 $2");
    first = deCamel.split(/\s+|[-_]+/)[0] || source;
  }

  const formatted = normaliseDisplayName(first);
  // Truncate for UI stability
  if (formatted.length > MAX_GREETING_NAME) {
    return `${formatted.slice(0, MAX_GREETING_NAME)}…`;
  }
  return formatted;
};

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [user, setUser] = useState(null);
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
    setUser(readStoredUser());
    const handleAuthChanged = (event) => {
      const nextUser = event?.detail?.user ?? readStoredUser();
      setUser(nextUser);
      if (!nextUser) {
        closeAccountDropdown();
      }
    };
    window.addEventListener(AUTH_EVENT, handleAuthChanged);
    return () => {
      window.removeEventListener(AUTH_EVENT, handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateCartQuantity = () => {
      setCartQuantity(countStoredCartItems());
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

  const handleLogout = async () => {
    try {
      const supabase = getBrowserSupabaseClient();
      await supabase.auth.signOut();
    } catch {}
    clearStoredUser();
    setUser(null);
    handleNavAction();
  };

  const accountLabel = user ? `Hi, ${getFirstName(user)}` : "Account";

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
              <span className="site-header__action-label">{accountLabel}</span>
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
              {user ? (
                <>
                  {ACCOUNT_MENU.map((item) => (
                    <Link
                      key={item.href}
                      className="site-header__account-link"
                      href={item.href}
                      role="menuitem"
                      onClick={handleNavAction}
                    >
                      <i className={item.iconClass} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  {isAdmin(user) ? (
                    <Link
                      className="site-header__account-link"
                      href="/admin/logs"
                      role="menuitem"
                      onClick={handleNavAction}
                    >
                      <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                      <span>Admin Logs</span>
                    </Link>
                  ) : null}
                  <button type="button" className="site-header__account-link site-header__account-link--logout" onClick={handleLogout}>
                    <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    className="site-header__account-link"
                    href="/sign-in?tab=login#loginForm"
                    role="menuitem"
                    onClick={handleNavAction}
                  >
                    Login
                  </Link>
                  <Link
                    className="site-header__account-link"
                    href="/sign-in?tab=signup#signupForm"
                    role="menuitem"
                    onClick={handleNavAction}
                  >
                    Sign Up
                  </Link>
                </>
              )}
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
              {formatCartCount(cartQuantity)}
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
            {user ? (
              <>
                {ACCOUNT_MENU.map((item) => (
                  <Link key={item.href} href={item.href} onClick={handleNavAction}>
                    {item.label}
                  </Link>
                ))}
                {isAdmin(user) ? (
                  <Link href="/admin/logs" onClick={handleNavAction}>
                    Admin Logs
                  </Link>
                ) : null}
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/sign-in?tab=login#loginForm" onClick={handleNavAction}>
                  Login
                </Link>
                <Link href="/sign-in?tab=signup#signupForm" onClick={handleNavAction}>
                  Sign Up
                </Link>
              </>
            )}
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
          <span className="site-header__mobile-badge">{formatCartCount(cartQuantity)}</span>
        </Link>
      </div>
    </header>
  );
}




