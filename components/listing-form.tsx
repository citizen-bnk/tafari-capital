"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Listing } from "@/lib/types";
import { ErrorBox } from "@/components/ui";
export function ListingForm({
  listing,
  onSaved,
}: {
  listing?: Listing;
  onSaved?: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="panel form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const f = Object.fromEntries(new FormData(e.currentTarget));
        const data = {
          ...f,
          asking_price: f.asking_price ? Number(f.asking_price) : null,
          area_hectares: f.area_hectares ? Number(f.area_hectares) : null,
        };
        try {
          if (listing) {
            await api("asset/" + listing.id, { ...data, action: "update" });
            onSaved?.();
          } else {
            const r = await api<{ id: string }>("listings", data);
            router.push("/dashboard/listings/" + r.id);
          }
        } catch (x) {
          setError((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="full">
        <p className="eyebrow">Asset details</p>
        <h3>{listing ? "Edit the opportunity" : "Start with the facts."}</h3>
        <p className="muted">
          Keep confidential details in supporting documents. Approved
          descriptions become public.
        </p>
      </div>
      <label className="full">
        Listing title
        <input
          name="title"
          defaultValue={listing?.title}
          required
          minLength={8}
          maxLength={160}
          placeholder="e.g. Chrome mining asset in Limpopo"
        />
      </label>
      <label>
        Commodity
        <select name="commodity" defaultValue={listing?.commodity || "Coal"}>
          {["Coal", "Chrome", "Diamonds", "Gold", "Iron ore", "Other"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
      </label>
      <label>
        Transaction type
        <select
          name="transaction_type"
          defaultValue={listing?.transaction_type || "Full sale"}
        >
          {["Full sale", "Partial stake", "Joint venture", "Offtake"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
      </label>
      <label>
        Country
        <select name="country" defaultValue={listing?.country || "Lesotho"}>
          <option>Lesotho</option>
          <option>South Africa</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        Location
        <input
          name="location"
          defaultValue={listing?.location}
          minLength={2}
          maxLength={160}
          required
          placeholder="District, province or region"
        />
      </label>
      <label>
        Asking price (optional)
        <input
          type="number"
          name="asking_price"
          defaultValue={listing?.asking_price || ""}
          min="1"
          step="0.01"
          placeholder="Leave blank for price on enquiry"
        />
      </label>
      <label>
        Currency
        <select name="currency" defaultValue={listing?.currency || "USD"}>
          <option>USD</option>
          <option>ZAR</option>
          <option>LSL</option>
        </select>
      </label>
      <label>
        Area in hectares (optional)
        <input
          type="number"
          name="area_hectares"
          defaultValue={listing?.area_hectares || ""}
          min="0.01"
          step="0.01"
        />
      </label>
      <label>
        Right / title reference (private)
        <input
          name="right_reference"
          defaultValue={listing?.right_reference}
          maxLength={200}
        />
      </label>
      <label className="full">
        Public asset description
        <textarea
          name="description"
          defaultValue={listing?.description}
          required
          minLength={50}
          maxLength={8000}
          rows={7}
          placeholder="Describe the asset, stage of development, commercial opportunity and available evidence. Do not include confidential data."
        />
      </label>
      <div className="full">
        <ErrorBox message={error} />
        <button className="btn dark" disabled={busy}>
          {busy ? "Saving…" : listing ? "Save changes" : "Create draft →"}
        </button>
      </div>
    </form>
  );
}
