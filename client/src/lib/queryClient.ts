import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global token storage - updated by AuthContext
let globalIdToken: string | null = null;

export function setGlobalIdToken(token: string | null) {
  console.log("[QUERY] Setting global token:", token ? `${token.substring(0, 20)}...` : "null");
  globalIdToken = token;
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
  console.log(`[API REQUEST] ${method} ${url}`);
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

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  console.log(`[API REQUEST] Response status:`, res.status);
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
    
    const res = await fetch(queryKey.join("/") as string, {
      headers: authHeaders,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
