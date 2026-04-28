import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { apiRouteContracts, type HttpMethod } from "./api/route-contracts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ROUTE_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function listRouteFiles(dir = resolve(ROOT, "app/api")): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const abs = resolve(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) return listRouteFiles(abs);
    if (entry === "route.ts") return [relative(ROOT, abs)];
    return [];
  });
}

function routePathFromFile(file: string): string {
  return `/${file.replace(/\/route\.ts$/, "").replace(/^app\//, "")}`;
}

function exportedMethods(source: string): HttpMethod[] {
  const methods = new Set<HttpMethod>();
  const directExport = /export\s+(?:const|async\s+function|function)\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
  const aliasExport = /export\s*\{([^}]+)\}/g;

  for (const match of source.matchAll(directExport)) {
    methods.add(match[1] as HttpMethod);
  }

  for (const match of source.matchAll(aliasExport)) {
    const exportsList = match[1] ?? "";
    for (const method of ROUTE_METHODS) {
      if (new RegExp(`\\bas\\s+${method}\\b`).test(exportsList)) {
        methods.add(method);
      }
    }
  }

  return [...methods].sort();
}

describe("API route contracts", () => {
  it("has exactly one contract for every app/api route file", () => {
    const files = listRouteFiles().sort();
    const contractFiles = apiRouteContracts.map((contract) => contract.file).sort();

    expect(contractFiles).toEqual(files);
    expect(new Set(contractFiles).size).toBe(contractFiles.length);
  });

  it("keeps contract route paths in sync with route file paths", () => {
    for (const contract of apiRouteContracts) {
      expect(contract.route).toBe(routePathFromFile(contract.file));
      expect(contract.smokePath.startsWith("/api/")).toBe(true);
      expect(contract.defaultExpectStatuses.length).toBeGreaterThan(0);
    }
  });

  it("keeps declared methods in sync with exported handlers", () => {
    for (const contract of apiRouteContracts) {
      const source = readFileSync(resolve(ROOT, contract.file), "utf8");
      expect(exportedMethods(source), contract.file).toEqual([...contract.methods].sort());
    }
  });

  it("marks request-id routes only when they use the shared route wrapper", () => {
    for (const contract of apiRouteContracts) {
      if (!contract.requiresRequestId) continue;

      const source = readFileSync(resolve(ROOT, contract.file), "utf8");
      expect(source, `${contract.file} is marked requiresRequestId but does not use withRoute`).toContain("withRoute(");
    }
  });
});

