/**
 * Email templates — plain HTML strings.
 *
 * These are simple, monospace-styled emails matching the app's aesthetic.
 * Can be migrated to React Email later for richer templates.
 */

import { APP_NAME } from "./client";

const STYLES = `
  body { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace; background: #0a0a0a; color: #f5f5f5; padding: 32px; }
  .container { max-width: 480px; margin: 0 auto; }
  .header { font-size: 14px; color: #737373; margin-bottom: 24px; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 16px 0; }
  p { font-size: 14px; line-height: 1.6; color: #a3a3a3; margin: 0 0 16px 0; }
  .btn { display: inline-block; padding: 12px 24px; background: #14b8a6; color: #0a0a0a; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
  .footer { margin-top: 32px; font-size: 11px; color: #525252; }
  .code { font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #f5f5f5; margin: 16px 0; }
`;

function wrap(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${STYLES}</style></head><body><div class="container">${content}</div></body></html>`;
}

/** Magic link email for Supabase auth. */
export function magicLinkEmail(params: {
  confirmUrl: string;
  email: string;
}): { subject: string; html: string } {
  return {
    subject: `Sign in to ${APP_NAME}`,
    html: wrap(`
      <div class="header">${APP_NAME}</div>
      <h1>Sign in to your account</h1>
      <p>Click the button below to sign in to ${APP_NAME}. This link expires in 24 hours.</p>
      <p><a href="${params.confirmUrl}" class="btn">Sign in</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <div class="footer">
        This email was sent to ${params.email}.<br>
        ${APP_NAME} by Mirror Factory
      </div>
    `),
  };
}

/** OTP code email for Supabase auth. */
export function otpEmail(params: {
  token: string;
  email: string;
}): { subject: string; html: string } {
  return {
    subject: `Your ${APP_NAME} verification code`,
    html: wrap(`
      <div class="header">${APP_NAME}</div>
      <h1>Verification code</h1>
      <p>Enter this code to verify your email:</p>
      <div class="code">${params.token}</div>
      <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      <div class="footer">
        This email was sent to ${params.email}.<br>
        ${APP_NAME} by Mirror Factory
      </div>
    `),
  };
}

/** Welcome email after first sign-in. */
export function welcomeEmail(_params: {
  email: string;
}): { subject: string; html: string } {
  return {
    subject: `Welcome to ${APP_NAME}`,
    html: wrap(`
      <div class="header">${APP_NAME}</div>
      <h1>Welcome to ${APP_NAME}</h1>
      <p>Your account is set up. Here's what you can do:</p>
      <p>
        <strong>Record meetings</strong> — Upload audio or use live transcription with speaker diarization.<br><br>
        <strong>AI summaries</strong> — Every recording gets a structured summary with key points, action items, and decisions.<br><br>
        <strong>Intake extraction</strong> — Automatically pull budget, timeline, decision makers, and requirements from calls.<br><br>
        <strong>Export</strong> — Download as PDF or Markdown.
      </p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://layer-1-audio.vercel.app"}/record" class="btn">Start recording</a></p>
      <div class="footer">
        You're on the free plan (25 meetings).<br>
        ${APP_NAME} by Mirror Factory
      </div>
    `),
  };
}

/** Meeting ready notification. */
export function meetingReadyEmail(params: {
  email: string;
  meetingTitle: string;
  meetingId: string;
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://layer-1-audio.vercel.app";
  return {
    subject: `Meeting ready: ${params.meetingTitle}`,
    html: wrap(`
      <div class="header">${APP_NAME}</div>
      <h1>${params.meetingTitle}</h1>
      <p>Your meeting transcript and summary are ready to review.</p>
      <p><a href="${appUrl}/meetings/${params.meetingId}" class="btn">View meeting</a></p>
      <div class="footer">
        This email was sent to ${params.email}.<br>
        ${APP_NAME} by Mirror Factory
      </div>
    `),
  };
}
