import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  Pickaxe,
  Truck,
  Handshake,
  ArrowRight,
} from "lucide-react";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow light">An African trade & investment house</p>
            <h1>
              Value in the land.
              <br />
              <em>Legacy in the making.</em>
            </h1>
            <p>
              Distributing food staples and consumer goods across Lesotho,
              connecting mineral asset owners with serious buyers, and carrying
              opportunities from first conversation to delivery.
            </p>
            <div className="actions">
              <Link className="btn gold" href="/exchange">
                Explore the Exchange <ArrowUpRight size={18} />
              </Link>
              <Link
                className="btn outline-light"
                href="/submit-asset"
              >
                List your asset
              </Link>
            </div>
            <div className="hero-foot">
              <span>LESOTHO & SOUTH AFRICA</span>
              <span>VERIFICATION FIRST</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="seal-orbit" />
            <img
              src="/assets/seal.png"
              alt="Tafari Capital — Generational Sovereignty"
            />
            <div className="visual-caption">
              <span>01 / OUR PURPOSE</span>
              <p>
                Africa’s assets.
                <br />
                Lasting African wealth.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="section wrap split">
        <div>
          <p className="eyebrow">FMCG & distribution</p>
          <h2>
            From supplier to shelf.
            <br />
            Across Lesotho.
          </h2>
        </div>
        <div>
          <p className="lede">
            Canned fish, rice, maize meal, sorghum and pantry staples for
            retailers, wholesalers and institutions.
          </p>
          <p className="body-copy">
            Tafari sources, imports, clears, stores and distributes consumer
            goods, and manages Lesotho market entry for manufacturers and brand
            owners.
          </p>
          <Link className="text-link" href="/distribution">
            Our products & distribution <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <div className="principle-strip">
        <div className="wrap">
          <span>
            <ShieldCheck size={18} /> Rights & mandate review
          </span>
          <span>
            <Handshake size={18} /> Qualified introductions
          </span>
          <span>
            <Pickaxe size={18} /> Mining & commodities
          </span>
          <span>
            <Truck size={18} /> Operations to export
          </span>
        </div>
      </div>
      <section className="section wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Our focus</p>
            <h2>
              Opportunity deserves
              <br />a solid foundation.
            </h2>
          </div>
          <p className="lede">
            We bring the discipline of a deal desk to markets where trust, title
            and execution decide the outcome.
          </p>
        </div>
        <div className="service-grid">
          {[
            [
              Pickaxe,
              "01",
              "Mining asset facilitation",
              "Sell an asset, bring in a partner or explore an offtake agreement. We help put the right people around a credible opportunity.",
            ],
            [
              ShieldCheck,
              "02",
              "Tafari Minerals Exchange",
              "One place to list assets, submit supporting documents, receive offers and work through the transaction.",
            ],
            [
              Truck,
              "03",
              "Operations & logistics",
              "Connect with equipment, contract mining, processing and logistics partners who can deliver.",
            ],
          ].map(([Icon, n, title, body]) => {
            const I = Icon as typeof Pickaxe;
            return (
              <article className="service-card" key={String(n)}>
                <div className="service-top">
                  <I size={30} strokeWidth={1.3} />
                  <span>{String(n)}</span>
                </div>
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
                <Link href="/services">
                  Discover our approach <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>
      <section className="exchange-feature">
        <div className="wrap split">
          <div>
            <p className="eyebrow light">The Tafari Minerals Exchange</p>
            <h2>
              A clear path from
              <br />
              asset to agreement.
            </h2>
            <p className="lede">
              For owners ready to move forward. For buyers who want the facts
              before the commitment.
            </p>
            <Link className="btn gold" href="/exchange">
              Find an opportunity <ArrowUpRight size={18} />
            </Link>
          </div>
          <ol className="flow-list">
            {[
              [
                "01",
                "List & document",
                "Register your asset and supply title and mandate evidence.",
              ],
              [
                "02",
                "Review & publish",
                "Tafari reviews the submission before it enters the marketplace.",
              ],
              [
                "03",
                "Offer & negotiate",
                "Qualified participants make offers and discuss terms in a private deal room.",
              ],
              [
                "04",
                "Diligence & close",
                "Tafari coordinates agreements, approvals and the closing process.",
              ],
            ].map(([n, t, b]) => (
              <li key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="section wrap split">
        <div>
          <p className="eyebrow">Built on a principle</p>
          <h2>
            Generational
            <br />
            Sovereignty.
          </h2>
        </div>
        <div>
          <p className="lede">
            The value in Africa’s land and markets should build lasting wealth
            for the people and families who hold it.
          </p>
          <p className="body-copy">
            Basotho-owned and incorporated in the Kingdom of Lesotho, Tafari
            Capital works across borders with care, clear mandates and
            accountable partnerships.
          </p>
          <Link className="text-link" href="/about">
            Meet Tafari Capital <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="cta-band">
        <div className="wrap">
          <div>
            <p className="eyebrow">Your next move</p>
            <h2>
              Bring us an asset.
              <br />
              Or tell us what you’re looking for.
            </h2>
          </div>
          <Link className="btn dark" href="/contact">
            Start a conversation <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
