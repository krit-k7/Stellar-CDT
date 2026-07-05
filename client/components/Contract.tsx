"use client";

import { useState, useCallback } from "react";
import {
  createCampaign,
  donate,
  getCampaign,
  getTotalRaised,
  getAllCampaigns,
  getDonorCount,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

interface Campaign {
  id: string;
  title: string;
  description: string;
  creator: string;
  created_at: string;
}

interface Donation {
  donor: string;
  amount: string;
  timestamp: string;
}

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "browse" | "create" | "donate";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Browse state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignTotal, setCampaignTotal] = useState<string>("0");
  const [donorCount, setDonorCount] = useState<number>(0);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Create state
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Donate state
  const [donateAmount, setDonateAmount] = useState("");
  const [donateToken, setDonateToken] = useState("");
  const [isDonating, setIsDonating] = useState(false);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatAmount = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return (num / 10000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const loadAllCampaigns = useCallback(async () => {
    setIsLoadingCampaigns(true);
    setError(null);
    try {
      const result = await getAllCampaigns(walletAddress || undefined);
      if (Array.isArray(result)) {
        setCampaigns(result as Campaign[]);
      } else {
        setCampaigns([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
      setCampaigns([]);
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [walletAddress]);

  const loadCampaignDetails = useCallback(async (campaignId: string) => {
    setIsLoadingDetails(true);
    setError(null);
    try {
      const [campaignResult, totalResult, donorsResult] = await Promise.all([
        getCampaign(campaignId, walletAddress || undefined),
        getTotalRaised(campaignId, walletAddress || undefined),
        getDonorCount(campaignId, walletAddress || undefined),
      ]);
      
      if (campaignResult && typeof campaignResult === "object") {
        setSelectedCampaign(campaignResult as Campaign);
      }
      setCampaignTotal(totalResult?.toString() || "0");
      setDonorCount(typeof donorsResult === "number" ? donorsResult : 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load campaign details");
    } finally {
      setIsLoadingDetails(false);
    }
  }, [walletAddress]);

  const handleCreateCampaign = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!createTitle.trim() || !createDesc.trim()) return setError("Fill in all fields");
    setError(null);
    setIsCreating(true);
    setTxStatus("Awaiting signature...");
    try {
      await createCampaign(walletAddress, createTitle.trim(), createDesc.trim());
      setTxStatus("Campaign created on-chain!");
      setCreateTitle("");
      setCreateDesc("");
      setTimeout(() => setTxStatus(null), 5000);
      // Reload campaigns
      loadAllCampaigns();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress, createTitle, createDesc, loadAllCampaigns]);

  const handleDonate = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!selectedCampaign) return setError("Select a campaign first");
    if (!donateAmount.trim() || parseFloat(donateAmount) <= 0) return setError("Enter a valid amount");
    if (!donateToken.trim()) return setError("Enter a token address");
    
    setError(null);
    setIsDonating(true);
    setTxStatus("Awaiting signature...");
    try {
      // Convert to stroops (7 decimal places for classic token)
      const amount = BigInt(Math.floor(parseFloat(donateAmount) * 10000000));
      await donate(walletAddress, selectedCampaign.id, donateToken.trim(), amount);
      setTxStatus("Donation recorded on-chain!");
      setDonateAmount("");
      setTimeout(() => {
        setTxStatus(null);
        if (selectedCampaign) {
          loadCampaignDetails(selectedCampaign.id);
        }
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsDonating(false);
    }
  }, [walletAddress, selectedCampaign, donateAmount, donateToken, loadCampaignDetails]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "browse", label: "Browse", icon: <SearchIcon />, color: "#4fc3f7" },
    { key: "create", label: "Create", icon: <PlusIcon />, color: "#7c6cf0" },
    { key: "donate", label: "Donate", icon: <HeartIcon />, color: "#f472b6" },
  ];

  // Load campaigns when browsing tab
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
    setSelectedCampaign(null);
    if (tab === "browse") {
      loadAllCampaigns();
    }
  };

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("recorded") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f472b6]/20 to-[#7c6cf0]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#f472b6]">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Crowdfunding Campaign</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Browse Campaigns */}
            {activeTab === "browse" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <MethodSignature name="get_all_campaigns" params="()" returns="-> Vec<Campaign>" color="#4fc3f7" />
                  <button
                    onClick={loadAllCampaigns}
                    disabled={isLoadingCampaigns}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-white/50 hover:text-white/70 transition-all"
                  >
                    <RefreshIcon /> Refresh
                  </button>
                </div>

                {isLoadingCampaigns ? (
                  <div className="flex items-center justify-center py-8">
                    <SpinnerIcon />
                    <span className="ml-2 text-sm text-white/50">Loading campaigns...</span>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-sm">
                    No campaigns yet. Be the first to create one!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {campaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => loadCampaignDetails(campaign.id)}
                        className={cn(
                          "w-full text-left rounded-xl border p-4 transition-all",
                          selectedCampaign?.id === campaign.id
                            ? "border-[#4fc3f7]/30 bg-[#4fc3f7]/[0.05]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white/90 text-sm">{campaign.title}</span>
                          <Badge variant="info" className="text-[9px]">Active</Badge>
                        </div>
                        <p className="text-xs text-white/40 line-clamp-2">{campaign.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-[10px] text-white/30">
                          <span className="flex items-center gap-1">
                            <UsersIcon /> {truncate(campaign.creator)}
                          </span>
                          <span>Created {new Date(parseInt(campaign.created_at) * 1000).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Campaign Details */}
                {selectedCampaign && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Campaign Details</span>
                      <Badge variant="success"><span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" /> Fundraising</Badge>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="font-semibold text-white/90">{selectedCampaign.title}</h4>
                        <p className="text-sm text-white/50 mt-1">{selectedCampaign.description}</p>
                      </div>
                      
                      {isLoadingDetails ? (
                        <div className="flex items-center justify-center py-4">
                          <SpinnerIcon />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg bg-white/[0.02] p-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-[#34d399] mb-1">
                              <DollarIcon />
                            </div>
                            <span className="text-lg font-semibold text-white/90">{formatAmount(campaignTotal)}</span>
                            <p className="text-[10px] text-white/30 mt-1">Total Raised</p>
                          </div>
                          <div className="rounded-lg bg-white/[0.02] p-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-[#4fc3f7] mb-1">
                              <UsersIcon />
                            </div>
                            <span className="text-lg font-semibold text-white/90">{donorCount}</span>
                            <p className="text-[10px] text-white/30 mt-1">Donors</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-[10px] text-white/30">
                        <span>By:</span>
                        <span className="font-mono">{selectedCampaign.creator}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Create Campaign */}
            {activeTab === "create" && (
              <div className="space-y-5">
                <MethodSignature name="create_campaign" params="(creator: Address, title: String, description: String)" returns="-> bool" color="#7c6cf0" />
                <Input label="Campaign Title" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="e.g. Fund My Project" />
                <Input label="Description" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Tell donors about your campaign..." />
                
                {walletAddress ? (
                  <ShimmerButton onClick={handleCreateCampaign} disabled={isCreating} shimmerColor="#7c6cf0" className="w-full">
                    {isCreating ? <><SpinnerIcon /> Creating...</> : <><PlusIcon /> Create Campaign</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to create campaign
                  </button>
                )}
              </div>
            )}

            {/* Donate */}
            {activeTab === "donate" && (
              <div className="space-y-5">
                <MethodSignature name="donate" params="(donor: Address, campaign_id: String, token: Address, amount: i128)" returns="" color="#f472b6" />
                
                {!selectedCampaign ? (
                  <div className="text-center py-8 text-white/30 text-sm">
                    <p>Select a campaign from the Browse tab first</p>
                    <button
                      onClick={() => handleTabChange("browse")}
                      className="mt-2 text-[#4fc3f7] hover:underline"
                    >
                      Go to Browse
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-[#f472b6]/20 bg-[#f472b6]/[0.03] p-4">
                      <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Donating to</p>
                      <p className="font-semibold text-white/90">{selectedCampaign.title}</p>
                    </div>
                    
                    <Input label="Token Address" value={donateToken} onChange={(e) => setDonateToken(e.target.value)} placeholder="e.g. GBXX... (classic asset)" />
                    <Input label="Amount" type="number" value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} placeholder="e.g. 100" />
                    
                    {walletAddress ? (
                      <ShimmerButton onClick={handleDonate} disabled={isDonating} shimmerColor="#f472b6" className="w-full">
                        {isDonating ? <><SpinnerIcon /> Processing...</> : <><HeartIcon /> Donate</>}
                      </ShimmerButton>
                    ) : (
                      <button
                        onClick={onConnect}
                        disabled={isConnecting}
                        className="w-full rounded-xl border border-dashed border-[#f472b6]/20 bg-[#f472b6]/[0.03] py-4 text-sm text-[#f472b6]/60 hover:border-[#f472b6]/30 hover:text-[#f472b6]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                      >
                        Connect wallet to donate
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Crowdfunding Campaign &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["Browse", "Create", "Donate"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                  {i < 2 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
