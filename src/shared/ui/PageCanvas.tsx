import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export interface PageCanvasProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  centered?: boolean;
  innerClassName?: string;
  innerStyle?: CSSProperties;
}

export function PageCanvas({
  children,
  centered = false,
  className,
  innerClassName,
  innerStyle,
  ...props
}: PageCanvasProps) {
  return (
    <main
      className={joinClassNames(
        "wp-react-ui-page-canvas",
        centered && "wp-react-ui-page-canvas--centered",
        className
      )}
      {...props}
    >
      <div
        className={joinClassNames("wp-react-ui-page-canvas__inner", innerClassName)}
        style={innerStyle}
      >
        {children}
      </div>
    </main>
  );
}

export default PageCanvas;
