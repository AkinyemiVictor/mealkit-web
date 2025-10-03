﻿import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css"; // global styles
import "@/styles/main.css"; // bring in your main styles
import Header from "@/components/header";
import Footer from "@/components/footer";
import ThemeInitializer from "@/components/theme-initializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MealKit | Real Meal, Real Fast",
  description: "Farm-fresh products delivered to your doorstep",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/assets/favicon/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/assets/favicon/favicon-16x16.png", type: "image/png", sizes: "16x16" }
    ],
    apple: "/assets/favicon/apple-touch-icon.png",
    shortcut: "/favicon.ico"
  },
  manifest: "/assets/favicon/site.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body data-theme="light" className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeInitializer />

        <Header />
        {children}

        <Footer />
      </body>
    </html>
  );
}

