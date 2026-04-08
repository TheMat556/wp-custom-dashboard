import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Collapse, Typography, theme } from "antd";
import { navigate } from "../../../utils/wp";
import type { OfflineAlertProps } from "../types";
import { relativeTime } from "../utils/formatters";

const { Text } = Typography;

export function OfflineAlert({ speed, t, intlLocale, adminUrl }: OfflineAlertProps) {
  const { token } = theme.useToken();

  const nextStep =
    speed.errorClass === "ssl"
      ? t(
          "Contact your hosting provider about your SSL certificate — it may be expired.",
        )
      : speed.errorClass === "dns"
        ? t(
            "Check if your domain registration is still active and DNS settings are correct.",
          )
        : speed.errorClass === "timeout"
          ? t(
              "Contact your hosting provider — the server may be overloaded or a plugin may have caused a PHP error.",
            )
          : t(
              "Contact your hosting provider. Tell them your website is not loading and ask them to check the server.",
            );

  return (
    <div style={{ marginBottom: 16 }}>
      <Alert
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
        message={<strong>{t("Your website is not reachable right now")}</strong>}
        description={
          <div>
            <p style={{ margin: "4px 0 8px" }}>
              {speed.reason ?? t("We could not connect to your homepage.")}{" "}
              {t("Your visitors may see an error page.")}
            </p>
            {speed.firstFailAt && (
              <p style={{ margin: "0 0 8px", fontSize: 12 }}>
                <strong>{t("Problem started:")}</strong>{" "}
                {new Date(speed.firstFailAt * 1000).toLocaleString(intlLocale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {" "}({relativeTime(speed.firstFailAt, intlLocale)})
              </p>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              <strong>{t("Recommended next step:")}</strong> {nextStep}
            </Text>
            {speed.errorDetail && (
              <Collapse
                ghost
                size="small"
                style={{ marginTop: 8 }}
                items={[
                  {
                    key: "tech",
                    label: (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {t("Technical details (for developers)")}
                      </Text>
                    ),
                    children: (
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          background: token.colorBgLayout,
                          borderRadius: token.borderRadius,
                          padding: "8px 12px",
                          color: token.colorTextSecondary,
                        }}
                      >
                        <div>
                          <strong>{t("Error class:")}</strong> {speed.errorClass ?? "connection"}
                        </div>
                        <div>
                          <strong>{t("Detail:")}</strong> {speed.errorDetail}
                        </div>
                        {speed.checkedAt && (
                          <div>
                            <strong>{t("Last checked:")}</strong>{" "}
                            {new Date(speed.checkedAt * 1000).toLocaleString(intlLocale)}
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        }
        style={{ borderRadius: token.borderRadiusLG }}
        action={
          <Button danger size="small" onClick={() => navigate("site-health.php", adminUrl)}>
            {t("Site Health")}
          </Button>
        }
      />
    </div>
  );
}
