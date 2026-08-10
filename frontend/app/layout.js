import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata = {
  title: "InfraCtrl | Developer Self-Service Infrastructure",
  description: "Provision PostgreSQL, Redis, and S3 resources in seconds. Self-service ephemeral infrastructure with automated lifecycle management.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>
        <nav className="fixed top-0 w-full z-50" style={{
          background: 'rgba(10, 15, 30, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>
                IC
              </div>
              <span className="text-lg font-bold tracking-tight text-white">InfraCtrl</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                BETA
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/" className="nav-link text-sm font-medium">
                New Request
              </Link>
              <Link href="/dashboard"
                className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all"
                style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                Dashboard
              </Link>
            </div>
          </div>
        </nav>
        <main className="min-h-screen pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
