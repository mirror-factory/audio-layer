import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@opentelemetry/sdk-node",
    "@opentelemetry/api",
    "@opentelemetry/otlp-grpc-exporter-base",
    "@opentelemetry/exporter-trace-otlp-grpc",
    "@opentelemetry/exporter-logs-otlp-grpc",
    "@grpc/grpc-js",
    "@langfuse/otel",
    "langfuse",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const orig = config.externals;
      config.externals = [
        ...(Array.isArray(orig) ? orig : orig ? [orig] : []),
        (ctx: { request: string }, callback: (err: null, result?: string) => void) => {
          if (
            /^@opentelemetry\//.test(ctx.request) ||
            /^@grpc\//.test(ctx.request) ||
            ctx.request === "langfuse" ||
            /^@langfuse\//.test(ctx.request)
          ) {
            return callback(null, `commonjs ${ctx.request}`);
          }
          callback(null);
        },
      ];
    }

    // Stub @opentelemetry/api for Edge runtime so the AI SDK's
    // import doesn't pull in Node.js modules into the middleware bundle.
    if (!isServer || config.name === "edge-server") {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        "@opentelemetry/api": false,
        "@opentelemetry/sdk-node": false,
        "@langfuse/otel": false,
        "langfuse": false,
      };
    }

    return config;
  },
};

export default nextConfig;
