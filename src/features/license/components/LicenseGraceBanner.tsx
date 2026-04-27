import { Alert } from "antd";
import { useLicense } from "../context/LicenseContext";

export function LicenseGraceBanner() {
  const license = useLicense();

  if (
    license.graceDaysRemaining <= 0 ||
    (license.status !== "grace" && license.status !== "expired")
  ) {
    return null;
  }

  return (
    <div style={{ padding: "16px 24px 0" }}>
      <Alert
        type="warning"
        showIcon
        message={`License grace period active. ${license.graceDaysRemaining} day(s) remaining.`}
        description="Licensed features remain available until grace ends."
      />
    </div>
  );
}
