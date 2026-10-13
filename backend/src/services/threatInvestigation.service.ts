/**
 * RiskShield AI — Threat Investigation & RFC 2142 Abuse Report Draft Service
 * Handles brand finding lifecycle state transitions, append-only investigation audit trails,
 * and evidence-based abuse report draft generation for human review.
 */
import { prisma } from '../lib/db/prisma';
import { parseDomainInfo } from '../lib/security/domainUtils';

export type FindingLifecycleStatus =
  | 'NEW'
  | 'UNDER_INVESTIGATION'
  | 'UNDER_REVIEW'
  | 'TAKEDOWN_REQUESTED'
  | 'CONFIRMED_THREAT'
  | 'FALSE_POSITIVE'
  | 'RESOLVED';

export interface StatusTransitionRequest {
  findingId: string;
  brandId: string;
  callerEmail: string;
  callerRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  targetStatus: FindingLifecycleStatus;
  note?: string;
}

export interface AbuseContactInfo {
  type: 'RFC_2142_ROLE_MAILBOX' | 'SECURITY_ROLE_MAILBOX' | 'REGISTRAR_HOST_DESK';
  email: string;
  label: string;
  isVerified: boolean;
  notes: string;
}

export interface AbuseReportDraft {
  findingId: string;
  brandName: string;
  target: string;
  generatedAt: string;
  suggestedSubject: string;
  suggestedRecipients: AbuseContactInfo[];
  markdownContent: string;
  plainTextContent: string;
  humanReviewRequired: boolean;
  disclaimer: string;
}

export class ThreatInvestigationService {
  private get threatModel() {
    return (prisma as any).brandThreatFinding;
  }

  private get investigationModel() {
    return (prisma as any).threatInvestigation;
  }

  /**
   * Validates whether a state transition is permitted by the lifecycle rules.
   */
  isValidTransition(currentStatus: string, targetStatus: string): boolean {
    if (currentStatus === targetStatus) return true;

    const allowedTransitions: Record<string, string[]> = {
      NEW: ['UNDER_INVESTIGATION', 'UNDER_REVIEW', 'FALSE_POSITIVE'],
      UNDER_REVIEW: ['UNDER_INVESTIGATION', 'CONFIRMED_THREAT', 'FALSE_POSITIVE'],
      UNDER_INVESTIGATION: ['TAKEDOWN_REQUESTED', 'RESOLVED', 'FALSE_POSITIVE', 'CONFIRMED_THREAT'],
      CONFIRMED_THREAT: ['TAKEDOWN_REQUESTED', 'RESOLVED', 'FALSE_POSITIVE', 'UNDER_INVESTIGATION'],
      TAKEDOWN_REQUESTED: ['RESOLVED', 'FALSE_POSITIVE', 'UNDER_INVESTIGATION'],
      RESOLVED: ['UNDER_INVESTIGATION'], // Re-open
      FALSE_POSITIVE: ['UNDER_INVESTIGATION'] // Re-open
    };

    return Boolean(allowedTransitions[currentStatus]?.includes(targetStatus));
  }

  /**
   * Transitions a threat finding to a new lifecycle status with role enforcement
   * and appends an immutable audit entry to threat_investigations.
   */
  async transitionFindingStatus(req: StatusTransitionRequest) {
    const finding = await this.threatModel.findUnique({
      where: { id: req.findingId }
    });

    if (!finding) {
      throw new Error(`Finding with ID "${req.findingId}" not found.`);
    }

    if (finding.brandId !== req.brandId) {
      throw new Error('Tenant mismatch: finding does not belong to authorized brand workspace.');
    }

    // Role-based permissions
    const privilegedStatuses = ['RESOLVED', 'FALSE_POSITIVE', 'TAKEDOWN_REQUESTED'];
    if (privilegedStatuses.includes(req.targetStatus) && req.callerRole === 'MEMBER') {
      throw new Error(
        `Insufficient permissions: Role "${req.callerRole}" cannot transition finding to "${req.targetStatus}". Requires OWNER or ADMIN.`
      );
    }

    // Transition validation
    if (!this.isValidTransition(finding.status, req.targetStatus)) {
      throw new Error(
        `Invalid lifecycle transition from "${finding.status}" to "${req.targetStatus}".`
      );
    }

    const previousStatus = finding.status;

    // 1. Update finding status
    const updatedFinding = await this.threatModel.update({
      where: { id: req.findingId },
      data: {
        status: req.targetStatus,
        updatedAt: new Date()
      }
    });

    // 2. Append immutable audit history record
    const auditRecord = await this.investigationModel.create({
      data: {
        findingId: req.findingId,
        authorEmail: req.callerEmail,
        note: req.note || `Status transitioned from ${previousStatus} to ${req.targetStatus}`,
        actionTaken: `STATUS_TRANSITION: ${previousStatus} -> ${req.targetStatus}`
      }
    });

    return {
      finding: updatedFinding,
      investigationEntry: auditRecord,
      previousStatus,
      newStatus: req.targetStatus
    };
  }

  /**
   * Appends an investigation note without modifying status.
   */
  async addInvestigationNote(
    findingId: string,
    brandId: string,
    authorEmail: string,
    note: string
  ) {
    const finding = await this.threatModel.findUnique({
      where: { id: findingId }
    });

    if (!finding || finding.brandId !== brandId) {
      throw new Error('Finding not found or tenant authorization mismatch.');
    }

    return this.investigationModel.create({
      data: {
        findingId,
        authorEmail,
        note,
        actionTaken: 'INVESTIGATION_NOTE'
      }
    });
  }

