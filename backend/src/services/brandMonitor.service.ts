/**
 * RiskShield AI — Brand Monitor Service
 * Coordinates scheduled brand intelligence scans for verified brand assets,
 * enforces bounded execution times, and handles atomic runner leases.
 */
import { randomUUID } from 'crypto';
import { brandMonitorRepository, BrandMonitorScheduleRecord } from '../repositories/brandMonitor.repository';
import { brandRepository } from '../repositories/brand.repository';
import { scannerService } from './scanner.service';
import { parseDomainInfo } from '../lib/security/domainUtils';

export interface MonitorRunResult {
  brandId: string;
  brandName: string;
  assetsScanned: number;
  candidatesEvaluated: number;
  findingsCaptured: number;
  status: 'COMPLETED' | 'FAILED';
  durationMs: number;
  error?: string;
}

export class BrandMonitorService {
  /**
   * Minimum and maximum allowed monitoring frequencies in hours.
   */
  readonly MIN_FREQUENCY_HOURS = 1;
  readonly MAX_FREQUENCY_HOURS = 168; // 7 days
  readonly DEFAULT_FREQUENCY_HOURS = 24;

  /**
   * Retrieves or creates a schedule record for the given brand.
   */
  async getOrCreateSchedule(brandId: string): Promise<BrandMonitorScheduleRecord> {
    const existing = await brandMonitorRepository.findByBrandId(brandId);
    if (existing) {
      return existing;
    }

    return brandMonitorRepository.upsertSchedule(brandId, {
      enabled: false,
      frequencyHours: this.DEFAULT_FREQUENCY_HOURS
    });
  }

  /**
   * Validates and updates the schedule configuration.
   */
  async updateSchedule(
    brandId: string,
    options: {
      enabled?: boolean;
      frequencyHours?: number;
    }
  ): Promise<BrandMonitorScheduleRecord> {
    if (options.frequencyHours !== undefined) {
      if (
        !Number.isInteger(options.frequencyHours) ||
        options.frequencyHours < this.MIN_FREQUENCY_HOURS ||
        options.frequencyHours > this.MAX_FREQUENCY_HOURS
      ) {
        throw new Error(
          `Invalid frequency: must be an integer between ${this.MIN_FREQUENCY_HOURS} and ${this.MAX_FREQUENCY_HOURS} hours.`
        );
      }
    }

    return brandMonitorRepository.upsertSchedule(brandId, options);
  }

