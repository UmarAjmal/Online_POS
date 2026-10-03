import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SystemSettingsProvider } from "@/context/SystemSettingsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Falcon Swift PVT. LTD. of Companies | Al Madina Commission Agent, Petroleum Service & Rehmani Zarai Farm",
  description: "Official portal of Falcon Swift PVT. LTD. of Companies. Al Madina Commission Agent, Al Madina Petroleum Service, and Rehmani Zarai Farm. Prop: Aamish Rehmani - Chak No 102/15L Mian Channu. Contact: 03261527022.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <ThemeProvider>
            <SystemSettingsProvider>
              {children}
              <Toaster position="top-center" />
            </SystemSettingsProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

