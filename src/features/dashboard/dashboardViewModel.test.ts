import { describe, expect, it } from "vitest";
import { createDashboardViewModel } from "./dashboardViewModel";
import type { DashboardData } from "./services/dashboardApi";

function createDashboardData(overrides?: Partial<DashboardData>): DashboardData {
  return {
    atAGlance: {
      posts: 1,
      postsDraft: 0,
      pages: 2,
      pagesDraft: 1,
      users: 3,
      wpVersion: "6.8",
      phpVersion: "8.4",
    },
    siteHealth: {
      status: "good",
      score: 90,
    },
    pendingUpdates: {
      plugins: 0,
      themes: 0,
      core: 0,
      total: 0,
    },
    visitorTrend: {
      days: [
        { date: "Apr 08", views: 10 },
        { date: "Apr 09", views: 20 },
      ],
      total: 30,
      prevTotal: 15,
      trendPct: 100,
    },
    countryStats: [{ country: "AT", visits: 5 }],
    siteSpeed: {
      ms: 320,
      status: "good",
    },
    pagesOverview: {
      recent: [],
      drafts: [],
      totalPublished: 2,
      totalDrafts: 1,
    },
    actionItems: [
      {
        type: "update",
        severity: "warning",
        title: "Plugin updates available",
        action: "Update plugins",
        url: "update-core.php",
      },
    ],
    seoOverview: {
      score: 80,
      plugin: null,
      totalPages: 2,
      issues: [
        {
          label: "Short homepage title",
          url: "post.php?post=1&action=edit",
        },
      ],
    },
    seoBasics: {
      score: 75,
      checks: {
        searchVisible: { ok: true, label: "Visible" },
        homeTitle: { ok: false, label: "Too short" },
        sitemap: { ok: true, label: "Found" },
        pageTitles: { ok: false, label: "Short", shortCount: 1 },
      },
      plugin: null,
    },
    legalCompliance: {
      privacyPolicy: { exists: true, published: true },
      impressum: { exists: true, published: true },
      cookiePlugin: null,
      trackingWithoutConsent: false,
    },
    businessFunctions: {
      bookings: { available: false, status: "not_installed" },
      contactForms: { available: false, status: "not_installed" },
      emailDelivery: { smtpPlugin: null, status: "default" },
    },
    onboardingChecklist: [
      { key: "a", label: "A", done: true, url: "a.php" },
      { key: "b", label: "B", done: false, url: "b.php" },
    ],
    siteReadinessScore: 50,
    calendarPreview: null,
    ...overrides,
  };
}

describe("createDashboardViewModel", () => {
  it("preserves provided trend totals and adds SEO issues as derived actions", () => {
    const model = createDashboardViewModel(createDashboardData(), false);

    expect(model.total30Views).toBe(30);
    expect(model.viewTrend).toBe(100);
    expect(model.actions).toHaveLength(2);
    expect(model.warningActions).toHaveLength(2);
    expect(model.actions[1]).toMatchObject({
      type: "seo",
      title: "Short homepage title",
      action: "View page",
    });
  });

  it("falls back to sparkline math when trend percentage is missing", () => {
    const model = createDashboardViewModel(
      createDashboardData({
        visitorTrend: {
          days: [
            { date: "Apr 08", views: 10 },
            { date: "Apr 09", views: 15 },
          ],
          total: 25,
          prevTotal: 0,
          trendPct: undefined as unknown as number,
        },
      }),
      false
    );

    expect(model.viewTrend).toBe(50);
    expect(model.sparkline).toEqual([
      { date: "Apr 08", views: 10 },
      { date: "Apr 09", views: 15 },
    ]);
  });

  it("hides the checklist when it was closed locally", () => {
    const model = createDashboardViewModel(createDashboardData(), true);

    expect(model.checklistDone).toBe(1);
    expect(model.showChecklist).toBe(false);
  });
});
