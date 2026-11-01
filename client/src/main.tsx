import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const trpcClient = trpc.createClient({
  links: [httpBatchLink({
    url: `${apiBaseUrl}/api/trpc`,
    transformer: superjson,
    async headers() {
      if (!window.location.pathname.startsWith("/admin")) return {};
      const { getBrowserSupabase } = await import("@/lib/supabase");
      const client = getBrowserSupabase();
      if (!client) return {};
      const { data } = await client.auth.getSession();
      return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
    fetch(input, init) {
      return globalThis.fetch(input, { ...(init ?? {}), credentials: "omit" });
    },
  })],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
  </trpc.Provider>,
);
