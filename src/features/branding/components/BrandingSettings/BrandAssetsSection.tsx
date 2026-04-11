import { PictureOutlined } from "@ant-design/icons";
import { LogoField } from "./LogoField";
import { SurfaceCard } from "./SurfaceCard";

interface BrandAssetsSectionProps {
  t: (key: string, vars?: Record<string, string | number>) => string;
  isLg: boolean;
  lightLogoId: number;
  lightLogoUrl: string | null;
  darkLogoId: number;
  darkLogoUrl: string | null;
  onLightLogoSelect: (id: number, url: string) => void;
  onLightLogoRemove: () => void;
  onDarkLogoSelect: (id: number, url: string) => void;
  onDarkLogoRemove: () => void;
}

export function BrandAssetsSection({
  t,
  isLg,
  lightLogoId,
  lightLogoUrl,
  darkLogoId,
  darkLogoUrl,
  onLightLogoSelect,
  onLightLogoRemove,
  onDarkLogoSelect,
  onDarkLogoRemove,
}: BrandAssetsSectionProps) {
  return (
    <SurfaceCard
      title={t("Brand Assets In The Sidebar")}
      description={t("Upload the logo variants used in the shell sidebar.")}
      icon={<PictureOutlined />}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isLg ? "repeat(2, minmax(0, 1fr))" : "1fr",
          gap: 24,
        }}
      >
        <LogoField
          label={t("Light Theme Logo")}
          description=""
          logoId={lightLogoId}
          logoUrl={lightLogoUrl}
          previewBackground="#ffffff"
          previewAlt={t("{label} preview", { label: t("Light Theme Logo") })}
          selectTitle={t("Select image")}
          selectButtonText={t("Use image")}
          uploadLabel={t("Upload")}
          replaceLabel={t("Replace")}
          deleteLabel={t("Delete")}
          emptyLabel={t("No image selected")}
          onSelect={onLightLogoSelect}
          onRemove={onLightLogoRemove}
        />

        <LogoField
          label={t("Dark Theme Logo")}
          description=""
          logoId={darkLogoId}
          logoUrl={darkLogoUrl}
          previewBackground="#1f2430"
          previewAlt={t("{label} preview", { label: t("Dark Theme Logo") })}
          selectTitle={t("Select image")}
          selectButtonText={t("Use image")}
          uploadLabel={t("Upload")}
          replaceLabel={t("Replace")}
          deleteLabel={t("Delete")}
          emptyLabel={t("No image selected")}
          onSelect={onDarkLogoSelect}
          onRemove={onDarkLogoRemove}
        />
      </div>
    </SurfaceCard>
  );
}
