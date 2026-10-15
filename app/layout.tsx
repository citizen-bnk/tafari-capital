import type { Metadata } from "next";
import { AppSessionProvider } from "@/components/app-session";
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
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
