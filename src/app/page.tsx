import Link from "next/link";
import { Receipt, Sparkles, FileSpreadsheet, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">ExpenseFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-brand-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 tracking-tight max-w-3xl mx-auto leading-tight">
          Expense reports, done in{" "}
          <span className="text-brand-primary">seconds</span>
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto">
          Upload your receipts, let AI extract the details, and export
          polished reports to PDF or Excel. No more manual data entry.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-primary/25"
          >
            Start Free Trial
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-3 rounded-lg font-semibold text-lg hover:border-gray-300 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="AI-Powered Extraction"
            description="Upload a receipt photo or PDF and our AI instantly extracts the date, vendor, amount, and category."
          />
          <FeatureCard
            icon={<FileSpreadsheet className="w-6 h-6" />}
            title="One-Click Export"
            description="Export to PDF for receipt documentation or fill your company's Excel template automatically."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Organization Ready"
            description="Custom branding per organization, team member management, and role-based access control."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} ExpenseFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
      <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
