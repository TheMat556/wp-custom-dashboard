import ContentFrame from "./components/ContentFrame";
import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";

export default function App() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--sidebar-width, 240px) minmax(0, 1fr)",
        gridTemplateRows: "64px 1fr",
        gridTemplateAreas: '"sidebar navbar" "sidebar content"',
        transition: "grid-template-columns 0.2s ease",
        width: "100%",
        height: "100%",
        minHeight: "100%",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          gridArea: "sidebar",
          minWidth: 0,
          pointerEvents: "auto",
        }}
      >
        <Sidebar />
      </div>

      <div
        style={{
          gridArea: "navbar",
          minWidth: 0,
          pointerEvents: "auto",
        }}
      >
        <Navbar />
      </div>

      <ContentFrame />
    </div>
  );
}
