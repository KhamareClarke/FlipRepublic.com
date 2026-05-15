import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const to = process.argv[2] ?? "fizasaif0233@gmail.com";
const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT ?? "465");
const user = (process.env.SMTP_USER ?? process.env.EMAIL_USER ?? "").trim();
const pass = (process.env.SMTP_PASS ?? process.env.EMAIL_PASS ?? "").trim();
let from = (process.env.SMTP_FROM ?? process.env.EMAIL_FROM ?? "").trim();
if (!from && user) from = `"FlipRepublic" <${user}>`;

if (!user || !pass || !from) {
  console.error(
    "Missing mail credentials: set SMTP_USER + SMTP_PASS (or EMAIL_USER + EMAIL_PASS) in .env.local, and optionally SMTP_FROM."
  );
  process.exit(1);
}

const site =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://fliprepublic.com";

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

await transporter.sendMail({
  from,
  to,
  subject: "FlipRepublic SMTP test",
  text: `If you received this, Gmail SMTP from ${site} is working.`,
  html: `<p>If you received this, Gmail SMTP is working.</p><p><a href="${site}">${site}</a></p>`,
});

console.log("Sent test email to", to);
