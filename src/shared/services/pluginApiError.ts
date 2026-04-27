import { notificationStore, notifyApiError } from "../../store/notificationStore";

interface WordPressApiErrorResponse {
  code?: unknown;
}

export class PluginApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PluginApiError";
    this.status = status;
    this.code = code;
  }
}

export async function createPluginApiError(
  response: Response,
  context: string
): Promise<PluginApiError> {
  let code: string | undefined;

  try {
    const payload = (await response.clone().json()) as WordPressApiErrorResponse;
    if (typeof payload?.code === "string") {
      code = payload.code;
    }
  } catch {
    code = undefined;
  }

  if (code === "license_feature_disabled") {
    const message = "Licensed feature unavailable";
    notificationStore.getState().push({
      type: "warning",
      message,
      description: "The current license no longer allows this page.",
    });
    return new PluginApiError(message, response.status, code);
  }

  return new PluginApiError(notifyApiError(response, context), response.status, code);
}

export function isLicenseFeatureDisabledError(error: unknown): error is PluginApiError {
  return (
    error instanceof PluginApiError &&
    error.status === 403 &&
    error.code === "license_feature_disabled"
  );
}
