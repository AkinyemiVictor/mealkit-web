import products from "@/data/products";

const FLAT_PRODUCTS = Object.entries(products || {}).flatMap(([categoryKey, items]) =>
  Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        categoryKey,
      }))
    : []
);

const PRODUCT_INDEX = new Map(FLAT_PRODUCTS.map((product) => [String(product.id), product]));

const mockUsers = [
  {
    id: "user-001",
    email: "jane.doe@example.com",
    password: "password123",
    firstName: "Jane",
    lastName: "Doe",
    phone: "+2349100000010",
    address: "Lekki Phase 1, Lagos",
    createdAt: "2024-09-01T09:15:00.000Z",
    role: "customer",
  },
  {
    id: "user-002",
    email: "tunde.ade@example.com",
    password: "tundeSecure!",
    firstName: "Tunde",
    lastName: "Adeyemi",
    phone: "+2349100000011",
    address: "Garki II, Abuja",
    createdAt: "2024-09-12T14:22:00.000Z",
    role: "customer",
  },
];

const mockOrders = [
  {
    orderId: "order-1001",
    userId: "user-001",
    status: "processing",
    paymentStatus: "pending",
    total: 25800,
    currency: "NGN",
    createdAt: "2024-10-01T10:00:00.000Z",
    updatedAt: "2024-10-01T10:00:00.000Z",
    items: [
      {
        productId: 1,
        name: "Cavendish Bananas",
        quantity: 2,
        unit: "kg",
        price: 1000,
      },
      {
        productId: 503,
        name: "Premium chicken",
        quantity: 1,
        unit: "kg",
        price: 25000,
      },
    ],
    deliveryAddress: "Lekki Phase 1, Lagos",
  },
];

const cartStore = new Map();

const generateId = (prefix) => {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}`;
};

const sanitiseUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

export const listProducts = ({ category } = {}) => {
  if (!category) return FLAT_PRODUCTS;
  const normalised = String(category).trim().toLowerCase();
  return FLAT_PRODUCTS.filter((product) => {
    const productCategory = (product.category || product.categoryKey || "").toLowerCase();
    return productCategory === normalised || String(product.categoryKey || "").toLowerCase() === normalised;
  });
};

export const getProductById = (productId) => PRODUCT_INDEX.get(String(productId)) || null;

export const listUsers = () => mockUsers.map(sanitiseUser);

export const findUserByEmail = (email) => {
  if (!email) return null;
  const normalised = String(email).trim().toLowerCase();
  return mockUsers.find((user) => user.email.toLowerCase() === normalised) || null;
};

export const createUser = ({ email, password, firstName, lastName, phone, address }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }
  if (findUserByEmail(email)) {
    throw new Error("A user with this email already exists");
  }
  const now = new Date().toISOString();
  const userRecord = {
    id: generateId("user"),
    email: String(email).trim().toLowerCase(),
    password,
    firstName: firstName || "",
    lastName: lastName || "",
    phone: phone || "",
    address: address || "",
    createdAt: now,
    role: "customer",
  };
  mockUsers.push(userRecord);
  return sanitiseUser(userRecord);
};

export const validateUserCredentials = ({ email, password }) => {
  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    return null;
  }
  return sanitiseUser(user);
};

export const listOrders = ({ userId } = {}) => {
  if (!userId) return [...mockOrders];
  return mockOrders.filter((order) => order.userId === userId);
};

export const createOrder = ({ userId, items = [], total = 0, status = "processing", paymentStatus = "pending", deliveryAddress = "" }) => {
  const now = new Date().toISOString();
  const orderRecord = {
    orderId: generateId("order"),
    userId: userId || "guest",
    status,
    paymentStatus,
    total,
    currency: "NGN",
    createdAt: now,
    updatedAt: now,
    items: Array.isArray(items) ? items : [],
    deliveryAddress,
  };
  mockOrders.unshift(orderRecord);
  return orderRecord;
};

export const updateOrderStatus = (orderId, { status, paymentStatus }) => {
  if (!orderId) return null;
  const index = mockOrders.findIndex((order) => order.orderId === orderId);
  if (index === -1) return null;
  const existing = mockOrders[index];
  const updated = {
    ...existing,
    status: status || existing.status,
    paymentStatus: paymentStatus || existing.paymentStatus,
    updatedAt: new Date().toISOString(),
  };
  mockOrders[index] = updated;
  return updated;
};

export const getCartForUser = (userId = "guest") => {
  const key = userId || "guest";
  if (cartStore.has(key)) {
    return cartStore.get(key);
  }
  const cart = {
    userId: key,
    items: [],
    currency: "NGN",
    subtotal: 0,
    deliveryFee: 0,
    updatedAt: new Date().toISOString(),
  };
  cartStore.set(key, cart);
  return cart;
};

export const replaceCartForUser = (userId = "guest", cartInput = {}) => {
  const key = userId || "guest";
  const items = Array.isArray(cartInput.items) ? cartInput.items : [];
  const subtotal = Number.isFinite(cartInput.subtotal) ? cartInput.subtotal : Number.parseFloat(cartInput.subtotal) || 0;
  const deliveryFee = Number.isFinite(cartInput.deliveryFee)
    ? cartInput.deliveryFee
    : Number.parseFloat(cartInput.deliveryFee) || 0;
  const cart = {
    userId: key,
    items,
    currency: cartInput.currency || "NGN",
    subtotal,
    deliveryFee,
    updatedAt: new Date().toISOString(),
    notes: cartInput.notes || "",
  };
  cartStore.set(key, cart);
  return cart;
};

export const clearCartForUser = (userId = "guest") => {
  const key = userId || "guest";
  cartStore.delete(key);
  return { success: true };
};
