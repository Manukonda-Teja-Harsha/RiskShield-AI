/**
 * RiskShield AI — Input Classifier & Indicator Extractor
 * Automatically identifies and classifies submitted indicators into supported categories:
 * URLs, SMS/WhatsApp/Email messages, phone numbers, public profiles, job offers,
 * UPI/payment IDs, mobile apps, and marketplace listings.
 */

import type { InputCategory, ExtractedIndicator } from '../../types';

export interface ClassificationResult {
  category: InputCategory;
  confidence: number;
  extractedIndicators: ExtractedIndicator[];
  isAmbiguous: boolean;
  ambiguityPrompt?: {
    question: string;
    suggestedCategories: { category: InputCategory; label: string }[];
  };
  primaryIndicator: string;
  summary: string;
}

// Regex helpers
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;
const DOMAIN_REGEX = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi;
const UPI_REGEX = /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SMS_SENDER_ID_REGEX = /^[A-Z]{2}-[A-Z0-9]{5,8}$/i;
const APP_PACKAGE_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export function classifyInput(rawText: string): ClassificationResult {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const extracted: ExtractedIndicator[] = [];

  // Extract all embedded URLs
  const rawUrls = text.match(URL_REGEX) || [];
  rawUrls.forEach(url => {
    extracted.push({ type: 'url', value: url });
  });

  // Extract all UPI IDs
  const rawUpis = text.match(UPI_REGEX) || [];
  const knownUpiBanks = ['okhdfcbank', 'okaxis', 'oksbi', 'okicici', 'paytm', 'ybl', 'ibl', 'axl', 'apl', 'upi', 'barodampay'];
  const validUpis = rawUpis.filter(upi => {
    const bank = upi.split('@')[1]?.toLowerCase();
    return knownUpiBanks.includes(bank) || upi.toLowerCase().includes('pay');
  });
  validUpis.forEach(upi => {
    extracted.push({ type: 'upi', value: upi });
  });

  // Extract all Phone Numbers
  const rawPhones = text.match(PHONE_REGEX) || [];
  rawPhones.forEach(phone => {
    extracted.push({ type: 'phone', value: phone });
  });

  // Extract Handles
  const rawHandles = text.match(/@[a-zA-Z0-9_]{3,30}/g) || [];
  rawHandles.forEach(handle => {
    extracted.push({ type: 'handle', value: handle });
  });

  // 1. Mobile App Listings & Packages
  if (
    lower.includes('play.google.com/store/apps') ||
    lower.includes('apps.apple.com/') ||
    lower.endsWith('.apk') ||
    lower.includes('.apk?') ||
    (APP_PACKAGE_REGEX.test(text) && (lower.startsWith('com.') || lower.startsWith('org.') || lower.startsWith('io.')))
  ) {
    extracted.push({ type: 'app_id', value: text });
    return {
      category: 'app',
      confidence: 0.95,
      extractedIndicators: extracted,
      isAmbiguous: false,
      primaryIndicator: text,
      summary: 'Mobile app store listing or application package identifier.'
    };
  }

  // 2. UPI ID or Direct Payment Destination
  if (validUpis.length > 0 && text.length < 50 && text.includes('@')) {
    return {
      category: 'payment',
      confidence: 0.94,
      extractedIndicators: extracted,
      isAmbiguous: false,
      primaryIndicator: validUpis[0],
      summary: 'Virtual Payment Address (UPI ID) or payment destination handle.'
    };
  }

  // 3. Phone Numbers & Alphanumeric SMS Sender IDs
  if (SMS_SENDER_ID_REGEX.test(text)) {
    return {
      category: 'phone',
      confidence: 0.96,
      extractedIndicators: [{ type: 'phone', value: text }],
      isAmbiguous: false,
      primaryIndicator: text,
      summary: 'Telecom SMS Sender ID (Alphanumeric Header).'
    };
  }

  if (/^\+?[0-9\s\-()]{7,18}$/.test(text) && !text.includes('.')) {
    return {
      category: 'phone',
      confidence: 0.92,
      extractedIndicators: [{ type: 'phone', value: text }],
      isAmbiguous: false,
      primaryIndicator: text,
      summary: 'Direct telephone number or SMS sender dial.'
    };
  }

  // 4. Social Media Profiles & Handles
  if (
    text.startsWith('@') ||
    lower.includes('twitter.com/') ||
    lower.includes('x.com/') ||
    lower.includes('instagram.com/') ||
    lower.includes('t.me/') ||
    lower.includes('telegram.me/') ||
    lower.includes('linkedin.com/in/') ||
    lower.includes('tiktok.com/@')
  ) {
    return {
      category: 'social',
      confidence: 0.95,
      extractedIndicators: extracted,
      isAmbiguous: false,
      primaryIndicator: text,
      summary: 'Public social media profile handle or channel URL.'
    };
  }

  // 5. Job Offers & Recruiter Messages
  const jobKeywords = [
    'daily wage', 'remote task', 'part-time job', 'youtube like', 'earn 5000', 
    'earn 3000', 'telegram recruiter', 'hr manager', 'hiring manager', 
    'daily payout', 'work from home', 'freelance commission', 'hotel review'
  ];
  if (jobKeywords.some(kw => lower.includes(kw))) {
    return {
      category: 'job',
      confidence: 0.91,
      extractedIndicators: extracted,
      isAmbiguous: false,
      primaryIndicator: extracted.length > 0 ? extracted[0].value : text.slice(0, 80),
      summary: 'Recruitment proposition or remote task job solicitation message.'
    };
  }

  // 6. Marketplace Listings & Product Pages
  if (
    lower.includes('amazon.com/dp/') ||
    lower.includes('amazon.') && lower.includes('/item/') ||
    lower.includes('ebay.com/itm/') ||
    lower.includes('aliexpress.com/item/') ||
    lower.includes('olx.') ||
    lower.includes('craigslist.') ||
    lower.includes('facebook.com/marketplace')
  ) {
    return {
      category: 'product',
      confidence: 0.95,
      extractedIndicators: extracted,
      isAmbiguous: false,
      primaryIndicator: text,
      summary: 'E-commerce marketplace product listing or seller profile.'
    };
  }

  // 7. Multi-line or Conversational Message (SMS / WhatsApp / Email)
  const isMessage = (
    text.includes('\n') ||
    text.split(' ').length > 8 ||
    lower.includes('urgent') ||
    lower.includes('dear customer') ||
    lower.includes('your account') ||
    lower.includes('suspended') ||
    lower.includes('electricity') ||
    lower.includes('delivery fee') ||
    lower.includes('lottery') ||
    lower.includes('package')
  );

  if (isMessage) {
    return {
      category: 'message',
      confidence: 0.93,
      extractedIndicators: extracted,
      isAmbiguous: false,
      primaryIndicator: extracted.length > 0 ? extracted[0].value : text.slice(0, 100),
      summary: `Suspicious message containing ${extracted.length} extracted technical indicator(s).`
    };
  }

  // 8. Clean URL or Domain
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('www.') ||
    DOMAIN_REGEX.test(text)
  ) {
    const cleanTarget = text.split(/\s+/)[0];
    return {
      category: 'url',
      confidence: 0.96,
      extractedIndicators: [{ type: 'url', value: cleanTarget }],
      isAmbiguous: false,
      primaryIndicator: cleanTarget,
      summary: 'Website URL or Fully Qualified Domain Name (FQDN).'
    };
  }

  // 9. Ambiguity Check: 10-digit number or generic text
  if (/^\d{8,12}$/.test(text)) {
    return {
      category: 'phone',
      confidence: 0.6,
      extractedIndicators: [{ type: 'phone', value: text }],
      isAmbiguous: true,
      ambiguityPrompt: {
        question: `The identifier "${text}" could be a Phone Number or an Order / Parcel Tracking Number. How would you like it analyzed?`,
        suggestedCategories: [
          { category: 'phone', label: 'Phone Number' },
          { category: 'other', label: 'Order / Tracking ID' }
        ]
      },
      primaryIndicator: text,
      summary: 'Numeric identifier (Ambiguous Phone vs Tracking ID).'
    };
  }

  // Default Fallback
  return {
    category: 'other',
    confidence: 0.7,
    extractedIndicators: extracted,
    isAmbiguous: false,
    primaryIndicator: text,
    summary: 'Generic suspicious technical text.'
  };
}
