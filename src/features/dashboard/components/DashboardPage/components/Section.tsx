import { Typography } from "antd";
import SurfacePanel from "../../../../../shared/ui/SurfacePanel";
import type { SectionProps } from "../types";

export function Section({ icon, title, description, children, extra }: SectionProps) {
  return (
    <SurfacePanel
      title={
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
      }
      description={
        description ? (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {description}
          </Typography.Text>
        ) : undefined
      }
      icon={icon}
      extra={extra}
    >
      {children}
    </SurfacePanel>
  );
}
