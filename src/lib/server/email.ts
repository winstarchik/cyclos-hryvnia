import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/env";
import type { OtpPurpose } from "@/lib/server/otp";

function createTransporter() {
  const smtp = getSmtpConfig();

  return nodemailer.createTransport({
    auth: {
      pass: smtp.pass,
      user: smtp.user,
    },
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
  });
}

function emailShell(content: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#050712;color:#fff;padding:32px;border-radius:16px">
      <h1 style="margin:0 0 16px;font-size:24px">Cyclos Hryvnia</h1>
      ${content}
    </div>
  `;
}

export async function sendAuthCodeEmail(
  to: string,
  code: string,
  purpose: OtpPurpose,
) {
  const smtp = getSmtpConfig();
  const title =
    purpose === "register"
      ? "Confirm your Cyclos account"
      : "Confirm your Cyclos sign in";

  await createTransporter().sendMail({
    from: smtp.from,
    html: emailShell(`
      <p style="margin:0 0 20px;color:#c7d2fe">${title}. Enter this code in the app:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:700;background:#131a3a;border-radius:12px;padding:18px 22px;display:inline-block">${code}</div>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:14px">The code expires in 10 minutes. If you did not request it, ignore this email.</p>
    `),
    subject: title,
    text: `${title}. Your Cyclos code is ${code}. It expires in 10 minutes.`,
    to,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const smtp = getSmtpConfig();

  await createTransporter().sendMail({
    from: smtp.from,
    html: emailShell(`
      <p style="margin:0 0 20px;color:#c7d2fe">Use the secure link below to set a new password for your Cyclos account.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#0099ff;color:#fff;text-decoration:none;font-weight:700;border-radius:12px;padding:14px 20px">Reset password</a>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:14px">The link expires in 30 minutes. If you did not request it, ignore this email.</p>
    `),
    subject: "Reset your Cyclos password",
    text: `Reset your Cyclos password: ${resetUrl}\n\nThe link expires in 30 minutes.`,
    to,
  });
}

export async function sendAdminCodeEmail(to: string, code: string) {
  const smtp = getSmtpConfig();
  const title = "Confirm Cyclos admin access";

  await createTransporter().sendMail({
    from: smtp.from,
    html: emailShell(`
      <p style="margin:0 0 20px;color:#c7d2fe">Someone is trying to open the Cyclos admin panel. Enter this code to continue:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:700;background:#131a3a;border-radius:12px;padding:18px 22px;display:inline-block">${code}</div>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:14px">The code expires in 10 minutes. If this was not you, rotate ADMIN_API_SECRET immediately.</p>
    `),
    subject: title,
    text: `${title}. Your Cyclos admin code is ${code}. It expires in 10 minutes.`,
    to,
  });
}
