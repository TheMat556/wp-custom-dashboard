import type { CoreWpRestConfig } from "../client/coreWpRestClient";
import { createCoreWpRestClient } from "../client/coreWpRestClient";

export interface QuickDraftPayload {
  title: string;
  content: string;
}

export interface PostsGateway {
  createDraft(input: QuickDraftPayload): Promise<Response>;
}

export function createPostsGateway(config: CoreWpRestConfig): PostsGateway {
  const client = createCoreWpRestClient(config);

  return {
    async createDraft({ title, content }) {
      return client.post("/wp/v2/posts", {
        title,
        content,
        status: "draft",
      });
    },
  };
}
