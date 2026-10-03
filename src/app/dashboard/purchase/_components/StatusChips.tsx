"use client";
import { BadgeCheck, Clock, CreditCard, ShieldX, Banknote, ReceiptText } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function StatusChip({ status, isVoided }: { status: string; isVoided: boolean }) {
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  if (isVoided)
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border bg-slate-100 text-slate-500 border-slate-200"><ShieldX size={10} /> {isUrdu ? "منسوخ شدہ" : "VOIDED"}</span>;
  if (status === "PAID")
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border bg-emerald-50 text-emerald-700 border-emerald-200"><BadgeCheck size={10} /> {isUrdu ? "مکمل ادا شدہ" : "PAID"}</span>;
  if (status === "PARTIAL")
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border bg-amber-50 text-amber-700 border-amber-200"><Clock size={10} /> {isUrdu ? "جزوی ادائیگی" : "PARTIAL"}</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border bg-rose-50 text-rose-700 border-rose-200"><CreditCard size={10} /> {isUrdu ? "ادھار / واجب الادا" : "CREDIT"}</span>;
}

export function PaymentModeChip({ mode }: { mode: string }) {
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  if (mode === "cash")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black border bg-green-50 text-green-700 border-green-200"><Banknote size={9} />{isUrdu ? "نقد" : "CASH"}</span>;
  if (mode === "bank")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black border bg-blue-50 text-blue-700 border-blue-200"><CreditCard size={9} />{isUrdu ? "بینک" : "BANK"}</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black border bg-rose-50 text-rose-700 border-rose-200"><ReceiptText size={9} />{isUrdu ? "ادھار" : "CREDIT"}</span>;
}
