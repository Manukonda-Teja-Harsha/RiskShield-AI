import React from 'react';
import { motion } from 'framer-motion';
import { Building2, ShieldCheck, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

interface BrandProtectionSectionProps {
  onOpenBrandAuth: () => void;
}

export const BrandProtectionSection: React.FC<BrandProtectionSectionProps> = ({ onOpenBrandAuth }) => {
  const brandPillars = [
    {
      title: 'Digital Asset Whitelist Registration',
      desc: 'Register and cryptographically attest official domains, social handles, and authorized merchants via DNS TXT records.',
    },
    {
      title: 'Autonomous Lookalike Domain Radar',
      desc: 'Continuously scan new TLD registrations for typosquats, brand keywords, and homoglyphs weaponizing your brand name.',
    },
    {
      title: 'RFC-Compliant Abuse Dossier Generator',
      desc: 'Export pre-packaged technical evidence packages (DNS, WHOIS, screenshots) ready for registrar and hosting abuse desks.',
    },
    {
      title: 'Community Threat Escalations',
      desc: 'Investigate user-flagged impersonation links targeting your company in a dedicated brand review queue.',
    }
  ];

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border bg-muted/10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Brand Explanation */}
        <div className="lg:col-span-7 space-y-6">
          <span className="text-xs font-mono uppercase font-bold text-amber-500 tracking-wider">
            Brand Sovereignty & Identity
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-foreground tracking-tight leading-tight">
            Protect Your Customers from Counterfeit Brand Clones
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Fraudsters weaponize your brand reputation to trick customers into entering credentials on lookalike domains. RiskShield AI empowers brand owners to catalog legitimate digital assets and assemble verifiable evidence dossiers for rapid abuse mitigation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {brandPillars.map((p, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <h4 className="font-semibold text-xs text-foreground">{p.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={onOpenBrandAuth}
              className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white font-bold text-xs tracking-wide shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 active:scale-95"
            >
              <Building2 className="w-4 h-4" />
              <span>Protect Your Brand Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground">
              Dedicated Brand Owner Dashboard
            </span>
          </div>
        </div>

        {/* Right Column: Architectural Integrity Callout */}
        <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-bold text-sm text-foreground">
              Verification & Ethical Standard
            </h3>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">DNS TXT Verification:</strong> Brand asset whitelisting requires authoritative DNS challenge completion or corporate domain email confirmation before assets receive verified status.
            </p>
            <p>
              <strong className="text-foreground">Evidence Integrity:</strong> We do not claim forced automated takedowns or invent brand case studies without verified authorization. Every dossier adheres to RFC abuse reporting standards.
            </p>
            <p>
              <strong className="text-foreground">Unverified Brand Reporting:</strong> Even prior to DNS verification, authorized brand representatives can submit active threat reports to the investigation queue.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/60 border border-border text-[11px] font-mono text-foreground space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verification Engine:</span>
              <span className="text-emerald-500 font-bold">DNS Zone Resolver Ready</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Takedown Standard:</span>
              <span>RFC-2822 / ICANN Abuse Packet</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
