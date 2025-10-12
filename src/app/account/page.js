"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./account.module.css";
import { AUTH_EVENT, clearStoredUser, readStoredUser } from "@/lib/auth";

const ACCOUNT_TABS = [
  { slug: "overview", label: "My Account", iconClass: "fa-solid fa-user" },
  { slug: "orders", label: "Orders", iconClass: "fa-solid fa-box" },
  { slug: "inbox", label: "Inbox", iconClass: "fa-solid fa-envelope" },
  { slug: "wishlist", label: "Wishlist", iconClass: "fa-regular fa-heart" },
  { slug: "voucher", label: "Voucher", iconClass: "fa-solid fa-ticket" },
  { slug: "followed", label: "Followed Sellers", iconClass: "fa-solid fa-store" },
  { slug: "recent", label: "Recently Viewed", iconClass: "fa-solid fa-clock-rotate-left" },
  { slug: "management", label: "Account Management", iconClass: "fa-solid fa-user-gear" },
  { slug: "payments", label: "Payment Settings", iconClass: "fa-solid fa-credit-card" },
  { slug: "addresses", label: "Address Book", iconClass: "fa-solid fa-location-dot" },
  { slug: "newsletter", label: "Newsletter Preferences", iconClass: "fa-solid fa-envelope-open-text" },
  { slug: "close", label: "Close Account", iconClass: "fa-solid fa-user-slash" },
];

const FALLBACK_USER = {
  fullName: "MealKit Friend",
  email: "hello@mealkit.ng",
};

const DEFAULT_TAB = "overview";

const getCurrentTab = (slug) =>
  ACCOUNT_TABS.some((tab) => tab.slug === slug) ? slug : DEFAULT_TAB;

