import million from "million/compiler";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: [
    "@opentelemetry/sdk-node",
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
            /^@opentelemetry\/(?!api)/.test(ctx.request) ||
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
    return config;
  },
};

export default million.next(nextConfig as Parameters<typeof million.next>[0], {
  auto: true,
  telemetry: false,
});
