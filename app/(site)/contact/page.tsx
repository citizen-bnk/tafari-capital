import { PageIntro } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
export const metadata = { title: "Contact Tafari" };
export default function Contact() {
  return (
    <div className="wrap section">
      <PageIntro
        eyebrow="Start a conversation"
        title="A good deal begins with a clear brief."
      >
        Tell us what you hold or what you are looking for.
      </PageIntro>
      <div className="split contact-grid">
        <div className="prose">
          <h3>The Tafari deal desk</h3>
          <p>
            <a href="mailto:phafanep@gmail.com">phafanep@gmail.com</a>
            <br />
            <a href="tel:+27728151383">+27 72 815 1383</a>
          </p>
          <h3>Postal address</h3>
          <p>
            PO Box 7961
            <br />
            Khubetsoana, Maseru 100
            <br />
            Kingdom of Lesotho
          </p>
          <div className="notice">
            Already have an account? Use your workspace to submit listings,
            manage offers and keep documents in one place.
          </div>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
