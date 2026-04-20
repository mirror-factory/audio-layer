export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { withExternalCall } from "@/lib/with-external";
import { getResend, FROM_EMAIL } from "@/lib/email/client";
import { magicLinkEmail, otpEmail } from "@/lib/email/templates";

interface AuthHookPayload {
  user: {
    email: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

export const POST = withRoute(async (req, ctx) => {
  const payload = (await req.json()) as AuthHookPayload;
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? email_data.site_url;
      const link = `${appUrl}/sign-in?token_hash=${email_data.token_hash}&type=magiclink`;
      const template = magicLinkEmail(link);
      subject = template.subject;
      html = template.html;
      break;
    }

    case "signup":
    case "email": {
      const template = otpEmail(email_data.token);
      subject = template.subject;
      html = template.html;
      break;
    }

    case "recovery": {
      const appUrlR = process.env.NEXT_PUBLIC_APP_URL ?? email_data.site_url;
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
