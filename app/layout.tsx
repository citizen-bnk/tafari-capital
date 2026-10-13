import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://tafari-capital.vercel.app"),
  title: {
    default: "Tafari Capital | Generational Sovereignty",
    template: "%s | Tafari Capital",
  },
  description:
    "FMCG distribution in Lesotho, mining assets and managed transactions across Lesotho and South Africa.",
  icons: { icon: "/assets/favicon.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
