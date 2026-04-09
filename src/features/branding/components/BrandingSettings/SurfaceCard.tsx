import { Typography } from "antd";
import type { ReactNode } from "react";
import SurfacePanel from "../../../../shared/ui/SurfacePanel";

interface SurfaceCardProps {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}

export function SurfaceCard({ title, description, icon, children }: SurfaceCardProps) {
  return (
    <SurfacePanel
      title={
        <Typography.Title level={4} style={{ margin: 0, fontSize: 18 }}>
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
      style={{ height: "100%" }}
      bodyStyle={{ flex: 1, minHeight: 0 }}
    >
      {children}
    </SurfacePanel>
  );
}
