import { useState, type ChangeEvent, type DragEvent } from "react";
import { useMedicalVault, useUploadVaultItem } from "../api/dashboard.api";
import { FileUp, FileText, Pill, FilePlus, ChevronRight } from "lucide-react";
import type { VaultItemType } from "../types/dashboard.types";

export function VaultPage() {
  const { data: vaultItems, isLoading } = useMedicalVault();
  const uploadMutation = useUploadVaultItem();
  const [dragActive, setDragActive] = useState(false);
  const [fileType, setFileType] = useState<VaultItemType>("bill");

  const uploadFile = (file?: File) => {
    if (file) uploadMutation.mutate({ file, type: fileType });
  };

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    uploadFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    uploadFile(e.dataTransfer.files[0]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "prescription": return <Pill className="w-6 h-6" />;
      case "bill": return <FileText className="w-6 h-6" />;
      case "lab_report": return <FilePlus className="w-6 h-6" />;
      default: return <FileText className="w-6 h-6" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--color-text)]">Medical Vault</h1>
          <p className="text-[var(--color-muted)] mt-2 text-lg">Your encrypted health records and claim evidence.</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] px-1">Upload Category</p>
          <div className="flex bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] shadow-sm">
            {(["prescription", "bill", "lab_report"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFileType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  fileType === type
                    ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20"
                    : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {type === 'lab_report' ? 'Lab Report' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed p-12 rounded-3xl flex flex-col items-center justify-center text-center transition-all duration-300 group ${
          dragActive 
            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]" 
            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/[0.02]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className="bg-[var(--color-primary)]/10 p-5 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
          <FileUp className="w-10 h-10 text-[var(--color-primary)]" />
        </div>
        <p className="text-2xl font-bold text-[var(--color-text)] mb-2">Drop your {fileType.replace('_', ' ')} here</p>
        <p className="text-[var(--color-muted)] max-w-sm mb-8">Securely upload PDF or images. Files are automatically encrypted and linked to your profile.</p>
        
        <label className="relative overflow-hidden bg-[var(--color-primary)] hover:brightness-110 text-white font-bold py-4 px-10 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-xl shadow-[var(--color-primary)]/20 flex items-center gap-3">
          {uploadMutation.isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FilePlus size={20} />
              Browse Documents
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleUpload}
            disabled={uploadMutation.isPending}
          />
        </label>
      </div>

      {/* Categories Section */}
      <div className="space-y-12 pt-4">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--color-muted)]">Vault Contents</h2>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
            <p className="mt-4 text-[var(--color-muted)] font-medium">Accessing secure vault...</p>
          </div>
        ) : vaultItems?.length === 0 ? (
          <div className="text-center py-20 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)]">
            <div className="bg-[var(--color-bg)] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-[var(--color-muted)] opacity-20" />
            </div>
            <p className="text-xl font-bold text-[var(--color-text)]">No documents found</p>
            <p className="text-[var(--color-muted)] mt-1">Upload your first record to begin tracking.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {(["bill", "prescription", "lab_report"] as const).map((category) => {
              const items = vaultItems?.filter(i => i.type === category);
              if (items?.length === 0) return null;
              
              return (
                <div key={category} className="space-y-8">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${
                        category === "prescription" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : 
                        category === "bill" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : 
                        "bg-green-500 text-white shadow-lg shadow-green-500/20"
                      }`}>
                        {getIcon(category)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-[var(--color-text)] capitalize">
                          {category.replace("_", " ")}s
                        </h3>
                        <p className="text-sm text-[var(--color-muted)] font-medium">
                          {items?.length} {items?.length === 1 ? 'record' : 'records'} available
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items?.map((item) => (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        key={item.id} 
                        className="group bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-border)] flex flex-col gap-4 transition-all hover:border-[var(--color-primary)] hover:shadow-2xl hover:shadow-[var(--color-primary)]/10 hover:-translate-y-1 active:scale-[0.98]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="bg-[var(--color-bg)] p-4 rounded-2xl group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all duration-300">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="px-3 py-1 rounded-full bg-[var(--color-bg)] text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)] border border-[var(--color-border)]">
                            {new Date(item.uploadDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-[var(--color-text)] text-lg truncate group-hover:text-[var(--color-primary)] transition-colors">
                            {item.fileName}
                          </p>
                          <p className="text-xs text-[var(--color-muted)] font-medium">
                            Added {new Date(item.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="pt-4 mt-auto border-t border-[var(--color-border)] flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--color-primary)] group-hover:underline flex items-center gap-2">
                            View Document
                            <ChevronRight size={14} />
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
