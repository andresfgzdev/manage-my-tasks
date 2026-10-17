"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CategoryProvider } from "@/context/CategoryProvider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export const ReactQueryClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000 * 60,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <CategoryProvider>{children}</CategoryProvider>
    </QueryClientProvider>
  );
};
