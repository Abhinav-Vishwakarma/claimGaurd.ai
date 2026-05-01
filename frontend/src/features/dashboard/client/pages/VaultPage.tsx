import { useState, type ChangeEvent, type DragEvent } from "react";
import { useMedicalVault, useUploadVaultItem } from "../api/dashboard.api";
import { FileUp, FileText, Pill, FilePlus } from "lucide-react";
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
      case "prescription": return <Pill className="text-blue-500 w-8 h-8" />;
      case "bill": return <FileText className="text-red-500 w-8 h-8" />;
      case "lab_report": return <FilePlus className="text-green-500 w-8 h-8" />;
      default: return <FileText className="text-gray-500 w-8 h-8" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">Medical Vault</h1>
        <p className="text-[var(--color-muted)] mt-1">Upload and manage prescriptions (Rx), bills, and lab reports securely.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">Document type</p>
          <p className="text-xs text-[var(--color-muted)]">Choose the correct category before uploading.</p>
        </div>
        <select
          className="w-full sm:w-60 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          value={fileType}
          onChange={(e) => setFileType(e.target.value as VaultItemType)}
        >
          <option value="prescription">Prescription</option>
          <option value="bill">Bill</option>
          <option value="lab_report">Lab report</option>
        </select>
      </div>

      <div
        className={`border-2 border-dashed p-10 mt-4 rounded-xl flex flex-col items-center justify-center text-center transition-colors bg-[var(--color-surface)] hover:bg-[var(--color-bg)] cursor-pointer ${
          dragActive ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10" : "border-[var(--color-border)]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <FileUp className="w-12 h-12 text-[var(--color-muted)] mb-4" />
        <p className="text-lg font-medium text-[var(--color-text)]">Drag & drop files here</p>
        <p className="text-sm text-[var(--color-muted)] mb-4">Supported: PDF, JPG, PNG up to 10MB</p>
        
        <label className="bg-[var(--color-primary)] hover:opacity-90 text-white font-medium py-2 px-6 rounded-lg cursor-pointer transition-colors">
          {uploadMutation.isPending ? "Uploading..." : "Browse Files"}
          <input
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleUpload}
            disabled={uploadMutation.isPending}
          />
        </label>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-[var(--color-text)]">Recent Uploads</h2>
        
        {isLoading ? (
          <div>Loading items...</div>
        ) : vaultItems?.length === 0 ? (
          <div className="text-[var(--color-muted)] bg-[var(--color-surface)] p-6 rounded-xl text-center border border-[var(--color-border)]">
            No files uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vaultItems?.map((item) => (
              <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.id} className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] flex items-center shadow-sm hover:border-[var(--color-primary)] transition-colors cursor-pointer block">
                <div className="bg-[var(--color-bg)] p-3 rounded-lg mr-4">
                  {getIcon(item.type)}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="font-medium text-[var(--color-text)] text-sm truncate">{item.fileName}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">{new Date(item.uploadDate).toLocaleDateString()}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
