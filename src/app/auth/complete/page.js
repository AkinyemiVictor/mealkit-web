"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { persistStoredUser } from "@/lib/auth";
import { migrateGuestCartToUser } from "@/lib/cart-storage";

const toNameParts = (email, metadata) => {
  const fallback = (email && email.includes("@")) ? email.split("@")[0] : "MealKit Friend";
  const fromMeta = (metadata?.full_name || metadata?.name || metadata?.user_name || "").trim();
  const source = fromMeta || fallback;
  const cleaned = String(source).replace(/[._\-]+/g, " ").trim();
  const pieces = cleaned.split(/\s+/);
  const first = (pieces[0] || "MealKit").toUpperCase();
  const last = (pieces[1] || "Friend").toUpperCase();
  return { firstName: first, lastName: last, fullName: `${first} ${last}`.trim() };
};

export default function OAuthCompletePage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const supabase = getBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/sign-in?tab=login#loginForm");
          return;
        }
        const { firstName, lastName, fullName } = toNameParts(user.email, user.user_metadata || {});
        const localUser = { firstName, lastName, fullName, email: user.email || "" };
        persistStoredUser(localUser);
        try {
          await fetch("/api/users/sync", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ first_name: firstName, last_name: lastName }),
          });
        } catch {}
        try { migrateGuestCartToUser(localUser); } catch {}
        router.replace("/");
      } catch {
        router.replace("/sign-in?tab=login#loginForm");
      }
    })();
  }, [router]);

  return (
    <main className="auth-page">
      <div className="auth-shell" style={{ padding: "2rem", justifyContent: "center", alignItems: "center" }}>
        <p>Signing you in…</p>
      </div>
    </main>
  );
}
