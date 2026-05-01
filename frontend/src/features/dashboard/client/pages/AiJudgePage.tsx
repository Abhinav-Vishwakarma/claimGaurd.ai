import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CopyCheck, ArrowRight, PlayCircle } from "lucide-react";
import { apiRequest } from "../../../../lib/apiClient";

export function AiJudgePage() {
  const [claimText, setClaimText] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      // Example endpoint for AI Agent handling the plan->execute->verify loop
      // return apiRequest<string>("/api/v1/dashboard/ai-judge/validate", { method: "POST", body: JSON.stringify({ text }) })
      return new Promise<string>((resolve) => 
        setTimeout(() => resolve("AI Assessment: Claim is compliant and valid. Evidence located in Medical Vault."), 2000)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "history"] });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">AI Claim Judge</h1>
        <p className="text-[var(--color-muted)] mt-1">Upload or paste claim data to validate with our AI Agent.</p>
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] flex flex-col md:flex-row gap-6 h-[400px]">
        {/* Input Pane */}
        <div className="flex-1 flex flex-col">
          <label className="text-sm font-semibold text-[var(--color-text)] mb-2 flex items-center">
            <CopyCheck className="w-4 h-4 mr-2" />
            Claim Details Input
          </label>
          <textarea
            className="flex-1 w-full bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg p-4 resize-none outline-none focus:border-[var(--color-primary)] transition-all"
            placeholder="Paste procedure codes, symptoms, or upload related EOB..."
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
          />
          <button 
            className="mt-4 bg-[var(--color-primary)] hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
            onClick={() => mutation.mutate(claimText)}
            disabled={mutation.isPending || !claimText.trim()}
          >
            {mutation.isPending ? "Validating..." : "Validate with AI Agent"}
            <PlayCircle className="w-5 h-5 ml-2" />
          </button>
        </div>

        <div className="hidden md:flex flex-col justify-center items-center text-[var(--color-muted)]">
          <ArrowRight className="w-8 h-8" />
        </div>

        {/* Output Pane */}
        <div className="flex-1 flex flex-col border-l border-[var(--color-border)] pl-0 md:pl-6 pt-6 md:pt-0">
          <label className="text-sm font-semibold text-[var(--color-text)] mb-2">
            AI Verdict
          </label>
          <div className="flex-1 bg-black border border-[var(--color-border)] rounded-lg p-4 text-green-400 font-mono text-sm overflow-y-auto">
            {mutation.isPending ? (
              <span className="animate-pulse">Processing Plan → Execute → Verify Loop...</span>
            ) : mutation.data ? (
              <span>{mutation.data}</span>
            ) : (
              <span className="text-gray-500">Awaiting input...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}