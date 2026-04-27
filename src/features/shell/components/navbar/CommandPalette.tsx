import { HistoryOutlined, SearchOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { Button, Drawer, Empty, Flex, Input, type InputRef, Modal, Typography, theme } from "antd";
import { type FormEvent, startTransition, useDeferredValue, useMemo, useRef } from "react";
import { useStore } from "zustand";
import {
  buildMenuPaletteItems,
  buildRecentPaletteItems,
  dedupePaletteItems,
  type PaletteItem,
  searchPaletteItems,
} from "../../../../utils/commandPalette";
import {
  hasNativeCommandPalette,
  openNativeCommandPalette,
} from "../../../../utils/nativeCommandPalette";
import { useMenu } from "../../../navigation/hooks/useMenu";
import { navigationStore } from "../../../navigation/store/navigationStore";
import { useShellConfig } from "../../context/ShellConfigContext";
import { useSidebar } from "../../context/SidebarContext";
import { shellPreferencesStore } from "../../store/shellPreferencesStore";

const { Text } = Typography;

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
          marginBottom: 6,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: token.colorTextQuaternary,
          paddingLeft: 4,
        }}
      >
        {title}
      </Text>

      <Flex vertical gap={2}>
        {items.map((item) => {
          const isFavorite = !!item.slug && favorites.includes(item.slug);

          return (
            // biome-ignore lint/a11y/useSemanticElements: contains nested Ant Design Button, cannot use <button>
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
              className="wp-react-ui-palette-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 10px",
                borderRadius: token.borderRadiusLG,
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background:
                    item.source === "recent" ? token.colorFillSecondary : `${token.colorPrimary}14`,
                  color: item.source === "recent" ? token.colorTextTertiary : token.colorPrimary,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 13,
                }}
              >
                {item.source === "recent" ? <HistoryOutlined /> : <SearchOutlined />}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  strong
                  style={{
                    display: "block",
                    fontSize: 13,
                    lineHeight: 1.35,
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
                    fontSize: 11,
                    lineHeight: 1.35,
                    color: token.colorTextTertiary,
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
                  size="small"
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  className={
                    isFavorite
                      ? "wp-react-ui-palette-star wp-react-ui-palette-star--active"
                      : "wp-react-ui-palette-star"
                  }
                  icon={
                    isFavorite ? (
                      <StarFilled style={{ color: token.colorWarning, fontSize: 13 }} />
                    ) : (
                      <StarOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
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
      searchPaletteItems(
        dedupePaletteItems([...recentPaletteItems, ...menuPaletteItems]),
        deferredQuery
      ).slice(0, 16),
    [recentPaletteItems, menuPaletteItems, deferredQuery]
  );

  const hasQuery = deferredQuery.trim().length > 0;
  const suggestedItems = useMemo(() => menuPaletteItems.slice(0, 8), [menuPaletteItems]);

  const handleSelect = (item: PaletteItem) => {
    closePalette();
    navigationStore.getState().navigate(item.url);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstItem = hasQuery
      ? searchResults[0]
      : (favoriteItems[0] ?? recentPaletteItems[0] ?? suggestedItems[0]);

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
      {/* Search header */}
      <div
        style={{
          padding: isMobile ? "14px 16px 12px" : "18px 20px 14px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          flexShrink: 0,
        }}
      >
        <form onSubmit={handleSubmit}>
          <Input
            ref={inputRef}
            value={paletteQuery}
            size="large"
            autoComplete="off"
            allowClear
            placeholder="Search pages, plugins, settings..."
            prefix={
              <SearchOutlined
                style={{
                  color: paletteQuery ? token.colorPrimary : token.colorTextTertiary,
                  fontSize: 16,
                  transition: "color 150ms ease",
                }}
              />
            }
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => {
                setPaletteQuery(nextValue);
              });
            }}
            style={{
              borderRadius: token.borderRadiusLG,
              fontSize: 15,
            }}
          />
        </form>
        <Flex align="center" style={{ marginTop: 10, minHeight: 20 }}>
          <Text style={{ fontSize: 11, color: token.colorTextQuaternary }}>
            Jump to pages, reopen recent screens, and pin favorites.
          </Text>
          {!isMobile && (
            <Flex gap={4} style={{ marginLeft: "auto", flexShrink: 0 }}>
              {(["↵ open", "Esc close"] as const).map((hint) => (
                <span
                  key={hint}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 7px",
                    borderRadius: token.borderRadiusSM,
                    background: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    fontSize: 10,
                    fontWeight: 600,
                    color: token.colorTextQuaternary,
                    lineHeight: 1.8,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {hint}
                </span>
              ))}
            </Flex>
          )}
        </Flex>
      </div>

      {/* Results area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: isMobile ? "12px 16px" : "14px 20px",
        }}
      >
        <Flex vertical gap={16}>
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
              <Flex vertical align="center" justify="center" style={{ padding: "32px 0" }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Text style={{ color: token.colorTextTertiary }}>
                      No pages found for &ldquo;{deferredQuery}&rdquo;
                    </Text>
                  }
                />
              </Flex>
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
      width={680}
      style={{ top: "6vh" }}
      destroyOnHidden
      styles={{
        body: { padding: 0, overflow: "hidden", borderRadius: token.borderRadiusLG },
      }}
    >
      <div style={{ height: "min(62vh, 600px)" }}>{content}</div>
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
          className="wp-react-ui-navbar-search-button"
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
        // biome-ignore lint/a11y/useSemanticElements: wraps Input component, cannot use <button> (nested interactive elements)
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
            maxWidth: 280,
            minWidth: 160,
            cursor: "pointer",
          }}
        >
          <Input
            className="wp-react-ui-navbar-search-input"
            readOnly
            tabIndex={-1}
            size="large"
            value=""
            placeholder="Search pages, plugins, settings..."
            prefix={<SearchOutlined style={{ color: token.colorTextTertiary, fontSize: 16 }} />}
            suffix={
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: token.colorFillAlter,
                  fontSize: 10,
                  fontWeight: 700,
                  color: token.colorTextTertiary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  lineHeight: 1.6,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.02em",
                }}
              >
                {nativePaletteAvailable ? "⌘K" : "Search"}
              </span>
            }
            style={{
              height: 40,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
              boxShadow: "none",
            }}
            styles={{
              input: {
                cursor: "pointer",
                fontSize: 13,
                top: "-2px",
              },
              prefix: {
                marginInlineEnd: 8,
              },
            }}
          />
        </div>
      )}

      {!nativePaletteAvailable && <PaletteBody />}
    </>
  );
}
