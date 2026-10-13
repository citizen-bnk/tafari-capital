import Link from "next/link";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <p className="footer-brand">TAFARI CAPITAL</p>
          <p>
            Investing in Africa.
            <br />
            Building generations.
          </p>
          <small>Maseru · Johannesburg</small>
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/services">Our services</Link>
          <Link href="/distribution">FMCG & distribution</Link>
          <Link href="/exchange">Minerals Exchange</Link>
          <Link href="/about">About Tafari</Link>
        </div>
        <div>
          <h4>Work with us</h4>
          <Link href="/dashboard/listings/new">List an asset</Link>
          <Link href="/auth/sign-up">Create an account</Link>
          <Link href="/back-office">Tafari back office</Link>
        </div>
        <div>
          <h4>Get in touch</h4>
          <a href="mailto:phafanep@gmail.com">phafanep@gmail.com</a>
          <a href="tel:+27728151383">+27 72 815 1383</a>
          <p>
            Khubetsoana, Maseru 100
            <br />
            Kingdom of Lesotho
          </p>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>
          © {new Date().getFullYear()} Tafari Capital (Pty) Ltd · Company No.
          78585
        </span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Platform terms</Link>
        </div>
      </div>
      <p className="wrap legal-note">
        Tafari Capital facilitates introductions and managed transactions. It is
        not a licensed financial services provider or securities exchange. No
        listing constitutes investment advice or an offer of securities.
      </p>
    </footer>
  );
}
