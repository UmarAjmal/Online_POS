"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, ArrowRight } from "lucide-react";
import { NATechHubBadge } from "@/components/NATechHubBadge";

export function PublicFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white/80 backdrop-blur-md relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Column 1: Company Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-0.5 bg-white shadow-xs border border-stone-200">
                <Image
                  src="/falcon.png"
                  alt="Falcon Swift PVT. LTD."
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold block">
                  Business Management System
                </span>
                <h4 className="text-sm font-black text-slate-900 leading-tight">
                  Falcon Swift PVT. LTD.
                </h4>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Universal Point of Sale and Business ERP system built for retail stores, supermarts, pharmacies, wholesale distribution, and commercial counters.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Navigation
            </h5>
            <ul className="space-y-2 text-xs font-medium text-stone-600">
              <li>
                <Link href="/" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link href="/product" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                  <span>Product & Modules</span>
                </Link>
              </li>
              <li>
                <Link href="/plan" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                  <span>Pricing & Plan</span>
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                  <span>Staff / Cashier Login</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Software Highlights */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Core Modules
            </h5>
            <ul className="space-y-1.5 text-xs text-stone-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Fast Barcode POS Billing</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Inventory & Stock Tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Customer & Supplier Khata</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Cash Register & Shift Control</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>12+ Financial & Audit Reports</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Support */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Sales & Support
            </h5>
            <div className="space-y-2.5 text-xs text-stone-600">
              <a
                href="https://wa.me/923263392082"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-900 font-bold transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
                <div>
                  <span className="text-[10px] text-emerald-700 block font-normal">Official WhatsApp Support</span>
                  <span>0326 3392082</span>
                </div>
              </a>

              <p className="text-[11px] text-stone-500">
                Available 7 days a week for software activation, inquiries, and customer assistance.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-stone-500 text-center sm:text-left">
            © {new Date().getFullYear()} Falcon Swift PVT. LTD. All rights reserved.
          </p>
          <NATechHubBadge variant="footer" />
        </div>
      </div>
    </footer>
  );
}
