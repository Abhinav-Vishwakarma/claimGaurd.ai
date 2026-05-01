import { FileText, CheckCircle2, Circle } from "lucide-react";
import type { MedicalVaultItem, VaultItemType } from "../types/dashboard.types";

interface DocumentSelectorProps {
  label: string;
  type: VaultItemType;
  items: MedicalVaultItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DocumentSelector({ label, type, items, selectedId, onSelect }: DocumentSelectorProps) {
  const filteredItems = items.filter(item => item.type === type);

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold flex items-center gap-2">
        <FileText size={16} className="text-[var(--color-primary)]" />
        {label}
      </label>
      
      <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto p-1 pr-2 custom-scrollbar">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`
              flex items-center justify-between p-3 rounded-xl border transition-all text-left
              ${selectedId === item.id 
                ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-sm" 
                : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50"}
            `}
          >
            <div className="truncate pr-4">
              <p className="text-sm font-medium truncate">{item.fileName}</p>
              <p className="text-[10px] text-[var(--color-muted)]">{new Date(item.uploadDate).toLocaleDateString()}</p>
            </div>
            {selectedId === item.id ? (
              <CheckCircle2 size={18} className="text-[var(--color-primary)] flex-shrink-0" />
            ) : (
              <Circle size={18} className="text-[var(--color-border)] flex-shrink-0" />
            )}
          </button>
        ))}
        {filteredItems.length === 0 && (
          <div className="p-4 text-center border-2 border-dashed border-[var(--color-border)] rounded-xl text-xs text-[var(--color-muted)]">
            No {type}s found in vault.
          </div>
        )}
      </div>
    </div>
  );
}
