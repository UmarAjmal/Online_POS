"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Save, Landmark, Settings, ToggleLeft, ToggleRight, Sparkles, Key, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminGatewaysPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  // Gateway config states
  const [gatewaySettings, setGatewaySettings] = useState({
    jazzcash_active: false,
    jazzcash_till: "",
    easypaisa_active: false,
    easypaisa_wallet: "",
    bank_active: false,
    bank_name: "",
    bank_account_num: "",
    bank_iban: "",
    stripe_active: false,
    stripe_publishable_key: "",
    safepay_active: false,
    safepay_api_key: "",
    safepay_secret_key: "",
    safepay_sandbox: true,
    monthly_price_pkr: 3500,
    yearly_price_pkr: 35000
  });

  useEffect(() => {
    loadGatewaySettings();
  }, []);

  const loadGatewaySettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("company_details")
        .select("website")
        .eq("shop_id", "f3ec4815-8cd0-4105-b0d3-f6e1fb468853") // Super admin shop
        .limit(1);

      const configRow = data?.[0];
      if (configRow && configRow.website && configRow.website.startsWith("{")) {
        try {
          const parsed = JSON.parse(configRow.website);
          setGatewaySettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {}
      }
    } catch (err: any) {
      toast.error("Failed to load gateway configurations: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGateways = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("company_details")
        .update({ website: JSON.stringify(gatewaySettings) })
        .eq("shop_id", "f3ec4815-8cd0-4105-b0d3-f6e1fb468853");

      if (error) throw error;
      toast.success("Billing and gateway settings updated successfully!");
    } catch (err: any) {
      toast.error("Failed to save gateway details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col justify-center items-center text-slate-450">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650 mb-2" />
        <p className="text-xs font-semibold">Loading gateway parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Billing Settings & Gateways</h2>
          <p className="text-xs text-slate-450 mt-0.5">Configure active payment methods and core subscription rates.</p>
        </div>
      </div>

      <div className="bg-white space-y-6">
        
        {/* Core Prices Config Card */}
        <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-4">
          <div className="border-b pb-3 flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CreditCard size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">SaaS Billing Base Rates</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Configure default rates shown during checkouts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">Monthly Price (PKR)</label>
              <Input
                type="number"
                value={gatewaySettings.monthly_price_pkr}
                onChange={(e) => setGatewaySettings(prev => ({ ...prev, monthly_price_pkr: Number(e.target.value) }))}
                className="h-10 text-xs border-slate-200 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">Yearly Price (PKR)</label>
              <Input
                type="number"
                value={gatewaySettings.yearly_price_pkr}
                onChange={(e) => setGatewaySettings(prev => ({ ...prev, yearly_price_pkr: Number(e.target.value) }))}
                className="h-10 text-xs border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Gateways Config Sections */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Landmark size={14} />
            </div>
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Configure Channels</span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            
            {/* EasyPaisa Instructions */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-xs font-extrabold text-slate-800">EasyPaisa Mobile Wallet</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGatewaySettings(prev => ({ ...prev, easypaisa_active: !prev.easypaisa_active }))}
                  className="text-slate-500 hover:text-indigo-600 transition"
                >
                  {gatewaySettings.easypaisa_active ? (
                    <ToggleRight className="text-emerald-500 h-7 w-7" />
                  ) : (
                    <ToggleLeft className="h-7 w-7" />
                  )}
                </button>
              </div>
              {gatewaySettings.easypaisa_active && (
                <div className="space-y-1.5 max-w-md">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Receiver Mobile Account Number</label>
                  <Input
                    value={gatewaySettings.easypaisa_wallet}
                    onChange={(e) => setGatewaySettings(prev => ({ ...prev, easypaisa_wallet: e.target.value }))}
                    className="h-9 text-xs border-slate-200 bg-slate-50/50"
                  />
                </div>
              )}
            </div>

            {/* JazzCash Instructions */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  <span className="text-xs font-extrabold text-slate-800">JazzCash Till ID Account</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGatewaySettings(prev => ({ ...prev, jazzcash_active: !prev.jazzcash_active }))}
                  className="text-slate-500 hover:text-indigo-650 transition"
                >
                  {gatewaySettings.jazzcash_active ? (
                    <ToggleRight className="text-emerald-500 h-7 w-7" />
                  ) : (
                    <ToggleLeft className="h-7 w-7" />
                  )}
                </button>
              </div>
              {gatewaySettings.jazzcash_active && (
                <div className="space-y-1.5 max-w-md">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Till Merchant ID / Account Number</label>
                  <Input
                    value={gatewaySettings.jazzcash_till}
                    onChange={(e) => setGatewaySettings(prev => ({ ...prev, jazzcash_till: e.target.value }))}
                    className="h-9 text-xs border-slate-200 bg-slate-50/50"
                  />
                </div>
              )}
            </div>

            {/* Bank Transfer Instructions */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  <span className="text-xs font-extrabold text-slate-800">Bank Transfer details</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGatewaySettings(prev => ({ ...prev, bank_active: !prev.bank_active }))}
                  className="text-slate-500 hover:text-indigo-650 transition"
                >
                  {gatewaySettings.bank_active ? (
                    <ToggleRight className="text-emerald-500 h-7 w-7" />
                  ) : (
                    <ToggleLeft className="h-7 w-7" />
                  )}
                </button>
              </div>
              {gatewaySettings.bank_active && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bank Name</label>
                    <Input
                      value={gatewaySettings.bank_name}
                      onChange={(e) => setGatewaySettings(prev => ({ ...prev, bank_name: e.target.value }))}
                      className="h-9 text-xs border-slate-200 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Account Number</label>
                    <Input
                      value={gatewaySettings.bank_account_num}
                      onChange={(e) => setGatewaySettings(prev => ({ ...prev, bank_account_num: e.target.value }))}
                      className="h-9 text-xs border-slate-200 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">IBAN Code</label>
                    <Input
                      value={gatewaySettings.bank_iban}
                      onChange={(e) => setGatewaySettings(prev => ({ ...prev, bank_iban: e.target.value }))}
                      className="h-9 text-xs border-slate-200 bg-slate-50/50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Safepay Integration Settings */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm border-l-4 border-l-indigo-600">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-800 uppercase block">Safepay hosted Redirection Integration</span>
                  <span className="text-[9px] text-slate-400 font-bold block">Redirection endpoint for automated Visa/Mastercard payments</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGatewaySettings(prev => ({ ...prev, safepay_active: !prev.safepay_active }))}
                  className="text-slate-500 hover:text-indigo-650 transition"
                >
                  {gatewaySettings.safepay_active ? (
                    <ToggleRight className="text-emerald-500 h-7 w-7" />
                  ) : (
                    <ToggleLeft className="h-7 w-7" />
                  )}
                </button>
              </div>
              {gatewaySettings.safepay_active && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                        <Key size={10} /> Public API Key
                      </label>
                      <Input
                        value={gatewaySettings.safepay_api_key}
                        onChange={(e) => setGatewaySettings(prev => ({ ...prev, safepay_api_key: e.target.value }))}
                        className="h-9 text-xs border-slate-200 bg-slate-50/50"
                        placeholder="sec_..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                        <Key size={10} /> Secret HMAC Key
                      </label>
                      <Input
                        value={gatewaySettings.safepay_secret_key}
                        onChange={(e) => setGatewaySettings(prev => ({ ...prev, safepay_secret_key: e.target.value }))}
                        className="h-9 text-xs border-slate-200 bg-slate-50/50"
                        placeholder="8a18..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={gatewaySettings.safepay_sandbox}
                      onChange={(e) => setGatewaySettings(prev => ({ ...prev, safepay_sandbox: e.target.checked }))}
                      className="h-4.5 w-4.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                      id="safepay_sandbox"
                    />
                    <label htmlFor="safepay_sandbox" className="text-[10px] font-bold text-slate-500 cursor-pointer select-none">
                      Enable Sandbox Test Mode (Uses test payment profiles)
                    </label>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Save settings action button */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button
            onClick={handleSaveGateways}
            className="bg-indigo-600 hover:bg-indigo-750 font-bold text-xs text-white h-11 px-6 flex items-center gap-1.5 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01]"
          >
            <Save size={15} /> Save Gateway settings
          </Button>
        </div>

      </div>
    </div>
  );
}
