import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TFunc } from "../../types";
import { KpiConversions } from "./KpiConversions";
import { KpiSpeed } from "./KpiSpeed";
import { KpiUpdates } from "./KpiUpdates";
import { KpiVisitors } from "./KpiVisitors";
import { KpiWebsite } from "./KpiWebsite";

const t: TFunc = (key) => key;

describe("KpiWebsite", () => {
  it("renders 'Offline' when site is down", () => {
    render(<KpiWebsite isSiteDown={true} health={null} speed={null} t={t} adminUrl="" />);
    expect(screen.getByText("Offline")).toBeDefined();
  });

  it("renders 'Online' when health is good", () => {
    render(
      <KpiWebsite
        isSiteDown={false}
        health={{ status: "good", score: 95 }}
        speed={null}
        t={t}
        adminUrl=""
      />
    );
    expect(screen.getByText("Online")).toBeDefined();
  });

  it("renders 'Check' when health is critical and site is up", () => {
    render(
      <KpiWebsite
        isSiteDown={false}
        health={{ status: "critical", score: 30 }}
        speed={null}
        t={t}
        adminUrl=""
      />
    );
    expect(screen.getByText("Check")).toBeDefined();
  });
});

describe("KpiVisitors", () => {
  it("formats the total view count when > 0", () => {
    render(<KpiVisitors total30Views={1234} viewTrend={5} t={t} intlLocale="en-US" />);
    expect(screen.getByText("1,234")).toBeDefined();
  });

  it("shows em dash when no visits", () => {
    render(<KpiVisitors total30Views={0} viewTrend={0} t={t} intlLocale="en-US" />);
    expect(screen.getByText("\u2014")).toBeDefined();
  });

  it("shows trend percentage when present", () => {
    render(<KpiVisitors total30Views={500} viewTrend={12} t={t} intlLocale="en-US" />);
    expect(screen.getByText(/12% vs yesterday/)).toBeDefined();
  });
});

describe("KpiUpdates", () => {
  it("renders the total update count", () => {
    render(
      <KpiUpdates
        updates={{ plugins: 1, themes: 0, core: 0, total: 1 }}
        hasUpdates={true}
        t={t}
        intlLocale="en-US"
        adminUrl=""
      />
    );
    expect(screen.getByText("1")).toBeDefined();
  });

  it("shows All up to date when no updates", () => {
    render(
      <KpiUpdates
        updates={{ plugins: 0, themes: 0, core: 0, total: 0 }}
        hasUpdates={false}
        t={t}
        intlLocale="en-US"
        adminUrl=""
      />
    );
    expect(screen.getByText("All up to date")).toBeDefined();
  });
});

describe("KpiSpeed", () => {
  it("renders 'Fast' for good status", () => {
    render(<KpiSpeed isSiteDown={false} speed={{ status: "good", ms: 100 }} t={t} />);
    expect(screen.getByText("Fast")).toBeDefined();
    expect(screen.getByText("100 ms")).toBeDefined();
  });

  it("renders 'Error' when site is down", () => {
    render(<KpiSpeed isSiteDown={true} speed={null} t={t} />);
    expect(screen.getByText("Error")).toBeDefined();
  });
});

describe("KpiConversions", () => {
  it("renders the total when stats are present", () => {
    render(
      <KpiConversions
        submissionStats={{ formSubmissions30d: 12, bookings30d: 3, formPlugin: "wpforms" }}
        t={t}
      />
    );
    expect(screen.getByText("15")).toBeDefined();
  });

  it("shows 'No plugin detected' when stats are absent", () => {
    render(<KpiConversions submissionStats={null} t={t} />);
    expect(screen.getByText("No plugin detected")).toBeDefined();
  });
});
