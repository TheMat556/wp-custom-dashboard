import {
  HistoryOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import {
  Button,
  Drawer,
  Empty,
  Flex,
  Input,
  type InputRef,
  Modal,
  Typography,
  theme,
} from "antd";
import { startTransition, type FormEvent, useDeferredValue, useEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";
import { useShellConfig } from "../../context/ShellConfigContext";
import { useSidebar } from "../../context/SidebarContext";
import { navigationStore } from "../../../navigation/store/navigationStore";
import { shellPreferencesStore } from "../../store/shellPreferencesStore";
import {
  buildMenuPaletteItems,
  buildRecentPaletteItems,
  dedupePaletteItems,
  searchPaletteItems,
  type PaletteItem,
} from "../../../../utils/commandPalette";
import {
  hasNativeCommandPalette,
  openNativeCommandPalette,
} from "../../../../utils/nativeCommandPalette";
import { useMenu } from "../../../navigation/hooks/useMenu";

const { Text, Title } = Typography;

function PaletteSection({
  title,
  items,
  favorites,
  onSelect,
  onToggleFavorite,
}: {
  title: string;
  items: PaletteItem[];
  favorites: string[];
  onSelect: (item: PaletteItem) => void;
  onToggleFavorite: (slug: string) => void;
}) {
  const { token } = theme.useToken();

  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <Text
        style={{
          display: "block",
          marginBottom: 10,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: token.colorTextTertiary,
        }}
      >
        {title}
      </Text>

      <Flex vertical gap={8}>
        {items.map((item) => {
          const isFavorite = !!item.slug && favorites.includes(item.slug);

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(item);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "12px 14px",
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: item.source === "recent" ? token.colorFillSecondary : `${token.colorPrimary}12`,
                  color: item.source === "recent" ? token.colorTextSecondary : token.colorPrimary,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.source === "recent" ? <HistoryOutlined /> : <SearchOutlined />}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  strong
                  style={{
                    display: "block",
                    fontSize: 14,
                    color: token.colorTextHeading,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: token.colorTextSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.subtitle}
                </Text>
              </div>

              {item.slug && (
                <Button
                  type="text"
                  shape="circle"
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  icon={
                    isFavorite ? (
                      <StarFilled style={{ color: token.colorWarning }} />
                    ) : (
                      <StarOutlined style={{ color: token.colorTextTertiary }} />
                    )
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleFavorite(item.slug as string);
                  }}
                />
              )}
            </div>
          );
        })}
      </Flex>
    </section>
  );
}

