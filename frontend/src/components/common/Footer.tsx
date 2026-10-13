import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Database, ExternalLink, Scale, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-card border-t border-border mt-20 pt-16 pb-12 text-muted-foreground text-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-border">
          {/* Col 1: Platform Overview */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">
                RiskShield <span className="text-brand-500">AI</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mb-4 leading-relaxed">
              Digital Risk Protection Platform providing explainable threat evaluation for everyday users and proactive digital identity defense for commercial brands.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Evidence Engine Online • STIX / TAXII 2.1 Ready</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="font-mono text-xs uppercase font-bold text-foreground tracking-wider mb-4">
              Platform Features
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="/#quick-scanner" className="hover:text-brand-500 transition-colors">Unified Threat Scanner</a></li>
              <li><Link to="/dashboard" className="hover:text-brand-500 transition-colors">Personal Scan History</Link></li>
              <li><Link to="/brand-dashboard" className="hover:text-brand-500 transition-colors">Brand Identity Defense</Link></li>
              <li><a href="#how-it-works" className="hover:text-brand-500 transition-colors">Heuristic Workflow</a></li>
              <li><a href="#faq" className="hover:text-brand-500 transition-colors">FAQ & Risk Statuses</a></li>
            </ul>
          </div>

          {/* Col 3: Principles & Ethics */}
          <div>
            <h4 className="font-mono text-xs uppercase font-bold text-foreground tracking-wider mb-4">
              Ethics & Governance
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-brand-500" /> Zero Telemetry Harvesting</li>
              <li className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-brand-500" /> Transparent Feed Attribution</li>
              <li className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-brand-500" /> Responsible Disclosure Policy</li>
              <li className="text-muted-foreground/80">RFC-Compliant Abuse Dossiers</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            © {new Date().getFullYear()} RiskShield AI Platform. All rights reserved.
          </div>
          <div className="text-center sm:text-right max-w-lg text-[11px] leading-relaxed text-muted-foreground/80">
            Advisory Notice: Threat intelligence scores represent automated heuristic probability assessments based on evidence available at scan time. Absence of a threat match does not guarantee complete safety.
          </div>
        </div>
      </div>
    </footer>
  );
};
