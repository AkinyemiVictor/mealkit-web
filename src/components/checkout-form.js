"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import copy from "@/data/copy";
import {
  clearStoredCart,
  computeCartSummary,
  dispatchCheckoutCompletedEvent,
  generateOrderId,
  persistCheckoutReceipt,
  readStoredCart,
} from "@/lib/checkout";
import { formatProductPrice } from "@/lib/catalogue";
import { persistStoredUser, readStoredUser } from "@/lib/auth";
import { addUserOrder } from "@/lib/orders";

const INITIAL_FORM_STATE = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  deliverySlot: "morning",
  paymentMethod: "paystack",
  cardName: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvc: "",
  notes: "",
};

const PAYMENT_METHOD_LABELS = copy.checkout.paymentMethods.reduce((accumulator, method) => {
  accumulator[method.value] = method.title;
  return accumulator;
}, {});

const DELIVERY_SLOT_LABELS = { ...copy.checkout.deliverySlots };

const CARD_FIELDS = ["cardName", "cardNumber", "cardExpiry", "cardCvc"];

const NAME_PATTERN = "[A-Za-z ]+";
const EMAIL_PATTERN = "[A-Za-z0-9]+@[A-Za-z0-9]+\\.com";
const PHONE_PATTERN = "\\+?[0-9]{10,15}";
const CITY_PATTERN = "[A-Za-z ]+";
const SERVICE_CITY = "Ibadan";
const SERVICE_CITY_CANONICAL = SERVICE_CITY.toLowerCase();
const ADDRESS_MIN_LENGTH = 10;
const ADDRESS_PATTERN = "[A-Za-z0-9.,'\\-\\s]{10,}";

const NAME_REGEX = new RegExp(`^${NAME_PATTERN}$`);
const EMAIL_REGEX = new RegExp(`^${EMAIL_PATTERN}$`);
const PHONE_REGEX = new RegExp(`^${PHONE_PATTERN}$`);
const CITY_REGEX = new RegExp(`^${CITY_PATTERN}$`);

const expiryPattern = /^(0[1-9]|1[0-2])\/\d{2}$/;

const createInitialFormState = (user) => ({
  ...INITIAL_FORM_STATE,
  fullName: user?.fullName ?? "",
  email: user?.email ?? "",
  phone: user?.phone ?? "",
  address: user?.address ?? "",
  city: user?.city ?? "",
});

const formatCardNumber = (value) => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 16);
  return digitsOnly.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

const formatCardExpiry = (value) => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 4);
  if (digitsOnly.length <= 2) return digitsOnly;
  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
};

const formatCardCvc = (value) => value.replace(/\D/g, "").slice(0, 3);

const deriveFirstName = (fullName) => {
  const trimmed = String(fullName || "").trim();
  if (!trimmed) return "friend";
  const [first] = trimmed.split(/\s+/);
  return first || "friend";
};

const getDeliverySlotLabel = (slot) => DELIVERY_SLOT_LABELS[slot] ?? slot;

const getPaymentMethodLabel = (method) => PAYMENT_METHOD_LABELS[method] ?? method;

