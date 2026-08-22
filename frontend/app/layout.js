import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import AppHeader from "@/components/AppHeader";
import { Toaster } from "sonner";
import { Analytics } from '@vercel/analytics/next';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata = {
  metadataBase: new URL('https://infractrl.vercel.app'),
  title: "InfraCtrl | Developer Self-Service Infrastructure",
  description: "Request cloud databases in 5 minutes, not 5 days. Self-service ephemeral infrastructure with automated Terraform provisioning and live cost metering.",
  openGraph: {
    title: "InfraCtrl | Developer Self-Service",
    description: "Request cloud databases in 5 minutes, not 5 days. Automated Terraform provisioning.",
    url: "https://infractrl.vercel.app",
    siteName: "InfraCtrl",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InfraCtrl | Developer Self-Service",
    description: "Request cloud databases in 5 minutes, not 5 days. Automated Terraform provisioning.",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.ico",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased min-h-screen bg-black text-white selection:bg-cyan-400/30 font-sans">
        <Providers>
          <AppHeader />
          <main className="min-h-screen">
            {children}
          </main>
        </Providers>

        {/* Global Toast Engine */}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0a0a0c',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              boxShadow: '0 10px 30px -5px rgba(0,0,0,0.9), 0 0 20px rgba(45, 212, 191, 0.15)',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
