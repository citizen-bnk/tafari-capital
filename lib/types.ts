export type Listing = {
  demo_owner_id?: string;
  id: string;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
  title: string;
  commodity: string;
  country: string;
  location: string;
  description: string;
  transaction_type: string;
  asking_price: string | null;
  currency: string;
  area_hectares: string | null;
  right_reference?: string;
  status: string;
  review_notes?: string;
  created_at: string;
};
export type Offer = {
  id: string;
  listing_id: string;
  buyer_id: string;
  owner_id: string;
  title: string;
  buyer_name: string;
  buyer_email?: string;
  amount: string;
  currency: string;
  message: string;
  status: string;
  stage: string;
  created_at: string;
};
export type Document = {
  id: string;
  listing_id: string;
  owner_id: string;
  title?: string;
  name: string;
  kind: string;
  size: number;
  state: string;
  created_at: string;
};
export type User = {
  logo_url?: string;
  demo?: boolean;
  organization_type?: string;
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  company?: string;
  phone?: string;
  country?: string;
  verified?: boolean;
  created_at?: string;
};
export type Enquiry = {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  status: string;
  created_at: string;
};
export type Audit = {
  id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  created_at: string;
};
export type Message = {
  id: string;
  body: string;
  author_name: string;
  author_role: string;
  created_at: string;
};
export function price(amount: string | null, currency: string) {
  return amount
    ? new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(Number(amount))
    : "Price on enquiry";
}
export function label(value: string) {
  return value.replaceAll("_", " ");
}
export function date(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}
