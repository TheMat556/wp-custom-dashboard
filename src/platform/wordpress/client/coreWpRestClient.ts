import type { WpReactUiConfig } from "../../../types/wp";

export type CoreWpRestConfig = Pick<WpReactUiConfig, "nonce"> & {
  apiRoot?: string;
};

export type CoreWpRestQueryValue = string | number | boolean | null | undefined;

export interface CoreWpRestRequestOptions {
  method?: "GET" | "POST";
  path: string;
  query?: Record<string, CoreWpRestQueryValue>;
  body?: unknown;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildCoreWpRestUrl(
  apiRoot: string,
  path: string,
  query?: Record<string, CoreWpRestQueryValue>
): string {
  const trimmedRoot = trimTrailingSlash(apiRoot);
  const url = new URL(`${trimmedRoot}${path}`, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  if (trimmedRoot.startsWith("/")) {
    return `${url.pathname}${url.search}${url.hash}`;
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

export interface CoreWpRestClient {
  request(options: CoreWpRestRequestOptions): Promise<Response>;
  get(path: string, query?: Record<string, CoreWpRestQueryValue>): Promise<Response>;
  post(
    path: string,
    body?: unknown,
    query?: Record<string, CoreWpRestQueryValue>
  ): Promise<Response>;
}

export function createCoreWpRestClient(config: CoreWpRestConfig): CoreWpRestClient {
  const apiRoot = config.apiRoot ?? "/wp-json";

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

      return fetch(buildCoreWpRestUrl(apiRoot, path, query), init);
    },

    async get(path, query) {
      return this.request({ path, query });
    },

    async post(path, body, query) {
      return this.request({ method: "POST", path, query, body });
    },
  };
}
