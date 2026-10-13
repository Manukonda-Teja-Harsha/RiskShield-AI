import React from 'react';
import { ShieldAlert, AlertTriangle, HelpCircle, CheckCircle2, ShieldX } from 'lucide-react';
import { RiskStatus } from '../../types';

interface RiskBadgeProps {
  status: RiskStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ status, showIcon = true, size = 'md' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'KNOWN_THREAT':
        return {
          label: 'KNOWN THREAT',
          icon: ShieldX,
          classes: 'bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400',
        };
      case 'HIGH_RISK':
        return {
          label: 'HIGH RISK',
          icon: ShieldAlert,
          classes: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
        };
      case 'SUSPICIOUS':
        return {
          label: 'SUSPICIOUS',
          icon: AlertTriangle,
          classes: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
        };
      case 'INCONCLUSIVE':
        return {
          label: 'INCONCLUSIVE',
          icon: HelpCircle,
          classes: 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400',
        };
      case 'NO_KNOWN_THREAT_DETECTED':
        return {
          label: 'NO KNOWN THREAT DETECTED',
          icon: CheckCircle2,
          classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
        };
      default:
        return {
          label: status,
          icon: HelpCircle,
          classes: 'bg-slate-500/10 border-slate-500/30 text-slate-500',
        };
    }
  };

  const config = getBadgeConfig();
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  return (
    <span className={`inline-flex items-center font-mono font-semibold rounded-full border ${config.classes} ${sizeClasses}`}>
      {showIcon && <IconComponent className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
};
