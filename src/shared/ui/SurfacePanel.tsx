import type { CSSProperties, ReactNode } from "react";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export interface SurfacePanelProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
}

export function SurfacePanel({
  title,
  description,
  icon,
  extra,
  children,
  className,
  bodyClassName,
  style,
  bodyStyle,
}: SurfacePanelProps) {
  return (
    <section className={joinClassNames("wp-react-ui-surface-panel", className)} style={style}>
      <div className="wp-react-ui-surface-panel__header">
        <div className="wp-react-ui-surface-panel__lead">
          {icon ? <span className="wp-react-ui-surface-panel__icon">{icon}</span> : null}
          <div className="wp-react-ui-surface-panel__copy">
            <div className="wp-react-ui-surface-panel__title">{title}</div>
            {description ? (
              <div className="wp-react-ui-surface-panel__description">{description}</div>
            ) : null}
          </div>
        </div>
        {extra ? <div className="wp-react-ui-surface-panel__extra">{extra}</div> : null}
      </div>
      <div
        className={joinClassNames("wp-react-ui-surface-panel__body", bodyClassName)}
        style={bodyStyle}
      >
        {children}
      </div>
    </section>
  );
}

export default SurfacePanel;
