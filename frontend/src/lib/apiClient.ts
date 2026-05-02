import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "./authStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ApiOptions = RequestInit & {
  token?: string | null;
};

let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = options.token !== undefined ? options.token : getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });

    // Handle 401 Unauthorized errors (except for login and refresh endpoints)
    if (
      response.status === 401 &&
      !path.includes("/auth/refresh") &&
      !path.includes("/auth/login") &&
      !path.includes("/auth/register")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            return apiRequest<T>(path, { ...options, token: newToken as string });
          })
          .catch((err) => {
            throw err;
          });
      }

      isRefreshing = true;
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new ApiError(401, "Session expired");
      }

      try {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshResponse.ok) {
          throw new Error("Refresh failed");
        }

        const body = await refreshResponse.json();
        const data = body.data;

        saveTokens(data);
        processQueue(null, data.accessToken);
        isRefreshing = false;

        return apiRequest<T>(path, { ...options, token: data.accessToken });
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        isRefreshing = false;
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new ApiError(401, "Session expired");
      }
    }

    if (response.status === 204) return undefined as T;

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(response.status, body?.message || "Something went wrong");
    }

    return body.data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, (error as Error).message || "Network error");
  }
}
