# RiskShield AI — API Contracts Reference

All backend endpoints are Next.js App Router Route Handlers under `backend/src/app/api/` serving structured JSON validated with Zod.

## 1. Health Check
- **Endpoint**: `GET /api/health`
- **Response (`200 OK`)**:
  ```json
  {
    "status": "ok",
    "service": "RiskShield AI Headless API",
    "version": "1.0.0",
    "timestamp": "2026-10-13T00:00:00.000Z"
  }
  ```

## 2. Authentication
- **Endpoint**: `POST /api/auth/login`
- **Request Body (`loginRequestSchema`)**:
  ```json
  {
    "email": "analyst@company.com",
    "password": "securepassword"
  }
  ```

## 3. Personal Context-Aware Scan
- **Endpoint**: `POST /api/scan`
- **Request Body (`personalScanRequestSchema`)**:
  ```json
  {
    "target": "https://chase-security-verify-session.top",
    "mode": "url",
    "contextPayload": {
      "category": "url",
      "primaryInput": "https://chase-security-verify-session.top",
      "channel": "SMS",
      "claimedEntity": "Chase Bank",
      "isOpened": true,
      "enteredSensitiveInfo": "None"
    }
  }
  ```

## 4. Brand Workspace Scan
- **Endpoint**: `POST /api/brand/scan`
- **Request Body (`brandScanRequestSchema`)**:
  ```json
  {
    "target": "https://acme-refunds-portal.biz",
    "brandId": "RB-01",
    "brandName": "Acme Financial",
    "contextPayload": {
      "category": "url",
      "primaryInput": "https://acme-refunds-portal.biz"
    }
  }
  ```

## 5. Brand Threat Findings
- **Endpoint**: `GET /api/brand/threats?brandId=RB-01`
