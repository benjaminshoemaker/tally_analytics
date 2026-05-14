export type PublicDemoProject = {
  name: string;
  domain: string;
  description: string;
};

export type PublicDemoTopItem = {
  label: string;
  value: number;
  percentage: number;
};

export type PublicDemoOverview = {
  period: "30d";
  pageViews: {
    total: number;
    change: number;
    timeSeries: Array<{ date: string; count: number }>;
  };
  sessions: {
    total: number;
    change: number;
  };
  topPage: string;
  topReferrer: string;
  topPages: PublicDemoTopItem[];
  topReferrers: PublicDemoTopItem[];
};

export type PublicDemoLiveEvent = {
  id: string;
  eventType: string;
  path: string;
  referrer: string | null;
  environment: "production" | "preview";
  browser: string;
  timestamp: string;
  relativeTime: string;
};

export type PublicDemoSessions = {
  totalSessions: number;
  newVisitors: number;
  returningVisitors: number;
  timeSeries: Array<{ date: string; newSessions: number; returningSessions: number }>;
};

export type PublicDemoTaskPreview = {
  title: string;
  eventName: string;
  why: string;
  verificationCriteria: string[];
};

export type PublicDemoAgentPreview = {
  label: string;
  summary: string;
  taskDescription: string;
  verificationCriteria: string[];
};

export type PublicDemoQuestionResult = {
  kind: "answered" | "partial_answer" | "cannot_answer_yet" | "unrecognized";
  title: string;
  summary: string;
  metrics?: Array<{ label: string; value: string | number }>;
  limitation?: string;
  task?: PublicDemoTaskPreview;
  agentPreview?: PublicDemoAgentPreview;
  suggestedQuestions?: string[];
};

export const publicDemoProject: PublicDemoProject = {
  name: "Acme Forms",
  domain: "acmeforms.example",
  description: "A fictional form builder used to demonstrate Tally Analytics.",
};

export const publicDemoOverview: PublicDemoOverview = {
  period: "30d",
  pageViews: {
    total: 18420,
    change: 18,
    timeSeries: [
      { date: "Apr 15", count: 420 },
      { date: "Apr 18", count: 510 },
      { date: "Apr 21", count: 640 },
      { date: "Apr 24", count: 590 },
      { date: "Apr 27", count: 760 },
      { date: "Apr 30", count: 880 },
      { date: "May 03", count: 910 },
      { date: "May 06", count: 1040 },
      { date: "May 09", count: 970 },
      { date: "May 12", count: 1120 },
    ],
  },
  sessions: {
    total: 6420,
    change: 11,
  },
  topPage: "/templates",
  topReferrer: "Google",
  topPages: [
    { label: "/", value: 5120, percentage: 28 },
    { label: "/pricing", value: 2840, percentage: 15 },
    { label: "/templates", value: 6380, percentage: 35 },
    { label: "/signup", value: 1910, percentage: 10 },
    { label: "/docs", value: 2170, percentage: 12 },
  ],
  topReferrers: [
    { label: "Google", value: 3980, percentage: 31 },
    { label: "GitHub", value: 2460, percentage: 19 },
    { label: "Product Hunt", value: 2210, percentage: 17 },
    { label: "Hacker News", value: 1510, percentage: 12 },
    { label: "direct", value: 2700, percentage: 21 },
  ],
};

export const publicDemoLiveEvents: PublicDemoLiveEvent[] = [
  {
    id: "evt_demo_001",
    eventType: "form_started",
    path: "/templates/customer-feedback",
    referrer: "Product Hunt",
    environment: "production",
    browser: "Chrome",
    timestamp: "2026-05-13T19:58:31.000Z",
    relativeTime: "18 seconds ago",
  },
  {
    id: "evt_demo_002",
    eventType: "pricing_cta_clicked",
    path: "/pricing",
    referrer: "Google",
    environment: "production",
    browser: "Safari",
    timestamp: "2026-05-13T19:57:48.000Z",
    relativeTime: "1 minute ago",
  },
  {
    id: "evt_demo_003",
    eventType: "template_viewed",
    path: "/templates/onboarding-survey",
    referrer: "GitHub",
    environment: "production",
    browser: "Firefox",
    timestamp: "2026-05-13T19:55:02.000Z",
    relativeTime: "4 minutes ago",
  },
  {
    id: "evt_demo_004",
    eventType: "signup_started",
    path: "/signup",
    referrer: "Hacker News",
    environment: "production",
    browser: "Chrome",
    timestamp: "2026-05-13T19:52:15.000Z",
    relativeTime: "7 minutes ago",
  },
  {
    id: "evt_demo_005",
    eventType: "page_view",
    path: "/docs",
    referrer: null,
    environment: "preview",
    browser: "Edge",
    timestamp: "2026-05-13T19:49:44.000Z",
    relativeTime: "10 minutes ago",
  },
];

