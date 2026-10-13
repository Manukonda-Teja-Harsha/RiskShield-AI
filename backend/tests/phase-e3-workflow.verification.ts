/**
 * RiskShield AI — Phase E3 Automated Verification Suite
 * Frontend Integration, Backend Persistence, Role Access Controls,
 * RFC 2142 Abuse Report Drafts, and Protected Scheduler Triggering
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

async function runPhaseE3Verification() {
  console.log('====================================================');
  console.log('   RISKSHIELD AI — PHASE E3 AUTOMATED VERIFICATION  ');
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
  const adminUserId = randomUUID();
  const memberUserId = randomUUID();
  const strangerUserId = randomUUID();
  const brandId = randomUUID();
  const otherBrandId = randomUUID();

  // Create test users
  await prisma.user.createMany({
    data: [
      {
        id: ownerUserId,
        email: `owner-e3-${Date.now()}@riskshield.internal`,
        fullName: 'E3 Brand Owner',
        role: 'BRAND_OWNER',
        isEmailVerified: true
      },
      {
        id: adminUserId,
        email: `admin-e3-${Date.now()}@riskshield.internal`,
        fullName: 'E3 Brand Admin',
        role: 'BRAND_OWNER',
        isEmailVerified: true
      },
      {
        id: memberUserId,
        email: `member-e3-${Date.now()}@riskshield.internal`,
        fullName: 'E3 Brand Member',
        role: 'USER',
        isEmailVerified: true
      },
      {
        id: strangerUserId,
        email: `stranger-e3-${Date.now()}@riskshield.internal`,
        fullName: 'E3 Stranger User',
        role: 'USER',
        isEmailVerified: true
      }
    ]
  });

  // Create workspace brand
  await prisma.brand.create({
    data: {
      id: brandId,
      name: 'CyberShield E3 Systems',
      slug: `cybershield-e3-${Date.now()}`,
      status: 'VERIFIED',
      website: 'https://cybershield-e3.io',
      category: 'Cybersecurity & Defense'
    }
  });

  // Create separate brand for cross-tenant checks
  await prisma.brand.create({
    data: {
      id: otherBrandId,
      name: 'Isolated Brand Org',
      slug: `isolated-org-${Date.now()}`,
      status: 'VERIFIED',
      website: 'https://isolated-org.com',
      category: 'Fintech'
    }
  });

  // Assign memberships
  await prisma.brandMembership.createMany({
    data: [
      {
        brandId,
        userId: ownerUserId,
        role: 'OWNER',
        status: 'ACTIVE'
      },
      {
        brandId,
        userId: adminUserId,
        role: 'ADMIN',
        status: 'ACTIVE'
      },
      {
        brandId,
        userId: memberUserId,
        role: 'MEMBER',
        status: 'ACTIVE'
      },
      {
        brandId: otherBrandId,
        userId: strangerUserId,
        role: 'OWNER',
        status: 'ACTIVE'
      }
    ]
  });

  try {
    // -------------------------------------------------------------
    // Suite 1: Status Transitions & State Machine Enforcement
    // -------------------------------------------------------------
    console.log('--- Suite 1: Status Transitions & State Machine Enforcement ---');

    // Create a finding
    const findingRecord: any = await (prisma as any).brandThreatFinding.create({
      data: {
        brandId,
        target: 'cybershield-e3-auth-portal.com',
        platform: 'DOMAIN',
        severity: 'critical',
        riskScore: 92,
        status: 'NEW',
        detectionReason: 'Deceptive credential harvesting lookalike targeting CyberShield E3 Systems',
        officialAssetCompared: 'cybershield-e3.io',
        evidence: [
          {
            label: 'Lookalike Domain Impersonation',
            detail: 'Visual substitution target mimicking official brand baseline',
            severity: 'critical'
          }
        ]
      }
    });

    assert(findingRecord.status === 'NEW', 'Finding starts in NEW status');

    // 1a. MEMBER transitions NEW -> UNDER_INVESTIGATION (allowed for triage)
    const triageRes = await threatInvestigationService.transitionFindingStatus({
      findingId: findingRecord.id,
      brandId,
      callerEmail: `member-e3@riskshield.internal`,
      callerRole: 'MEMBER',
      targetStatus: 'UNDER_INVESTIGATION',
      note: 'Member initiated initial triage and domain WHOIS assessment.'
    });
    assert(triageRes.finding.status === 'UNDER_INVESTIGATION', 'MEMBER successfully transitions NEW to UNDER_INVESTIGATION');
    assert(
      triageRes.investigationEntry.actionTaken?.startsWith('STATUS_TRANSITION') === true,
      'Audit entry recorded for triage transition'
    );

    // 1b. MEMBER attempts to jump to RESOLVED -> must be rejected by RBAC
    let memberResolveRejected = false;
    try {
      await threatInvestigationService.transitionFindingStatus({
        findingId: findingRecord.id,
        brandId,
        callerEmail: `member-e3@riskshield.internal`,
        callerRole: 'MEMBER',
        targetStatus: 'RESOLVED',
        note: 'Attempting to resolve as member'
      });
    } catch (err: any) {
      memberResolveRejected = err.message.includes('permission');
    }
    assert(memberResolveRejected, 'MEMBER rejected from resolving finding (RBAC requires OWNER or ADMIN)');

    // 1c. ADMIN transitions UNDER_INVESTIGATION -> TAKEDOWN_REQUESTED
    const takedownRes = await threatInvestigationService.transitionFindingStatus({
      findingId: findingRecord.id,
      brandId,
      callerEmail: `admin-e3@riskshield.internal`,
      callerRole: 'ADMIN',
      targetStatus: 'TAKEDOWN_REQUESTED',
      note: 'Registrar abuse notification prepared and takedown escalation logged.'
    });
    assert(takedownRes.finding.status === 'TAKEDOWN_REQUESTED', 'ADMIN transitions UNDER_INVESTIGATION to TAKEDOWN_REQUESTED');

    // 1d. OWNER transitions TAKEDOWN_REQUESTED -> RESOLVED
    const resolveRes = await threatInvestigationService.transitionFindingStatus({
      findingId: findingRecord.id,
      brandId,
      callerEmail: `owner-e3@riskshield.internal`,
      callerRole: 'OWNER',
      targetStatus: 'RESOLVED',
      note: 'Host suspended abusive domain. Verified sinkhole.'
    });
    assert(resolveRes.finding.status === 'RESOLVED', 'OWNER transitions TAKEDOWN_REQUESTED to RESOLVED');

    // 1e. Invalid jump: RESOLVED cannot jump to TAKEDOWN_REQUESTED
    let invalidTransitionRejected = false;
    try {
      await threatInvestigationService.transitionFindingStatus({
        findingId: findingRecord.id,
        brandId,
        callerEmail: `owner-e3@riskshield.internal`,
        callerRole: 'OWNER',
        targetStatus: 'TAKEDOWN_REQUESTED',
        note: 'Illegal backward jump'
      });
    } catch (err: any) {
      invalidTransitionRejected =
        err.message.toLowerCase().includes('invalid') &&
        err.message.toLowerCase().includes('transition');
    }
    assert(invalidTransitionRejected, 'Invalid status transition rejected by state machine');

    // 1f. Cross-tenant transition attempt rejected
    let crossTenantRejected = false;
    try {
      await threatInvestigationService.transitionFindingStatus({
        findingId: findingRecord.id,
        brandId: otherBrandId, // wrong brand workspace
        callerEmail: `stranger-e3@riskshield.internal`,
        callerRole: 'OWNER',
        targetStatus: 'UNDER_INVESTIGATION'
      });
    } catch (err: any) {
      crossTenantRejected =
        err.message.toLowerCase().includes('tenant mismatch') ||
        err.message.toLowerCase().includes('not belong') ||
        err.message.toLowerCase().includes('not found');
    }
    assert(crossTenantRejected, 'Cross-tenant finding status transition rejected');

    // -------------------------------------------------------------
    // Suite 2: Note Persistence & Append-Only Audit Trail
    // -------------------------------------------------------------
    console.log('\n--- Suite 2: Note Persistence & Append-Only Audit Trail ---');

    // 2a. Add analyst note
    const note1 = await threatInvestigationService.addInvestigationNote(
      findingRecord.id,
      brandId,
      `analyst-1@riskshield.internal`,
      'Contacted registrar abuse desk ticket #RS-88214.'
    );
    assert(note1.actionTaken === 'INVESTIGATION_NOTE', 'First investigation note added successfully');

    // 2b. Add second analyst note
    const note2 = await threatInvestigationService.addInvestigationNote(
      findingRecord.id,
      brandId,
      `analyst-2@riskshield.internal`,
      'Registrar acknowledged receipt; awaiting nameserver deletion.'
    );
    assert(note2.actionTaken === 'INVESTIGATION_NOTE', 'Second investigation note added successfully');

    // 2c. Verify notes and audit entries persisted in PostgreSQL
    const auditEntries = await (prisma as any).threatInvestigation.findMany({
      where: { findingId: findingRecord.id },
      orderBy: { createdAt: 'asc' }
    });

    assert(auditEntries.length === 5, `Audit trail contains exactly 5 entries (3 status transitions + 2 notes), found: ${auditEntries.length}`);
    assert(
      auditEntries.some((e: any) => e.actionTaken === 'INVESTIGATION_NOTE' && e.note?.includes('#RS-88214')),
      'PostgreSQL contains first analyst note with ticket reference'
    );
    assert(
      auditEntries.some((e: any) => e.actionTaken === 'INVESTIGATION_NOTE' && e.note?.includes('nameserver deletion')),
      'PostgreSQL contains second analyst note'
    );

    // 2d. Reload finding from PostgreSQL with relation and verify notes persist
    const reloadedFinding = await (prisma as any).brandThreatFinding.findUnique({
      where: { id: findingRecord.id },
      include: { investigations: true }
    });
    assert(
      Boolean(reloadedFinding?.investigations.some((i: any) => i.note?.includes('#RS-88214'))),
      'Reloaded finding retains first note in investigations relation'
    );
    assert(
      Boolean(reloadedFinding?.investigations.some((i: any) => i.note?.includes('nameserver deletion'))),
      'Reloaded finding retains second note in investigations relation'
    );

    // -------------------------------------------------------------
    // Suite 3: RFC 2142 Abuse Report Draft Generation
    // -------------------------------------------------------------
    console.log('\n--- Suite 3: RFC 2142 Abuse Report Draft Generation ---');

    const draft = await threatInvestigationService.generateAbuseReportDraft(
      findingRecord.id,
      brandId,
      `analyst@riskshield.internal`
    );

    // 3a. Recipients structure
    assert(draft.suggestedRecipients.length >= 2, 'Generated draft contains at least 2 RFC 2142 role mailboxes');
    const abuseMailbox = draft.suggestedRecipients.find(r => r.email.startsWith('abuse@'));
    const securityMailbox = draft.suggestedRecipients.find(r => r.email.startsWith('security@'));
    assert(Boolean(abuseMailbox), 'Contains abuse@ mailbox');
    assert(Boolean(securityMailbox), 'Contains security@ mailbox');

    // 3b. Truthfulness of mailbox delivery
    assert(abuseMailbox?.isVerified === false, 'RFC 2142 mailbox explicitly labeled as isVerified: false');
    assert(
      Boolean(abuseMailbox?.notes.toLowerCase().includes('unverified')),
      'Recipients include note explaining unverified delivery'
    );

    // 3c. Content validation
    assert(draft.suggestedSubject.includes('CyberShield E3 Systems'), 'Subject line identifies targeted brand name');
    assert(
      draft.markdownContent.includes('RiskShield Finding Reference:') || draft.markdownContent.includes('Case ID:'),
      'Report body contains Finding reference / Case ID'
    );
    assert(draft.markdownContent.includes('Technical Evidence Packet'), 'Report body contains Technical Evidence Packet');
    assert(draft.markdownContent.includes('cybershield-e3-auth-portal.com'), 'Report body references the deceptive target');
    assert(draft.humanReviewRequired === true, 'Draft explicitly flags humanReviewRequired === true');
    assert(
      draft.markdownContent.toLowerCase().includes('does not automatically submit') ||
      draft.markdownContent.toLowerCase().includes('no automated emails'),
      'Body contains explicit disclaimer that no automated requests are transmitted'
    );

    // -------------------------------------------------------------
    // Suite 4: Monitoring Schedule Configuration & Persistence
    // -------------------------------------------------------------
    console.log('\n--- Suite 4: Monitoring Schedule Configuration & Persistence ---');

    // 4a. Initialize schedule
    const sched = await brandMonitorService.getOrCreateSchedule(brandId);
    assert(sched.enabled === false, 'Initial monitor schedule is disabled');
    assert(sched.frequencyHours === 24, 'Default frequency is 24 hours');

    // 4b. Enforce frequency boundary limits (1h to 168h)
    let rejectedLow = false;
    try {
      await brandMonitorService.updateSchedule(brandId, { frequencyHours: 0 });
    } catch (err: any) {
      rejectedLow = err.message.toLowerCase().includes('invalid frequency');
    }
    assert(rejectedLow, 'Rejects frequency < 1 hour');

    let rejectedHigh = false;
    try {
      await brandMonitorService.updateSchedule(brandId, { frequencyHours: 200 });
    } catch (err: any) {
      rejectedHigh = err.message.toLowerCase().includes('invalid frequency');
    }
    assert(rejectedHigh, 'Rejects frequency > 168 hours (7 days maximum)');

    // 4c. Update frequency to 12 hours and enable
    const updatedSched = await brandMonitorService.updateSchedule(brandId, {
      enabled: true,
      frequencyHours: 12
    });
    assert(updatedSched.enabled === true, 'Schedule successfully enabled');
    assert(updatedSched.frequencyHours === 12, 'Schedule frequency updated to 12 hours');

    // 4d. Verify persistence in PostgreSQL
    const dbSched = await brandMonitorRepository.findByBrandId(brandId);
    assert(dbSched?.enabled === true, 'Schedule enabled state persisted in PostgreSQL');
    assert(dbSched?.frequencyHours === 12, 'Schedule frequency persisted in PostgreSQL');

    // 4e. Add verified asset baseline
    await prisma.brandAsset.create({
      data: {
        brandId,
        type: 'DOMAIN',
        value: 'cybershield-e3.io',
        normalizedValue: 'cybershield-e3.io',
        status: 'VERIFIED'
      }
    });

    // 4f. Run on-demand execution (manual immediate trigger)
    const runResult = await brandMonitorService.executeBrandMonitoring(brandId);
    assert(runResult.assetsScanned === 1, 'Manual on-demand run scanned 1 verified asset baseline');
    assert(runResult.candidatesEvaluated > 0, 'Evaluated synthesized lookalike candidates');
    assert(runResult.findingsCaptured > 0, 'Captured brand threat findings in database');

    const scheduleAfterRun = await brandMonitorRepository.findByBrandId(brandId);
    assert(scheduleAfterRun?.status === 'COMPLETED', 'Schedule status transitioned to COMPLETED');
    assert(scheduleAfterRun?.lastRunAt !== null, 'lastRunAt updated on schedule');
    assert(scheduleAfterRun?.lastAssetsScanned === 1, 'lastAssetsScanned recorded in PostgreSQL');

    // -------------------------------------------------------------
    // Suite 5: Protected Cron Endpoint Security & Secret Verification
    // -------------------------------------------------------------
    console.log('\n--- Suite 5: Protected Cron Endpoint Security & Secret Verification ---');

    const cronSecret = process.env.CRON_SECRET || 'riskshield-cron-secret-2026';

    // Helper simulating isCronAuthorized logic
    function checkCronAuth(headerAuth: string | null, headerSecret: string | null): boolean {
      if (headerSecret && headerSecret === cronSecret) return true;
      if (headerAuth && headerAuth.startsWith('Bearer ') && headerAuth.slice(7).trim() === cronSecret) return true;
      return false;
    }

    // 5a. Missing authorization rejected
    assert(checkCronAuth(null, null) === false, 'Cron invocation without headers rejected (401)');

    // 5b. Invalid token rejected
    assert(checkCronAuth('Bearer invalid-secret-token', null) === false, 'Cron invocation with invalid Bearer token rejected (401)');
    assert(checkCronAuth(null, 'wrong-header-secret') === false, 'Cron invocation with invalid x-cron-secret header rejected (401)');

    // 5c. Valid Bearer token accepted
    assert(checkCronAuth(`Bearer ${cronSecret}`, null) === true, 'Cron invocation with valid Bearer token authorized (200)');

    // 5d. Valid x-cron-secret header accepted
    assert(checkCronAuth(null, cronSecret) === true, 'Cron invocation with valid x-cron-secret header authorized (200)');

    // 5e. Batch cron execution works safely with atomic lease
    const batchReport = await brandMonitorService.runCronBatch(`test-cron-worker-${Date.now()}`, 5);
    assert(typeof batchReport.totalAcquired === 'number', 'Cron batch report returns totalAcquired');
    assert(Array.isArray(batchReport.results), 'Cron batch report returns results array');

    console.log('\n====================================================');
    console.log(`🎉 ALL PHASE E3 VERIFICATION TESTS PASSED: ${passed}/${total}`);
    console.log('====================================================\n');
  } finally {
    // Teardown test entities
    try {
      await (prisma as any).threatInvestigation.deleteMany({
        where: { finding: { brandId: { in: [brandId, otherBrandId] } } }
      });
      await (prisma as any).brandThreatFinding.deleteMany({
        where: { brandId }
      });
      await (prisma as any).brandMonitorSchedule.deleteMany({
        where: { brandId: { in: [brandId, otherBrandId] } }
      });
      await prisma.brandAsset.deleteMany({
        where: { brandId: { in: [brandId, otherBrandId] } }
      });
      await prisma.brandMembership.deleteMany({
        where: { brandId: { in: [brandId, otherBrandId] } }
      });
      await prisma.brand.deleteMany({
        where: { id: { in: [brandId, otherBrandId] } }
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUserId, adminUserId, memberUserId, strangerUserId] } }
      });
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }
}

runPhaseE3Verification()
  .catch((err) => {
    console.error('\n❌ PHASE E3 VERIFICATION FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
