import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  CreditCard, 
  FileCode, 
  Link as LinkIcon, 
  PhoneCall, 
  Info
} from 'lucide-react';

interface EmergencyModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScenario?: 'link' | 'credentials' | 'money' | 'file';
}

type ScenarioId = 'link' | 'credentials' | 'money' | 'file';

interface EmergencyScenario {
  id: ScenarioId;
  label: string;
  icon: React.ElementType;
  severity: 'URGENT' | 'HIGH' | 'CRITICAL';
  summary: string;
  steps: { title: string; desc: string; important?: boolean }[];
  escalationChannels: { name: string; url?: string; phone?: string; desc: string }[];
}

export const EmergencyModeModal: React.FC<EmergencyModeModalProps> = ({
  isOpen,
  onClose,
  initialScenario = 'link'
}) => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>(initialScenario);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const scenarios: Record<ScenarioId, EmergencyScenario> = {
    link: {
      id: 'link',
      label: 'I clicked a suspicious link',
      icon: LinkIcon,
      severity: 'HIGH',
      summary: 'You followed an unverified link or visited a deceptive web page, but did not enter passwords or financial information.',
      steps: [
        {
          title: 'Close the browser tab immediately',
          desc: 'Do not click anywhere else on the page or accept any browser prompt (e.g. "Allow notifications" or "Update Flash").',
          important: true
        },
        {
          title: 'Clear browser cookies and session storage',
          desc: 'Go to your browser settings and clear browsing data for the past hour to destroy any tracking cookies or session tokens planted by the destination.'
        },
        {
          title: 'Disconnect from local Wi-Fi temporarily',
          desc: 'Toggle Wi-Fi off for 60 seconds if you notice unexpected network requests or automatic file download attempts.'
        },
        {
          title: 'Run a malware and antivirus quick scan',
          desc: 'Launch built-in protection (e.g. Windows Defender or macOS XProtect) to confirm no malicious payloads were cached in temporary directories.'
        }
      ],
      escalationChannels: [
        {
          name: 'FTC Fraud Reporting',
          url: 'https://reportfraud.ftc.gov',
          desc: 'Official United States Federal Trade Commission deceptive link intake.'
        },
        {
          name: 'Google Safe Browsing Report',
          url: 'https://safebrowsing.google.com/safebrowsing/report_phish/',
          desc: 'Submit deceptive URLs to trigger browser warning flags for other users.'
        }
      ]
    },
    credentials: {
      id: 'credentials',
      label: 'I shared my password or OTP',
      icon: Lock,
      severity: 'CRITICAL',
      summary: 'You entered your account credentials, security code, or SMS one-time password (OTP) into an unverified form.',
      steps: [
        {
          title: 'Change password on the affected service right now',
          desc: 'Open the genuine service website in a clean browser window and update your master password immediately.',
          important: true
        },
        {
          title: 'Change identical passwords across all other accounts',
          desc: 'If you reuse this password on your email, banking, or cloud accounts, update every one of them immediately. Credential stuffers test compromised passwords across hundreds of portals within minutes.',
          important: true
        },
        {
          title: 'Force-terminate active login sessions',
          desc: 'Go to Account Security settings on the legitimate service and click "Sign out of all other sessions / devices" to kick out attackers.'
        },
        {
          title: 'Switch from SMS 2FA to an Authenticator App',
          desc: 'Deactivate SMS-based codes if possible. Transition to a hardware security key (FIDO2/WebAuthn) or an authenticator app (Google Authenticator, Authy).'
        }
      ],
      escalationChannels: [
        {
          name: 'Account Service Provider Security Desk',
          desc: 'Contact the verified customer care of the compromised platform to request an emergency account freeze.'
        },
        {
          name: 'IdentityTheft.gov',
          url: 'https://www.identitytheft.gov',
          desc: 'Official U.S. government identity theft recovery plan and notification generator.'
        }
      ]
    },
    money: {
      id: 'money',
      label: 'I lost money or submitted card details',
      icon: CreditCard,
      severity: 'CRITICAL',
      summary: 'You entered your credit/debit card details, authorized a wire transfer, or sent funds through a P2P payment service.',
      steps: [
        {
          title: 'Call your bank or card issuer fraud hotline immediately',
          desc: 'Call the emergency phone number printed on the physical back of your bank card. Do NOT search for bank support numbers on search engines (scammers buy fake ads).',
          important: true
        },
        {
          title: 'Instruct the bank to lock the card and freeze pending transfers',
          desc: 'Request that the representative lock the compromised card number, cancel pre-authorizations, and reissue a new physical card with a different number.'
        },
        {
          title: 'File a dispute / unauthorized charge claim',
          desc: 'Formally contest the charges under unauthorized fraud protection regulations.'
        },
        {
          title: 'Place a fraud alert with national credit bureaus',
          desc: 'Contact credit reporting agencies (Experian, TransUnion, Equifax) to place an alert preventing scammers from opening lines of credit in your name.'
        }
      ],
      escalationChannels: [
        {
          name: 'FBI Internet Crime Complaint Center (IC3)',
          url: 'https://www.ic3.gov',
          desc: 'Federal cybercrime reporting bureau for wire and digital payment fraud.'
        },
        {
          name: 'Consumer Financial Protection Bureau',
          url: 'https://www.consumerfinance.gov/complaint/',
          desc: 'Regulatory resource if your financial institution delays fraud response.'
        }
      ]
    },
    file: {
      id: 'file',
      label: 'I downloaded or opened a suspicious file',
      icon: FileCode,
      severity: 'CRITICAL',
      summary: 'You downloaded or executed an email attachment, invoice PDF, executable (.exe/.dmg), or unknown script.',
      steps: [
        {
          title: 'Disconnect your device from all networks immediately',
          desc: 'Unplug your Ethernet cable and toggle Wi-Fi and Bluetooth OFF immediately. This stops remote command-and-control servers from exfiltrating data or spreading laterally across your home/office network.',
          important: true
        },
        {
          title: 'Do NOT accept administrative permission prompts',
          desc: 'If a dialog pops up asking for User Account Control (UAC) or root password access, click NO or CANCEL.',
          important: true
        },
        {
          title: 'Run a full offline system scan',
          desc: 'Restart your device into Safe Mode or trigger an offline Windows Defender scan to evaluate autorun registry keys and startup directories.'
        },
        {
          title: 'Back up critical offline documents',
          desc: 'If files are accessible, copy essential documents to an external USB drive (do not execute unknown binaries from that drive).'
        }
      ],
      escalationChannels: [
        {
          name: 'CISA Incident Reporting',
          url: 'https://www.cisa.gov/report',
          desc: 'Cybersecurity and Infrastructure Security Agency cyber incident reporting for high-severity intrusions.'
        },
        {
          name: 'Local Computer Security Professional',
          desc: 'If persistent malware or ransom notes appear, bring the machine to a certified technician for clean re-imaging.'
        }
      ]
    }
  };

  const current = scenarios[selectedScenario];

  const toggleStep = (stepIdx: number) => {
    const key = `${selectedScenario}-${stepIdx}`;
    setCompletedSteps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-card border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-md">
                <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="emergency-modal-title" className="text-xl sm:text-2xl font-display font-extrabold text-foreground">
                    Scam Emergency Mode
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-red-500/15 text-red-500 border border-red-500/30">
                    Incident Triage
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actionable step-by-step guidance for users who may have interacted with malicious content.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
              aria-label="Close emergency modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scenario Selector Pills */}
          <div>
            <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground tracking-wider block mb-2">
              Select What Happened:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(scenarios) as ScenarioId[]).map((key) => {
                const sc = scenarios[key];
                const Icon = sc.icon;
                const isSelected = selectedScenario === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedScenario(key)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-red-500/10 border-red-500/40 text-foreground shadow-sm'
                        : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-display font-bold text-xs">{sc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scenario Summary Box */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-mono font-bold text-foreground">Situation Assessment</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold ml-auto">
                {current.severity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {current.summary}
            </p>
          </div>

          {/* Step-by-Step Action Checklist */}
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5">
              <span>Immediate Protective Steps</span>
              <span className="text-[10px] font-normal lowercase text-muted-foreground">(check as you complete)</span>
            </h3>

            <div className="space-y-2.5">
              {current.steps.map((st, idx) => {
                const isChecked = !!completedSteps[`${selectedScenario}-${idx}`];

                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked 
                        ? 'bg-emerald-500/5 border-emerald-500/30' 
                        : st.important
                        ? 'bg-card border-red-500/40 hover:border-red-500/70'
                        : 'bg-card border-border hover:border-border/80'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-muted-foreground/40 bg-muted/50'
                    }`}>
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${
                          isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}>
                          {st.title}
                        </span>
                        {st.important && !isChecked && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-500/15 text-red-500 border border-red-500/30">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 leading-relaxed ${
                        isChecked ? 'line-through text-muted-foreground/60' : 'text-muted-foreground'
                      }`}>
                        {st.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Escalation & Support Channels */}
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider mb-2.5">
              Official Escalation & Reporting Channels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.escalationChannels.map((channel, i) => (
                <div key={i} className="p-3 rounded-xl bg-muted/50 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">{channel.name}</span>
                    {channel.url && (
                      <a
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-500 hover:text-brand-600 text-xs font-mono flex items-center gap-1"
                      >
                        <span>Open Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{channel.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Explicit Honest Non-Liability Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-[11px] text-muted-foreground leading-relaxed">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Incident Guidance Disclaimer:</strong> RiskShield AI provides emergency response triage steps based on security industry best practices. RiskShield AI does not scan local hardware, reverse bank transactions, or recover lost funds. Contact your financial institution and official regulatory authorities immediately.
            </span>
          </div>

          {/* Footer action */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all"
            >
              Done Reviewing Emergency Steps
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EmergencyModeModal;
