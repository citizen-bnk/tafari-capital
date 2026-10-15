import { z } from "zod";
export const questionnaireVersion = 1;
export type Answers = Record<string, string>;
export type Question = {
  id: string;
  section: "contact" | "asset";
  prompt: string;
  hint: string;
  type: "text" | "email" | "tel" | "choice" | "longtext" | "number";
  options?: string[];
  optional?: boolean;
  placeholder?: string;
  when?: (a: Answers) => boolean;
  max?: number;
};
export const questions: Question[] = [
  {
    id: "contact_consent",
    section: "contact",
    prompt: "May we save your progress and contact you about your asset?",
    hint: "Your details and asset information stay private to you and the Tafari team. Nothing is published by this conversation.",
    type: "choice",
    options: ["Yes, please contact me", "Not now"],
  },
  {
    id: "contact_name",
    section: "contact",
    prompt: "What is your full name?",
    hint: "Tell us who Tafari should speak to about this opportunity.",
    type: "text",
    placeholder: "Your name",
    max: 120,
  },
  {
    id: "contact_preference",
    section: "contact",
    prompt: "How would you like Tafari to contact you?",
    hint: "Choose the easiest way for our team to reach you.",
    type: "choice",
    options: ["Phone call", "Email"],
  },
  {
    id: "contact_phone",
    section: "contact",
    prompt: "What is the best phone number to reach you?",
    hint: "Include your country code, starting with +266 for Lesotho or +27 for South Africa. Spaces are fine.",
    type: "tel",
    placeholder: "Phone number with country code",
    when: (a) => a.contact_preference === "Phone call",
  },
  {
    id: "contact_email",
    section: "contact",
    prompt: "Which email address should we use?",
    hint: "Use an address you check regularly. We will use it to follow up on this asset.",
    type: "email",
    placeholder: "you@company.com",
    when: (a) => a.contact_preference === "Email",
  },
  {
    id: "company",
    section: "asset",
    prompt: "What is your company name?",
    hint: "Enter the company name, or skip if you are applying as an individual.",
    type: "text",
    optional: true,
    max: 160,
    placeholder: "Company name, if applicable",
  },
  {
    id: "relationship",
    section: "asset",
    prompt: "What is your connection to the asset?",
    hint: "It is fine to be an owner, a representative or still establishing your role. Tafari will confirm authority and any mandate later.",
    type: "choice",
    options: [
      "I own the asset",
      "I represent the owner",
      "I am a broker or introducer",
      "I need advice about my role",
    ],
  },
  {
    id: "asset_type",
    section: "asset",
    prompt: "What kind of opportunity do you have?",
    hint: "Choose the closest match. We will work through the details together.",
    type: "choice",
    options: [
      "Mining asset",
      "Exploration project",
      "Quarry",
      "Commodity supply",
      "Other opportunity",
    ],
  },
  {
    id: "asset_name",
    section: "asset",
    prompt: "What is the asset or project called?",
    hint: "A working name is enough. If it does not have a name yet, you can skip this.",
    type: "text",
    optional: true,
    max: 160,
    placeholder: "Asset or project name",
  },
  {
    id: "country",
    section: "asset",
    prompt: "In which country is the asset located?",
    hint: "Choose the country where the asset or source of supply is situated.",
    type: "choice",
    options: ["Lesotho", "South Africa", "Other"],
  },
  {
    id: "other_country",
    section: "asset",
    prompt: "Which country is it in?",
    hint: "Type the country name so we can route the opportunity to the right team.",
    type: "text",
    max: 80,
    when: (a) => a.country === "Other",
  },
  {
    id: "location",
    section: "asset",
    prompt: "What is the nearest town, district or province?",
    hint: "An approximate location is fine for now. You do not need coordinates or a survey plan to start.",
    type: "text",
    max: 160,
    placeholder: "Nearest town, district or province",
  },
  {
    id: "commodity",
    section: "asset",
    prompt: "Which mineral or commodity is involved?",
    hint: "Select the main commodity. Choose Not sure if you need help identifying it.",
    type: "choice",
    options: [
      "Coal",
      "Chrome",
      "Diamonds",
      "Gold",
      "Iron ore",
      "Other",
      "Not sure",
    ],
  },
  {
    id: "other_commodity",
    section: "asset",
    prompt: "What is the mineral or commodity called?",
    hint: "Use the name you know. Tafari can help clarify it during follow-up.",
    type: "text",
    max: 60,
    when: (a) => a.commodity === "Other",
  },
  {
    id: "development_stage",
    section: "asset",
    prompt: "What stage is the asset at?",
    hint: "Exploration means it is still being investigated; operating means production is taking place.",
    type: "choice",
    options: [
      "Exploration",
      "Development",
      "Operating",
      "Care and maintenance",
      "Not sure",
    ],
  },
  {
    id: "transaction_goal",
    section: "asset",
    prompt: "What would you like to do with the asset?",
    hint: "You can sell it, bring in an investor or partner, arrange offtake, or ask Tafari to help decide.",
    type: "choice",
    options: [
      "Full sale",
      "Partial stake",
      "Joint venture",
      "Offtake",
      "I need advice",
    ],
  },
  {
    id: "description",
    section: "asset",
    prompt: "Tell us a little about the opportunity.",
    hint: "A few sentences are enough: what is available, what work has been done, and what you would like help with. Approximate information is welcome; do not include passwords or banking details.",
    type: "longtext",
    max: 3000,
    placeholder: "What should Tafari know about this asset?",
  },
  {
    id: "right_status",
    section: "asset",
    prompt: "What do you know about the mining right or title?",
    hint: "You do not need to prove it at this stage. Tafari will request evidence and check it before any listing is published.",
    type: "choice",
    options: [
      "Granted mining right",
      "Prospecting or exploration right",
      "Application in progress",
      "No right yet",
      "Not sure",
    ],
  },
  {
    id: "right_reference",
    section: "asset",
    prompt: "Do you have a right or title reference number?",
    hint: "Enter it if you have it handy. Otherwise skip and provide it later. This reference stays private.",
    type: "text",
    max: 200,
    optional: true,
  },
  {
    id: "asking_price",
    section: "asset",
    prompt: "Do you have an asking price in mind?",
    hint: "Enter an amount without a currency symbol, or skip if you would rather discuss value with Tafari.",
    type: "number",
    optional: true,
    placeholder: "Amount, if known",
  },
  {
    id: "currency",
    section: "asset",
    prompt: "Which currency is that amount in?",
    hint: "Choose the currency for the amount you just entered.",
    type: "choice",
    options: ["LSL", "ZAR", "USD"],
    when: (a) => !!a.asking_price,
  },
  {
    id: "area_hectares",
    section: "asset",
    prompt: "Do you know the approximate size in hectares?",
    hint: "An estimate is useful. Skip if you do not know the area yet.",
    type: "number",
    optional: true,
    placeholder: "Hectares, if known",
  },
  {
    id: "documents_ready",
    section: "asset",
    prompt: "Do you already have supporting documents or photos?",
    hint: "Examples include title evidence, an owner mandate, reports and site photos. You can supply these securely after this first conversation.",
    type: "choice",
    options: [
      "Yes, I have some documents or photos",
      "Not yet",
      "I am not sure what is needed",
    ],
  },
];
export function activeQuestions(a: Answers) {
  return questions.filter((q) => !q.when || q.when(a));
}
export function nextQuestion(a: Answers) {
  return activeQuestions(a).find((q) => !Object.hasOwn(a, q.id)) || null;
}
export function parseAnswer(q: Question, value: unknown): string {
  if (typeof value !== "string") throw new Error("Please enter an answer.");
  let v = value.trim();
  if (v.length > (q.max || 3000))
    throw new Error(
      `Please keep this answer under ${q.max || 3000} characters.`,
    );
  if (!v && q.optional) return "";
  if (!v) throw new Error("Please answer this question before continuing.");
  if (q.type === "choice" && !q.options?.includes(v))
    throw new Error("Please choose one of the answers shown.");
  if (q.id === "contact_name" && v.length < 2)
    throw new Error("Please enter your full name.");
  if (q.type === "email") {
    if (!z.email().max(200).safeParse(v).success)
      throw new Error("Please enter a valid email address.");
    v = v.toLowerCase();
  }
  if (q.type === "tel") {
    v = v.replace(/[\s().-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(v))
      throw new Error(
        "Use a phone number with its country code, such as +266 or +27, followed by the number.",
      );
  }
  if (q.type === "number") {
    const n = Number(v.replaceAll(",", ""));
    if (
      !Number.isFinite(n) ||
      n <= 0 ||
      n > (q.id === "area_hectares" ? 100000000 : 99999999999999)
    )
      throw new Error("Enter a positive amount, or skip if you are not sure.");
    v = String(n);
  }
  if (
    ["location", "other_country", "other_commodity"].includes(q.id) &&
    v.length < 2
  )
    throw new Error("Please add a little more detail.");
  if (q.id === "description" && v.length < 20)
    throw new Error(
      "Please tell us a little more: one or two sentences will help the team.",
    );
  return v;
}
export function validateContact(raw: Answers): Answers {
  const answers: Answers = {};
  for (const q of questions.filter((q) => q.section === "contact"))
    if (!q.when || q.when(answers)) answers[q.id] = parseAnswer(q, raw[q.id]);
  if (answers.contact_consent !== "Yes, please contact me")
    throw new Error("We need your permission before saving contact details.");
  return answers;
}
export function answeredQuestions(a: Answers) {
  return activeQuestions(a).filter((q) => Object.hasOwn(a, q.id));
}
export function rewindAnswers(a: Answers, id: string): Answers {
  const active = activeQuestions(a),
    index = active.findIndex((q) => q.id === id);
  if (index < 0 || !Object.hasOwn(a, id))
    throw new Error("This answer cannot be edited.");
  return retainActiveAnswers(a);
}
export type AssetApplication = {
  id: string;
  reference: string;
  owner_id: string | null;
  listing_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_preference: string;
  answers: Answers;
  state: "draft" | "submitted";
  status: string;
  revision: number;
  questionnaire_version: number;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
  staff_notes?: string;
  source: string;
  current_question: string | null;
  draft_answers: Answers;
  last_seen_at: string;
  last_event: string;
};

export function currentQuestion(
  a: Pick<AssetApplication, "answers" | "current_question" | "state">,
) {
  if (a.state === "submitted") return null;
  return (
    activeQuestions(a.answers).find((q) => q.id === a.current_question) ||
    nextQuestion(a.answers)
  );
}
export function retainActiveAnswers(a: Answers): Answers {
  return Object.fromEntries(
    activeQuestions(a)
      .filter((q) => Object.hasOwn(a, q.id))
      .map((q) => [q.id, a[q.id]]),
  );
}
export type ApplicationEvent = {
  id: string;
  action: string;
  question: string | null;
  previous_question: string | null;
  current_question: string | null;
  before_value: string | null;
  after_value: string | null;
  snapshot: Answers;
  occurred_at: string;
};
export function questionLabel(id: string | null) {
  return id
    ? questions.find((q) => q.id === id)?.prompt || id
    : "Review and send";
}