function CheckoutConfirmation({ order }) {
  const firstName = deriveFirstName(order.fullName);
  const successTitle = copy.checkout.status.successTitle(firstName);
  const successSubtitle = copy.checkout.status.successSubtitle?.(order.email);
  const deliverySlot = getDeliverySlotLabel(order.deliverySlot);
  const paymentLabel = getPaymentMethodLabel(order.paymentMethod);
  const totalFormatted = formatProductPrice(order.summary?.total ?? 0);
  const bankSubtitle = copy.checkout.status.bankInstructionsSubtitle?.(totalFormatted);
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <section className="checkout-card checkout-confirmation" role="status" aria-live="polite">
      <div className="checkout-confirmation__header">
        <div>
          <h2>{successTitle}</h2>
          {successSubtitle ? <p>{successSubtitle}</p> : null}
        </div>
      </div>

      <dl className="checkout-confirmation__details">
        <div>
          <dt>{copy.checkout.confirmation.orderIdLabel}</dt>
          <dd>{order.orderId}</dd>
        </div>
        <div>
          <dt>{copy.checkout.confirmation.deliverySlotLabel}</dt>
          <dd>{deliverySlot}</dd>
        </div>
        <div>
          <dt>{copy.checkout.confirmation.paymentMethodLabel}</dt>
          <dd>{paymentLabel}</dd>
        </div>
        <div>
          <dt>{copy.checkout.confirmation.totalLabel}</dt>
          <dd>{totalFormatted}</dd>
        </div>
      </dl>

      {items.length ? (
        <div className="checkout-confirmation__items">
          <h3>{copy.checkout.confirmation.itemsHeading}</h3>
          <ul>
            {items.map((item, index) => {
              const key = item?.id != null ? String(item.id) : `${item?.name ?? "item"}-${index}`;
              const quantity = Number(item?.quantity) || Number(item?.orderCount) || Number(item?.orderSize) || 1;
              return (
                <li key={key}>
                  <span>{item?.name ?? "Fresh produce"}</span>
                  <span>{`x${quantity.toLocaleString()}`}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {order.paymentMethod === "bank" && !order.isOnlinePaid ? (
        <div className="checkout-confirmation__notice">
          <h3>{copy.checkout.status.bankInstructionsTitle}</h3>
          {bankSubtitle ? <p>{bankSubtitle}</p> : null}
          <ul className="checkout-confirmation__account">
            <li>
              <span>Account name</span>
              <span>{copy.checkout.bankAccount.name}</span>
            </li>
            <li>
              <span>Account number</span>
              <span>{copy.checkout.bankAccount.number}</span>
            </li>
            <li>
              <span>Bank</span>
              <span>{copy.checkout.bankAccount.bank}</span>
            </li>
          </ul>
        </div>
      ) : null}

      {order.paymentMethod === "delivery" ? (
        <div className="checkout-confirmation__notice">
          <h3>{copy.checkout.status.deliveryInstructionsTitle}</h3>
          <p>{copy.checkout.status.deliveryInstructionsSubtitle}</p>
        </div>
      ) : null}

      {(order.paymentMethod === "palmpay" || order.paymentMethod === "opay") && !order.isOnlinePaid ? (
        <div className="checkout-confirmation__notice">
          <h3>{copy.checkout.status.walletInstructionsTitle}</h3>
          <p>{copy.checkout.status.walletInstructionsSubtitle}</p>
        </div>
      ) : null}

      <div className="checkout-confirmation__actions">
        <Link href="/checkout/success" className="checkout-confirmation__action">
          {copy.checkout.receiptPage.viewReceipt}
        </Link>
        <Link href="/products" className="checkout-confirmation__action checkout-confirmation__action--secondary">
          {copy.checkout.emptyCta}
        </Link>
        <Link href="/categories" className="checkout-confirmation__action checkout-confirmation__action--secondary">
          {copy.general.seeAll}
        </Link>
      </div>
    </section>
  );
}

export default function CheckoutForm() {
  const [formState, setFormState] = useState(() =>
    createInitialFormState(typeof window !== "undefined" ? readStoredUser() : null)
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = readStoredUser();
    if (!stored) return;
    setFormState((prev) => {
      let changed = false;
      const next = { ...prev };
      if (!prev.fullName && stored.fullName) {
        next.fullName = stored.fullName;
        changed = true;
      }
      if (!prev.email && stored.email) {
        next.email = stored.email;
        changed = true;
      }
      if (!prev.phone && stored.phone) {
        next.phone = stored.phone;
        changed = true;
      }
      if (!prev.address && stored.address) {
        next.address = stored.address;
        changed = true;
      }
      if (!prev.city && stored.city) {
        next.city = stored.city;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  // We use Paystack for all online payments; never collect raw card details in our UI.
  const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
  const usingPaystack = /^pk_(test|live)_/.test(paystackKey);
  const showCardFields = false;
  const isProcessing = status === "processing";

  const paymentHint = useMemo(() => copy.checkout.paymentHint, []);

  const handleChange = (event) => {
    const { name } = event.target;
    let { value } = event.target;

    let nextValue = value;

    if (name === "cardNumber") {
      nextValue = formatCardNumber(value);
    } else if (name === "cardExpiry") {
      nextValue = formatCardExpiry(value);
    } else if (name === "cardCvc") {
      nextValue = formatCardCvc(value);
    } else if (name === "address") {
      nextValue = value.replace(/\s{2,}/g, " ");
    } else if (name === "city") {
      nextValue = value.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ");
    } else {
      if (name === "fullName") {
        nextValue = value.replace(/[^A-Za-z\s]/g, "").replace(/\s+/g, " ");
      } else if (name === "email") {
        nextValue = value.replace(/\s+/g, "");
      } else if (name === "phone") {
        const stripped = value.replace(/[^0-9+]/g, "");
        const startsWithPlus = stripped.startsWith("+");
        const digitsOnly = stripped.replace(/\D/g, "").slice(0, 15);
        nextValue = startsWithPlus ? `+${digitsOnly}` : digitsOnly;
      }
    }

    setFormState((prev) => ({ ...prev, [name]: nextValue }));

    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

    if (name === "paymentMethod") {
      setErrors((prev) => {
        if (!Object.keys(prev).length) return prev;
        const next = { ...prev };
        CARD_FIELDS.forEach((field) => { delete next[field]; });
        return next;
      });
    }
  };

  const validateForm = (state) => {
    const validation = copy.checkout.validation;
    const nextErrors = {};

    const trimmedName = state.fullName.trim();
    if (!trimmedName) {
      nextErrors.fullName = validation.required;
    } else if (!NAME_REGEX.test(trimmedName)) {
      nextErrors.fullName = validation.name ?? validation.required;
    }

    const normalizedEmail = state.email.trim().toLowerCase();
    if (!normalizedEmail) {
      nextErrors.email = validation.required;
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      nextErrors.email = validation.email;
    }

    const normalizedPhone = state.phone.trim();
    const phoneDigits = normalizedPhone.replace(/\s+/g, "");
    if (!phoneDigits) {
      nextErrors.phone = validation.required;
    } else if (!PHONE_REGEX.test(phoneDigits)) {
      nextErrors.phone = validation.phone;
    }
    const addressTrimmed = state.address.trim();
    if (!addressTrimmed) {
      nextErrors.address = validation.required;
    } else if (addressTrimmed.length < ADDRESS_MIN_LENGTH) {
      nextErrors.address = validation.addressLength ?? validation.required;
    }
    const cityTrimmed = state.city.trim();
    if (!cityTrimmed) {
      nextErrors.city = validation.required;
    } else if (!CITY_REGEX.test(cityTrimmed) || cityTrimmed.toLowerCase() !== SERVICE_CITY_CANONICAL) {
      nextErrors.city = validation.cityService ?? validation.required;
    }

    if (showCardFields) {
      if (!state.cardName.trim()) {
        nextErrors.cardName = validation.required;
      }
      const digits = state.cardNumber.replace(/\D/g, "");
      if (digits.length !== 16) {
        nextErrors.cardNumber = validation.cardNumber;
      }
      if (!expiryPattern.test(state.cardExpiry)) {
        nextErrors.cardExpiry = validation.cardExpiry;
      }
      if (state.cardCvc.replace(/\D/g, "").length !== 3) {
        nextErrors.cardCvc = validation.cardCvc;
      }
    }

    return nextErrors;
  };

  const ensurePaystackScript = () => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if (window.PaystackPop) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const launchPaystack = async ({ email, amount, orderId, channels }) => {
    const ready = await ensurePaystackScript();
    if (!ready || !window.PaystackPop) throw new Error("Paystack failed to load");
    return new Promise((resolve, reject) => {
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email,
        amount: Math.max(0, Math.round(Number(amount) * 100)),
        ref: `MK-${orderId || generateOrderId()}-${Date.now()}`,
        ...(Array.isArray(channels) && channels.length ? { channels } : {}),
        // Use non-async function to satisfy inline.js validator
        callback: function (response) {
          fetch("/api/paystack/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: response.reference, orderId }),
          })
            .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
            .then(({ ok, json }) => {
              if (!ok || !json?.verified) throw new Error(json?.error || "Verification failed");
              resolve(json);
            })
            .catch((e) => reject(e));
        },
        onClose: function () {
          reject(new Error("Payment window closed"));
        },
      });
      handler.openIframe();
    });
  };

  const launchPalmPay = async ({ amount, orderId }) => {
    const ref = `MK-${orderId || generateOrderId()}-${Date.now()}`;
    const url = `https://palmpay.app/pay?ref=${encodeURIComponent(ref)}&amount=${encodeURIComponent(
      Math.max(0, Math.round(Number(amount)))
    )}`;
    try { window.open(url, "_blank"); } catch (_) {}
  };

  const launchOpay = async ({ amount, orderId }) => {
    const ref = `MK-${orderId || generateOrderId()}-${Date.now()}`;
    const url = `https://pay.opayweb.com/?ref=${encodeURIComponent(ref)}&amount=${encodeURIComponent(
      Math.max(0, Math.round(Number(amount)))
    )}`;
    try { window.open(url, "_blank"); } catch (_) {}
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isProcessing) return;

    const fieldErrors = validateForm(formState);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      setFormError(null);
      return;
    }

    const cartItems = readStoredCart();
    if (!cartItems.length) {
      setFormError(copy.checkout.emptyDescription);
      return;
    }

    setErrors({});
    setFormError(null);

    const summary = computeCartSummary(cartItems, {
      freeDeliveryThreshold: copy.checkout.freeDeliveryThreshold,
      deliveryFee: copy.checkout.deliveryFee,
    });

    const status =
      formState.paymentMethod === "delivery"
        ? "awaiting delivery"
        : formState.paymentMethod === "palmpay" || formState.paymentMethod === "opay"
          ? "awaiting payment"
          : "processing";
    const storedUser = readStoredUser();

    const cityTrimmed = formState.city.trim();
    const hasServiceCity = Boolean(cityTrimmed) && cityTrimmed.toLowerCase() === SERVICE_CITY_CANONICAL;
    const canonicalCity = hasServiceCity ? SERVICE_CITY : "";

    const normalizedForm = {
      ...formState,
      fullName: formState.fullName.trim(),
      email: formState.email.trim().toLowerCase(),
      phone: formState.phone.trim().replace(/\s+/g, ""),
      address: formState.address.trim(),
      city: canonicalCity,
      notes: formState.notes.trim(),
      cardName: formState.cardName.trim(),
      cardExpiry: formState.cardExpiry.trim(),
    };

    let nextUserRecord = storedUser;
    if (normalizedForm.email) {
      const base = storedUser ?? {};
      nextUserRecord = {
        ...base,
        fullName: normalizedForm.fullName || base.fullName || "",
        email: normalizedForm.email,
        phone: normalizedForm.phone || base.phone || "",
        address: normalizedForm.address || base.address || "",
        city: canonicalCity || base.city || "",
      };
      persistStoredUser(nextUserRecord);
    }

    const order = {
      ...normalizedForm,
      orderId: generateOrderId(),
      items: cartItems,
      summary,
      createdAt: new Date().toISOString(),
      status,
      user: nextUserRecord
        ? {
            name: nextUserRecord.fullName || nextUserRecord.email,
            email: nextUserRecord.email,
            phone: nextUserRecord.phone,
            address: nextUserRecord.address,
          }
        : null,
    };

    const finalize = async (serverOrderId) => {
      // Attempt to create server order (requires Supabase session)
      try {
        if (!serverOrderId) {
          const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ deliveryAddress: order.address, note: order.notes }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.warn("Server order create failed", payload?.error || res.statusText);
          } else {
            serverOrderId = payload?.order?.id;
          }
        }
      } catch (e) {
        console.warn("Server order create exception", e);
      }

      persistCheckoutReceipt(order);
      clearStoredCart();
      addUserOrder(order, status, nextUserRecord);
      dispatchCheckoutCompletedEvent({ items: cartItems, summary, order });
      // Fire-and-forget email receipt; do not block UI
      try {
        fetch("/api/receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order, to: order.email }),
        }).catch(() => {});
      } catch (_) {}
      setResult(order);
      setStatus("success");
      setFormState(createInitialFormState(nextUserRecord));
    };

    setStatus("processing");
    try {
      let createdOrderId = null;
      // Always create the server order first to get an id
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ deliveryAddress: order.address, note: order.notes }),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.ok) createdOrderId = payload?.order?.id || null;
      } catch {}

      if (formState.paymentMethod === "paystack") {
        if (!/^pk_(test|live)_/.test(paystackKey || "")) {
          setFormError("Online payments are not available: missing Paystack public key.");
          setStatus("idle");
          return;
        }
        await launchPaystack({ email: order.email, amount: summary.total, orderId: createdOrderId || generateOrderId() });
        order.isOnlinePaid = true;
      } else if (formState.paymentMethod === "palmpay") {
        await launchPalmPay({ amount: summary.total, orderId: createdOrderId || generateOrderId() });
        order.isOnlinePaid = false;
      } else if (formState.paymentMethod === "opay") {
        await launchOpay({ amount: summary.total, orderId: createdOrderId || generateOrderId() });
        order.isOnlinePaid = false;
      }

      await finalize(createdOrderId);
    } catch (err) {
      console.warn("Checkout error", err);
      setFormError(err?.message || "Payment was not completed");
      setStatus("idle");
    }
  };

  if (result) {
    return <CheckoutConfirmation order={result} />;
  }

  const getFieldErrorId = (field) => (errors[field] ? `checkout-${field}-error` : undefined);
  const cityServiceMismatch =
    Boolean(formState.city.trim()) && formState.city.trim().toLowerCase() !== SERVICE_CITY_CANONICAL;
  const cityErrorId = getFieldErrorId("city");
  const cityFieldHasError = Boolean(cityErrorId) || cityServiceMismatch;
  const cityDescribedBy = (() => {
    const ids = [];
    if (cityServiceMismatch) {
      ids.push("checkout-city-service-alert");
    }
    if (cityErrorId) {
      ids.push(cityErrorId);
    }
    return ids.length ? ids.join(" ") : undefined;
  })();

  return (
    <form
      className="checkout-card"
      aria-describedby="checkout-payment-description"
      noValidate
      onSubmit={handleSubmit}
    >
      {formError ? (
        <div className="checkout-alert checkout-alert--error" role="alert">
          {formError}
        </div>
      ) : null}

      {isProcessing ? (
        <div className="checkout-alert checkout-alert--processing" role="status" aria-live="assertive">
          <span className="checkout-alert__spinner" aria-hidden="true" />
          <p>{copy.checkout.status.processingSubtitle}</p>
        </div>
      ) : null}

      <section className="checkout-section">
        <h2>{copy.checkout.deliveryDetails}</h2>
        <div className="checkout-field-grid">
          <label className={errors.fullName ? "checkout-field has-error" : "checkout-field"}>
            <span>{copy.checkout.labels.fullName}</span>
            <input
              name="fullName"
              value={formState.fullName}
              onChange={handleChange}
              placeholder={copy.checkout.placeholders.fullName}
              autoComplete="name"
              pattern={NAME_PATTERN}
              title="Use letters and spaces only."
              required
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={getFieldErrorId("fullName")}
            />
            {errors.fullName ? (
              <span className="checkout-field__error" id="checkout-fullName-error">
                {errors.fullName}
              </span>
            ) : null}
          </label>
          <label className={errors.email ? "checkout-field has-error" : "checkout-field"}>
            <span>{copy.checkout.labels.email}</span>
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
              placeholder={copy.checkout.placeholders.email}
              autoComplete="email"
              pattern={EMAIL_PATTERN}
              title="Use letters or numbers, followed by @, ending with .com"
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={getFieldErrorId("email")}
            />
            {errors.email ? (
              <span className="checkout-field__error" id="checkout-email-error">
                {errors.email}
              </span>
            ) : null}
          </label>
          <label className={errors.phone ? "checkout-field has-error" : "checkout-field"}>
            <span>{copy.checkout.labels.phone}</span>
            <input
              type="tel"
              name="phone"
              value={formState.phone}
              onChange={handleChange}
              placeholder={copy.checkout.placeholders.phone}
              autoComplete="tel"
              pattern={PHONE_PATTERN}
              title="Include country code and digits only, e.g. +2348120000000"
              required
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={getFieldErrorId("phone")}
            />
            {errors.phone ? (
              <span className="checkout-field__error" id="checkout-phone-error">
                {errors.phone}
              </span>
            ) : null}
          </label>
        </div>
        <label className={errors.address ? "checkout-textarea has-error" : "checkout-textarea"}>
          <span>{copy.checkout.labels.address}</span>
          <textarea
            name="address"
            value={formState.address}
            onChange={handleChange}
            rows={3}
            placeholder={copy.checkout.placeholders.address}
            minLength={ADDRESS_MIN_LENGTH}
            title={`Address should be at least ${ADDRESS_MIN_LENGTH} characters.`}
            required
            aria-invalid={Boolean(errors.address)}
            aria-describedby={getFieldErrorId("address")}
          />
          {errors.address ? (
            <span className="checkout-field__error" id="checkout-address-error">
              {errors.address}
            </span>
          ) : null}
        </label>
        <div className="checkout-field-grid">
          <label className={cityFieldHasError ? "checkout-field has-error" : "checkout-field"}>
            <span>{copy.checkout.labels.city}</span>
            <input
              name="city"
              value={formState.city}
              onChange={handleChange}
              placeholder={copy.checkout.placeholders.city}
              autoComplete="address-level2"
              required
              pattern={CITY_PATTERN}
              title={`Enter ${SERVICE_CITY} to continue.`}
              aria-invalid={Boolean(errors.city) || cityServiceMismatch}
              aria-describedby={cityDescribedBy}
            />
            {cityServiceMismatch ? (
              <div
                className="checkout-field__notice checkout-field__notice--error"
                id="checkout-city-service-alert"
                role="alert"
              >
                {copy.checkout.validation.cityService}
              </div>
            ) : null}
            {errors.city ? (
              <span className="checkout-field__error" id="checkout-city-error">
                {errors.city}
              </span>
            ) : null}
          </label>
          <label className="checkout-field">
            <span>{copy.checkout.labels.deliverySlot}</span>
            <select name="deliverySlot" value={formState.deliverySlot} onChange={handleChange}>
              <option value="morning">{copy.checkout.deliverySlots.morning}</option>
              <option value="afternoon">{copy.checkout.deliverySlots.afternoon}</option>
              <option value="evening">{copy.checkout.deliverySlots.evening}</option>
            </select>
          </label>
        </div>
        <label className="checkout-textarea">
          <span>{copy.checkout.labels.notes}</span>
          <textarea
            name="notes"
            value={formState.notes}
            onChange={handleChange}
            rows={3}
            placeholder={copy.checkout.placeholders.notes}
          />
        </label>
      </section>

      <section className="checkout-section">
        <h2>{copy.checkout.paymentHeading}</h2>
        <p id="checkout-payment-description" className="checkout-section__hint">
          {paymentHint}
        </p>
        <div className="checkout-payment-options">
          {copy.checkout.paymentMethods.map((method) => (
            <label
              key={method.value}
              className={`checkout-payment-tile${
                formState.paymentMethod === method.value ? " checkout-payment-tile--active" : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.value}
                checked={formState.paymentMethod === method.value}
                onChange={handleChange}
              />
              <div>
                <span className="checkout-payment-title">{method.title}</span>
                <span className="checkout-payment-subtitle">{method.subtitle}</span>
                {Array.isArray(method.badges) && method.badges.length ? (
                  <div className="checkout-payment-badges">
                    {method.badges.map((badge, index) => {
                      const key = `${badge.label}-${index}`;
                      if (badge.type === "image" && badge.src) {
                        const imageSrc = encodeURI(badge.src);
                        return (
                          <span key={key} className="checkout-payment-badge checkout-payment-badge--image">
                            <img src={imageSrc} alt={badge.label} />
                          </span>
                        );
                      }
                      if (badge.icon) {
                        return (
                          <span key={key} className="checkout-payment-badge">
                            <i className={badge.icon} aria-hidden="true" />
                            <span className="sr-only">{badge.label}</span>
                          </span>
                        );
                      }
                      return (
                        <span key={key} className="checkout-payment-badge checkout-payment-badge--text">
                          {badge.label}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </label>
          ))}
        </div>

        {showCardFields ? (
          <div className="checkout-field-grid">
            <label className={errors.cardName ? "checkout-field has-error" : "checkout-field"}>
              <span>{copy.checkout.labels.cardName}</span>
              <input
                name="cardName"
                value={formState.cardName}
                onChange={handleChange}
                placeholder={copy.checkout.placeholders.cardName}
                autoComplete="cc-name"
                required={showCardFields}
                aria-invalid={Boolean(errors.cardName)}
                aria-describedby={getFieldErrorId("cardName")}
              />
              {errors.cardName ? (
                <span className="checkout-field__error" id="checkout-cardName-error">
                  {errors.cardName}
                </span>
              ) : null}
            </label>
            <label className={errors.cardNumber ? "checkout-field has-error" : "checkout-field"}>
              <span>{copy.checkout.labels.cardNumber}</span>
              <input
                name="cardNumber"
                value={formState.cardNumber}
                onChange={handleChange}
                inputMode="numeric"
                placeholder={copy.checkout.placeholders.cardNumber}
                autoComplete="cc-number"
                required={showCardFields}
                aria-invalid={Boolean(errors.cardNumber)}
                aria-describedby={getFieldErrorId("cardNumber")}
              />
              {errors.cardNumber ? (
                <span className="checkout-field__error" id="checkout-cardNumber-error">
                  {errors.cardNumber}
                </span>
              ) : null}
            </label>
            <label className={errors.cardExpiry ? "checkout-field has-error" : "checkout-field"}>
              <span>{copy.checkout.labels.cardExpiry}</span>
              <input
                name="cardExpiry"
                value={formState.cardExpiry}
                onChange={handleChange}
                placeholder={copy.checkout.placeholders.cardExpiry}
                autoComplete="cc-exp"
                required={showCardFields}
                aria-invalid={Boolean(errors.cardExpiry)}
                aria-describedby={getFieldErrorId("cardExpiry")}
              />
              {errors.cardExpiry ? (
                <span className="checkout-field__error" id="checkout-cardExpiry-error">
                  {errors.cardExpiry}
                </span>
              ) : null}
            </label>
            <label className={errors.cardCvc ? "checkout-field has-error" : "checkout-field"}>
              <span>{copy.checkout.labels.cardCvc}</span>
              <input
                name="cardCvc"
                value={formState.cardCvc}
                onChange={handleChange}
                inputMode="numeric"
                placeholder={copy.checkout.placeholders.cardCvc}
                autoComplete="cc-csc"
                required={showCardFields}
                aria-invalid={Boolean(errors.cardCvc)}
                aria-describedby={getFieldErrorId("cardCvc")}
              />
              {errors.cardCvc ? (
                <span className="checkout-field__error" id="checkout-cardCvc-error">
                  {errors.cardCvc}
                </span>
              ) : null}
            </label>
          </div>
        ) : null}
      </section>

      <button type="submit" className="checkout-submit" disabled={isProcessing}>
        {isProcessing ? copy.checkout.status.processingTitle : copy.checkout.completeOrder}
      </button>
    </form>
  );
}
