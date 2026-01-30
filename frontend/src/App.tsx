import { Routes, Route } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import Sidebar from "./components/sidebar/sidebar";
import AnalyticsMeetings from "./components/analytics/AnalyticsMeetings";

import useMediaQuery from "./helpers/useMediaQuery";

function DashboardPage({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return <AnalyticsMeetings onOpenSidebar={onOpenSidebar} />;
}

export default function App() {
  
  const isDesktop = useMediaQuery("(min-width: 1024px)"); // lg
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // logout handler
  const auth = useContext(AuthContext);
  const handleLogout = () => auth?.setUser?.(null);

  // على الموبايل/تابلت: خليها collapsed + اقفل drawer
  useEffect(() => {
    if (!isDesktop) {
      setCollapsed(true);
      setMobileOpen(false);
    }
  }, [isDesktop]);

  const contentPad = isDesktop ? (collapsed ? "lg:pl-20" : "lg:pl-64") : "";

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar
  collapsed={collapsed}
  setCollapsed={setCollapsed}
  mobileOpen={mobileOpen}
  setMobileOpen={setMobileOpen}
  isDesktop={isDesktop}
  onLogout={handleLogout}
/>


      <main className={`transition-all duration-300 ${contentPad}`}>
        <div className="p-3 sm:p-4 lg:p-6 overflow-y-auto min-h-screen">
          <Routes>
            <Route
              path="/"
              element={<DashboardPage onOpenSidebar={() => setMobileOpen(true)} />}
            />
            <Route
              path="/wordpress-dashboard"
              element={<DashboardPage onOpenSidebar={() => setMobileOpen(true)} />}
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}
