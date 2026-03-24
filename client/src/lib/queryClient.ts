import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

// Global token storage - updated by AuthContext
let globalIdToken: string | null = null;

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}

export function setGlobalIdToken(token: string | null) {
  console.log("[QUERY] Setting global token:", token ? `${token.substring(0, 20)}...` : "null");
  globalIdToken = token;
}

async function refreshIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken(true);
  setGlobalIdToken(token);
  return token;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {};
  
  console.log("[QUERY] Getting auth headers...");
  console.log("[QUERY] globalIdToken:", globalIdToken ? "EXISTS" : "NULL");
  
  if (globalIdToken) {
    console.log("[QUERY] ✅ Using token from AuthContext");
    headers["Authorization"] = `Bearer ${globalIdToken}`;
  } else if (auth.currentUser) {
    console.warn("[QUERY] ⚠️ No global token, reading from Firebase user...");
    try {
      const token = await auth.currentUser.getIdToken();
      setGlobalIdToken(token);
      headers["Authorization"] = `Bearer ${token}`;
    } catch (error) {
      console.error("[QUERY] ❌ Failed to read token from Firebase user:", error);
    }
  } else {
    console.error("[QUERY] ❌ NO TOKEN AVAILABLE - User not authenticated!");
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const resolvedUrl = resolveApiUrl(url);
  console.log(`[API REQUEST] ${method} ${resolvedUrl}`);
  const authHeaders = await getAuthHeaders();
  console.log("[API REQUEST] Headers:", Object.keys(authHeaders));
  
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const headers: HeadersInit = {
    ...authHeaders,
    ...(!isFormData && data ? { "Content-Type": "application/json" } : {}),
  };

  const body = data
    ? (isFormData ? (data as FormData) : JSON.stringify(data))
    : undefined;

  const res = await fetch(resolvedUrl, {
    method,
    headers,
    body,
    credentials: "include",
  });

  console.log(`[API REQUEST] Response status:`, res.status);

  if (res.status === 401) {
    const text = (await res.text()) || res.statusText;
    console.warn("[API REQUEST] 401 received, attempting token refresh...");

    try {
      const refreshed = await refreshIdToken();
      if (refreshed) {
        const retryHeaders: HeadersInit = {
          ...headers,
          Authorization: `Bearer ${refreshed}`,
        };

        const retry = await fetch(resolvedUrl, {
          method,
          headers: retryHeaders,
          body,
          credentials: "include",
        });

        console.log(`[API REQUEST] Retry status:`, retry.status);
        await throwIfResNotOk(retry);
        return retry;
      }
    } catch (error) {
      console.error("[API REQUEST] Token refresh failed:", error);
    }

    throw new Error(`${res.status}: ${text}`);
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();
    
    const rawUrl = queryKey.join("/") as string;
    const resolvedUrl = resolveApiUrl(rawUrl);

    const res = await fetch(resolvedUrl, {
      headers: authHeaders,
      credentials: "include",
    });

    if (res.status === 401) {
      const text = (await res.text()) || res.statusText;
      console.warn("[QUERY] 401 received, attempting token refresh...");

      try {
        const refreshed = await refreshIdToken();
        if (refreshed) {
          const retry = await fetch(resolvedUrl, {
            headers: { ...authHeaders, Authorization: `Bearer ${refreshed}` },
            credentials: "include",
          });

          if (unauthorizedBehavior === "returnNull" && retry.status === 401) {
            return null;
          }

          await throwIfResNotOk(retry);
          return await retry.json();
        }
      } catch (error) {
        console.error("[QUERY] Token refresh failed:", error);
      }

      if (unauthorizedBehavior === "returnNull") {
        return null;
      }

      throw new Error(`${res.status}: ${text}`);
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos (não mais infinito)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

