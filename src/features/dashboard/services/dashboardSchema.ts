import { z } from "zod";

// Validates the required top-level structure of DashboardData.
// Inner shapes use passthrough() to avoid brittle coupling to every nested field.
// The service uses safeParse for graceful degradation — partial data is
// better than a broken dashboard page.

const AtAGlanceSchema = z
  .object({
    posts: z.number(),
    pages: z.number(),
    users: z.number(),
    wpVersion: z.string(),
    phpVersion: z.string(),
  })
  .passthrough();

const SiteHealthSchema = z.object({ status: z.string(), score: z.number() }).passthrough();

const PendingUpdatesSchema = z
  .object({ plugins: z.number(), themes: z.number(), core: z.number(), total: z.number() })
  .passthrough();

const VisitorTrendSchema = z
  .object({
    days: z.array(z.record(z.string(), z.unknown())),
    total: z.number(),
    prevTotal: z.number(),
    trendPct: z.number(),
  })
  .passthrough();

const SiteSpeedSchema = z
  .object({ ms: z.number().nullable(), status: z.enum(["good", "fair", "slow", "error"]) })
  .passthrough();

const PagesOverviewSchema = z
  .object({
    recent: z.array(z.unknown()),
    drafts: z.array(z.unknown()),
    totalPublished: z.number(),
    totalDrafts: z.number(),
  })
  .passthrough();

const ActionItemSchema = z
  .object({
    type: z.string(),
    severity: z.string(),
    title: z.string(),
    action: z.string(),
    url: z.string(),
  })
  .passthrough();

const SeoOverviewSchema = z
  .object({
    score: z.number(),
    issues: z.array(z.unknown()),
    plugin: z.string().nullable(),
    totalPages: z.number(),
  })
  .passthrough();

export const DashboardDataSchema = z
  .object({
    atAGlance: AtAGlanceSchema,
    siteHealth: SiteHealthSchema,
    pendingUpdates: PendingUpdatesSchema,
    visitorTrend: VisitorTrendSchema,
    countryStats: z.array(z.record(z.string(), z.unknown())),
    siteSpeed: SiteSpeedSchema,
    pagesOverview: PagesOverviewSchema,
    actionItems: z.array(ActionItemSchema),
    seoOverview: SeoOverviewSchema,
    seoBasics: z.unknown().optional(),
    legalCompliance: z.unknown().optional(),
    businessFunctions: z.unknown().optional(),
    onboardingChecklist: z.array(z.unknown()).optional(),
    siteReadinessScore: z.number().optional(),
    calendarPreview: z.unknown().nullable().optional(),
    submissionStats: z.unknown().optional(),
  })
  .passthrough();
