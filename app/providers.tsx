"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

export default function Providers({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error): boolean => {
              // Don't retry on 4xx errors except 408 (timeout)
              if (error instanceof Error && "status" in error) {
                const errorWithStatus = error as Error & { status: unknown };
                const status = errorWithStatus.status;
                if (
                  typeof status === "number" &&
                  status >= 400 &&
                  status < 500 &&
                  status !== 408
                ) {
                  return false;
                }
              }
              // Retry up to 3 attempts for other errors
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}