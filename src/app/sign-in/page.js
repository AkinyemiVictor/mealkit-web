"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import "@/styles/sign-in.css";

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
  const [activeTab, setActiveTab] = useState("login");

  const hashLookup = useMemo(() => ({
    login: "#loginForm",
    signup: "#signupForm",
  }), []);

  const deriveTabFromHash = useCallback(() => {
    if (typeof window === "undefined") {
      return "login";
    }
    return window.location.hash === "#signupForm" ? "signup" : "login";
  }, []);

  const syncFromHash = useCallback(() => {
    setActiveTab(deriveTabFromHash());
  }, [deriveTabFromHash]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [syncFromHash]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const desiredHash = hashLookup[activeTab];
    if (window.location.hash !== desiredHash) {
      window.history.replaceState(null, "", desiredHash);
    }
  }, [activeTab, hashLookup]);

  const handleTabChange = useCallback((tabKey) => {
    setActiveTab(tabKey);
  }, []);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
  }, []);

  const isLoginActive = activeTab === "login";

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <img src="/assets/logo/LOGO NO BACKGROUND.png" alt="Mealkit logo" />
      </div>

      <div className="auth-container">
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

        <form
          id="loginForm"
          className={`auth-form${isLoginActive ? " is-active" : ""}`}
          aria-hidden={!isLoginActive}
          aria-labelledby="login-tab"
          onSubmit={handleSubmit}
        >
          <input type="email" name="login-email" placeholder="Email" required autoComplete="email" />
          <input
            type="password"
            name="login-password"
            placeholder="Password"
            required
            autoComplete="current-password"
          />
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
            Don&apos;t have an account? {" "}
            <button type="button" onClick={() => handleTabChange("signup")}>
              Sign Up
            </button>
          </p>
        </form>

        <form
          id="signupForm"
          className={`auth-form${!isLoginActive ? " is-active" : ""}`}
          aria-hidden={isLoginActive}
          aria-labelledby="signup-tab"
          onSubmit={handleSubmit}
        >
          <input type="text" name="signup-name" placeholder="Full Name" required autoComplete="name" />
          <input type="email" name="signup-email" placeholder="Email" required autoComplete="email" />
          <input
            type="password"
            name="signup-password"
            placeholder="Password"
            required
            autoComplete="new-password"
          />
          <input
            type="password"
            name="signup-confirm-password"
            placeholder="Confirm Password"
            required
            autoComplete="new-password"
          />
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
            Already have an account? {" "}
            <button type="button" onClick={() => handleTabChange("login")}>
              Login
            </button>
          </p>
        </form>
      </div>

      <p className="auth-disclaimer">
        By using this, you agree to our {" "}
        <Link href="#">Terms and Conditions</Link>
        {" "}and{" "}
        <Link href="#">Privacy Policy</Link>.
      </p>
    </div>
  );
}
