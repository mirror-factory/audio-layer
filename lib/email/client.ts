/**
 * Resend email client singleton.
 * Returns null when RESEND_API_KEY is missing.
 */

import { Resend } from "resend";

let instance: Resend | null = null;

export function getResend(): Resend | null {
  if (instance) return instance;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  instance = new Resend(apiKey);
  return instance;
}

export const FROM_EMAIL = "Layers <onboarding@resend.dev>";
export const APP_NAME = "Layers";
