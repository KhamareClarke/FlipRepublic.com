import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { PageLayout } from "@/components/layout/page-layout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "FlipRepublic - The Private Market for Elite Resale",
  description:
    "Curated luxury marketplace for authenticated trainers, streetwear, and high-end fashion. Invitation-only sellers, verified items, white glove service.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <PageLayout>
          <Navigation />
          <main className="min-h-screen pt-16 flex-1">{children}</main>
          <Footer />
        </PageLayout>
      </body>
    </html>
  );
}
