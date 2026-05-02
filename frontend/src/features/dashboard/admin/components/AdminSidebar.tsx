import navItems from "../config/adminNav.json";
import { SidebarItem } from "../../client/components/SidebarItem";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { ThemeToggle } from "../../../../components/layout/ThemeToggle";
import { useLanguage } from "../../../../hooks/useLanguage";
import { useTheme } from "../../../../hooks/useTheme";
import { landingContent } from "../../../../content/landing";

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  onSignOut: () => void;
}

export function AdminSidebar({ isCollapsed, toggleCollapse, onSignOut }: SidebarProps) {
  const language = useLanguage();
  const theme = useTheme();
  const content = landingContent[language.locale];

  return (
    <aside
      className={`
        flex flex-col h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-sm transition-all duration-300
        ${isCollapsed ? "w-20" : "w-64"}
      `}
    >
      {/* Header / Logo */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        {!isCollapsed && <span className="text-xl font-bold text-[var(--color-primary)]">ClaimGuard Admin</span>}
        <button
          onClick={toggleCollapse}
          className="p-1 rounded-md text-[var(--color-muted)] hover:bg-[var(--color-bg)] transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <SidebarItem
            key={item.id}
            label={item.label}
            path={item.path}
            iconName={item.icon}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Footer / Controls */}
      <div className={`p-4 border-t border-[var(--color-border)] flex ${isCollapsed ? 'flex-col items-center gap-4' : 'flex-row items-center justify-between gap-2'}`}>
        <div className="flex-shrink-0">
          <ThemeToggle labels={content.theme} theme={theme} />
        </div>
        
        <button
          onClick={onSignOut}
          title="Sign Out"
          className={`
            flex items-center p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors
            ${isCollapsed ? "justify-center w-full" : "justify-center flex-1"}
          `}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="ml-2 font-medium text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
