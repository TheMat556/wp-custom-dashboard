import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShellConfigProvider } from "../../../shell/context/ShellConfigContext";
import { LicenseProvider } from "../../context/LicenseContext";
import { licenseStore, resetLicenseStore } from "../../store/licenseStore";
import { maskLicenseKey } from "../../utils/licenseKeyUtils";
import LicenseSettings from "./index";

const loadLicenseStatusMock = vi.fn();
const loadLicenseServerSettingsMock = vi.fn();
const saveLicenseServerSettingsMock = vi.fn();
const activateLicenseMock = vi.fn();
const deactivateLicenseMock = vi.fn();
const storedLicenseKey = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

vi.mock("../../store/licenseActions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../store/licenseActions")>();

  return {
    ...actual,
    loadLicenseStatus: () => loadLicenseStatusMock(),
    loadLicenseServerSettings: () => loadLicenseServerSettingsMock(),
    saveLicenseServerSettings: (input: unknown) => saveLicenseServerSettingsMock(input),
    activateLicense: (input: unknown) => activateLicenseMock(input),
    deactivateLicense: () => deactivateLicenseMock(),
  };
});

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ShellConfigProvider
      config={
        {
          adminUrl: "/wp-admin/",
          menu: [],
          restUrl: "/wp-json/wp-react-ui/v1",
          nonce: "nonce",
          siteName: "Test Site",
          branding: {
            siteName: "Test Site",
            logos: {
              lightUrl: null,
              darkUrl: null,
              longUrl: null,
              defaultUrl: "/logo.svg",
            },
            useLongLogo: false,
            primaryColor: "#4f46e5",
            fontPreset: "inter",
          },
          theme: "light",
          assetsUrl: "/",
          publicUrl: "/",
          navigation: {
            fullReloadPageParams: [],
            shellDisabledPagenow: [],
            breakoutPagenow: [],
            openInNewTabPatterns: [],
          },
          logoutUrl: "/logout",
          user: {
            name: "Admin",
            role: "administrator",
            canManageOptions: true,
          },
          license: {
            status: "active",
            role: "customer",
            tier: "pro",
            expiresAt: null,
            features: ["chat"],
            graceDaysRemaining: 0,
            hasKey: true,
            keyPrefix: "12345678",
            serverConfigured: true,
          },
          shellRoutes: [],
          locale: "en_US",
        } as const
      }
    >
      <LicenseProvider>{children}</LicenseProvider>
    </ShellConfigProvider>
  );
}

