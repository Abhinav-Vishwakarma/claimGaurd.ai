import { useState, useEffect } from "react";
import { useRegisterClient, useSearchUser } from "../api/admin.api";
import { useDebounce } from "../../../../hooks/useDebounce";
import { Shield, User, Mail, Search, Check, AlertCircle, Info } from "lucide-react";

export function ClientRegistrationPage() {
  const [searchEmail, setSearchEmail] = useState("");
  const debouncedSearchEmail = useDebounce(searchEmail, 500);
  const isDebouncing = searchEmail !== debouncedSearchEmail;
  const { data: foundUsers = [], isLoading: isSearching } = useSearchUser(debouncedSearchEmail);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const registerMutation = useRegisterClient();
  
  const [formData, setFormData] = useState({
    userId: undefined as string | undefined,
    email: "",
    password: "",
    name: "",
    memberId: "",
    planType: "PPO" as "PPO" | "HMO",
    deductibleTotal: 5000,
    policyActive: true,
    premiumPaid: true,
  });

  // Sync selected user to form
  useEffect(() => {
    if (selectedUser) {
      setFormData(prev => ({
        ...prev,
        userId: selectedUser.id,
        email: selectedUser.email,
        name: selectedUser.name || prev.name,
      }));
    }
  }, [selectedUser]);

  // Clear selected user if search changes significantly
  useEffect(() => {
    if (searchEmail === "") {
      setSelectedUser(null);
    }
  }, [searchEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser?.memberProfile) return;

    registerMutation.mutate(formData, {
      onSuccess: () => {
        setSearchEmail("");
        setSelectedUser(null);
        setFormData({
          userId: undefined,
          email: "",
          password: "",
          name: "",
          memberId: "",
          planType: "PPO",
          deductibleTotal: 5000,
          policyActive: true,
          premiumPaid: true,
        });
      },
    });
  };

  const inputClasses = "w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all";
  const labelClasses = "block text-sm font-medium mb-1.5 text-[var(--color-text)]";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Onboard Client</h1>
        <p className="text-[var(--color-muted)] mt-2">Link an existing website user to a clinical member profile.</p>
      </div>

      {/* Step 1: Search User */}
      <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-4">
        <label className={labelClasses}>Step 1: Find Existing User by Email</label>
        <div className="relative">
          <input
            type="email"
            placeholder="Type keyword to search (e.g. 'john' or 'gmail')"
            className={`${inputClasses} pl-11`}
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={18} />
          {(isSearching || isDebouncing) && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Search Results Dropdown-like List */}
        {searchEmail.length >= 3 && !isSearching && !isDebouncing && foundUsers.length > 0 && !selectedUser && (
          <div className="border border-[var(--color-border)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)] animate-in fade-in slide-in-from-top-2">
            {foundUsers.map((user: any) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUser(user)}
                className="w-full p-4 text-left hover:bg-[var(--color-primary)]/5 transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="font-bold text-sm">{user.name || "Unnamed User"}</p>
                  <p className="text-xs text-[var(--color-muted)]">{user.email}</p>
                </div>
                {user.memberProfile ? (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">Has Profile</span>
                ) : (
                  <Check size={16} className="text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Selected User or Status Feedback */}
        {searchEmail.length >= 3 && !isSearching && !isDebouncing && (
          <div className="animate-in fade-in slide-in-from-top-1">
            {selectedUser ? (
              selectedUser.memberProfile ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-700 dark:text-amber-400 text-sm">
                  <AlertCircle size={18} />
                  <span><strong>{selectedUser.email}</strong> already has a clinical profile. Please choose another user.</span>
                  <button onClick={() => setSelectedUser(null)} className="ml-auto text-xs underline">Clear</button>
                </div>
              ) : (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400 text-sm">
                  <Check size={18} />
                  <span>Selected: <strong>{selectedUser.name}</strong> ({selectedUser.email}). Proceed with configuration below.</span>
                  <button onClick={() => setSelectedUser(null)} className="ml-auto text-xs underline">Change</button>
                </div>
              )
            ) : foundUsers.length === 0 ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 text-blue-700 dark:text-blue-400 text-sm">
                <Info size={18} />
                <span>No existing user found. You can manually fill the details below to create a <strong>new user</strong>.</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`space-y-8 transition-opacity ${selectedUser?.memberProfile ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {/* Section 1: Identity */}
        <div className="bg-[var(--color-surface)] p-8 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <User className="text-[var(--color-primary)]" size={20} />
            <h2 className="font-bold">Identity & Credentials</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className={inputClasses}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Email Address</label>
              <input
                type="email"
                required
                placeholder="john@example.com"
                className={inputClasses}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClasses}>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className={inputClasses}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClasses}>Member ID (Unique)</label>
              <input
                type="text"
                required
                placeholder="MBR-123456"
                className={inputClasses}
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Policy Details */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <Shield className="text-[var(--color-primary)]" size={20} />
            <h2 className="font-bold">Policy Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Plan Type</label>
              <select
                className={inputClasses}
                value={formData.planType}
                onChange={(e) => setFormData({ ...formData, planType: e.target.value as any })}
              >
                <option value="PPO">PPO (Preferred Provider Organization)</option>
                <option value="HMO">HMO (Health Maintenance Organization)</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Annual Deductible ($)</label>
              <input
                type="number"
                required
                className={inputClasses}
                value={formData.deductibleTotal}
                onChange={(e) => setFormData({ ...formData, deductibleTotal: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <label className="flex items-center gap-3 p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-primary)]/5 transition-colors">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                checked={formData.policyActive}
                onChange={(e) => setFormData({ ...formData, policyActive: e.target.checked })}
              />
              <div>
                <p className="font-medium">Policy Active</p>
                <p className="text-xs text-[var(--color-muted)]">User can access clinical vault</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-primary)]/5 transition-colors">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                checked={formData.premiumPaid}
                onChange={(e) => setFormData({ ...formData, premiumPaid: e.target.checked })}
              />
              <div>
                <p className="font-medium">Premium Paid</p>
                <p className="text-xs text-[var(--color-muted)]">Required for clean claim status</p>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--color-primary)]/20"
          >
            {registerMutation.isPending ? "Registering..." : "Register Client & Create Profile"}
          </button>
        </div>
      </form>

      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-800">
        <Info className="flex-shrink-0" size={20} />
        <p className="text-sm">
          <strong>Note:</strong> Registering a client here will automatically create their login credentials and link them to the clinical database. The <strong>Member ID</strong> must match the ID on their medical documents for automated triangulation to work.
        </p>
      </div>
    </div>
  );
}
