import nodemailer from "nodemailer";

type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML body (same copy as text when generated from templates). */
  html?: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = (process.env.SMTP_USER ?? process.env.EMAIL_USER ?? "").trim();
  const pass = (process.env.SMTP_PASS ?? process.env.EMAIL_PASS ?? "").trim();
  let from = (process.env.SMTP_FROM ?? process.env.EMAIL_FROM ?? "").trim();
  if (!from && user) {
    from = `"FlipRepublic" <${user}>`;
  }

  return { host, port, user, pass, from };
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  const { host, port, user, pass, from } = getSmtpConfig();

  if (!user || !pass || !from) {
    console.warn("SMTP is not configured. Skipping email.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });

  return true;
}
