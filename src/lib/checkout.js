import { clearCartItems, dispatchCartUpdatedEvent, readCartItems, writeCartItems } from "./cart-storage";

export const readStoredCart = () => readCartItems();

export const writeStoredCart = (items) => {
  if (!Array.isArray(items)) {
    throw new TypeError("Cart payload must be an array");
  }
  writeCartItems(items);
};

export const clearStoredCart = () => {
  clearCartItems();
};

export const dispatchCheckoutCompletedEvent = (detail) => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("checkout-completed", { detail }));
  } catch (error) {
    console.warn("Unable to dispatch checkout-completed event", error);
  }
};

export const computeCartSummary = (items, { freeDeliveryThreshold = Infinity, deliveryFee = 0 } = {}) => {
  const aggregates = (Array.isArray(items) ? items : []).reduce(
    (acc, item) => {
      const price = Number(item?.price) || 0;
      const quantity = Number(item?.quantity ?? item?.orderSize ?? 1) || 0;
      acc.subtotal += price * quantity;
      acc.quantity += quantity;
      return acc;
    },
    { subtotal: 0, quantity: 0 }
  );

  const normalisedDeliveryFee =
    aggregates.subtotal >= freeDeliveryThreshold ? 0 : Number(deliveryFee) || 0;

  return {
    ...aggregates,
    deliveryFee: normalisedDeliveryFee,
    total: aggregates.subtotal + normalisedDeliveryFee,
  };
};

export const generateOrderId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1e6)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `MK-${timestamp.slice(-5)}${random}`;
};

const RECEIPT_STORAGE_KEY = "mealkit_checkout_receipt";

export const persistCheckoutReceipt = (order) => {
  if (typeof window === "undefined" || !order) return;
  try {
    window.sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(order));
  } catch (error) {
    console.warn("Unable to persist checkout receipt", error);
  }
};

export const readCheckoutReceipt = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(RECEIPT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Unable to read checkout receipt", error);
    return null;
  }
};

export const clearCheckoutReceipt = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RECEIPT_STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to clear checkout receipt", error);
  }
};

export { dispatchCartUpdatedEvent };
