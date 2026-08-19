// Server-only Gmail SMTP sender using nodemailer
import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("Gmail credentials not configured");
  cachedTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return cachedTransporter;
}

export async function sendOtpEmail(to: string, otp: string, agreementType: string, customerName: string) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER!;
  const label = agreementType.toUpperCase();
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;background:#f4f6fb;padding:28px;border-radius:14px;">
      <div style="background:linear-gradient(135deg,#1F3D7A,#2E5AAC);color:#fff;padding:24px 26px;border-radius:12px;">
        <div style="font-size:12px;letter-spacing:3px;opacity:0.85;">NARAINSONS</div>
        <div style="font-size:22px;font-weight:700;margin-top:4px;">Agreement Verification OTP</div>
      </div>
      <div style="background:#fff;padding:26px;border-radius:12px;margin-top:14px;color:#1a1a1a;">
        <p style="margin:0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
        <p style="margin:0 0 16px 0;">Your one-time password for signing the <strong>${label}</strong> agreement is:</p>
        <div style="text-align:center;background:#f0f4ff;border:2px dashed #2E5AAC;border-radius:10px;padding:18px;margin:14px 0;">
          <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#1F3D7A;font-family:Consolas,monospace;">${otp}</div>
        </div>
        <p style="margin:12px 0 6px 0;color:#555;font-size:13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="margin:16px 0 0 0;color:#777;font-size:12px;">If you did not request this, please ignore this email.</p>
      </div>
      <div style="text-align:center;color:#8892a6;font-size:11px;margin-top:14px;letter-spacing:1px;">FUELING AMBITIONS WITH FLEXIBLE FINANCE</div>
    </div>`;
  await transporter.sendMail({
    from: `"Narainsons Finance" <${from}>`,
    to,
    subject: `OTP for ${label} Agreement — Narainsons`,
    html,
    text: `Your OTP for ${label} agreement is: ${otp}. Valid for 10 minutes.`,
  });
}
