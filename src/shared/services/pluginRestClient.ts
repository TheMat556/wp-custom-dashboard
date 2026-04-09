import type { WpReactUiConfig } from "../../types/wp";

export type PluginRestConfig = Pick<WpReactUiConfig, "restUrl" | "nonce">;

export type PluginRestQueryValue = string | number | boolean | null | undefined;

export interface PluginRestRequestOptions {
  method?: "GET" | "POST";
  path: string;
  query?: Record<string, PluginRestQueryValue>;
  body?: unknown;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildPluginRestUrl(
  restUrl: string,
  path: string,
  query?: Record<string, PluginRestQueryValue>
): string {
  const url = new URL(`${trimTrailingSlash(restUrl)}${path}`, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function buildHeaders(nonce: string, hasJsonBody: boolean): HeadersInit {
  if (!hasJsonBody) {
    return { "X-WP-Nonce": nonce };
  }

  return {
    "Content-Type": "application/json",
    "X-WP-Nonce": nonce,
  };
}

export interface PluginRestClient {
  request(options: PluginRestRequestOptions): Promise<Response>;
  get(path: string, query?: Record<string, PluginRestQueryValue>): Promise<Response>;
  post(
    path: string,
    body?: unknown,
    query?: Record<string, PluginRestQueryValue>
  ): Promise<Response>;
}

export function createPluginRestClient(config: PluginRestConfig): PluginRestClient {
  return {
    async request({ method = "GET", path, query, body }) {
      const hasJsonBody = body !== undefined;
      const init: RequestInit = {
        headers: buildHeaders(config.nonce, hasJsonBody),
      };

      if (method !== "GET") {
        init.method = method;
      }

      if (hasJsonBody) {
        init.body = JSON.stringify(body);
      }

      return fetch(buildPluginRestUrl(config.restUrl, path, query), init);
    },

    async get(path, query) {
      return this.request({ path, query });
    },

    async post(path, body, query) {
      return this.request({ method: "POST", path, query, body });
    },
  };
}
