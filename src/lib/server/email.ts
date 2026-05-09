import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/env";

export async function sendLoginCodeEmail(to: string, code: string) {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    auth: {
      pass: smtp.pass,
      user: smtp.user,
    },
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
  });

  await transporter.sendMail({
    from: smtp.from,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#050712;color:#fff;padding:32px;border-radius:16px">
        <h1 style="margin:0 0 16px;font-size:24px">Cyclos Hryvnia</h1>
        <p style="margin:0 0 20px;color:#c7d2fe">Use this code to sign in:</p>
        <div style="font-size:32px;letter-spacing:8px;font-weight:700;background:#131a3a;border-radius:12px;padding:18px 22px;display:inline-block">${code}</div>
        <p style="margin:20px 0 0;color:#94a3b8;font-size:14px">The code expires in 10 minutes. If you did not request it, ignore this email.</p>
      </div>
    `,
    subject: "Your Cyclos login code",
    text: `Your Cyclos login code is ${code}. It expires in 10 minutes.`,
    to,
  });
}
