import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* ===================================================================================
   GLOBAL METADATA
   Informasi ini akan muncul di tab browser pengguna.
=================================================================================== */
export const metadata: Metadata = {
  title: "LookDeep ERP | Enterprise Resource Planning",
  description: "Sistem Informasi ERP Terintegrasi Berbasis Component-Based untuk Manajemen Operasional.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Mengubah ke bahasa Indonesia
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F8FAFC] text-slate-600`}
      >
        {children}
      </body>
    </html>
  );
}