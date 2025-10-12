"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

const INITIAL_FORM_STATE = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  deliverySlot: "morning",
  paymentMethod: "card",
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

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9][0-9\s-]{6,}$/;
const expiryPattern = /^(0[1-9]|1[0-2])\/\d{2}$/;

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

      {order.paymentMethod === "bank" ? (
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
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);

  const showCardFields = formState.paymentMethod === "card";
  const isProcessing = status === "processing";

  const paymentHint = useMemo(() => copy.checkout.paymentHint, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => {
      if (name === "cardNumber") {
        return { ...prev, [name]: formatCardNumber(value) };
      }
      if (name === "cardExpiry") {
        return { ...prev, [name]: formatCardExpiry(value) };
      }
      if (name === "cardCvc") {
        return { ...prev, [name]: formatCardCvc(value) };
      }
      return { ...prev, [name]: value };
    });

    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

    if (name === "paymentMethod" && value !== "card") {
      setErrors((prev) => {
        const hasCardErrors = CARD_FIELDS.some((field) => prev[field]);
        if (!hasCardErrors) return prev;
        const next = { ...prev };
        CARD_FIELDS.forEach((field) => {
          delete next[field];
        });
        return next;
      });
    }
  };

  const validateForm = (state) => {
    const validation = copy.checkout.validation;
    const nextErrors = {};

    if (!state.fullName.trim()) {
      nextErrors.fullName = validation.required;
    }
    if (!state.email.trim() || !emailPattern.test(state.email.trim())) {
      nextErrors.email = validation.email;
    }
    if (!state.phone.trim() || !phonePattern.test(state.phone.trim())) {
      nextErrors.phone = validation.phone;
    }
    if (!state.address.trim()) {
      nextErrors.address = validation.required;
    }
    if (!state.city.trim()) {
      nextErrors.city = validation.required;
    }

    if (state.paymentMethod === "card") {
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

  const handleSubmit = (event) => {
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

    const order = {
      ...formState,
      orderId: generateOrderId(),
      items: cartItems,
      summary,
      createdAt: new Date().toISOString(),
    };

    const finalize = () => {
      persistCheckoutReceipt(order);
      clearStoredCart();
      dispatchCheckoutCompletedEvent({ items: cartItems, summary, order });
      setResult(order);
      setStatus("success");
      setFormState(INITIAL_FORM_STATE);
    };

    setStatus("processing");
    const delay = formState.paymentMethod === "card" ? 1400 : 400;
    window.setTimeout(finalize, delay);
  };

  if (result) {
    return <CheckoutConfirmation order={result} />;
  }

  const getFieldErrorId = (field) => (errors[field] ? `checkout-${field}-error` : undefined);

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
          <label className={errors.city ? "checkout-field has-error" : "checkout-field"}>
            <span>{copy.checkout.labels.city}</span>
            <input
              name="city"
              value={formState.city}
              onChange={handleChange}
              placeholder={copy.checkout.placeholders.city}
              required
              aria-invalid={Boolean(errors.city)}
              aria-describedby={getFieldErrorId("city")}
            />
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
                      const key = badge.icon ? `${badge.icon}-${index}` : `${badge.label}-${index}`;
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