  /**
   * Executes monitoring for a single brand with a bounded per-brand timeout.
   */
  async executeBrandMonitoring(
    brandId: string,
    workerId = `worker-${randomUUID().substring(0, 8)}`,
    timeoutMs = 25000
  ): Promise<MonitorRunResult> {
    const startTime = Date.now();

    // 1. Acquire lease
    const acquired = await brandMonitorRepository.acquireLease(brandId, workerId, timeoutMs + 10000);
    if (!acquired) {
      throw new Error(`Could not acquire execution lease for brand ${brandId}. Another worker may be processing it.`);
    }

    let assetsScanned = 0;
    let candidatesEvaluated = 0;
    let findingsCaptured = 0;
    let brandName = 'Unknown Brand';

    try {
      // 2. Load verified brand details
      const brand = await brandRepository.findBrandById(brandId);
      if (!brand) {
        throw new Error(`Brand with ID "${brandId}" not found.`);
      }
      brandName = String((brand as any).name || 'Unknown Brand');

      // 3. Filter ONLY verified DOMAIN and SUBDOMAIN assets
      const allAssets = (await brandRepository.findBrandAssets(brandId)) as any[];
      const verifiedDomainAssets = allAssets.filter(
        (a) =>
          a.status === 'VERIFIED' &&
          (a.type === 'DOMAIN' || a.type === 'SUBDOMAIN')
      );

      assetsScanned = verifiedDomainAssets.length;

      if (verifiedDomainAssets.length === 0) {
        // No verified assets to monitor yet
        const schedule = await this.getOrCreateSchedule(brandId);
        const nextRun = new Date(Date.now() + schedule.frequencyHours * 3600 * 1000);

        await brandMonitorRepository.releaseLease(brandId, {
          status: 'COMPLETED',
          findingsCount: 0,
          assetsScanned: 0,
          nextRunAt: nextRun
        });

        return {
          brandId,
          brandName,
          assetsScanned: 0,
          candidatesEvaluated: 0,
          findingsCaptured: 0,
          status: 'COMPLETED',
          durationMs: Date.now() - startTime
        };
      }

      // 4. Synthesize synthetic candidate indicators for detection evaluation
      // (Uses TR39 confusable lookalikes, typosquatting, and deceptive subdomain permutations)
      const candidateTargets: string[] = [];

      for (const asset of verifiedDomainAssets) {
        const parsed = parseDomainInfo(asset.normalizedValue);
        const sld = parsed.sld;
        const tld = parsed.tld || 'com';

        // Candidate 1: Deceptive subdomain pattern
        candidateTargets.push(`https://${asset.normalizedValue}.account-security-update.net/login`);

        // Candidate 2: Visual substitution (e.g. paypa1 or arnazon)
        if (sld.length >= 4) {
          const visualSubSld = sld.replace(/l/g, '1').replace(/o/g, '0').replace(/m/g, 'rn');
          if (visualSubSld !== sld) {
            candidateTargets.push(`https://${visualSubSld}.${tld}`);
          }
        }
      }

      // Limit candidates per run to prevent timeout
      const boundedCandidates = candidateTargets.slice(0, 6);
      candidatesEvaluated = boundedCandidates.length;

      // 5. Evaluate each candidate through ScannerService
      for (const target of boundedCandidates) {
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          console.warn(`Brand monitoring for "${brandName}" reached bounded timeout (${timeoutMs}ms).`);
          break;
        }

        try {
          const scanRes = await scannerService.evaluateBrandIndicator({
            brandId,
            brandName,
            target,
            contextPayload: {
              category: 'url',
              primaryInput: target
            }
          });

          if (scanRes.shouldCreateBrandFinding) {
            findingsCaptured++;
          }
        } catch (scanErr) {
          // Log candidate failure without aborting entire brand scan
          console.warn(`Candidate scan failed for target ${target}:`, scanErr);
        }
      }

      // 6. Release lease and update schedule
      const schedule = await this.getOrCreateSchedule(brandId);
      const nextRun = new Date(Date.now() + schedule.frequencyHours * 3600 * 1000);

      await brandMonitorRepository.releaseLease(brandId, {
        status: 'COMPLETED',
        findingsCount: findingsCaptured,
        assetsScanned,
        nextRunAt: nextRun
      });

      return {
        brandId,
        brandName,
        assetsScanned,
        candidatesEvaluated,
        findingsCaptured,
        status: 'COMPLETED',
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      const schedule = await this.getOrCreateSchedule(brandId);
      // Retry in 1 hour on failure
      const retryRun = new Date(Date.now() + 3600 * 1000);

      await brandMonitorRepository.releaseLease(brandId, {
        status: 'FAILED',
        lastError: err?.message || 'Monitoring run failed',
        findingsCount: findingsCaptured,
        assetsScanned,
        nextRunAt: retryRun
      });

      return {
        brandId,
        brandName,
        assetsScanned,
        candidatesEvaluated,
        findingsCaptured,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        error: err?.message || 'Monitoring run failed'
      };
    }
  }

  /**
   * Cron runner job: acquires up to batchSize eligible brand schedules and processes them.
   */
  async runCronBatch(
    workerId = `cron-runner-${randomUUID().substring(0, 8)}`,
    batchSize = 5
  ): Promise<{
    workerId: string;
    totalAcquired: number;
    results: MonitorRunResult[];
    durationMs: number;
  }> {
    const startTime = Date.now();

    // Atomically acquire schedules whose nextRunAt has elapsed
    const eligibleSchedules = await brandMonitorRepository.acquireEligibleSchedules(
      batchSize,
      workerId,
      45000 // 45s batch lease
    );

    const results: MonitorRunResult[] = [];

    for (const sched of eligibleSchedules) {
      try {
        const res = await this.executeBrandMonitoring(sched.brandId, workerId, 15000);
        results.push(res);
      } catch (err: any) {
        results.push({
          brandId: sched.brandId,
          brandName: 'Unknown',
          assetsScanned: 0,
          candidatesEvaluated: 0,
          findingsCaptured: 0,
          status: 'FAILED',
          durationMs: 0,
          error: err?.message || 'Unexpected batch processing failure'
        });
      }
    }

    return {
      workerId,
      totalAcquired: eligibleSchedules.length,
      results,
      durationMs: Date.now() - startTime
    };
  }
}

export const brandMonitorService = new BrandMonitorService();
