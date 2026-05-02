import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { ToastContainer } from "react-toastify";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disables the automatic 3 retries on failure
      refetchOnWindowFocus: false, // Prevents refetching when switching tabs
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer position="bottom-right" theme="colored" />
    </QueryClientProvider>
  );
}
