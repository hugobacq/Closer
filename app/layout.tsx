import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

import { Viewport } from "next";

export const metadata: Metadata = {
  title: "Closer",
  description: "Votre espace privé à deux",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Closer",
  },
};

export const viewport: Viewport = {
  themeColor: "#FDF8F5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${sans.className} antialiased bg-stone-100`}>
        <div className="max-w-md mx-auto min-h-screen bg-[#FDF8F5]">
          {children}
        </div>
      </body>
    </html>
  );
}
