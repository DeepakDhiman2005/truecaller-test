import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import Script from "next/script"; // ✅ Import this
import AppProvider from "@/providers/AppProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quikkred | Truecaller Auth",
  description: "Secure login with Truecaller",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Use ONLY the v1 SDK as per your verification code logic */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={<div>Loading...</div>}>
          <AppProvider>
            {children}
          </AppProvider>
        </Suspense>

        {/* Move the script to the bottom of the body */}
        <script
          src="https://sdk.truecaller.com/web/v1/truecaller-web-sdk.js"
          async
        />
      </body>
    </html>
  );
}