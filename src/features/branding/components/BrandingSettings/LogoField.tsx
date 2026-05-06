import { DeleteOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Flex, Typography, theme } from "antd";
import { useCallback, useState } from "react";
import { openMediaPicker } from "../../../../utils/wpMedia";
import styles from "./BrandingSettings.module.css";

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
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSelect = useCallback(async () => {
    const result = await openMediaPicker({
      title: selectTitle,
      buttonText: selectButtonText,
    });

    if (result) {
      onSelect(result.id, result.url);
    }
  }, [onSelect, selectButtonText, selectTitle]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      // Delegate to media picker for now — files dropped here could
      // be uploaded via wp.media in a future iteration.
      void handleSelect();
    },
    [handleSelect]
  );

  return (
    <div
      className="wp-react-ui-inset-panel"
      style={{
        minWidth: 0,
        borderRadius: token.borderRadiusLG,
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

      {/* biome-ignore lint/a11y/useSemanticElements: A button cannot contain a nested drop zone with DnD handlers. The Upload/Replace button below provides the keyboard path. */}
      <div
        className={`${styles.logoPreviewBox} wp-react-ui-inset-panel`}
        role="button"
        tabIndex={0}
        aria-label={label}
        style={{
          borderRadius: token.borderRadiusLG,
          background: previewBackground ?? token.colorFillAlter,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void handleSelect();
          }
        }}
      >
        {isDragOver && (
          <div
            className={styles.dropOverlay}
            style={{
              background: `${token.colorPrimary}15`,
              color: token.colorPrimary,
            }}
          >
            <UploadOutlined className={styles.dropOverlayIcon} />
            <Text>{uploadLabel}</Text>
          </div>
        )}

        {logoUrl ? (
          <img src={logoUrl} alt={previewAlt} className={styles.logoPreviewImg} />
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
