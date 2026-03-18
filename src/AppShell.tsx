import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 overflow-y-auto">
          {/* WordPress content stays visible underneath/outside actual mount area */}
        </div>
      </main>
    </div>
  )
}