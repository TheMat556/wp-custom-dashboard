import { message } from "antd";
import { useCallback, useState } from "react";
import { createPostsGateway } from "../../../platform/wordpress/gateway/postsGateway";
import { useShellConfig } from "../../shell/context/ShellConfigContext";

export interface QuickDraftValues {
  title: string;
  content: string;
}

export interface UseQuickDraftOptions {
  onSuccess?: () => void;
}

export function useQuickDraft({ onSuccess }: UseQuickDraftOptions = {}) {
  const { nonce } = useShellConfig();
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (values: QuickDraftValues) => {
      const title = values.title?.trim();

      if (!title) {
        return;
      }

      setSaving(true);

      try {
        const response = await createPostsGateway({ nonce }).createDraft({
          title,
          content: values.content?.trim() || "",
        });

        if (response.ok) {
          message.success("Draft saved");
          onSuccess?.();
        } else {
          message.error("Failed to save draft");
        }
      } catch {
        message.error("Failed to save draft");
      } finally {
        setSaving(false);
      }
    },
    [nonce, onSuccess]
  );

  return {
    saving,
    handleSubmit,
  };
}
