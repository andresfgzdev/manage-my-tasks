import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `radix-ui` is one package with every primitive: import only the ones used.
  experimental: { optimizePackageImports: ["radix-ui"] },
};

export default nextConfig;
