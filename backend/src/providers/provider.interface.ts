/**
 * RiskShield AI — Threat Intelligence Provider Architecture Interface
 */
import type { ProviderLookupResult, ThreatProviderName } from '../types';

export interface ThreatIntelligenceProvider {
  readonly name: ThreatProviderName;
  isConfigured(): boolean;
  lookup(targetUrl: string): Promise<ProviderLookupResult>;
}
