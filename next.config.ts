import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "*": ["./.wwebjs_auth/**/*", "./.wwebjs_cache/**/*"],
  },
};

export default nextConfig;
