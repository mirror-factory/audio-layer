export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRoute } from "@/lib/with-route";
import { withExternalCall } from "@/lib/with-external";
import { getResend, FROM_EMAIL } from "@/lib/email/client";
import { magicLinkEmail, otpEmail } from "@/lib/email/templates";

const AuthHookPayloadSchema = z.object({
  user: z.object({
    email: z.string().email(),
  }),
  email_data: z.object({
    token: z.string().optional(),
    token_hash: z.string().optional(),
    redirect_to: z.string().optional(),
    email_action_type: z.string().min(1),
    site_url: z.string().optional(),
    token_new: z.string().optional(),
    token_hash_new: z.string().optional(),
  }).passthrough(),
});

type AuthHookPayload = z.infer<typeof AuthHookPayloadSchema>;

export const POST = withRoute(async (req, ctx) => {
  let payload: AuthHookPayload;
  try {
    payload = AuthHookPayloadSchema.parse(await req.json());
  } catch (err) {
    const zodErrors = err instanceof z.ZodError ? err.issues : null;
    return NextResponse.json(
      { error: zodErrors ?? "Invalid auth email payload" },
      { status: 400 },
    );
  }

  const { user, email_data } = payload;

  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { error: "Resend is not configured" },
      { status: 503 },
    );
  }

  const emailType = email_data.email_action_type;
  const recipientEmail = user.email;

  let subject: string;
  let html: string;

  switch (emailType) {
    case "magiclink":
    case "login": {
      if (!email_data.token_hash) {
        return NextResponse.json(
          { error: "Missing token_hash for magic link email" },
          { status: 400 },
        );
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? email_data.site_url ?? "http://localhost:3000";
      const link = `${appUrl}/sign-in?token_hash=${email_data.token_hash}&type=magiclink`;
      const template = magicLinkEmail(link);
      subject = template.subject;
      html = template.html;
      break;
    }

    case "signup":
    case "email": {
      if (!email_data.token) {
        return NextResponse.json(
          { error: "Missing token for OTP email" },
          { status: 400 },
        );
      }
      const template = otpEmail(email_data.token);
      subject = template.subject;
      html = template.html;
      break;
    }

    case "recovery": {
      if (!email_data.token_hash) {
        return NextResponse.json(
          { error: "Missing token_hash for recovery email" },
          { status: 400 },
        );
      }
      const appUrlR = process.env.NEXT_PUBLIC_APP_URL ?? email_data.site_url ?? "http://localhost:3000";
      const link = `${appUrlR}/sign-in?token_hash=${email_data.token_hash}&type=recovery`;
      const template = magicLinkEmail(link);
      subject = "Reset your audio-layer password";
      html = template.html;
      break;
    }

    default: {
      return NextResponse.json(
        { error: `Unsupported email type: ${emailType}` },
        { status: 400 },
      );
    }
  }

  await withExternalCall(
    { vendor: "resend", operation: "emails.send", requestId: ctx.requestId },
    () =>
      resend.emails.send({
        from: FROM_EMAIL,
        to: recipientEmail,
        subject,
        html,
      }),
  );

  return NextResponse.json({ success: true });
});
