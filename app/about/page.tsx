import { PageIntro } from "@/components/ui";
export const metadata = { title: "About Tafari" };
export default function About() {
  return (
    <div className="wrap section">
      <PageIntro
        eyebrow="About Tafari Capital"
        title="African ownership. A lasting outlook."
      >
        A Basotho-owned investment and facilitation house working across Lesotho
        and South Africa.
      </PageIntro>
      <div className="split">
        <div className="about-seal">
          <img src="/assets/seal.png" alt="Generational Sovereignty seal" />
        </div>
        <div className="prose">
          <h2>Generational Sovereignty</h2>
          <p>
            Tafari Capital (Pty) Ltd was incorporated in the Kingdom of Lesotho
            on 3 November 2021. Our work connects owners of mineral and
            commodity assets with buyers, operating partners and commercial
            opportunities.
          </p>
          <p>
            Our name and seal carry a simple idea: the value in Africa’s assets
            should create durable wealth for the people and families who hold
            them.
          </p>
          <h3>Founder & Director</h3>
          <p>
            Pule Meshark Phafane brings more than 20 years of experience in
            operations, administration and technology across South Africa,
            Lesotho and Singapore, including banking systems and cooperative
            finance platforms.
          </p>
          <dl className="facts-table">
            <dt>Company number</dt>
            <dd>78585 (Lesotho)</dd>
            <dt>Business registration</dt>
            <dd>A2023/9908</dd>
            <dt>Registered office</dt>
            <dd>Khubetsoana, Maseru 100, Lesotho</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
