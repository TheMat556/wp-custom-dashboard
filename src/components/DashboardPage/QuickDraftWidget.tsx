import { Button, Card, Form, Input, message, theme } from "antd";
import { useCallback, useState } from "react";
import { useShellConfig } from "../../context/ShellConfigContext";

export function QuickDraftWidget() {
  const { token } = theme.useToken();
  const { nonce } = useShellConfig();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (values: { title: string; content: string }) => {
      if (!values.title?.trim()) return;
      setSaving(true);

      try {
        const response = await fetch("/wp-json/wp/v2/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": nonce,
          },
          body: JSON.stringify({
            title: values.title.trim(),
            content: values.content?.trim() || "",
            status: "draft",
          }),
        });

        if (response.ok) {
          message.success("Draft saved");
          form.resetFields();
        } else {
          message.error("Failed to save draft");
        }
      } catch {
        message.error("Failed to save draft");
      } finally {
        setSaving(false);
      }
    },
    [nonce, form]
  );

  return (
    <Card
      title="Quick Draft"
      styles={{ body: { padding: "16px 20px" } }}
      style={{ borderRadius: token.borderRadiusLG }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
          <Input placeholder="Draft title..." />
        </Form.Item>
        <Form.Item name="content" label="Content">
          <Input.TextArea rows={3} placeholder="What's on your mind?" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Save Draft
        </Button>
      </Form>
    </Card>
  );
}
