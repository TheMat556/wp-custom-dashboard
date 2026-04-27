import { z } from "zod";
import type { WpReactUiShellRoute } from "./wp";

export const ShellRouteSchema = z.object({
  slug: z.string(),
  label: z.string(),
  entrypoint_url: z.string(),
});

export const ShellRoutesSchema = z.array(ShellRouteSchema);

// Compile-time structural compatibility check
type _ShellRouteCheck = z.infer<typeof ShellRouteSchema> extends WpReactUiShellRoute ? true : never;
const _shellRouteCheck: _ShellRouteCheck = true;
void _shellRouteCheck;