describe("LicenseSettings", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    resetLicenseStore();
    licenseStore.setState({
      status: "active",
      role: "customer",
      tier: "pro",
      expiresAt: null,
      features: ["chat", "dashboard"],
      graceDaysRemaining: 0,
      hasKey: true,
      keyPrefix: "12345678",
      serverConfigured: true,
      loading: false,
      saving: false,
    });
    loadLicenseStatusMock.mockReset().mockResolvedValue(true);
    loadLicenseServerSettingsMock.mockReset().mockResolvedValue({
      serverUrl: "https://licenses.example.test",
      serverConfigured: true,
      storedLicenseKey,
    });
    saveLicenseServerSettingsMock.mockReset().mockResolvedValue({
      serverUrl: "https://licenses.changed.test",
      serverConfigured: true,
      storedLicenseKey,
    });
    activateLicenseMock.mockReset().mockResolvedValue(true);
    deactivateLicenseMock.mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    resetLicenseStore();
  });

  it("renders the status badge and shows the KPI section", async () => {
    render(<LicenseSettings />, { wrapper: Wrapper });

    // Status badge visible in KPI tile
    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(screen.getByText("License Status")).toBeInTheDocument();
  });

  it("shows the license key input and license server section when status is not active", async () => {
    licenseStore.setState({ status: "disabled", hasKey: false, serverConfigured: true });
    render(<LicenseSettings />, { wrapper: Wrapper });

    // Key form always visible
    await screen.findByLabelText(/license key/i);
    // License Server collapse header always visible
    expect(screen.getByText("Advanced Settings")).toBeInTheDocument();
  });

  it("always shows the license key input when active", async () => {
    render(<LicenseSettings />, { wrapper: Wrapper });

    // Key form is visible without any interaction
    expect(await screen.findByLabelText(/license key/i)).toBeInTheDocument();
    expect(screen.getByText("Advanced Settings")).toBeInTheDocument();
  });

  it("shows the server URL field when server is not configured (section auto-expanded)", async () => {
    licenseStore.setState({ status: "disabled", hasKey: false, serverConfigured: false });
    loadLicenseServerSettingsMock.mockReset().mockResolvedValue({
      serverUrl: "",
      serverConfigured: false,
      storedLicenseKey: "",
    });
    render(<LicenseSettings />, { wrapper: Wrapper });

    // Section opens automatically when server is not configured
    expect(await screen.findByLabelText(/server url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/license key/i)).toBeInTheDocument();
  });

  it("shows the server URL field inside the license server section when expanded", async () => {
    render(<LicenseSettings />, { wrapper: Wrapper });

    // Expand the License Server section
    fireEvent.click(await screen.findByText("Advanced Settings"));

    expect(await screen.findByLabelText(/server url/i)).toHaveValue(
      "https://licenses.example.test"
    );
  });

  it("shows the masked license key in the field after loading", async () => {
    render(<LicenseSettings />, { wrapper: Wrapper });

    const keyField = (await screen.findByLabelText(/license key/i)) as HTMLInputElement;
    await waitFor(() => expect(keyField).toHaveValue(maskLicenseKey(storedLicenseKey)));
    expect(keyField.value).not.toBe(storedLicenseKey);
  });

  it("tests connection on demand via the license server section", async () => {
    render(<LicenseSettings />, { wrapper: Wrapper });

    // loadLicenseStatus called once on mount
    await screen.findByText("Active");
    expect(loadLicenseStatusMock).toHaveBeenCalledTimes(1);

    // Open license server section and click Test Connection
    fireEvent.click(screen.getByText("Advanced Settings"));
    fireEvent.click(await screen.findByRole("button", { name: /test connection/i }));

    await waitFor(() => expect(loadLicenseStatusMock).toHaveBeenCalledTimes(2));
  });

  it("keeps the stored key masked while supporting backspace edits", async () => {
    render(<LicenseSettings />, { wrapper: Wrapper });

    // Key form is always visible — wait for masked value to load
    const keyField = (await screen.findByDisplayValue(
      maskLicenseKey(storedLicenseKey)
    )) as HTMLInputElement;
    keyField.focus();
    keyField.setSelectionRange(keyField.value.length, keyField.value.length);
    fireEvent.keyDown(keyField, { key: "Backspace" });

    expect(keyField).toHaveValue(maskLicenseKey(storedLicenseKey.slice(0, -1), 7));
    expect(keyField.value).not.toContain(storedLicenseKey);
  });

  it("saves the server URL before activating with a new key", async () => {
    licenseStore.setState({ status: "disabled", hasKey: false, serverConfigured: true });
    loadLicenseServerSettingsMock.mockReset().mockResolvedValue({
      serverUrl: "https://licenses.example.test",
      serverConfigured: true,
      storedLicenseKey: "",
    });
    saveLicenseServerSettingsMock.mockReset().mockResolvedValue({
      serverUrl: "https://licenses.changed.test",
      serverConfigured: true,
      storedLicenseKey: "",
    });
    render(<LicenseSettings />, { wrapper: Wrapper });

    // Open license server section to change the URL
    fireEvent.click(await screen.findByText("Advanced Settings"));
    const serverField = await screen.findByLabelText(/server url/i);
    fireEvent.change(serverField, { target: { value: "https://licenses.changed.test" } });

    const keyField = screen.getByPlaceholderText(/64-character license key/i) as HTMLInputElement;
    fireEvent.change(keyField, {
      target: { value: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^activate$/i }));

    await waitFor(() =>
      expect(saveLicenseServerSettingsMock).toHaveBeenCalledWith({
        serverUrl: "https://licenses.changed.test",
      })
    );
    await waitFor(() =>
      expect(activateLicenseMock).toHaveBeenCalledWith({
        licenseKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      })
    );
  });

  it("allows activation when only the server url changed for an existing key", async () => {
    render(<LicenseSettings />, { wrapper: Wrapper });

    // Key form is always visible
    await screen.findByLabelText(/license key/i);

    // Open license server section to change the URL
    fireEvent.click(screen.getByText("Advanced Settings"));
    const serverField = await screen.findByLabelText(/server url/i);
    const activateButton = screen.getByRole("button", { name: /^activate$/i });

    expect(activateButton).toBeDisabled();

    fireEvent.change(serverField, { target: { value: "https://licenses.changed.test" } });

    expect(activateButton).toBeEnabled();
  });

  it("keeps the activated key in the field on successful activation", async () => {
    const nextLicenseKey = "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    licenseStore.setState({ status: "disabled", hasKey: false, serverConfigured: true });
    loadLicenseServerSettingsMock
      .mockReset()
      .mockResolvedValueOnce({
        serverUrl: "https://licenses.example.test",
        serverConfigured: true,
        storedLicenseKey: "",
      })
      .mockResolvedValueOnce({
        serverUrl: "https://licenses.example.test",
        serverConfigured: true,
        storedLicenseKey: nextLicenseKey,
      });
    activateLicenseMock.mockResolvedValue(true);
    render(<LicenseSettings />, { wrapper: Wrapper });

    await screen.findByLabelText(/license key/i);

    const keyField = screen.getByPlaceholderText(/64-character license key/i) as HTMLInputElement;
    fireEvent.change(keyField, { target: { value: nextLicenseKey } });
    fireEvent.click(screen.getByRole("button", { name: /^activate$/i }));

    await waitFor(() => expect(activateLicenseMock).toHaveBeenCalled());
    await waitFor(() => expect(keyField).toHaveValue(maskLicenseKey(nextLicenseKey)));
  });

  it("keeps the license key field on failed activation", async () => {
    licenseStore.setState({ status: "disabled", hasKey: false, serverConfigured: true });
    loadLicenseServerSettingsMock.mockReset().mockResolvedValue({
      serverUrl: "https://licenses.example.test",
      serverConfigured: true,
      storedLicenseKey: "",
    });
    activateLicenseMock.mockResolvedValue(false);
    render(<LicenseSettings />, { wrapper: Wrapper });

    await screen.findByLabelText(/license key/i);

    const keyField = screen.getByPlaceholderText(/64-character license key/i) as HTMLInputElement;
    const licenseKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    fireEvent.change(keyField, { target: { value: licenseKey } });
    fireEvent.click(screen.getByRole("button", { name: /^activate$/i }));

    await waitFor(() => expect(activateLicenseMock).toHaveBeenCalled());
    expect(keyField).toHaveValue(maskLicenseKey(licenseKey));
  });
});