const formatName = (user) => {
  if (!user) return "MealKit Friend";
  if (user.fullName && user.fullName.trim()) return user.fullName.trim();
  if (user.email) return user.email.split("@")[0];
  return "MealKit Friend";
};

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const activeTab = useMemo(() => {
    const slug = searchParams?.get("tab");
    return getCurrentTab(slug);
  }, [searchParams]);

  useEffect(() => {
    const stored = readStoredUser();
    if (!stored) {
      router.replace("/sign-in?tab=login#loginForm");
      return;
    }
    setUser(stored);
    setHydrated(true);
  }, [router]);

  useEffect(() => {
    const handleAuthChange = (event) => {
      const nextUser = event?.detail?.user ?? readStoredUser();
      if (!nextUser) {
        router.replace("/sign-in?tab=login#loginForm");
        return;
      }
      setUser(nextUser);
    };

    window.addEventListener(AUTH_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_EVENT, handleAuthChange);
    };
  }, [router]);

  const handleSelectTab = (slug) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", slug);
    router.replace(`/account?${params.toString()}`, { scroll: false });
  };

  const handleLogout = () => {
    clearStoredUser();
    router.replace("/sign-in?tab=login#loginForm");
  };

  const resolvedUser = user || FALLBACK_USER;

  const renderOverview = () => (
    <>
      <div className={styles.cards}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Account details</h3>
          <div className={styles.cardBody}>
            <p>{formatName(resolvedUser)}</p>
            <p>{resolvedUser.email}</p>
          </div>
          <Link href="/account?tab=management" className={styles.cardAction}>
            Manage account
          </Link>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Address book</h3>
          <div className={styles.cardBody}>
            <p>Set your default delivery address to speed up checkout.</p>
          </div>
          <Link href="/account?tab=addresses" className={styles.cardAction}>
            Add shipping address
          </Link>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>MealKit store credit</h3>
          <div className={styles.cardBody}>
            <p>Balance: ₦0.00</p>
            <p>Store credit from refunds or loyalty rewards appears here.</p>
          </div>
          <Link href="/account?tab=voucher" className={styles.cardAction}>
            View vouchers
          </Link>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Newsletter preferences</h3>
          <div className={styles.cardBody}>
            <p>Choose the updates you want: weekly offers, seasonal drops, or farmer spotlights.</p>
          </div>
          <Link href="/account?tab=newsletter" className={styles.cardAction}>
            Edit preferences
          </Link>
        </div>
      </div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Quick actions</h3>
        <div className={styles.twoColumn}>
          <Link href="/account?tab=orders" className={styles.cardAction}>
            Track recent orders
          </Link>
          <Link href="/products" className={styles.cardAction}>
            Continue shopping
          </Link>
          <Link href="/checkout" className={styles.cardAction}>
            Book a delivery slot
          </Link>
          <button type="button" className={styles.logoutAction} onClick={handleLogout}>
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
            Logout
          </button>
        </div>
      </div>
    </>
  );

  const renderEmptyState = (title, body, actionHref, actionLabel) => (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionEmpty}>
        <i className="fa-regular fa-folder-open" aria-hidden="true" style={{ fontSize: "1.8rem" }} />
        <p>{body}</p>
        {actionHref ? (
          <Link href={actionHref}>{actionLabel}</Link>
        ) : null}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "orders":
        return renderEmptyState(
          "Orders",
          "You have not placed any orders yet. When you do, they will appear here with live tracking.",
          "/products",
          "Shop groceries"
        );
      case "inbox":
        return renderEmptyState(
          "Inbox",
          "We will send delivery updates, offers, and service alerts right here.",
          "/help-center",
          "Visit help center"
        );
      case "wishlist":
        return renderEmptyState(
          "Wishlist",
          "Save seasonal bundles or special treats to your wishlist for easy reordering.",
          "/products",
          "Browse catalogue"
        );
      case "voucher":
        return (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Voucher wallet</h3>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <span>Store credit</span>
                <span>₦0.00</span>
              </div>
              <div className={styles.sectionEmpty}>
                <i className="fa-solid fa-ticket" aria-hidden="true" style={{ fontSize: "1.6rem" }} />
                <p>No vouchers saved yet. Apply promo codes on the cart page to store them here.</p>
                <Link href="/cart">Go to cart</Link>
              </div>
            </div>
          </div>
        );
      case "followed":
        return renderEmptyState(
          "Followed sellers",
          "Follow your favourite farms and brands to get notified when new produce arrives.",
          "/products",
          "Discover sellers"
        );
      case "recent":
        return renderEmptyState(
          "Recently viewed",
          "Items you view will appear here so you can add them to cart in a tap.",
          "/products",
          "Start exploring"
        );
      case "management":
        return (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Account management</h3>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <span>Full name</span>
                <span>{formatName(resolvedUser)}</span>
              </div>
              <div className={styles.listItem}>
                <span>Email</span>
                <span>{resolvedUser.email}</span>
              </div>
              <div className={styles.listItem}>
                <span>Password</span>
                <Link href="/sign-in?tab=login#loginForm">Change password</Link>
              </div>
            </div>
          </div>
        );
      case "payments":
        return renderEmptyState(
          "Payment settings",
          "Save your preferred cards or setup bank transfer instructions for faster checkout.",
          "/checkout",
          "Checkout now"
        );
      case "addresses":
        return renderEmptyState(
          "Address book",
          "Add a default delivery address to speed through checkout.",
          "/checkout",
          "Add address at checkout"
        );
      case "newsletter":
        return (
          <div className={`${styles.section}`}>
            <h3 className={styles.sectionTitle}>Newsletter preferences</h3>
            <p className={styles.cardBody}>
              You&apos;re currently subscribed to product updates and weekly offers. Toggle categories below to tailor what
              hits your inbox.
            </p>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <span>Weekly offers & flash sales</span>
                <span>Subscribed</span>
              </div>
              <div className={styles.listItem}>
                <span>Seasonal farmer drops</span>
                <span>Subscribed</span>
              </div>
              <div className={styles.listItem}>
                <span>Chef recipes & meal plans</span>
                <span>Unsubscribed</span>
              </div>
            </div>
            <Link href="/help-center" className={styles.cardAction}>
              Update with concierge
            </Link>
          </div>
        );
      case "close":
        return (
          <div className={`${styles.section} ${styles.dangerZone}`}>
            <h3 className={styles.sectionTitle}>Close account</h3>
            <p className={styles.cardBody}>
              We hate to see you go. Closing your MealKit account removes saved addresses, vouchers, and order history.
              You can always come back and create a fresh account later.
            </p>
            <button type="button" className={styles.dangerAction} onClick={handleLogout}>
              Close & sign out
            </button>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  if (!hydrated) {
    return (
      <main className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.sidebar}>
            <span className={styles.sidebarHeading}>Loading</span>
          </div>
          <div className={styles.skeleton}>Preparing your account...</div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <nav className={styles.sidebar} aria-label="Account sections">
          <span className={styles.sidebarHeading}>My account</span>
          <ul className={styles.navList}>
            {ACCOUNT_TABS.map((tab) => (
              <li
                key={tab.slug}
                className={`${styles.navItem}${activeTab === tab.slug ? ` ${styles.navItemActive}` : ""}`}
              >
                <button type="button" onClick={() => handleSelectTab(tab.slug)}>
                  <i className={tab.iconClass} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className={styles.content} aria-live="polite">
          <header className={styles.header}>
            <span className={styles.headerEyebrow}>Account</span>
            <h1 className={styles.headerTitle}>
              {ACCOUNT_TABS.find((tab) => tab.slug === activeTab)?.label ?? "My Account"}
            </h1>
            <p className={styles.headerSubtitle}>Manage deliveries, preferences, and saved details from one place.</p>
          </header>

          {renderContent()}
        </section>
      </div>
    </main>
  );
}