export const publicDemoSessions: PublicDemoSessions = {
  totalSessions: 6420,
  newVisitors: 4740,
  returningVisitors: 1680,
  timeSeries: [
    { date: "Apr 15", newSessions: 120, returningSessions: 42 },
    { date: "Apr 18", newSessions: 144, returningSessions: 51 },
    { date: "Apr 21", newSessions: 166, returningSessions: 61 },
    { date: "Apr 24", newSessions: 151, returningSessions: 58 },
    { date: "Apr 27", newSessions: 190, returningSessions: 66 },
    { date: "Apr 30", newSessions: 216, returningSessions: 73 },
    { date: "May 03", newSessions: 232, returningSessions: 84 },
    { date: "May 06", newSessions: 255, returningSessions: 91 },
    { date: "May 09", newSessions: 244, returningSessions: 88 },
    { date: "May 12", newSessions: 286, returningSessions: 103 },
  ],
};

export const publicDemoQuestions = [
  "Which pages are bringing users to signup?",
  "How many users visited pricing this month?",
  "What should we track next?",
  "Are people publishing forms after signup?",
] as const;

const scriptedResults: Record<string, PublicDemoQuestionResult> = {
  [normalizeDemoQuestion(publicDemoQuestions[0])]: {
    kind: "answered",
    title: "Signup paths are strongest from templates and pricing",
    summary: "The highest-signal paths before signup are /templates, /pricing, and /docs.",
    metrics: [
      { label: "/templates to signup", value: "31%" },
      { label: "/pricing to signup", value: "24%" },
      { label: "/docs to signup", value: "12%" },
    ],
  },
  [normalizeDemoQuestion(publicDemoQuestions[1])]: {
    kind: "answered",
    title: "Pricing drew 2,840 visits this month",
    summary: "Pricing is the second-most viewed page in the Acme Forms demo data.",
    metrics: [
      { label: "Pricing page views", value: 2840 },
      { label: "Pricing CTA clicks", value: 412 },
      { label: "CTA click-through", value: "14.5%" },
    ],
  },
  [normalizeDemoQuestion(publicDemoQuestions[2])]: {
    kind: "cannot_answer_yet",
    title: "Track form publish completion",
    summary: "Acme Forms should track whether users publish forms after signup.",
    limitation:
      "Tally can see signups and template views, but it cannot confirm whether users publish forms after signup.",
    task: {
      title: "Track form publish completion",
      eventName: "form_published",
      why:
        "Tally can see signups and template views, but it cannot confirm whether users publish forms after signup.",
      verificationCriteria: [
        "Trigger form_published after a form is successfully published.",
        "Include template_id and workspace_id properties when available.",
        "Verify form_published appears in production analytics after deploy.",
      ],
    },
    agentPreview: {
      label: "Simulated MCP/agent output",
      summary: "An MCP-capable coding agent would receive a scoped analytics task, not a fake patch.",
      taskDescription:
        "Add a form_published tracking event after successful publish completion and include verification criteria.",
      verificationCriteria: [
        "Call track('form_published', ...) only after publish succeeds.",
        "Add a focused test or browser verification for the publish path.",
        "Confirm form_published appears in Tally after deploy.",
      ],
    },
  },
  [normalizeDemoQuestion(publicDemoQuestions[3])]: {
    kind: "partial_answer",
    title: "Signup intent is visible, publish completion is missing",
    summary:
      "The demo data shows 1,910 signup page visits and 830 form starts, but publish completion is not tracked yet.",
    limitation: "Add form_published to measure completed forms after signup.",
    metrics: [
      { label: "Signup page visits", value: 1910 },
      { label: "Form starts", value: 830 },
    ],
    task: {
      title: "Track form publish completion",
      eventName: "form_published",
      why: "Without a publish-complete event, Tally can only infer intent from form starts.",
      verificationCriteria: ["Verify form_published fires after successful publishing."],
    },
  },
};

export function normalizeDemoQuestion(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replace(/[?!.\s]+$/g, "")
    .replace(/\s+/g, " ");
}

export function matchDemoQuestion(question: string): PublicDemoQuestionResult {
  const normalizedQuestion = normalizeDemoQuestion(question);
  const scriptedResult = scriptedResults[normalizedQuestion];

  if (scriptedResult) return scriptedResult;

  return {
    kind: "unrecognized",
    title: "Try one of the demo questions",
    summary: "This public demo uses deterministic example answers instead of an LLM.",
    suggestedQuestions: [...publicDemoQuestions],
  };
}
