"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Building2, Phone, Mail, MapPin, FileText, 
  Palette, Upload, Trash2, CheckCircle2, 
  Save, RotateCcw, Sparkles, Store, ShieldCheck,
  Receipt, DollarSign, Image as ImageIcon, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SystemSettingsPage() {
  const { settings, loading, updateSettings, resetToDefaults } = useSystemSettings();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");

  useEffect(() => {
    setFormData(settings);
    setLogoPreview(settings.logoUrl || "");
  }, [settings]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isUrdu ? "تصویر کا سائز 2MB سے کم ہونا چاہیے" : "Image size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setFormData(prev => ({ ...prev, logoUrl: result }));
      toast.success(isUrdu ? "لوگو منتخب کر لیا گیا ہے" : "Logo selected successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview("");
    setFormData(prev => ({ ...prev, logoUrl: "" }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.shopName.trim()) {
      toast.error(isUrdu ? "سسٹم کا نام درج کرنا لازمی ہے" : "System Name is required");
      return;
    }

    setSaving(true);
    const success = await updateSettings(formData);
    setSaving(false);

    if (success) {
      toast.success(isUrdu ? "سسٹم سیٹنگز کامیابی سے محفوظ ہو گئیں!" : "System settings saved successfully!");
    } else {
      toast.error(isUrdu ? "محفوظ کرنے میں مسئلہ پیش آیا" : "Failed to save settings. Please try again.");
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      isUrdu 
        ? "کیا آپ واقعی تمام سیٹنگز کو ڈیفالٹ پر ری سیٹ کرنا چاہتے ہیں؟" 
        : "Are you sure you want to reset all system settings to defaults?"
    );
    if (!confirmed) return;

    setSaving(true);
    const success = await resetToDefaults();
    setSaving(false);
    if (success) {
      toast.success(isUrdu ? "ڈیفالٹ سیٹنگز بحال کر دی گئیں" : "Reset to default settings successfully");
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12 animate-in fade-in duration-300">
      {/* Top Action Ribbon */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              {isUrdu ? "سسٹم پروفائل اور کاروباری معلومات" : "Business Profile & System Information"}
            </h2>
            <p className="text-xs text-slate-500">
              {isUrdu ? "یہ معلومات انوائسز، بلز اور ہیڈر میں ظاہر ہوں گی" : "Configure shop name, logo, contact, and receipt details"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link href="/dashboard/settings/colors">
            <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 h-9 text-xs">
              <Palette className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
              {isUrdu ? "کلر تھیمز" : "Color Themes"}
            </Button>
          </Link>
          <Button 
            onClick={handleReset} 
            disabled={saving || loading}
            variant="ghost" 
            className="text-slate-500 hover:text-slate-700 h-9 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {isUrdu ? "ری سیٹ" : "Reset"}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="text-white h-9 text-xs shadow-xs font-semibold px-4 cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            {isUrdu ? "محفوظ کریں" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Core System & Store Info */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Store size={18} className="text-slate-600" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                {isUrdu ? "بنیادی کاروباری معلومات" : "General Business Details"}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>{isUrdu ? "سسٹم / دکان کا نام *" : "System / Business Name *"}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Appears on invoices & headers</span>
                </label>
                <div className="relative">
                  <Input
                    value={formData.shopName}
                    onChange={(e) => handleChange("shopName", e.target.value)}
                    placeholder="e.g. Al Madina Pharmacy & Superstore"
                    className="bg-slate-50/50 border-slate-200 text-sm font-medium focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {isUrdu ? "بزنس کی قسم / انڈسٹری" : "Business Industry Type"}
                </label>
                <select
                  value={formData.industryType}
                  onChange={(e) => handleChange("industryType", e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 text-sm rounded-lg p-2.5 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="pharmacy">Pharmacy & Medical Store (فارمیسی)</option>
                  <option value="commercial">Supermarket & Retail Store (کریانہ و جنرل)</option>
                  <option value="restaurant">Restaurant & Cafe (ریستوراں و ہوٹل)</option>
                  <option value="tailor">Tailoring & Boutique (درزی و بوتیک)</option>
                  <option value="electronics">Electronics & Mobile Shop (موبائل و الیکٹرانکس)</option>
                  <option value="fertilizer">Fertilizer, Seeds & Mandi (کھاد و غلہ منڈی)</option>
                  <option value="hardware">Hardware & Sanitary Store (ہارڈویئر اسٹور)</option>
                  <option value="fuel">Petrol Pump & Lubricants (پیٹرول پمپ)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {isUrdu ? "مالک / پروپرائیٹر کا نام" : "Owner / Manager Name"}
                </label>
                <Input
                  value={formData.ownerName}
                  onChange={(e) => handleChange("ownerName", e.target.value)}
                  placeholder="e.g. Aamish Rehmani"
                  className="bg-slate-50/50 border-slate-200 text-sm focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-500" />
                  <span>{isUrdu ? "فون نمبر / واٹس ایپ" : "Phone / WhatsApp Number"}</span>
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="e.g. +92 326 1527022"
                  className="bg-slate-50/50 border-slate-200 text-sm focus:bg-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-500" />
                  <span>{isUrdu ? "ای میل ایڈریس" : "Email Address"}</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="contact@store.com"
                  className="bg-slate-50/50 border-slate-200 text-sm focus:bg-white font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin size={13} className="text-slate-500" />
                  <span>{isUrdu ? "دکان کا مکمل پتہ" : "Shop / Store Full Address"}</span>
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="e.g. Main Commercial Market, Chak No 102/15L, Mian Channu"
                  className="bg-slate-50/50 border-slate-200 text-sm focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Receipt & Invoicing Info */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Receipt size={18} className="text-slate-600" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                {isUrdu ? "انوائس اور رسید کی سیٹنگز" : "Invoice & Bill Receipt Customization"}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <DollarSign size={13} className="text-slate-500" />
                  <span>{isUrdu ? "کرنسی سمبل" : "Currency Symbol"}</span>
                </label>
                <Input
                  value={formData.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  placeholder="PKR / Rs / $"
                  className="bg-slate-50/50 border-slate-200 text-sm font-semibold focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-500" />
                  <span>{isUrdu ? "ٹیکس / NTN نمبر (اختیاری)" : "NTN / Tax ID (Optional)"}</span>
                </label>
                <Input
                  value={formData.ntn}
                  onChange={(e) => handleChange("ntn", e.target.value)}
                  placeholder="e.g. 1234567-8"
                  className="bg-slate-50/50 border-slate-200 text-sm focus:bg-white font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {isUrdu ? "رسید کے نیچے نوٹ / پالیسی میسج" : "Receipt Footer Note / Return Policy"}
                </label>
                <textarea
                  value={formData.footerNote}
                  onChange={(e) => handleChange("footerNote", e.target.value)}
                  rows={3}
                  placeholder="e.g. Thank you for your visit! Goods sold cannot be returned without receipt."
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Logo Upload & Live Preview */}
        <div className="space-y-6">
          
          {/* Logo Branding Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ImageIcon size={18} className="text-slate-600" />
              <h3 className="font-bold text-slate-800 text-sm">
                {isUrdu ? "سسٹم لوگو اور برانڈنگ" : "System Logo & Branding"}
              </h3>
            </div>

            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center relative hover:bg-slate-50 transition-colors">
              {logoPreview ? (
                <div className="space-y-3">
                  <div className="h-24 w-24 mx-auto rounded-2xl bg-white border border-slate-200 shadow-sm p-2 flex items-center justify-center overflow-hidden">
                    <img src={logoPreview} alt="System Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <span className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        {isUrdu ? "تبدیل کریں" : "Change Logo"}
                      </span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <button
                      onClick={handleRemoveLogo}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      {isUrdu ? "ہٹائیں" : "Remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Upload size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {isUrdu ? "اپنا لوگو اپلوڈ کریں" : "Upload Custom Logo"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG up to 2MB</p>
                  </div>
                  <label className="cursor-pointer inline-block">
                    <span 
                      className="text-xs text-white px-4 py-1.5 rounded-lg font-semibold shadow-xs transition-opacity hover:opacity-90 inline-block"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {isUrdu ? "فائل منتخب کریں" : "Browse Image"}
                    </span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Live Receipt & Header Preview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isUrdu ? "رسید پر لائیو پریویو" : "Live Receipt Preview"}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> Real-time
              </span>
            </div>

            {/* Thermal Slip Simulation */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-mono text-center space-y-1 text-slate-700 shadow-inner">
              {logoPreview && (
                <div className="h-10 w-10 mx-auto mb-1 rounded bg-white p-1 border border-slate-200">
                  <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain mx-auto" />
                </div>
              )}
              <p className="font-bold text-xs uppercase tracking-tight text-slate-900">
                {formData.shopName || "YOUR STORE NAME"}
              </p>
              <p className="text-[10px] text-slate-500">{formData.address || "Store Address"}</p>
              <p className="text-[10px] text-slate-500">Ph: {formData.phone || "+92 300 0000000"}</p>
              {formData.ntn && <p className="text-[9px] text-slate-400">NTN: {formData.ntn}</p>}
              
              <div className="border-t border-dashed border-slate-300 my-2 pt-2 text-[10px] text-left">
                <div className="flex justify-between">
                  <span>Panadol 500mg</span>
                  <span>100.00</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200 mt-1 pt-1">
                  <span>TOTAL ({formData.currency || "PKR"}):</span>
                  <span>100.00</span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 italic pt-1 border-t border-dashed border-slate-300">
                {formData.footerNote || "Thank you for shopping!"}
              </p>
            </div>
          </div>

          {/* Quick link to Color Customizer */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 flex items-start gap-3">
            <Palette className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-purple-950">
                {isUrdu ? "رنگ اور بٹن تبدیل کرنا چاہتے ہیں؟" : "Want to change theme colors?"}
              </p>
              <p className="text-[11px] text-purple-800/80 leading-snug">
                {isUrdu 
                  ? "سائیڈ بار، بٹنز اور تھیم کے رنگ اپنی مرضی کے مطابق منتخب کرنے کے لیے کلر سیٹنگز کھولیں۔" 
                  : "Customize sidebar background, button colors, and active highlights from the color studio."}
              </p>
              <Link href="/dashboard/settings/colors" className="inline-block mt-1">
                <span className="text-xs font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1">
                  {isUrdu ? "کلر سیٹنگز کھولیں →" : "Open Color Themes Studio →"}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
