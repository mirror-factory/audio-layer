#!/usr/bin/env node

import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3000";
const baseUrl = process.env.TEST_BASE_URL ?? `http://127.0.0.1:${port}`;

const smokeEnv = {
  TEST_BASE_URL: baseUrl,
  NEXT_PUBLIC_APP_URL: baseUrl,
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  ASSEMBLYAI_API_KEY: "",
  OPENAI_API_KEY: "",
  AI_GATEWAY_API_KEY: "",
  ANTHROPIC_API_KEY: "",
  GOOGLE_GENERATIVE_AI_API_KEY: "",
  RESEND_API_KEY: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
  VERCEL_OIDC_TOKEN: "",
  VERCEL_TOOLBAR: "0",
  LANGFUSE_PUBLIC_KEY: "",
  LANGFUSE_SECRET_KEY: "",
  DEV_KIT_DASHBOARD_SECRET: "",
  EMBEDDINGS_BACKFILL_SECRET: "",
};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...options.env },
      shell: false,
    });
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? code}`));
    });
  });
}

function start(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...options.env },
    shell: false,
  });
}

async function waitForHealth(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.status < 500) return;
      lastError = new Error(`health returned ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError ?? new Error("timed out waiting for /api/health");
}

let server = null;

try {
  await run("pnpm", ["build"], { env: smokeEnv });
  server = start("pnpm", ["start"], { env: { ...smokeEnv, PORT: port } });
  await waitForHealth();
  await run("pnpm", ["exec", "vitest", "--config", "vitest.api.config.ts", "run"], {
    env: smokeEnv,
  });
} finally {
  if (server && !server.killed) {
    server.kill("SIGTERM");
  }
}
