export type Competitor = {
  id: string;
  name: string;
  domain: string;
  status: "tracking" | "paused" | "discovered";
  ai_confidence: number | null;
  created_at: string;
};

export type Alert = {
  id: string;
  competitor_id: string;
  severity: "info" | "medium" | "high" | "critical";
  category: "pricing" | "product" | "hiring" | "marketing" | "reputation";
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  competitors?: Pick<Competitor, "name" | "domain"> | null;
};

export type WebsiteChange = {
  id: string;
  competitor_id: string;
  detected_at: string;
  change_summary: string | null;
  diff_text: string | null;
  severity: "low" | "medium" | "high";
  competitors?: Pick<Competitor, "name" | "domain"> | null;
};

export type JobPosting = {
  id: string;
  competitor_id: string;
  role: string;
  department: string;
  url: string | null;
  posted_at: string | null;
  detected_at: string;
  is_new: boolean;
};

export type WeeklyBrief = {
  id: string;
  week_start: string;
  bullets: string[] | { title?: string; body?: string; severity?: string }[];
  swot_analysis: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  generated_at: string;
  is_sent: boolean;
};

export const demoCompetitors: Competitor[] = [
  {
    id: "demo-acme",
    name: "Acme Analytics",
    domain: "acme.example",
    status: "tracking",
    ai_confidence: 0.92,
    created_at: "2026-05-19T08:00:00.000Z",
  },
  {
    id: "demo-nova",
    name: "NovaOps",
    domain: "novaops.example",
    status: "tracking",
    ai_confidence: 0.86,
    created_at: "2026-05-21T08:00:00.000Z",
  },
  {
    id: "demo-pulse",
    name: "PulseStack",
    domain: "pulsestack.example",
    status: "discovered",
    ai_confidence: 0.74,
    created_at: "2026-05-25T08:00:00.000Z",
  },
];

export const demoAlerts: Alert[] = [
  {
    id: "alert-1",
    competitor_id: "demo-acme",
    severity: "critical",
    category: "pricing",
    title: "Starter tier price cut detected",
    body: "Acme reduced entry pricing from $29 to $21 and bundled webhooks into the base plan.",
    is_read: false,
    created_at: "2026-05-29T03:15:00.000Z",
    competitors: { name: "Acme Analytics", domain: "acme.example" },
  },
  {
    id: "alert-2",
    competitor_id: "demo-nova",
    severity: "high",
    category: "hiring",
    title: "AI workflow hiring spike",
    body: "NovaOps opened four senior roles around agents, workflow automation, and customer data sync.",
    is_read: false,
    created_at: "2026-05-28T13:10:00.000Z",
    competitors: { name: "NovaOps", domain: "novaops.example" },
  },
  {
    id: "alert-3",
    competitor_id: "demo-pulse",
    severity: "medium",
    category: "marketing",
    title: "New enterprise security page",
    body: "PulseStack added SOC2, SSO, and audit log positioning to its enterprise landing page.",
    is_read: true,
    created_at: "2026-05-27T17:44:00.000Z",
    competitors: { name: "PulseStack", domain: "pulsestack.example" },
  },
];

export const demoChanges: WebsiteChange[] = [
  {
    id: "change-1",
    competitor_id: "demo-acme",
    detected_at: "2026-05-29T03:12:00.000Z",
    severity: "high",
    change_summary: "Pricing page now promotes a lower starter tier and includes native webhooks.",
    diff_text:
      '@@ pricing\n- <span class="price">$29/mo</span>\n+ <span class="price">$21/mo</span>\n+ <li>Native webhook dispatcher included</li>',
    competitors: { name: "Acme Analytics", domain: "acme.example" },
  },
  {
    id: "change-2",
    competitor_id: "demo-pulse",
    detected_at: "2026-05-27T17:40:00.000Z",
    severity: "medium",
    change_summary: "Enterprise page added stronger compliance language and sales-led CTA.",
    diff_text:
      "@@ enterprise\n+ SOC2-ready controls\n+ SAML SSO\n+ Book a compliance walkthrough",
    competitors: { name: "PulseStack", domain: "pulsestack.example" },
  },
];

export const demoJobs: JobPosting[] = [
  {
    id: "job-1",
    competitor_id: "demo-nova",
    role: "Principal AI Workflow Engineer",
    department: "Engineering",
    url: null,
    posted_at: "2026-05-28",
    detected_at: "2026-05-28T13:10:00.000Z",
    is_new: true,
  },
  {
    id: "job-2",
    competitor_id: "demo-nova",
    role: "Solutions Architect, Automation",
    department: "Sales",
    url: null,
    posted_at: "2026-05-26",
    detected_at: "2026-05-26T09:00:00.000Z",
    is_new: true,
  },
  {
    id: "job-3",
    competitor_id: "demo-acme",
    role: "Senior Product Marketing Manager",
    department: "Marketing",
    url: null,
    posted_at: "2026-05-24",
    detected_at: "2026-05-24T09:00:00.000Z",
    is_new: false,
  },
];

export const demoBrief: WeeklyBrief = {
  id: "brief-1",
  week_start: "2026-05-25",
  generated_at: "2026-05-29T05:00:00.000Z",
  is_sent: false,
  bullets: [
    "Acme is testing a lower-friction entry plan and trying to neutralize integration objections.",
    "NovaOps hiring suggests a Q3 agent-workflow push focused on enterprise implementation.",
    "PulseStack is repositioning around security assurance for larger accounts.",
  ],
  swot_analysis: {
    strengths: ["Clearer compliance story", "Richer integration narrative"],
    weaknesses: ["Higher entry price than Acme", "Limited visible hiring momentum"],
    opportunities: ["Package webhook reliability into sales enablement", "Publish security comparison content"],
    threats: ["Acme can pull budget-conscious trials", "NovaOps may ship automation workflows soon"],
  },
};
