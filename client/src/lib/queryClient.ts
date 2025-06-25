import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Construct URL properly for array query keys like ['/api/templates/by-type', 'soap']
    let url: string;
    if (Array.isArray(queryKey) && queryKey.length > 1) {
      const baseUrl = queryKey[0] as string;
      const pathParams = queryKey.slice(1);
      url = `${baseUrl}/${pathParams.join('/')}`;
    } else {
      url = queryKey[0] as string;
    }

    console.log('🔍 [QueryClient] Fetching URL:', url);
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('❌ [QueryClient] Unauthorized for:', url);
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log('✅ [QueryClient] Success for:', url, 'Data length:', Array.isArray(data) ? data.length : 'object');
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