function PaletteBody() {
  const { adminUrl } = useShellConfig();
  const { isMobile } = useSidebar();
  const { menuItems } = useMenu();
  const { token } = theme.useToken();

  const paletteOpen = useStore(shellPreferencesStore, (state) => state.paletteOpen);
  const paletteQuery = useStore(shellPreferencesStore, (state) => state.paletteQuery);
  const favorites = useStore(shellPreferencesStore, (state) => state.favorites);
  const recentPages = useStore(shellPreferencesStore, (state) => state.recentPages);
  const closePalette = useStore(shellPreferencesStore, (state) => state.closePalette);
  const setPaletteQuery = useStore(shellPreferencesStore, (state) => state.setPaletteQuery);
  const toggleFavorite = useStore(shellPreferencesStore, (state) => state.toggleFavorite);

  const inputRef = useRef<InputRef>(null);
  const deferredQuery = useDeferredValue(paletteQuery);

  const menuPaletteItems = useMemo(
    () => buildMenuPaletteItems(menuItems, adminUrl),
    [menuItems, adminUrl]
  );
  const favoriteItems = useMemo(
    () =>
      menuPaletteItems
        .filter((item) => item.slug && favorites.includes(item.slug))
        .sort(
          (left, right) =>
            favorites.indexOf(left.slug as string) - favorites.indexOf(right.slug as string)
        ),
    [menuPaletteItems, favorites]
  );
  const recentPaletteItems = useMemo(
    () => buildRecentPaletteItems(recentPages, menuPaletteItems),
    [recentPages, menuPaletteItems]
  );
  const searchResults = useMemo(
    () =>
      searchPaletteItems(dedupePaletteItems([...recentPaletteItems, ...menuPaletteItems]), deferredQuery)
        .slice(0, 16),
    [recentPaletteItems, menuPaletteItems, deferredQuery]
  );

  const hasQuery = deferredQuery.trim().length > 0;
  const suggestedItems = useMemo(() => menuPaletteItems.slice(0, 8), [menuPaletteItems]);

  useEffect(() => {
    if (!paletteOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({
        cursor: "all",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [paletteOpen]);

  const handleSelect = (item: PaletteItem) => {
    closePalette();
    navigationStore.getState().navigate(item.url);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstItem = hasQuery
      ? searchResults[0]
      : favoriteItems[0] ?? recentPaletteItems[0] ?? suggestedItems[0];

    if (firstItem) {
      handleSelect(firstItem);
    }
  };

  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: token.colorBgLayout,
      }}
    >
      <div
        style={{
          padding: isMobile ? 16 : 20,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Title level={4} style={{ marginTop: 0, marginBottom: 6 }}>
          Search Admin
        </Title>
        <Text type="secondary" style={{ display: "block", marginBottom: 14 }}>
          Jump to pages, reopen recent screens, and pin favorites.
        </Text>
        <form onSubmit={handleSubmit}>
          <Input
            ref={inputRef}
            value={paletteQuery}
            size="large"
            placeholder="Search pages, plugins, settings..."
            prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => {
                setPaletteQuery(nextValue);
              });
            }}
          />
        </form>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: isMobile ? 16 : 20,
        }}
      >
        <Flex vertical gap={20}>
          {hasQuery ? (
            searchResults.length > 0 ? (
              <PaletteSection
                title="Results"
                items={searchResults}
                favorites={favorites}
                onSelect={handleSelect}
                onToggleFavorite={toggleFavorite}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No matching pages found."
              />
            )
          ) : (
            <>
              <PaletteSection
                title="Favorites"
                items={favoriteItems}
                favorites={favorites}
                onSelect={handleSelect}
                onToggleFavorite={toggleFavorite}
              />

              <PaletteSection
                title="Recent"
                items={recentPaletteItems}
                favorites={favorites}
                onSelect={handleSelect}
                onToggleFavorite={toggleFavorite}
              />

              <PaletteSection
                title="Suggested"
                items={suggestedItems}
                favorites={favorites}
                onSelect={handleSelect}
                onToggleFavorite={toggleFavorite}
              />
            </>
          )}
        </Flex>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={paletteOpen}
        onClose={closePalette}
        placement="top"
        height="100%"
        title={null}
        closeIcon={null}
        destroyOnHidden
        styles={{
          body: { padding: 0 },
          header: { display: "none" },
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Modal
      open={paletteOpen}
      onCancel={closePalette}
      footer={null}
      title={null}
      width={720}
      destroyOnHidden
      styles={{
        body: { padding: 0 },
      }}
    >
      <div style={{ height: "70vh", minHeight: 480 }}>{content}</div>
    </Modal>
  );
}

export function CommandPaletteTrigger({ compact: forceCompact = false }: { compact?: boolean }) {
  const { token } = theme.useToken();
  const { isMobile } = useSidebar();
  const nativePaletteAvailable = hasNativeCommandPalette();
  const openPalette = useStore(shellPreferencesStore, (state) => state.openPalette);

  const handleOpen = () => {
    if (nativePaletteAvailable && openNativeCommandPalette()) {
      return;
    }

    openPalette();
  };

  const showIconOnly = isMobile || forceCompact;

  return (
    <>
      {showIconOnly ? (
        <Button
          type="default"
          onClick={handleOpen}
          icon={<SearchOutlined style={{ color: token.colorTextSecondary, fontSize: 18 }} />}
          title="Search admin"
          aria-label="Search admin"
          style={{
            width: 40,
            height: 40,
            paddingInline: 0,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
            boxShadow: "none",
          }}
        />
      ) : (
        <div
          onClick={handleOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleOpen();
            }
          }}
          role="button"
          tabIndex={0}
          title="Search admin"
          aria-label="Search admin"
          style={{
            width: "100%",
            maxWidth: 300,
            minWidth: 180,
            cursor: "pointer",
          }}
        >
          <Input
            readOnly
            size="large"
            value=""
            placeholder="Search pages, plugins, settings..."
            prefix={<SearchOutlined style={{ color: token.colorTextTertiary, fontSize: 16 }} />}
            suffix={
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: token.colorFillAlter,
                  fontSize: 11,
                  fontWeight: 600,
                  color: token.colorTextTertiary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                }}
              >
                {nativePaletteAvailable ? "Cmd/Ctrl+K" : "Search"}
              </span>
            }
            style={{
              height: 46,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
              boxShadow: "none",
            }}
            styles={{
              input: {
                cursor: "pointer",
                fontSize: 14,
              },
              prefix: {
                marginInlineEnd: 10,
              },
            }}
          />
        </div>
      )}

      {!nativePaletteAvailable && <PaletteBody />}
    </>
  );
}
