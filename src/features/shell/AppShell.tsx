import { LicenseGraceBanner } from "../license/components/LicenseGraceBanner";
import { AriaLiveRegion } from "./components/AriaLiveRegion";
import ContentFrame from "./components/ContentFrame";
import Navbar from "./components/navbar";
import { SkipToContent } from "./components/SkipToContent";
import Sidebar from "./components/sidebar";

export default function App() {
  return (
    <div className="wp-react-ui-shell">
      <SkipToContent />
      <AriaLiveRegion />
      <div className="wp-react-ui-shell-sidebar-slot">
        <Sidebar />
      </div>

      <div className="wp-react-ui-shell-navbar-slot">
        <Navbar />
      </div>

      <LicenseGraceBanner />
      <ContentFrame />
    </div>
  );
}
