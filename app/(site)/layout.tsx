import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DemoBanner } from "@/components/demo-banner";
import { QuickMenu } from "@/components/quick-menu";
import { services } from "@/lib/site-content";
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
      <QuickMenu
        services={services.map(({ slug, title }) => ({ slug, title }))}
      />
    </>
  );
}
