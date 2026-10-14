export const demoRoles = [
  "member",
  "owner",
  "buyer",
  "partner",
  "staff",
  "super_admin",
] as const;
export type DemoAccount = {
  id: string;
  name: string;
  email: string;
  company: string;
  organizationType: string;
  country: string;
  role: string;
  status: string;
  verified: boolean;
  scenario: string;
};
const types = [
  "Sole proprietor",
  "Partnership",
  "Cooperative",
  "Private company",
  "Regional group",
  "Multinational company",
];
const ownerCompanies = [
  "Mokoena Prospecting",
  "Thaba Stone Works",
  "Lerato Mineral Ventures",
  "Mahlako Exploration",
  "Nala Quarry Services",
  "Kopano Mineral Partners",
  "Berg Ridge Resources",
  "Metsi Valley Aggregates",
  "Maloti Prospectors Cooperative",
  "Sefate Chrome Partners",
  "Khanya Gold Cooperative",
  "Senqu Diamond Cooperative",
  "Mokhotlong Resource Cooperative",
  "Basalt Hills Mining",
  "Blue Kloof Minerals",
  "Cedar Reef Resources",
  "Dawn Basin Metals",
  "East Ridge Collieries",
  "Fynbos Chrome Ventures",
  "Granite Crest Holdings",
  "Highland Mineral Assets",
  "Impala Valley Exploration",
  "Jade Plateau Resources",
  "Karoo Ridge Minerals",
  "Luminous Ore Holdings",
  "Meridian Basin Resources",
  "Northbank Mining Group",
  "Orchard Reef Holdings",
  "Plateau Resource Group",
  "Quartz Bridge Minerals",
  "Riverstone African Resources",
  "Summit Ridge Mining Group",
  "Terra Meridian Africa",
  "Unity Basin Resources",
  "Vantage Ore Group",
  "Westhaven Global Minerals",
  "Xenora International Resources",
  "Yarrow Continental Metals",
  "Zenith Arc Mining",
  "Aurora Atlas Resources",
];
const buyerCompanies = [
  "Mpho Mineral Trading",
  "Palesa Asset Investments",
  "Teboho Ore Trading",
  "Senqu Acquisition Partners",
  "Kloof Commodity Partners",
  "Highveld Buyers Cooperative",
  "Maloti Enterprise Cooperative",
  "Bokamoso Metals",
  "Cobalt Bridge Capital",
  "Delta Forge Minerals",
  "Ember Resource Investments",
  "Falcon Basin Holdings",
  "Greencrest Mining Capital",
  "Horizon African Holdings",
  "Indigo Resource Group",
  "Juniper Continental Mining",
  "Keystone Global Commodities",
  "Latitude Meridian Capital",
  "Mosaic International Metals",
  "Nova Atlas Resources",
];
const ownerScenarios = [
  "Published asset and competing offers",
  "Title evidence missing on draft",
  "Submission awaiting Tafari review",
  "Reviewer requested corrections",
  "Asset withdrawn from publication",
  "Accepted offer: due diligence",
  "Agreements in preparation",
  "Regulatory approvals pending",
  "Closing scheduled",
  "Completed sale and historical records",
  "Cancelled deal, asset relisted",
  "Published offtake opportunity",
];
function organizationType(index: number, total: number) {
  return types[Math.min(5, Math.floor((index * 6) / total))];
}
function participant(
  role: "owner" | "buyer",
  company: string,
  index: number,
  total: number,
): DemoAccount {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `demo-${role}-${number}`,
    name:
      role === "owner"
        ? `${["Mpho", "Lerato", "Thabo", "Palesa", "Naledi"][index % 5]} ${["Mokoena", "Dlamini", "Molefe", "Nkosi", "Mabena"][Math.floor(index / 5) % 5]}`
        : `${["Kabelo", "Ayanda", "Neo", "Zanele", "Tumi"][index % 5]} ${["Maseko", "Mofokeng", "Khumalo", "Radebe"][Math.floor(index / 5) % 4]}`,
    email: `${role}-${number}@demo.tafari.example`,
    company,
    organizationType: organizationType(index, total),
    country:
      index % 3 === 0 ? "Lesotho" : index % 3 === 1 ? "South Africa" : "Other",
    role,
    status: "active",
    verified: true,
    scenario:
      role === "owner"
        ? ownerScenarios[index % ownerScenarios.length]
        : [
            "Pending offer on a published asset",
            "Offer accepted and documents shared",
            "Offer declined by owner",
            "Offer withdrawn by buyer",
            "Historical completed and cancelled deals",
          ][index % 5],
  };
}
export const demoAccounts: DemoAccount[] = [
  ...ownerCompanies.map((c, i) => participant("owner", c, i, 40)),
  ...buyerCompanies.map((c, i) => participant("buyer", c, i, 20)),
  ...[
    [
      "member",
      "New Member",
      "Individual",
      "Explore an empty workspace before choosing a profile",
    ],
    [
      "partner",
      "Advisory Partner",
      "Maloti Transaction Advisory",
      "Partner profile, asset introductions and offers",
    ],
    [
      "staff",
      "Deal Desk Officer",
      "Tafari Demo Deal Desk",
      "Review assets, advance transactions and respond to enquiries",
    ],
    [
      "staff",
      "Operations Officer",
      "Tafari Demo Operations",
      "Documents, audit trail and moderation",
    ],
    [
      "super_admin",
      "Demo Platform Administrator",
      "Tafari Demo Back Office",
      "All demo administration, including roles and suspension",
    ],
  ].map(([role, name, company, scenario], i) => ({
    id: `demo-role-${role}-${i + 1}`,
    name,
    email: `role-${i + 1}@demo.tafari.example`,
    company,
    organizationType: "Platform role",
    country: "Lesotho",
    role,
    status: "active",
    verified: true,
    scenario,
  })),
  {
    ...participant("owner", "Suspended Sample Ventures", 40, 41),
    id: "demo-suspended-owner",
    email: "suspended@demo.tafari.example",
    status: "suspended",
    scenario: "Suspended account is denied workspace and mutation access",
  },
  {
    ...participant("buyer", "Unverified Sample Trading", 20, 21),
    id: "demo-unverified-buyer",
    email: "unverified@demo.tafari.example",
    verified: false,
    scenario: "Unverified buyer can view workspace but cannot submit an offer",
  },
];
export const demoSuperAdminId = "demo-role-super_admin-5";
