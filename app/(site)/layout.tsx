import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DemoBanner } from "@/components/demo-banner";
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <DemoBanner />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
