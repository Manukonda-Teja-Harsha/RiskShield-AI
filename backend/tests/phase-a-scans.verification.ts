/**
 * RiskShield AI — Phase A Automated Test Suite
 * Secure Scan Persistence, User Scoping, Isolation & Contract Verification
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/db/prisma';
import { scanRepository } from '../src/repositories/scan.repository';
import { POST as scanPostHandler } from '../src/app/api/scan/route';
import { GET as scansGetHandler } from '../src/app/api/scans/route';
import { sanitizeAndGuardInput } from '../src/lib/security/ssrfGuard';
import { scannerService } from '../src/services/scanner.service';

async function runPhaseAVerification() {
  console.log('====================================================');
  console.log('   RISKSHIELD AI — PHASE A AUTOMATED VERIFICATION   ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // ---------------------------------------------------------
  // 1. Unauthenticated and Malformed Token Security (HTTP 401)
  // ---------------------------------------------------------
  console.log('--- Suite 1: Unauthenticated Guardrails ---');

  // 1a. POST /api/scan without Authorization header
  const unauthReq = new Request('http://localhost:3001/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: 'example.com', mode: 'url' })
  });
  const unauthRes = await scanPostHandler(unauthReq as any);
  assert(unauthRes.status === 401, 'POST /api/scan returns HTTP 401 when Authorization header is missing');

  // 1b. POST /api/scan with invalid Bearer token
  const badTokenReq = new Request('http://localhost:3001/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token-xyz-123'
    },
    body: JSON.stringify({ target: 'example.com', mode: 'url' })
  });
  const badTokenRes = await scanPostHandler(badTokenReq as any);
  assert(badTokenRes.status === 401, 'POST /api/scan returns HTTP 401 when token is invalid or expired');

  // 1c. GET /api/scans without Authorization header
  const unauthGetReq = new Request('http://localhost:3001/api/scans', {
    method: 'GET'
  });
  const unauthGetRes = await scansGetHandler(unauthGetReq as any);
  assert(unauthGetRes.status === 401, 'GET /api/scans returns HTTP 401 when Authorization header is missing');

  // 1d. GET /api/scans with invalid Bearer token
  const badTokenGetReq = new Request('http://localhost:3001/api/scans', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer invalid-token-xyz-123' }
  });
  const badTokenGetRes = await scansGetHandler(badTokenGetReq as any);
  assert(badTokenGetRes.status === 401, 'GET /api/scans returns HTTP 401 when token is invalid or expired');

  // ---------------------------------------------------------
  // 2. Input Validation and SSRF Guards
  // ---------------------------------------------------------
  console.log('\n--- Suite 2: SSRF & Dangerous Target Guards ---');

  const ssrfCheck1 = sanitizeAndGuardInput('http://169.254.169.254/latest/meta-data/');
  assert(ssrfCheck1.isBlocked, 'SSRF Guard blocks AWS cloud metadata IP (169.254.169.254)');

  const ssrfCheck2 = sanitizeAndGuardInput('http://127.0.0.1:5432/');
  assert(ssrfCheck2.isBlocked, 'SSRF Guard blocks loopback internal IP (127.0.0.1)');

  const ssrfCheck3 = sanitizeAndGuardInput('http://localhost:3001/api/internal');
  assert(ssrfCheck3.isBlocked, 'SSRF Guard blocks localhost targets');

  // ---------------------------------------------------------
  // 3. Scanner Service Evaluation Logic
  // ---------------------------------------------------------
  console.log('\n--- Suite 3: Scan Evaluation Logic ---');

  const threatResult = await scannerService.evaluatePersonalIndicator({
    target: 'chase-security-verify-session.top',
    mode: 'url',
    contextPayload: {
      category: 'url',
      primaryInput: 'chase-security-verify-session.top',
      requestedAction: 'Enter 6-digit SMS OTP'
    }
  });

  assert(threatResult.score >= 85, 'Heuristic engine scores high-risk TLD + OTP solicitation >= 85');
  assert(threatResult.status === 'KNOWN_THREAT', 'Heuristic engine assigns KNOWN_THREAT status for score >= 85');
  assert(threatResult.evidence.length >= 2, 'Evidence array contains multiple corroborating factors');
  assert(threatResult.sourcesChecked.length > 0, 'sourcesChecked contains the active evaluation engines');

  // ---------------------------------------------------------
  // 4. Database Persistence & Isolation (User A vs User B)
  // ---------------------------------------------------------
  console.log('\n--- Suite 4: Database Persistence & User Isolation ---');

  const testUserAId = randomUUID();
  const testUserBId = randomUUID();

  try {
    // Create test user profiles in PostgreSQL
    await prisma.user.createMany({
      data: [
        {
          id: testUserAId,
          email: `usera.${Date.now()}@test.riskshield.ai`,
          fullName: 'Test User A',
          isEmailVerified: true,
          role: 'USER'
        },
        {
          id: testUserBId,
          email: `userb.${Date.now()}@test.riskshield.ai`,
          fullName: 'Test User B',
          isEmailVerified: true,
          role: 'USER'
        }
      ]
    });

    // 4a. Persist 2 scans for User A
    const scanA1 = await scanRepository.createPersonalScanRecord({
      userId: testUserAId,
      target: 'chase-security-verify-session.top',
      normalizedTarget: 'chase-security-verify-session.top',
      category: 'url',
      mode: 'url',
      status: 'KNOWN_THREAT',
      score: 95,
      explanation: 'High abuse TLD and OTP solicitation detected.',
      evidence: threatResult.evidence,
      sourcesChecked: threatResult.sourcesChecked
    });
    assert(Boolean(scanA1.id), 'Scan record for User A successfully persisted with UUID primary key');

    const scanA2 = await scanRepository.createPersonalScanRecord({
      userId: testUserAId,
      target: 'github.com',
      normalizedTarget: 'github.com',
      category: 'url',
      mode: 'url',
      status: 'NO_KNOWN_THREAT_DETECTED',
      score: 10,
      explanation: 'Established domain with authoritative reputation.',
      evidence: [],
      sourcesChecked: ['RiskShield Lexical Heuristics']
    });
    assert(Boolean(scanA2.id), 'Second scan record for User A successfully persisted');

    // 4b. Persist 1 scan for User B
    const scanB1 = await scanRepository.createPersonalScanRecord({
      userId: testUserBId,
      target: 'suspicious-crypto-giveaway.xyz',
      normalizedTarget: 'suspicious-crypto-giveaway.xyz',
      category: 'url',
      mode: 'url',
      status: 'HIGH_RISK',
      score: 75,
      explanation: 'Cryptocurrency giveaway lure on ephemeral domain.',
      evidence: [],
      sourcesChecked: ['RiskShield Lexical Heuristics']
    });
    assert(Boolean(scanB1.id), 'Scan record for User B successfully persisted');

    // 4c. Verify user isolation: User A sees only User A's scans
    const userAScans = await scanRepository.findPersonalScansByUserId(testUserAId);
    const userACount = await scanRepository.countPersonalScansByUserId(testUserAId);

    assert(userACount === 2, `User A total scan count is exactly 2 (got ${userACount})`);
    assert(userAScans.length === 2, 'User A retrieves exactly 2 scan records');
    assert(
      userAScans.every((s) => s.userId === testUserAId),
      'All scan records returned for User A have userId === testUserAId'
    );
    assert(
      !userAScans.some((s) => s.id === scanB1.id),
      'User A scan history DOES NOT contain User B scan (Strict Isolation confirmed)'
    );

    // 4d. Verify user isolation: User B sees only User B's scans
    const userBScans = await scanRepository.findPersonalScansByUserId(testUserBId);
    const userBCount = await scanRepository.countPersonalScansByUserId(testUserBId);

    assert(userBCount === 1, `User B total scan count is exactly 1 (got ${userBCount})`);
    assert(userBScans.length === 1, 'User B retrieves exactly 1 scan record');
    assert(userBScans[0].id === scanB1.id, 'User B retrieves only their own scan');
    assert(
      !userBScans.some((s) => s.id === scanA1.id || s.id === scanA2.id),
      'User B scan history DOES NOT contain any of User A scans'
    );

    // 4e. Verify ordering: Newest first
    assert(
      new Date(userAScans[0].createdAt).getTime() >= new Date(userAScans[1].createdAt).getTime(),
      'User A scans are ordered newest-first (createdAt desc)'
    );

    // 4f. Verify bounded pagination
    const paginatedScans = await scanRepository.findPersonalScansByUserId(testUserAId, { skip: 0, take: 1 });
    assert(paginatedScans.length === 1, 'Pagination take parameter limits result count to 1');
    assert(paginatedScans[0].id === scanA2.id, 'First page contains the most recent scan');

    const secondPage = await scanRepository.findPersonalScansByUserId(testUserAId, { skip: 1, take: 1 });
    assert(secondPage.length === 1 && secondPage[0].id === scanA1.id, 'Second page retrieves the older scan');

    // ---------------------------------------------------------
    // 5. Cleanup
    // ---------------------------------------------------------
    console.log('\n--- Suite 5: Teardown & Database Cleanup ---');

    await prisma.scanRecord.deleteMany({
      where: {
        userId: { in: [testUserAId, testUserBId] }
      }
    });
    console.log('✅ [PASS] Cleaned up test scan records from database');

    await prisma.user.deleteMany({
      where: {
        id: { in: [testUserAId, testUserBId] }
      }
    });
    console.log('✅ [PASS] Cleaned up test user profiles from database');

  } catch (err) {
    // Attempt emergency cleanup
    try {
      await prisma.scanRecord.deleteMany({ where: { userId: { in: [testUserAId, testUserBId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [testUserAId, testUserBId] } } });
    } catch {}
    throw err;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} PHASE A TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runPhaseAVerification().catch((err) => {
  console.error('\n❌ Phase A verification suite failed:', err);
  process.exit(1);
});
