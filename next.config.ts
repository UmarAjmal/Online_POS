import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.12', '192.168.1.12:3000', 'localhost:3000'],
  serverExternalPackages: ['better-sqlite3', 'pg'],
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@supabase/supabase-js',
      'jspdf',
      'jspdf-autotable',
      'sonner',
      'clsx',
      'tailwind-merge',
      'jsbarcode',
    ],
  },
};

export default nextConfig;
