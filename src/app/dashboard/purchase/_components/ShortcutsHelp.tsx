"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type Props = { isOpen: boolean; onClose: () => void };

export function ShortcutsHelp({ isOpen, onClose }: Props) {
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  const shortcuts = [
    { key: "F1 / Alt+S",    desc: isUrdu ? "تلاش سرچ بار پر فوکس کریں" : "Focus search autocomplete input" },
    { key: "F2 / Alt+U",    desc: isUrdu ? "سپلائر سلیکٹر پر فوکس کریں" : "Focus supplier selector" },
    { key: "F3 / Alt+A",    desc: isUrdu ? "کارٹ آئٹمز پر فوکس کریں" : "Focus cart (arrow navigate)" },
    { key: "F4 / Alt+D",    desc: isUrdu ? "ڈسکاؤنٹ / رعایت کے خانے پر جائیں" : "Focus discount field" },
    { key: "F7 / Alt+T",    desc: isUrdu ? "ٹیکس کے خانے پر فوکس کریں" : "Focus tax field" },
    { key: "F8",            desc: isUrdu ? "ادائیگی موڈ تبدیل کریں (نقد ← بینک ← ادھار)" : "Cycle payment mode (Cash→Bank→Credit)" },
    { key: "F9 / Alt+Enter",desc: isUrdu ? "خریداری کا بل محفوظ کریں" : "Save purchase" },
    { key: "F10 / Alt+K",   desc: isUrdu ? "کی بورڈ شارٹ کٹس مینیو کھولیں/بند کریں" : "Toggle this shortcuts menu" },
    { key: "↑ / ↓",         desc: isUrdu ? "کارٹ: اوپر نیچے سطروں میں جائیں" : "Cart: navigate rows" },
    { key: "→ / ←",         desc: isUrdu ? "کارٹ: تعداد یا قیمت کے خانے میں جائیں" : "Cart: focus quantity / cost rate" },
    { key: "Del / Back",    desc: isUrdu ? "کارٹ: منتخب آئٹم کو حذف کریں" : "Cart: remove selected item" },
    { key: "Arrows / Enter", desc: isUrdu ? "سرچ لسٹ: منتخب کرنے کے لیے انٹر دبائیں" : "Search dropdown: navigate & select" },
    { key: "Escape",        desc: isUrdu ? "تلاش صاف کریں یا فوکس ختم کریں" : "Clear search / exit cart focus" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6"
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-violet-100 rounded-xl"><Keyboard size={15} className="text-violet-600" /></span>
                {isUrdu ? "کی بورڈ شارٹ کٹس گائیڈ" : "Keyboard Shortcuts"}
              </h3>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"><X size={15} /></button>
            </div>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {shortcuts.map(s => (
                <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500 font-medium">{s.desc}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 font-mono shrink-0 ml-2">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-4 text-center">
              {isUrdu ? "شارٹ کٹس کھولنے کے لیے F10 یا Alt+K دبائیں" : "Press F10 or Alt+K to toggle this menu"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
