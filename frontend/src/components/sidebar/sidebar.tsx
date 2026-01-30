import { NavLink } from "react-router-dom";
import { useState } from "react";
import aptemIcon from "@/assets/aptem_logo.jpg";

type SidebarProps = {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;

  isDesktop: boolean;
  onLogout?: () => void;
};

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  isDesktop,
  onLogout
}: SidebarProps) {
  const isDrawer = !isDesktop;

  return (
    <>
      {/* Overlay mobile/tablet*/}
      {isDrawer && mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        />
      )}

      <aside
        className={[
          "bg-gradient-to-b from-[#241453] to-[#442F73] text-gray-200",
          "flex flex-col justify-between transition-all duration-300",
          "z-50",
          // Desktop: fixed
          isDesktop ? "fixed left-0 top-0 h-screen" : "fixed left-0 top-0 h-screen w-64",
          // Drawer behavior
          isDrawer ? (mobileOpen ? "translate-x-0" : "-translate-x-full") : "",
          // Desktop width
          isDesktop ? (collapsed ? "w-20" : "w-64") : "",
        ].join(" ")}
      >
        {/* Toggle collapse button (Desktop only) */}
        {isDesktop && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={[
              "absolute right-0 top-16 z-50",
              "translate-x-1/2",
              "w-9 h-9 rounded-full shadow-md",
              "bg-[#CEA869] text-[#644D93] border border-[#CEA869]",
              "flex items-center justify-center",
              "hover:scale-105 transition",
            ].join(" ")}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i
              className={`fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-left"
                }`}
            />
          </button>
        )}

        {/* Top */}
        <div>
          <div className="p-6 text-2xl font-bold text-white flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
              <i className="fa-solid fa-graduation-cap" />
            </span>

            {(!collapsed || !isDesktop) && <span>Coaches</span>}

            {/* Close drawer button (Mobile only) */}
            {!isDesktop && (
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="ml-auto w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 transition flex items-center justify-center"
                aria-label="Close menu"
              >
                ✕
              </button>
            )}
          </div>

          <nav className="px-3 space-y-2">
            <SidebarLink
              to="/wordpress-dashboard"
              collapsed={collapsed && isDesktop}
              icon="fa-gauge"
              label="WordPress Dashboard"
              onClick={() => {
                if (!isDesktop) setMobileOpen(false);
              }}
            />

            <SidebarExternalLink
              href="https://kentbusinesscollege.org/user-account"
              collapsed={collapsed && isDesktop}
              icon="fa-book"
              label="LMS"
              onClick={() => {
                if (!isDesktop) setMobileOpen(false);
              }}
            />

            <SidebarExternalLink
              href="https://kentbusinesscollege.org/psychological-dashboard/"
              collapsed={collapsed && isDesktop}
              icon="fa-user"
              label="Who I am"
              onClick={() => {
                if (!isDesktop) setMobileOpen(false);
              }}
            />

            <SidebarExternalLink
              href="https://kentbusinesscollege.aptem.co.uk/pwa/auth/login?returnUrl=%2Fdashboard"
              collapsed={collapsed && isDesktop}
              iconImg={aptemIcon}
              label="Aptem"
              onClick={() => {
                if (!isDesktop) setMobileOpen(false);
              }}
            />

            {/* Mobile-only Logout */}
        {!isDesktop && (
          <button
            onClick={() => {
              onLogout?.();
              setMobileOpen(false);
            }}
            className="
      w-full mb-3
      h-11 rounded-xl
      bg-[#241453] text-white
      text-sm font-medium
      hover:bg-[#442F73]
      transition
      flex items-center justify-center gap-2
    "
          >
            <i className="fa-solid fa-right-from-bracket" />
            Logout
          </button>
        )}
          </nav>
        </div>

        {/* Bottom CTA */}
        <div className="p-4">
          <DownloadReportCard collapsed={collapsed && isDesktop} />
        </div>
      </aside>
    </>
  );
}

function SidebarLink({
  to,
  icon,
  label,
  collapsed,
  onClick,
}: {
  to: string;
  icon: string;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) => {
        if (collapsed) {
          return [
            "flex items-center justify-center",
            "h-11 w-11 mx-auto",
            "rounded-xl transition",
            isActive ? "bg-white/15" : "hover:bg-white/10",
          ].join(" ");
        }

        return [
          "group flex items-center gap-3 px-4 py-2 rounded-md transition",
          isActive
            ? "bg-gradient-to-b from-[#866CB6] to-[#A88CD9] text-white"
            : "hover:bg-[#442F73]",
        ].join(" ");
      }}
    >
      <i className={`fa-solid ${icon}`} />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function SidebarExternalLink({
  href,
  icon,
  iconImg,
  label,
  collapsed,
  onClick,
}: {
  href: string;
  icon?: string;
  iconImg?: string;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const base = collapsed
    ? "flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition hover:bg-white/10"
    : "group flex items-center gap-3 px-4 py-2 rounded-md transition hover:bg-[#442F73]";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={collapsed ? label : undefined}
      className={base}
      onClick={onClick}
    >
      <span className={collapsed ? "" : "w-6 text-center"}>
        {iconImg ? (
          <img src={iconImg} alt="" className="w-5 h-5 object-contain inline-block" />
        ) : (
          <i className={`fa-solid ${icon ?? "fa-link"}`} />
        )}
      </span>

      {!collapsed && <span className="truncate">{label}</span>}
    </a>
  );
}

/* DownloadReportCard  */
function DownloadReportCard({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);

  if (collapsed) {
    return (
      <div className="relative flex justify-center">
        <button
          type="button"
          title="Export"
          onClick={() => setOpen((v) => !v)}
          className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/20 text-white flex items-center justify-center transition"
        >
          <i className="fa-solid fa-arrow-up-right-from-square" />
        </button>

        {open && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#A88CD9] rounded-lg shadow-lg text-sm w-36 overflow-hidden border border-white/20 z-50">
            <button className="block w-full text-left px-4 py-2 hover:bg-white/30">
              PDF
            </button>
            <button className="block w-full text-left px-4 py-2 hover:bg-white/30">
              CSV
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-b from-[#A88CD9] to-[#866CB6] rounded-2xl p-5 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="absolute top-4 right-4 bg-[#F9F5FF] text-[#644D93] w-9 h-9 rounded-full flex items-center justify-center shadow-md">
        ↗
      </div>

      <h3 className="text-lg font-medium text-white">Download</h3>
      <p className="text-base font-semibold text-[#241453] mb-4">Report</p>

      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-[#241453] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#442F73] transition"
      >
        Export
      </button>

      {open && (
        <div className="absolute bottom-16 left-5 bg-[#e2e1e1] rounded-lg shadow-lg text-sm w-36 overflow-hidden border border-white/20 z-50">
          <button className="block w-full text-left text-[#241453] px-4 py-2 hover:bg-[#A88CD9]/30">
            PDF
          </button>
          <button className="block w-full text-left text-[#241453] px-4 py-2 hover:bg-[#A88CD9]/30">
            CSV
          </button>
        </div>
      )}
    </div>
  );
}
