/**
 * RiskShield AI — Phase E2 Automated Verification Suite
 * Automated Scheduled Brand Monitoring, Atomic Lease Acquisition,
 * Threat Investigation Lifecycle Transitions, and RFC 2142 Abuse Drafts
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/db/prisma';
import { brandMonitorRepository } from '../src/repositories/brandMonitor.repository';
import { brandMonitorService } from '../src/services/brandMonitor.service';
import { threatInvestigationService } from '../src/services/threatInvestigation.service';
import { brandRepository } from '../src/repositories/brand.repository';

async function runPhaseE2Verification() {
  console.log('====================================================');
  console.log('   RISKSHIELD AI — PHASE E2 AUTOMATED VERIFICATION  ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   Details: ${details}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // Setup isolated test entities
  const ownerUserId = randomUUID();
  const memberUserId = randomUUID();
  const strangerUserId = randomUUID();
  const brandId = randomUUID();

  // Create test users
  await prisma.user.createMany({
    data: [
      {
        id: ownerUserId,
        email: `owner-${Date.now()}@riskshield.internal`,
        fullName: 'E2 Brand Owner',
        role: 'BRAND_OWNER',
        isEmailVerified: true
      },
      {
        id: memberUserId,
        email: `member-${Date.now()}@riskshield.internal`,
        fullName: 'E2 Brand Member',
        role: 'USER',
        isEmailVerified: true
      },
      {
        id: strangerUserId,
        email: `stranger-${Date.now()}@riskshield.internal`,
        fullName: 'E2 Stranger User',
        role: 'USER',
        isEmailVerified: true
      }
    ]
  });

  // Create test brand
  await prisma.brand.create({
    data: {
      id: brandId,
      name: 'CyberShield Quantum',
      slug: `cybershield-${Date.now()}`,
      category: 'CYBERSECURITY',
      status: 'VERIFIED',
      website: 'https://cybershield.io',
      securityContactEmail: 'security@cybershield.io'
    }
  });

  // Memberships: Owner (OWNER) and Member (MEMBER). Stranger has NO membership.
  await prisma.brandMembership.createMany({
    data: [
      { userId: ownerUserId, brandId, role: 'OWNER', status: 'ACTIVE' },
      { userId: memberUserId, brandId, role: 'MEMBER', status: 'ACTIVE' }
    ]
  });

  try {
    // -------------------------------------------------------------
    // Suite 1: Schedule Configuration & Frequency Limits
    // -------------------------------------------------------------
    console.log('--- Suite 1: Schedule Configuration & Frequency Limits ---');

    // 1a. Default schedule initialization
    const initialSchedule = await brandMonitorService.getOrCreateSchedule(brandId);
    assert(initialSchedule.enabled === false, 'New monitor schedule initializes in disabled state');
    assert(initialSchedule.frequencyHours === 24, 'Default frequency is 24 hours');
    assert(initialSchedule.status === 'IDLE', 'Initial status is IDLE');

    // 1b. Frequency validation: rejects < 1 hour
    let rejectedLow = false;
    try {
      await brandMonitorService.updateSchedule(brandId, { frequencyHours: 0 });
    } catch {
      rejectedLow = true;
    }
    assert(rejectedLow, 'Rejects frequency < 1 hour (minimum boundary enforced)');

    // 1c. Frequency validation: rejects > 168 hours
    let rejectedHigh = false;
    try {
      await brandMonitorService.updateSchedule(brandId, { frequencyHours: 200 });
    } catch {
      rejectedHigh = true;
    }
    assert(rejectedHigh, 'Rejects frequency > 168 hours (maximum 7 days boundary enforced)');

    // 1d. Valid frequency update
    const updatedSchedule = await brandMonitorService.updateSchedule(brandId, {
      enabled: true,
      frequencyHours: 12
    });
    assert(updatedSchedule.enabled === true, 'Schedule enabled successfully');
    assert(updatedSchedule.frequencyHours === 12, 'Schedule frequency updated to 12 hours');

    // -------------------------------------------------------------
    // Suite 2: Atomic Lease Acquisition & Concurrency Control
    // -------------------------------------------------------------
    console.log('\n--- Suite 2: Atomic Lease Acquisition & Concurrency Control ---');

    const workerA = 'worker-node-alpha';
    const workerB = 'worker-node-beta';

    // 2a. Worker A acquires lease
    const leaseA = await brandMonitorRepository.acquireLease(brandId, workerA, 60000);
    assert(leaseA === true, 'Worker A successfully acquires atomic lease');

    // 2b. Worker B attempts to acquire while locked -> must be rejected
    const leaseB = await brandMonitorRepository.acquireLease(brandId, workerB, 60000);
    assert(leaseB === false, 'Worker B rejected while active lease is held (prevents concurrent duplicate runs)');

    // 2c. Expired lease recovery (simulate expired lock)
    await (prisma as any).brandMonitorSchedule.update({
      where: { brandId },
      data: { lockedUntil: new Date(Date.now() - 3600 * 1000) } // 1 hour in past (reliably expired)
    });

    const leaseRecovery = await brandMonitorRepository.acquireLease(brandId, workerB, 60000);
    assert(leaseRecovery === true, 'Worker B acquires lease after previous lease expired (worker crash recovery)');

    // 2d. Release lease cleanly
    await brandMonitorRepository.releaseLease(brandId, {
      status: 'COMPLETED',
      findingsCount: 0,
      assetsScanned: 0,
      nextRunAt: new Date(Date.now() + 12 * 3600 * 1000)
    });

    const scheduleAfterRelease = await brandMonitorRepository.findByBrandId(brandId);
    assert(scheduleAfterRelease?.status === 'COMPLETED', 'Schedule status transitions to COMPLETED on clean release');
    assert(scheduleAfterRelease?.lockedUntil === null, 'lockedUntil cleared upon lease release');

    // -------------------------------------------------------------
    // Suite 3: Verified-Only Asset Monitoring & Threat Finding
    // -------------------------------------------------------------
    console.log('\n--- Suite 3: Verified-Only Asset Monitoring & Threat Finding ---');

    // 3a. Add an unverified asset (PENDING_DNS)
    await prisma.brandAsset.create({
      data: {
        brandId,
        type: 'DOMAIN',
        value: 'unverified-candidate.com',
        normalizedValue: 'unverified-candidate.com',
        status: 'PENDING_DNS'
      }
    });

    // Run monitoring: unverified asset must NOT be scanned
    const runUnverifiedOnly = await brandMonitorService.executeBrandMonitoring(brandId);
    assert(
      runUnverifiedOnly.assetsScanned === 0,
      'Unverified asset is ignored (only verified assets qualify as monitoring baseline)'
    );

    // 3b. Add a verified official domain asset
    await prisma.brandAsset.create({
      data: {
        brandId,
        type: 'DOMAIN',
        value: 'cybershield.io',
        normalizedValue: 'cybershield.io',
        status: 'VERIFIED'
      }
    });

    // Run monitoring: verified asset qualifies
    const runVerified = await brandMonitorService.executeBrandMonitoring(brandId);
    assert(runVerified.assetsScanned === 1, 'Verified domain asset is scanned as baseline (1 asset scanned)');
    assert(runVerified.candidatesEvaluated > 0, 'Synthesizes lookalike candidates for lexical/threat checking');
    assert(runVerified.findingsCaptured > 0, 'Detects impersonation candidates and captures threat findings');

    // Verify finding in PostgreSQL
    const findings = (await brandRepository.findFindingsByBrand(brandId)) as any[];
    assert(findings.length >= 1, `Brand threat findings persisted in PostgreSQL (count: ${findings.length})`);
    const initialFinding = findings[0];
    assert(initialFinding.riskScore >= 60, `Finding riskScore is ${initialFinding.riskScore} >= 60`);
    assert(initialFinding.repeatScanCount === 1, 'Initial finding repeatScanCount is 1');

    // 3c. Idempotent re-run: repeat scan increments repeatScanCount without duplicate rows
    await brandMonitorService.executeBrandMonitoring(brandId);
    const findingsAfterRerun = (await brandRepository.findFindingsByBrand(brandId)) as any[];
    assert(findingsAfterRerun.length === findings.length, 'Finding rows deduplicated (no duplicate rows created)');
    const updatedFinding = findingsAfterRerun.find((f: any) => f.id === initialFinding.id);
    assert(
      updatedFinding.repeatScanCount >= 2,
      `repeatScanCount incremented to ${updatedFinding.repeatScanCount} on re-run`
    );

    // -------------------------------------------------------------
    // Suite 4: Finding Investigation Lifecycle & RBAC
    // -------------------------------------------------------------
    console.log('\n--- Suite 4: Finding Investigation Lifecycle & RBAC ---');

    const testFindingId = initialFinding.id;

    // 4a. Initial status must be NEW
    assert(initialFinding.status === 'NEW', 'Initial finding status is NEW');

    // 4b. Member transitions NEW -> UNDER_INVESTIGATION (Permitted for MEMBER)
    const memberTransition = await threatInvestigationService.transitionFindingStatus({
      findingId: testFindingId,
      brandId,
      callerEmail: `member@riskshield.internal`,
      callerRole: 'MEMBER',
      targetStatus: 'UNDER_INVESTIGATION',
      note: 'Analyst assigned to review deceptive login form.'
    });
    assert(
      memberTransition.newStatus === 'UNDER_INVESTIGATION',
      'MEMBER successfully transitions finding from NEW to UNDER_INVESTIGATION'
    );
    assert(
      memberTransition.investigationEntry.actionTaken.includes('NEW -> UNDER_INVESTIGATION'),
      'Append-only audit record captures status transition'
    );

    // 4c. Member attempts privileged transition to RESOLVED -> must be rejected (RBAC)
    let memberResolvedRejected = false;
    try {
      await threatInvestigationService.transitionFindingStatus({
        findingId: testFindingId,
        brandId,
        callerEmail: `member@riskshield.internal`,
        callerRole: 'MEMBER',
        targetStatus: 'RESOLVED',
        note: 'Attempting resolution without admin rights.'
      });
    } catch {
      memberResolvedRejected = true;
    }
    assert(
      memberResolvedRejected,
      'MEMBER rejected from transitioning finding to RESOLVED (RBAC requires OWNER or ADMIN)'
    );

    // 4d. Owner transitions UNDER_INVESTIGATION -> TAKEDOWN_REQUESTED (Permitted for OWNER)
    const ownerTakedown = await threatInvestigationService.transitionFindingStatus({
      findingId: testFindingId,
      brandId,
      callerEmail: `owner@riskshield.internal`,
      callerRole: 'OWNER',
      targetStatus: 'TAKEDOWN_REQUESTED',
      note: 'RFC 2142 abuse report prepared and sent to hosting provider desk.'
    });
    assert(
      ownerTakedown.newStatus === 'TAKEDOWN_REQUESTED',
      'OWNER successfully transitions finding to TAKEDOWN_REQUESTED'
    );

    // 4e. Owner transitions TAKEDOWN_REQUESTED -> RESOLVED (Permitted for OWNER)
    const ownerResolved = await threatInvestigationService.transitionFindingStatus({
      findingId: testFindingId,
      brandId,
      callerEmail: `owner@riskshield.internal`,
      callerRole: 'OWNER',
      targetStatus: 'RESOLVED',
      note: 'Host suspended bulletproof subdomain.'
    });
    assert(ownerResolved.newStatus === 'RESOLVED', 'OWNER successfully transitions finding to RESOLVED');

    // 4f. Invalid lifecycle transition: RESOLVED directly to TAKEDOWN_REQUESTED (must be rejected)
    let invalidDirectRejected = false;
    try {
      await threatInvestigationService.transitionFindingStatus({
        findingId: testFindingId,
        brandId,
        callerEmail: `owner@riskshield.internal`,
        callerRole: 'OWNER',
        targetStatus: 'TAKEDOWN_REQUESTED',
        note: 'Invalid jump from RESOLVED to TAKEDOWN_REQUESTED.'
      });
    } catch {
      invalidDirectRejected = true;
    }
    assert(
      invalidDirectRejected,
      'Invalid lifecycle jump rejected by transition state machine'
    );

    // 4g. Audit trail integrity: all transitions recorded in threat_investigations
    const auditEntries = await (prisma as any).threatInvestigation.findMany({
      where: { findingId: testFindingId },
      orderBy: { createdAt: 'asc' }
    });
    assert(auditEntries.length >= 3, `Append-only audit trail contains ${auditEntries.length} entries`);
    assert(
      auditEntries.some((e: any) => e.actionTaken.includes('UNDER_INVESTIGATION -> TAKEDOWN_REQUESTED')),
      'Audit log captures TAKEDOWN_REQUESTED transition'
    );
    assert(
      auditEntries.some((e: any) => e.actionTaken.includes('TAKEDOWN_REQUESTED -> RESOLVED')),
      'Audit log captures RESOLVED transition'
    );

    // 4h. Tenant isolation: stranger brand cannot access or transition finding
    let crossTenantRejected = false;
    try {
      await threatInvestigationService.transitionFindingStatus({
        findingId: testFindingId,
        brandId: randomUUID(), // different brand ID
        callerEmail: `stranger@riskshield.internal`,
        callerRole: 'OWNER',
        targetStatus: 'FALSE_POSITIVE'
      });
    } catch {
      crossTenantRejected = true;
    }
    assert(crossTenantRejected, 'Cross-tenant finding transition rejected (strict workspace scoping)');

    // -------------------------------------------------------------
    // Suite 5: Evidence-Based RFC 2142 Abuse Report Draft Generation
    // -------------------------------------------------------------
    console.log('\n--- Suite 5: RFC 2142 Abuse Report Draft Generation ---');

    const draft = await threatInvestigationService.generateAbuseReportDraft(
      testFindingId,
      brandId,
      'security-lead@cybershield.io'
    );

    // 5a. Subject line contains brand name and target
    assert(
      draft.suggestedSubject.includes('CyberShield Quantum') && draft.suggestedSubject.includes('Abuse'),
      'Subject line identifies brand name and abuse intent'
    );

    // 5b. Suggested recipients include RFC 2142 role mailboxes
    assert(
      draft.suggestedRecipients.some((r) => r.type === 'RFC_2142_ROLE_MAILBOX' && r.email.startsWith('abuse@')),
      'Includes RFC 2142 standard abuse role mailbox (abuse@<apex>)'
    );
    assert(
      draft.suggestedRecipients.some((r) => r.type === 'SECURITY_ROLE_MAILBOX' && r.email.startsWith('security@')),
      'Includes RFC 2142 security role mailbox (security@<apex>)'
    );

    // 5c. Unverified recipient labeling (never claims constructed address is verified)
    const rfc2142Recipient = draft.suggestedRecipients.find((r) => r.type === 'RFC_2142_ROLE_MAILBOX');
    assert(
      rfc2142Recipient?.isVerified === false,
      'Recipient explicitly labeled as isVerified: false (constructed role mailbox)'
    );
    assert(
      Boolean(rfc2142Recipient?.notes?.includes('unverified')),
      'Recipient notes clearly state address existence is unverified'
    );

    // 5d. Technical evidence packet included in body
    assert(
      draft.markdownContent.includes('Technical Evidence Packet'),
      'Report body contains Technical Evidence Packet header'
    );
    assert(
      draft.markdownContent.includes('RiskShield Finding Reference'),
      'Report body embeds immutable Finding Reference ID'
    );
    assert(
      draft.markdownContent.includes('Threat Intelligence & Provider Telemetry'),
      'Report body documents Threat Intelligence & Provider Telemetry'
    );

    // 5e. Mandatory human review requirement & zero automated transmission
    assert(
      draft.humanReviewRequired === true,
      'Draft explicitly marks humanReviewRequired === true'
    );
    assert(
      draft.disclaimer.includes('RiskShield AI does not transmit emails automatically'),
      'Disclaimer reinforces that no automated emails are dispatched'
    );

    console.log('\n====================================================');
    console.log(`🎉 ALL PHASE E2 VERIFICATION TESTS PASSED: ${passed}/${total}`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ PHASE E2 VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    // Clean up isolated test data
    try {
      await (prisma as any).threatInvestigation.deleteMany({
        where: { finding: { brandId } }
      });
      await (prisma as any).brandThreatFinding.deleteMany({ where: { brandId } });
      await (prisma as any).brandMonitorSchedule.deleteMany({ where: { brandId } });
      await prisma.brandAsset.deleteMany({ where: { brandId } });
      await prisma.brandMembership.deleteMany({ where: { brandId } });
      await prisma.brand.delete({ where: { id: brandId } });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUserId, memberUserId, strangerUserId] } }
      });
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
    await prisma.$disconnect();
  }
}

runPhaseE2Verification();