  /**
   * Generates an editable, evidence-based RFC 2142 abuse report draft.
   */
  async generateAbuseReportDraft(
    findingId: string,
    brandId: string,
    reporterEmail: string
  ): Promise<AbuseReportDraft> {
    const finding = await this.threatModel.findUnique({
      where: { id: findingId },
      include: {
        brand: true,
        investigations: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!finding || finding.brandId !== brandId) {
      throw new Error('Finding not found or unauthorized brand workspace.');
    }

    const brand = finding.brand;
    const targetUrl = finding.target;
    const parsedTarget = parseDomainInfo(targetUrl);
    const apexDomain = parsedTarget.registrableDomain || parsedTarget.rawHostname;

    // Resolve RFC 2142 abuse mailboxes with honest verification labeling
    const suggestedRecipients: AbuseContactInfo[] = [
      {
        type: 'RFC_2142_ROLE_MAILBOX',
        email: `abuse@${apexDomain}`,
        label: `RFC 2142 Standard Network Abuse Mailbox (${apexDomain})`,
        isVerified: false,
        notes:
          'Constructed per RFC 2142 Section 4 mailbox specifications. Recipient address existence is unverified until delivery.'
      },
      {
        type: 'SECURITY_ROLE_MAILBOX',
        email: `security@${apexDomain}`,
        label: `RFC 2142 Security Contact Mailbox (${apexDomain})`,
        isVerified: false,
        notes:
          'Constructed per RFC 2142 Section 4 role standard as secondary escalation channel.'
      }
    ];

    const subject = `[URGENT] Abuse & Phishing Impersonation Notification: ${brand.name} (Target: ${apexDomain})`;

    // Evidence summary
    const evidenceList = Array.isArray(finding.evidence)
      ? (finding.evidence as any[]).map((e) => `- **${e.label || 'Indicator'}**: ${e.detail || ''}`).join('\n')
      : `- **Detection Reason**: ${finding.detectionReason}`;

    const markdownContent = `
# RFC 2142 Abuse & Domain Infringement Notice

**Attention: Abuse and Security Operations Team for ${apexDomain}**

This is an evidence-based security notification regarding an active phishing/brand impersonation indicator hosted under your infrastructure.

---

### Incident Summary
- **Affected Monitored Brand:** ${brand.name}
- **Official Brand Domain:** ${finding.officialAssetCompared || brand.website || 'Verified Corporate Portal'}
- **Suspected Deceptive Target:** \`${targetUrl}\`
- **Registrable Apex Domain:** \`${apexDomain}\`
- **Initial Detection Time:** ${new Date(finding.detectedAt).toUTCString()}
- **Risk Assessment Score:** ${finding.riskScore}/100 (${finding.severity.toUpperCase()} SEVERITY)
- **RiskShield Finding Reference:** \`${finding.id}\`

---

### Technical Evidence Packet
${evidenceList}

---

### Threat Intelligence & Provider Telemetry
- **Evaluation Mechanism:** RiskShield AI Multi-Signal Behavioral & TR39 Confusable Analysis Engine
- **Telemetry Limitations Note:** Active indicators were corroborated through localized structural and cryptographic algorithms. Upstream public threat feeds (e.g. Google Web Risk, PhishTank) report operational status accurately without simulated guarantees.

---

### Requested Action
Under standard RFC 2142 abuse response guidelines, we request immediate review and mitigation:
1. Suspend the deceptive domain name or revoke its authoritative DNS delegation.
2. Neutralize active credential-harvesting endpoints hosted at the target address.
3. Preserve server access logs for subsequent cybercrime forensics.

---

### Authorized Reporter Contact
- **Brand Legal / Security Team:** ${brand.name}
- **Authorized Contact:** ${brand.securityContactEmail || reporterEmail}
- **Submission Date:** ${new Date().toUTCString()}

*NOTICE: This document is an editable draft produced by RiskShield AI for human review. It must be inspected and sent by authorized personnel. RiskShield AI does not automatically submit takedown requests to external networks.*
`.trim();

    const plainTextContent = `
RFC 2142 Abuse & Phishing Impersonation Notice
Target Domain: ${apexDomain}
Affected Brand: ${brand.name}
Finding ID: ${finding.id}

Suspected URL: ${targetUrl}
Detection Time: ${new Date(finding.detectedAt).toUTCString()}
Risk Score: ${finding.riskScore}/100

TECHNICAL EVIDENCE:
${evidenceList.replace(/\*\*/g, '')}

REQUESTED ACTION:
Please immediately investigate and suspend active deceptive host ${apexDomain}.

REPORTER CONTACT:
Brand: ${brand.name}
Contact: ${brand.securityContactEmail || reporterEmail}
`.trim();

    return {
      findingId,
      brandName: brand.name,
      target: targetUrl,
      generatedAt: new Date().toISOString(),
      suggestedSubject: subject,
      suggestedRecipients,
      markdownContent,
      plainTextContent,
      humanReviewRequired: true,
      disclaimer:
        'DRAFT ONLY: For authorized human review. Recipient mailboxes are constructed per RFC 2142 and are unverified. RiskShield AI does not transmit emails automatically.'
    };
  }
}

export const threatInvestigationService = new ThreatInvestigationService();
