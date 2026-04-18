"use client";
import { useEffect } from "react";

export function CapacitorInit() {
  useEffect(() => {
    import("@/lib/capacitor-init").then(m => m.initCapacitor());
  }, []);
  return null;
}
