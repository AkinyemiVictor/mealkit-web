"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import "@/styles/sign-in.css";
import { persistStoredUser, readStoredUser } from "@/lib/auth";

const TAB_OPTIONS = [
  { key: "login", label: "Login", hash: "#loginForm" },
  { key: "signup", label: "Sign Up", hash: "#signupForm" },
];

function GoogleIcon() {
  return (
    <svg
      className="auth-google-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export default function SignInPage() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") {
      return "login";
    }

    const { hash, search } = window.location;
    const hashMatch = TAB_OPTIONS.find((tab) => tab.hash === hash);
    if (hashMatch) {
      return hashMatch.key;
    }

    if (search) {
      const params = new URLSearchParams(search);
      const tabParam = params.get("tab");
      if (tabParam) {
        const tabMatch = TAB_OPTIONS.find((tab) => tab.key === tabParam);
        if (tabMatch) {
          return tabMatch.key;
        }
      }
    }

    return "login";
  });

  const hashLookup = useMemo(() => TAB_OPTIONS.reduce((acc, tab) => {
    acc[tab.key] = tab.hash;
    return acc;
  }, {}), []);

  const hashToTab = useMemo(() => TAB_OPTIONS.reduce((acc, tab) => {
    acc[tab.hash] = tab.key;
    return acc;
  }, {}), []);

  const deriveTabFromLocation = useCallback(() => {
    if (typeof window === "undefined") {
      return "login";
    }

    const { hash, search } = window.location;
    if (hash && hashToTab[hash]) {
      return hashToTab[hash];
    }

    if (search) {
      const params = new URLSearchParams(search);
      const tabParam = params.get("tab");
      if (tabParam && hashLookup[tabParam]) {
        return tabParam;
      }
    }

    return "login";
  }, [hashLookup, hashToTab]);

  const syncFromLocation = useCallback(() => {
    setActiveTab(deriveTabFromLocation());
  }, [deriveTabFromLocation]);

  useEffect(() => {
    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [syncFromLocation]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const desiredHash = hashLookup[activeTab];
    if (!desiredHash) {
      return;
    }

    const url = new URL(window.location.href);
    let shouldUpdate = false;

    if (url.hash !== desiredHash) {
      url.hash = desiredHash;
      shouldUpdate = true;
    }

    if (url.searchParams.get("tab") !== activeTab) {
      url.searchParams.set("tab", activeTab);
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      window.history.replaceState(null, "", url);
    }
  }, [activeTab, hashLookup]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);

  const handleTabChange = useCallback((tabKey) => {
    setActiveTab(tabKey);
  }, []);

  const handleLoginSubmit = useCallback((event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("login-email") || "").trim();
    if (!email) return;
    const nameFromEmail = email.includes("@") ? email.split("@")[0] : "MealKit friend";
    persistStoredUser({
      fullName: nameFromEmail.replace(/[\.\_\-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "MealKit Friend",
      email,
    });
    window.location.href = "/account";
  }, []);

  const handleSignupSubmit = useCallback((event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fullName = String(formData.get("signup-name") || "").trim();
    const email = String(formData.get("signup-email") || "").trim();
    if (!fullName || !email) return;
    persistStoredUser({
      fullName,
      email,
    });
    window.location.href = "/account";
  }, []);

  useEffect(() => {
    const existing = readStoredUser();
    if (existing) {
      window.location.replace("/account");
    }
  }, []);

  const isLoginActive = activeTab === "login";
  const panelHeading = isLoginActive ? "Welcome back" : "Create your MealKit account";
  const panelSubheading = isLoginActive
    ? "Sign in to manage deliveries, track orders, and repeat your favourite baskets."
    : "Set up your account to schedule deliveries, save baskets, and earn loyalty rewards.";

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside" aria-label="MealKit membership highlights">
          <div className="auth-aside-inner">
            <div>
              <span className="auth-aside-badge">MealKit community</span>
              <h1 className="auth-aside-title">Groceries done in minutes</h1>
              <p className="auth-aside-text">
                Stay on top of your pantry with real-time delivery tracking and curated recommendations tailored to
                your household.
              </p>
              <ul className="auth-aside-list">
                <li>
                  <i className="fa-solid fa-bolt" aria-hidden="true" />
                  <span>Same-day delivery across Lagos</span>
                </li>
                <li>
                  <i className="fa-solid fa-seedling" aria-hidden="true" />
                  <span>Chef-picked seasonal bundles</span>
                </li>
                <li>
                  <i className="fa-solid fa-shield-heart" aria-hidden="true" />
                  <span>Secure payments & dedicated support</span>
                </li>
              </ul>
            </div>
            <p className="auth-aside-footer">
              Need help logging in?{' '}
              <Link href="/help-center">Talk to our concierge</Link>
            </p>
          </div>
        </aside>

        <section className="auth-panel" aria-label="MealKit authentication">
          <div className="auth-panel-header">
            <div>
              <span className="auth-panel-eyebrow">MealKit account</span>
              <h2 className="auth-panel-title">{panelHeading}</h2>
              <p className="auth-panel-subtitle">{panelSubheading}</p>
            </div>
            <button type="button" className="auth-help-link">
              <i className="fa-regular fa-circle-question" aria-hidden="true" />
              Contact support
            </button>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Authentication tabs">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`${tab.key}-tab`}
                aria-controls={tab.hash.substring(1)}
                aria-selected={activeTab === tab.key}
                className={`auth-tab${activeTab === tab.key ? " is-active" : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="auth-forms">
            <form
              id="loginForm"
              className={`auth-form${isLoginActive ? " is-active" : ""}`}
              aria-hidden={!isLoginActive}
              aria-labelledby="login-tab"
              onSubmit={handleLoginSubmit}
            >
              <div className="auth-field">
                <label className="sr-only" htmlFor="login-email">
                  Email
                </label>
                <input id="login-email" type="email" name="login-email" placeholder="Email" required autoComplete="email" />
              </div>
              <div className="auth-field">
                <label className="sr-only" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  name="login-password"
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="auth-forgot">
                <Link href="#">Forgot password?</Link>
              </div>
              <button type="submit" className="auth-primary-btn">
                Login
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button type="button" className="auth-google-btn">
                <GoogleIcon />
                Login with Google
              </button>

              <p className="auth-switch">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => handleTabChange('signup')}>
                  Sign Up
                </button>
              </p>
            </form>

            <form
              id="signupForm"
              className={`auth-form${!isLoginActive ? " is-active" : ""}`}
              aria-hidden={isLoginActive}
              aria-labelledby="signup-tab"
              onSubmit={handleSignupSubmit}
            >
              <div className="auth-field">
                <label className="sr-only" htmlFor="signup-name">
                  Full name
                </label>
                <input id="signup-name" type="text" name="signup-name" placeholder="Full Name" required autoComplete="name" />
              </div>
              <div className="auth-field">
                <label className="sr-only" htmlFor="signup-email">
                  Email
                </label>
                <input id="signup-email" type="email" name="signup-email" placeholder="Email" required autoComplete="email" />
              </div>
              <div className="auth-field">
                <label className="sr-only" htmlFor="signup-password">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  name="signup-password"
                  placeholder="Password"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="auth-field">
                <label className="sr-only" htmlFor="signup-confirm-password">
                  Confirm password
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  name="signup-confirm-password"
                  placeholder="Confirm Password"
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="auth-primary-btn">
                Sign Up
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button type="button" className="auth-google-btn">
                <GoogleIcon />
                Sign up with Google
              </button>

              <p className="auth-switch">
                Already have an account?{' '}
                <button type="button" onClick={() => handleTabChange('login')}>
                  Login
                </button>
              </p>
            </form>
          </div>

          <p className="auth-disclaimer">
            By using MealKit you agree to our{' '}
            <Link href="#">Terms and Conditions</Link>
            {' '}and{' '}
            <Link href="#">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
