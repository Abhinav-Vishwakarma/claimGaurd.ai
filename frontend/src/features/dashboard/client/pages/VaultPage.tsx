import React, { useState } from "react";
import { useMedicalVault, useUploadVaultItem } from "../api/dashboard.api";
import { FileUp, FileText, Pill, FilePlus } from "lucide-react";

export function VaultPage() {
  const { data: vaultItems, isLoading } = useMedicalVault();
  const uploadMutation = useUploadVaultItem();
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      uploadMutation.mutate(formData);
    }
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

      <div 
        className={`border-2 border-dashed p-10 mt-6 rounded-xl flex flex-col items-center justify-center text-center transition-colors bg-[var(--color-surface)] hover:bg-[var(--color-bg)] cursor-pointer ${
          dragActive ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10" : "border-[var(--color-border)]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); /* Handle File Drop */ }}
      >
        <FileUp className="w-12 h-12 text-[var(--color-muted)] mb-4" />
        <p className="text-lg font-medium text-[var(--color-text)]">Drag & drop files here</p>
        <p className="text-sm text-[var(--color-muted)] mb-4">Supported: PDF, JPG, PNG up to 10MB</p>
        
        <label className="bg-[var(--color-primary)] hover:opacity-90 text-white font-medium py-2 px-6 rounded-lg cursor-pointer transition-colors">
          Browse Files
          <input type="file" className="hidden" onChange={handleUpload} />
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
              <div key={item.id} className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] flex items-center shadow-sm">
                <div className="bg-[var(--color-bg)] p-3 rounded-lg mr-4">
                  {getIcon(item.type)}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="font-medium text-[var(--color-text)] text-sm truncate">{item.fileName}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">{new Date(item.uploadDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}