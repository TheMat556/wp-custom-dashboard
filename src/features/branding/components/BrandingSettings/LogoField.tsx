import { DeleteOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Flex, Typography, theme } from "antd";
import { useCallback } from "react";
import { openMediaPicker } from "../../../../utils/wpMedia";

const { Text } = Typography;

interface LogoFieldProps {
  label: string;
  description: string;
  logoId: number;
  logoUrl: string | null;
  previewBackground?: string;
  previewAlt: string;
  selectTitle: string;
  selectButtonText: string;
  uploadLabel: string;
  replaceLabel: string;
  deleteLabel: string;
  emptyLabel: string;
  onSelect: (id: number, url: string) => void;
  onRemove: () => void;
}

export function LogoField({
  label,
  description,
  logoId,
  logoUrl,
  previewBackground,
  previewAlt,
  selectTitle,
  selectButtonText,
  uploadLabel,
  replaceLabel,
  deleteLabel,
  emptyLabel,
  onSelect,
  onRemove,
}: LogoFieldProps) {
  const { token } = theme.useToken();

  const handleSelect = useCallback(async () => {
    const result = await openMediaPicker({
      title: selectTitle,
      buttonText: selectButtonText,
    });

    if (result) {
      onSelect(result.id, result.url);
    }
  }, [onSelect, selectButtonText, selectTitle]);

  return (
    <div
      style={{
        minWidth: 0,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        padding: 28,
      }}
    >
      <Flex justify="space-between" align="baseline" gap={12} style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: token.colorTextTertiary,
          }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 12, color: token.colorTextQuaternary }}>{description}</Text>
      </Flex>

      <div
        style={{
          height: 160,
          marginBottom: 18,
          padding: 18,
          borderRadius: token.borderRadiusLG,
          background: previewBackground ?? token.colorFillAlter,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={previewAlt}
            style={{
              display: "block",
              width: "auto",
              height: "auto",
              maxWidth: "min(100%, 240px)",
              maxHeight: 72,
              objectFit: "contain",
            }}
          />
        ) : (
          <Flex vertical align="center" gap={10}>
            <PictureOutlined style={{ fontSize: 28, color: token.colorTextQuaternary }} />
            <Text type="secondary" style={{ fontSize: 14 }}>
              {emptyLabel}
            </Text>
          </Flex>
        )}
      </div>

      <Flex gap={10} wrap>
        <Button type="default" onClick={handleSelect} icon={<UploadOutlined />}>
          {logoId ? replaceLabel : uploadLabel}
        </Button>
        {logoId > 0 && (
          <Button danger onClick={onRemove} icon={<DeleteOutlined />}>
            {deleteLabel}
          </Button>
        )}
      </Flex>
    </div>
  );
}
