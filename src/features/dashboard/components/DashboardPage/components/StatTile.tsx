import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip, Typography, theme } from "antd";
import type { CSSProperties } from "react";
import type { StatTileProps } from "../types";

const { Text } = Typography;

export function StatTile({ icon, label, value, sub, color, tooltip, onClick }: StatTileProps) {
  const { token } = theme.useToken();
  const tileStyle = {
    "--metric-accent": color,
  } as CSSProperties;

  const content = (
    <>
      <div className="wp-react-ui-metric-tile__header">
        <div className="wp-react-ui-metric-tile__icon" aria-hidden="true">
          {icon}
        </div>
        {tooltip ? (
          <Tooltip title={tooltip} overlayStyle={{ maxWidth: 240 }}>
            <span className="wp-react-ui-metric-tile__hint" aria-label={tooltip}>
              <QuestionCircleOutlined style={{ fontSize: 13, color: token.colorTextTertiary }} />
            </span>
          </Tooltip>
        ) : null}
      </div>

      <div className="wp-react-ui-metric-tile__body">
        <Text className="wp-react-ui-metric-tile__label">{label}</Text>
        <div className="wp-react-ui-metric-tile__value">{value}</div>
      </div>

      {sub ? <div className="wp-react-ui-metric-tile__footer">{sub}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="wp-react-ui-metric-tile wp-react-ui-metric-tile--interactive"
        onClick={onClick}
        style={tileStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="wp-react-ui-metric-tile" style={tileStyle}>
      {content}
    </div>
  );
}
