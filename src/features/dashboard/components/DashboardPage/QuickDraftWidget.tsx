import { Button, Card, Form, Input, theme } from "antd";
import { useQuickDraft } from "../../hooks/useQuickDraft";

export function QuickDraftWidget() {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const { saving, handleSubmit } = useQuickDraft({
    onSuccess: () => {
      form.resetFields();
    },
  });

  return (
    <Card
      className="wp-react-ui-dashboard-widget-card"
      title="Quick Draft"
      style={{ borderRadius: token.borderRadiusLG }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: "Title is required" }]}
        >
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
