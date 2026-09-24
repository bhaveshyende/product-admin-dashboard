import axios from "axios";

export type Review = {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
};

export type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage?: number;
  rating: number;
  stock: number;
  tags?: string[];
  brand?: string;
  sku?: string;
  weight?: number;
  dimensions?: { width: number; height: number; depth: number };
  warrantyInformation?: string;
  shippingInformation?: string;
  availabilityStatus?: string;
  reviews?: Review[];
  returnPolicy?: string;
  minimumOrderQuantity?: number;
  images: string[];
  thumbnail: string;
};

type ProductsResponse = {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
};

type LoginResponse = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  image: string;
  accessToken: string;
  refreshToken?: string;
};

export const api = axios.create({
  baseURL: "https://dummyjson.com",
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("pa_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const message = error.response?.data?.message || error.message || "Something went wrong";
    return Promise.reject(new Error(message));
  },
);

export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await api.post<LoginResponse>("/auth/login", {
      username,
      password,
      expiresInMins: 60,
    });
    return data;
  },
};

export type ProductQuery = {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  signal?: AbortSignal;
};

export const productApi = {
  list: async ({ page, limit, search, category, sortBy, order, signal }: ProductQuery) => {
    const endpoint = search
      ? "/products/search"
      : category
        ? `/products/category/${encodeURIComponent(category)}`
        : "/products";
    const { data } = await api.get<ProductsResponse>(endpoint, {
      params: {
        limit,
        skip: (page - 1) * limit,
        ...(search ? { q: search } : {}),
        ...(sortBy ? { sortBy, order } : {}),
      },
      signal,
    });
    return data;
  },
  get: async (id: number, signal?: AbortSignal) => {
    const { data } = await api.get<Product>(`/products/${id}`, { signal });
    return data;
  },
  categories: async (signal?: AbortSignal) => {
    const { data } = await api.get<string[]>("/products/category-list", { signal });
    return data;
  },
  create: async (payload: Partial<Product>) => {
    const { data } = await api.post<Product>("/products/add", payload);
    return data;
  },
  update: async (id: number, payload: Partial<Product>) => {
    const { data } = await api.put<Product>(`/products/${id}`, payload);
    return data;
  },
  remove: async (id: number) => {
    const { data } = await api.delete<Product>(`/products/${id}`);
    return data;
  },
};

export type LocalProductState = {
  created: Product[];
  updated: Record<string, Product>;
  deleted: number[];
};

const LOCAL_KEY = "pa_local_products";

export const emptyLocalProductState = (): LocalProductState => ({
  created: [],
  updated: {},
  deleted: [],
});

export function readLocalProductState(): LocalProductState {
  try {
    const stored = window.localStorage.getItem(LOCAL_KEY);
    if (!stored) return emptyLocalProductState();
    const parsed = JSON.parse(stored) as Partial<LocalProductState>;
    return {
      created: Array.isArray(parsed.created) ? parsed.created : [],
      updated: parsed.updated && typeof parsed.updated === "object" ? parsed.updated : {},
      deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
    };
  } catch {
    return emptyLocalProductState();
  }
}

export function writeLocalProductState(state: LocalProductState) {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
}

export function mergeLocalProducts(products: Product[], state: LocalProductState, includeCreated = false) {
  const deleted = new Set(state.deleted);
  const merged = products
    .filter((product) => !deleted.has(product.id))
    .map((product) => state.updated[String(product.id)] || product);
  if (!includeCreated) return merged;
  return [...state.created.filter((product) => !deleted.has(product.id)), ...merged];
}

export function findLocalProduct(id: number, state: LocalProductState) {
  if (state.deleted.includes(id)) return null;
  return state.updated[String(id)] || state.created.find((product) => product.id === id) || null;
}

export function saveCreatedProduct(product: Product, state: LocalProductState): LocalProductState {
  const next = {
    ...state,
    created: [product, ...state.created.filter((item) => item.id !== product.id)],
    deleted: state.deleted.filter((id) => id !== product.id),
  };
  writeLocalProductState(next);
  return next;
}

export function saveUpdatedProduct(product: Product, state: LocalProductState): LocalProductState {
  const next = {
    ...state,
    updated: { ...state.updated, [String(product.id)]: product },
    created: state.created.map((item) => (item.id === product.id ? product : item)),
  };
  writeLocalProductState(next);
  return next;
}

export function saveDeletedProduct(id: number, state: LocalProductState): LocalProductState {
  const next = {
    ...state,
    deleted: Array.from(new Set([...state.deleted, id])),
    created: state.created.filter((item) => item.id !== id),
  };
  writeLocalProductState(next);
  return next;
}

export function formatApiError(error: unknown) {
  if (axios.isCancel(error)) return "Request cancelled";
  return error instanceof Error ? error.message : "Unable to complete this request";
}
