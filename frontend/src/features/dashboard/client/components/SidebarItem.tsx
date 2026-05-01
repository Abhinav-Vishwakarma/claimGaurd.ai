import React from "react";
import { navigate, usePath } from "../../../../hooks/usePath";
import * as LucideIcons from "lucide-react";

interface SidebarItemProps {
  id: string;
  label: string;
  path: string;
  iconName: string;
  isCollapsed: boolean;
}

export function SidebarItem({ id, label, path, iconName, isCollapsed }: SidebarItemProps) {
  const currentPath = usePath();
  const isActive = currentPath === path || currentPath.startsWith(path + "/");
  
  // Dynamically grab the lucide icon
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Circle;

  return (
    <button
      onClick={() => navigate(path)}
      title={isCollapsed ? label : undefined}
      className={`
        w-full flex items-center p-3 my-1 rounded-lg transition-colors duration-200
        ${isActive 
          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-l-4 border-[var(--color-primary)]" 
          : "text-[var(--color-muted)] hover:bg-[var(--color-bg)] border-l-4 border-transparent"}
      `}
    >
      <IconComponent className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && (
        <span className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all text-left flex-1">
          {label}
        </span>
      )}
    </button>
  );
}