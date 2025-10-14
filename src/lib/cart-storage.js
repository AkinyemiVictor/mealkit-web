"use client";

import { readStoredUser } from "./auth";

const BASE_KEY = "mealkit_cart";
export const CART_UPDATED_EVENT = "cart-updated";
const GUEST_KEY = `${BASE_KEY}_guest`;

const normaliseEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

export const getCartStorageKeyForUser = (user = readStoredUser()) => {
  const emailKey = normaliseEmail(user?.email);
  return emailKey ? `${BASE_KEY}_${emailKey}` : GUEST_KEY;
};

const readRawCart = (user) => {
  if (typeof window === "undefined") return [];
  try {
    const key = getCartStorageKeyForUser(user);
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Unable to read cart data", error);
    return [];
  }
};

const writeRawCart = (items, user, detail) => {
  if (typeof window === "undefined") return;
  try {
    const key = getCartStorageKeyForUser(user);
    window.localStorage.setItem(key, JSON.stringify(items ?? []));
    dispatchCartUpdatedEvent(detail);
  } catch (error) {
    console.warn("Unable to persist cart data", error);
  }
};

export const readCartItems = (user) => readRawCart(user);

export const writeCartItems = (items, user, options = {}) => {
  if (!Array.isArray(items)) {
    throw new TypeError("Cart payload must be an array");
  }
  writeRawCart(items, user, options);
};

export const clearCartItems = (user, options = {}) => {
  if (typeof window === "undefined") return;
  try {
    const key = getCartStorageKeyForUser(user);
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("Unable to clear cart data", error);
  }
  dispatchCartUpdatedEvent(options);
};

export const migrateGuestCartToUser = (user = readStoredUser()) => {
  if (typeof window === "undefined") return;
  const guestCart = readRawCart(null);
  if (!guestCart.length) return;
  const userCart = readRawCart(user);
  if (userCart.length) return;
  writeRawCart(guestCart, user);
  clearCartItems(null);
};

export const dispatchCartUpdatedEvent = (detail) => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail }));
  } catch (error) {
    console.warn("Unable to dispatch cart event", error);
  }
};
