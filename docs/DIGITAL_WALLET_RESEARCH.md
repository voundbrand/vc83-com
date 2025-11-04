# Digital Wallet Pass Implementation Research

## Executive Summary

This document provides comprehensive research on implementing digital wallet passes for both **Apple Wallet (PassKit)** and **Google Wallet** in a unified architecture. The research focuses on reusable patterns applicable to multiple transaction types including event tickets, invoices, loyalty cards, and other digital passes.

---

## 1. Technical Requirements Overview

### 1.1 Apple Wallet (PassKit)

#### Core Requirements
- **Format**: .pkpass file (ZIP archive with signed contents)
- **Primary File**: `pass.json` (JSON manifest defining pass structure)
- **Signing**: PKCS#7 detached signature using Apple certificates
- **Distribution**: HTTPS download or Add to Wallet button
- **Platform**: iOS 9.0+, watchOS 3.0+

#### Development Prerequisites
- Apple Developer Account ($99/year)
- Mac computer (required for certificate generation)
- Pass Type ID (unique identifier starting with "pass.")
- Pass Signing Certificate (.p12 file)
- Apple WWDR (Worldwide Developer Relations) Certificate

#### Technical Stack
- **Node.js Libraries**:
  - `passkit-generator` (v3.4.0+) - Most popular, TypeScript support
  - `@walletpass/pass-js` - Alternative with native JS RSA signing
- **Signing Method**: PKCS#7 via OpenSSL or native Node.js crypto
- **Image Requirements**: PNG format, specific dimensions per pass type

### 1.2 Google Wallet

#### Core Requirements
- **Format**: JSON object (no file bundle required)
- **Primary Structure**: Class + Object model
- **Signing**: JWT (JSON Web Token) signed with service account key
- **Distribution**: JWT URL or Android intent
- **Platform**: Android 5.0+ (API level 21+)

#### Development Prerequisites
- Google Cloud Project
- Google Wallet API enabled
- Service Account with Wallet Objects Issuer role
- Service Account JSON key file
- Business profile in Google Wallet Business Console

#### Technical Stack
- **Node.js Libraries**:
  - `@googleapis/walletobjects` - Official Google library
  - `googleapis` - General Google API client with Wallet support
  - `google-wallet` - Third-party TypeScript wrapper
- **Signing Method**: RS256 JWT with service account private key
- **Image Requirements**: PNG/JPEG, specific sizes, square logos (circular mask)

---

## 2. Common Elements (Cross-Platform)

### 2.1 Shared Data Structures

Both platforms support these core fields:

```typescript
interface CommonPassData {
  // Identity
  passId: string;
  serialNumber: string;

  // Organization
  organizationName: string;
  logoUrl: string;

  // Visual
  backgroundColor: string; // Hex color
  foregroundColor: string;
  labelColor?: string;

  // Barcode/QR Code
  barcode: {
    format: "QR" | "PDF417" | "Aztec" | "Code128";
    message: string; // Data to encode
    altText?: string; // Fallback text
  };

  // Content Fields
  headerFields: Field[];
  primaryFields: Field[];
  secondaryFields: Field[];
  auxiliaryFields: Field[];
  backFields: Field[];

  // Location (optional)
  locations?: Array<{
    latitude: number;
    longitude: number;
    relevantText?: string;
  }>;

  // Dates
  relevantDate?: Date;
  expirationDate?: Date;
}

interface Field {
  key: string;
  label: string;
  value: string | number;
  changeMessage?: string; // Push notification message
}
```

### 2.2 Unified Architecture Pattern

```typescript
// Abstract base class for wallet passes
abstract class WalletPassGenerator {
  abstract createPass(data: PassData): Promise<Pass>;
  abstract signPass(pass: Pass): Promise<SignedPass>;
  abstract generateDownloadUrl(signedPass: SignedPass): string;
  abstract updatePass(passId: string, updates: Partial<PassData>): Promise<void>;
  abstract sendPushNotification(passId: string, message: string): Promise<void>;
}

// Platform-specific implementations
class AppleWalletGenerator extends WalletPassGenerator {
  // Apple-specific implementation
}

class GoogleWalletGenerator extends WalletPassGenerator {
  // Google-specific implementation
}

// Factory pattern for unified interface
class WalletPassFactory {
  static createGenerator(platform: "apple" | "google"): WalletPassGenerator {
    return platform === "apple"
      ? new AppleWalletGenerator()
      : new GoogleWalletGenerator();
  }

  // Create pass for both platforms
  static async createUniversalPass(data: PassData): Promise<{
    apple: ApplePass;
    google: GooglePass;
  }> {
    const [apple, google] = await Promise.all([
      this.createGenerator("apple").createPass(data),
      this.createGenerator("google").createPass(data)
    ]);
    return { apple, google };
  }
}
```

---

## 3. Platform-Specific Implementation Details

### 3.1 Apple Wallet (PassKit)

#### Pass Bundle Structure
```
EventTicket.pkpass (ZIP archive)
├── pass.json           # Pass definition and content
├── manifest.json       # SHA-1 hashes of all files
├── signature           # PKCS#7 signature of manifest
├── logo.png           # Required logo image
├── logo@2x.png        # Retina logo
├── icon.png           # Lock screen icon
├── icon@2x.png        # Retina icon
├── background.png     # Optional background
└── en.lproj/          # Optional localizations
    └── pass.strings
```

#### pass.json Structure Example
```json
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.com.yourcompany.eventticket",
  "serialNumber": "nmyuxofgna",
  "teamIdentifier": "AGK5BZEN3E",
  "organizationName": "Your Company Name",
  "description": "Event Ticket",

  "backgroundColor": "rgb(107, 70, 193)",
  "foregroundColor": "rgb(255, 255, 255)",
  "labelColor": "rgb(255, 255, 255)",

  "logoText": "Your Company",

  "barcodes": [
    {
      "format": "PKBarcodeFormatQR",
      "message": "https://yourapp.com/verify/ticket123",
      "messageEncoding": "iso-8859-1",
      "altText": "TICKET-123"
    }
  ],

  "eventTicket": {
    "primaryFields": [
      {
        "key": "event",
        "label": "EVENT",
        "value": "Tech Conference 2024"
      }
    ],
    "secondaryFields": [
      {
        "key": "loc",
        "label": "LOCATION",
        "value": "Convention Center"
      }
    ],
    "auxiliaryFields": [
      {
        "key": "date",
        "label": "DATE",
        "value": "2024-06-15",
        "dateStyle": "PKDateStyleMedium",
        "timeStyle": "PKDateStyleShort"
      }
    ],
    "backFields": [
      {
        "key": "terms",
        "label": "Terms and Conditions",
        "value": "Full terms text here..."
      }
    ]
  },

  "relevantDate": "2024-06-15T09:00:00-08:00",
  "expirationDate": "2024-06-15T23:59:00-08:00",

  "locations": [
    {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "relevantText": "Welcome to the venue!"
    }
  ],

  "webServiceURL": "https://yourapi.com/passes/",
  "authenticationToken": "vxwxd7J8AlNNFPS8k0a0FfUFtq0ewzFdc"
}
```

#### Signing Process (Node.js)
```typescript
import { PKPass } from "passkit-generator";
import fs from "fs";

async function createApplePass(data: TicketData): Promise<Buffer> {
  const pass = await PKPass.from({
    model: "./models/EventTicket.pass", // Template directory
    certificates: {
      wwdr: fs.readFileSync("./certs/wwdr.pem"),
      signerCert: fs.readFileSync("./certs/signerCert.pem"),
      signerKey: fs.readFileSync("./certs/signerKey.pem"),
      signerKeyPassphrase: process.env.CERT_PASSPHRASE
    }
  }, {
    serialNumber: data.ticketId,
    description: data.eventName
  });

  // Add dynamic fields
  pass.primaryFields.push({
    key: "event",
    label: "EVENT",
    value: data.eventName
  });

  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: data.verificationUrl,
    messageEncoding: "iso-8859-1"
  });

  // Generate signed .pkpass file
  return pass.getAsBuffer();
}
```

#### Push Notifications (Updates)
```typescript
// Apple requires web service for push updates
const webServiceConfig = {
  url: "https://yourapi.com/passes/",
  endpoints: {
    register: "v1/devices/:deviceId/registrations/:passTypeId/:serialNumber",
    unregister: "v1/devices/:deviceId/registrations/:passTypeId/:serialNumber",
    getUpdatedPasses: "v1/devices/:deviceId/registrations/:passTypeId",
    getLatestPass: "v1/passes/:passTypeId/:serialNumber"
  }
};

// Send push notification via APNs
async function notifyPassUpdate(passId: string) {
  // Use Apple Push Notification service
  // Max 10 notifications per day per pass
  await apnProvider.send({
    topic: "pass.com.yourcompany.eventticket",
    pushType: "background",
    payload: {} // Empty payload triggers pass update
  });
}
```

### 3.2 Google Wallet

#### Class + Object Model
```typescript
// Step 1: Create Pass Class (Template)
const eventTicketClass = {
  "id": `${issuerId}.event-ticket-class`,
  "classTemplateInfo": {
    "cardTemplateOverride": {
      "cardRowTemplateInfos": [
        {
          "twoItems": {
            "startItem": {
              "firstValue": {
                "fields": [{
                  "fieldPath": "object.textModulesData['event']"
                }]
              }
            },
            "endItem": {
              "firstValue": {
                "fields": [{
                  "fieldPath": "object.textModulesData['date']"
                }]
              }
            }
          }
        }
      ]
    }
  },
  "reviewStatus": "UNDER_REVIEW",
  "issuerName": "Your Company Name",
  "eventName": {
    "defaultValue": {
      "language": "en-US",
      "value": "Event Ticket"
    }
  }
};

// Step 2: Create Pass Object (Instance)
const eventTicketObject = {
  "id": `${issuerId}.ticket-${ticketId}`,
  "classId": `${issuerId}.event-ticket-class`,
  "state": "ACTIVE",

  "heroImage": {
    "sourceUri": {
      "uri": "https://yourcdn.com/event-hero.jpg"
    },
    "contentDescription": {
      "defaultValue": {
        "language": "en-US",
        "value": "Event banner"
      }
    }
  },

  "textModulesData": [
    {
      "id": "event",
      "header": "EVENT",
      "body": "Tech Conference 2024"
    },
    {
      "id": "location",
      "header": "LOCATION",
      "body": "Convention Center"
    },
    {
      "id": "date",
      "header": "DATE",
      "body": "June 15, 2024 at 9:00 AM"
    }
  ],

  "linksModuleData": {
    "uris": [
      {
        "uri": "https://yourapp.com/event/details",
        "description": "Event Details",
        "id": "event-details"
      }
    ]
  },

  "barcode": {
    "type": "QR_CODE",
    "value": "https://yourapp.com/verify/ticket123",
    "alternateText": "TICKET-123"
  },

  "validTimeInterval": {
    "start": {
      "date": "2024-06-15T09:00:00Z"
    },
    "end": {
      "date": "2024-06-15T23:59:00Z"
    }
  }
};
```

#### JWT Creation and Signing
```typescript
import jwt from "jsonwebtoken";
import { google } from "googleapis";

async function createGooglePass(data: TicketData): Promise<string> {
  // Load service account credentials
  const serviceAccount = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  );

  // Create pass object
  const passObject = {
    id: `${serviceAccount.client_email.split("@")[0]}.${data.ticketId}`,
    classId: `${serviceAccount.client_email.split("@")[0]}.event-ticket`,
    state: "ACTIVE",
    // ... rest of object data
  };

  // Create JWT claims
  const claims = {
    iss: serviceAccount.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: ["https://yourapp.com"],
    payload: {
      eventTicketObjects: [passObject]
    }
  };

  // Sign JWT with service account private key
  const token = jwt.sign(claims, serviceAccount.private_key, {
    algorithm: "RS256"
  });

  // Return "Add to Google Wallet" URL
  return `https://pay.google.com/gp/v/save/${token}`;
}

// Alternative: REST API approach
async function createGooglePassViaAPI(data: TicketData) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "./service-account-key.json",
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"]
  });

  const client = await auth.getClient();
  const walletobjects = google.walletobjects({
    version: "v1",
    auth: client
  });

  // Create pass object
  const response = await walletobjects.eventticketobject.insert({
    requestBody: passObject
  });

  return response.data;
}
```

#### Push Notifications (Updates)
```typescript
// Google Wallet supports push messages
async function sendGoogleWalletNotification(
  passObjectId: string,
  message: string
) {
  await walletobjects.eventticketobject.addmessage({
    resourceId: passObjectId,
    requestBody: {
      message: {
        header: "Update",
        body: message,
        kind: "walletobjects#addMessageRequest"
      }
    }
  });

  // Note: Max 3 notifications per day per pass
}
```

---

## 4. Pass Types Comparison

### 4.1 Supported Pass Types

| Pass Type | Apple Wallet | Google Wallet | Use Cases |
|-----------|--------------|---------------|-----------|
| Event Tickets | ✅ `eventTicket` | ✅ `EventTicketClass` | Concerts, conferences, sports |
| Boarding Passes | ✅ `boardingPass` | ✅ `FlightClass` | Airlines, trains, buses |
| Coupons | ✅ `coupon` | ✅ `OfferClass` | Discounts, vouchers |
| Loyalty Cards | ✅ `storeCard` | ✅ `LoyaltyClass` | Points, rewards, memberships |
| Generic | ✅ `generic` | ✅ `GenericClass` | Gym passes, ID cards, invoices |
| Gift Cards | ❌ | ✅ `GiftCardClass` | Store credit, prepaid |
| Transit Passes | ✅ `boardingPass` | ✅ `TransitClass` | Metro, bus passes |

### 4.2 Recommended Types for Common Transactions

```typescript
interface PassTypeRecommendations {
  eventTickets: {
    apple: "eventTicket";
    google: "EventTicketClass";
    features: ["QR codes", "Location triggers", "Time-based"];
  };

  invoices: {
    apple: "generic";
    google: "GenericClass";
    features: ["Payment status", "PDF link", "Amount display"];
  };

  loyaltyCards: {
    apple: "storeCard";
    google: "LoyaltyClass";
    features: ["Points balance", "Tier status", "Rewards"];
  };

  membershipCards: {
    apple: "generic";
    google: "GenericClass";
    features: ["Expiration date", "Member ID", "Benefits"];
  };

  giftCards: {
    apple: "storeCard"; // Closest match
    google: "GiftCardClass";
    features: ["Balance", "PIN/code", "Store locations"];
  };
}
```

---

## 5. Security and Signing

### 5.1 Apple Wallet Security

#### Certificate Requirements
1. **Pass Type ID Certificate**
   - Created in Apple Developer Portal
   - Tied to specific Pass Type ID (e.g., `pass.com.company.event`)
   - Must be renewed annually ($99/year with developer account)
   - Exported as .p12 file with password protection

2. **WWDR Certificate**
   - Apple Worldwide Developer Relations Certificate
   - Required for signature chain validation
   - Available from Apple's website (free)
   - Must be updated when Apple rotates (every few years)

#### Signing Process
```bash
# Convert certificates to PEM format
openssl x509 -inform der -in pass_cert.cer -out pass_cert.pem
openssl pkcs12 -in pass_key.p12 -out pass_key.pem -nodes

# Create manifest.json (SHA-1 hashes)
{
  "pass.json": "abc123...",
  "logo.png": "def456...",
  "icon.png": "ghi789..."
}

# Sign manifest with PKCS#7
openssl smime -sign -binary \
  -in manifest.json \
  -out signature \
  -outform DER \
  -inkey pass_key.pem \
  -signer pass_cert.pem \
  -certfile wwdr.pem
```

#### Security Best Practices
- Store certificates securely (environment variables, KMS)
- Rotate authentication tokens regularly
- Use HTTPS for all web service URLs
- Validate pass authenticity on server side
- Implement rate limiting for pass downloads

### 5.2 Google Wallet Security

#### Service Account Requirements
1. **Google Cloud Project**
   - Enable Google Wallet API
   - Create service account with Wallet Objects Issuer role
   - Download JSON key file

2. **JWT Signing**
   - Algorithm: RS256 (RSA with SHA-256)
   - Key: Service account private key from JSON file
   - Claims: iss, aud, typ, iat, payload

#### Signing Process
```typescript
// Service account key structure
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "abc123",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "wallet@your-project.iam.gserviceaccount.com",
  "client_id": "123456",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}

// JWT claims
{
  "iss": "wallet@your-project.iam.gserviceaccount.com",
  "aud": "google",
  "typ": "savetowallet",
  "iat": 1641234567,
  "origins": ["https://yourapp.com"],
  "payload": {
    "eventTicketObjects": [{ /* pass object */ }]
  }
}
```

#### Security Best Practices
- Protect service account key (never commit to repo)
- Use environment variables or secret management
- Restrict service account permissions (least privilege)
- Implement JWT expiration (short-lived tokens)
- Validate pass authenticity via Google's API
- Use HTTPS for callback URLs

---

## 6. Push Notifications and Updates

### 6.1 Apple Wallet Push Updates

#### Web Service Requirements
- **Endpoints Required**:
  ```
  POST /v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}
  DELETE /v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}
  GET /v1/devices/{deviceId}/registrations/{passTypeId}
  GET /v1/passes/{passTypeId}/{serialNumber}
  POST /v1/log (optional, for debugging)
  ```

- **Authentication**:
  - `authenticationToken` in pass.json
  - Sent as `Authorization` header by devices

#### Update Flow
1. Pass includes `webServiceURL` and `authenticationToken`
2. Device registers with server when pass is added
3. Server sends push notification via APNs when pass changes
4. Device fetches updated pass from server
5. Pass automatically updates on device

#### Limitations
- **Max 10 notifications per day per pass**
- Silent notifications (no custom message to user)
- Device must be online to receive updates
- Updates must include changed fields only

```typescript
// Example update notification
interface PassUpdateNotification {
  // Send via APNs to registered devices
  topic: "pass.com.yourcompany.eventticket";
  pushType: "background";
  payload: {}; // Empty payload
}

// Device then fetches updated pass
// GET /v1/passes/{passTypeId}/{serialNumber}
// Returns: updated .pkpass file
```

### 6.2 Google Wallet Push Updates

#### Notification Types
1. **Push Messages** (User-visible)
   - Header and body text
   - Appears in notification shade
   - Max 3 per day per pass
   - Can include action buttons

2. **Silent Updates**
   - Update pass object via API
   - Device syncs changes automatically
   - No notification to user
   - No daily limits

#### Update Flow
```typescript
// Send push message (visible notification)
await walletobjects.eventticketobject.addmessage({
  resourceId: passObjectId,
  requestBody: {
    message: {
      header: "Gate Changed",
      body: "Your gate has been updated to B12",
      kind: "walletobjects#addMessageRequest",
      messageType: "TEXT" // or "TEXT_AND_NOTIFY"
    }
  }
});

// Silent update (no notification)
await walletobjects.eventticketobject.patch({
  resourceId: passObjectId,
  requestBody: {
    textModulesData: [{
      id: "gate",
      header: "GATE",
      body: "B12"
    }]
  }
});
```

#### Limitations
- **Max 3 push messages per day per pass** (user-visible)
- Silent updates unlimited
- Updates require internet connection
- May have sync delay (up to 24 hours)

---

## 7. Location-Based Features

### 7.1 Apple Wallet Location Features

#### Geofencing
```json
"locations": [
  {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "altitude": 0.0,
    "relevantText": "Welcome to the venue!"
  }
]
```

- **Radius**: Determined by Apple (varies by pass type)
  - Event tickets: ~1000m
  - Coupons: ~100m
  - Boarding passes: ~1000m
- **Behavior**: Pass appears on lock screen when entering radius
- **Limit**: Up to 10 locations per pass
- **Requirements**: User must enable location services

#### iBeacon Support
```json
"beacons": [
  {
    "proximityUUID": "D0D3FA86-CA76-45EC-9BD9-6AF4E4FD80FF",
    "major": 1,
    "minor": 1,
    "relevantText": "Check in at the front desk"
  }
]
```

- **Proximity Trigger**: Pass appears when near beacon
- **Range**: ~70m maximum
- **Limit**: Up to 10 beacons per pass
- **Use Cases**: Indoor navigation, proximity marketing

#### NFC Support
```json
"nfc": {
  "message": "Ticket verification data",
  "encryptionPublicKey": "base64-encoded-key"
}
```

- **Use Case**: Contactless check-in, payments
- **Supported**: iPhone 7+ with iOS 11+
- **Security**: Encrypted payload support

### 7.2 Google Wallet Location Features

#### Current Status (2024)
- **Geofencing**: No longer officially supported
- **Nearby Pass**: Uses device location to suggest relevant passes
- **Limited Control**: Google determines when to show passes

#### NFC Support
```json
"smartTapRedemptionValue": "redemption-code-123",
"enableSmartTap": true
```

- **Smart Tap**: Google's NFC protocol
- **Use Cases**: Transit, access control, loyalty
- **Multiple AIDs**: Supports multiple Application IDs
- **Supported**: Android phones with NFC

---

## 8. Design Guidelines

### 8.1 Apple Wallet Design

#### Layout Structure
- **Pass Types**: 5 styles (boarding pass, coupon, event ticket, store card, generic)
- **Field Hierarchy**:
  - Header fields: 1-3 fields (most prominent)
  - Primary fields: 1 field (large, center)
  - Secondary fields: 1-4 fields
  - Auxiliary fields: 1-4 fields (smallest)
  - Back fields: Unlimited (details page)

#### Image Specifications
| Asset | Size (points) | Size (@2x) | Size (@3x) | Required |
|-------|---------------|------------|------------|----------|
| icon | 29x29 | 58x58 | 87x87 | ✅ Yes |
| logo | 160x50 | 320x100 | 480x150 | ✅ Yes |
| background | 180x220 | 360x440 | 540x660 | Optional |
| footer | 286x15 | 572x30 | 858x45 | Optional |
| strip | 375x123 | 750x246 | 1125x369 | Optional |
| thumbnail | 90x90 | 180x180 | 270x270 | Optional |

#### Color Guidelines
```json
"backgroundColor": "rgb(107, 70, 193)",  // Pass background
"foregroundColor": "rgb(255, 255, 255)", // Text color
"labelColor": "rgb(255, 255, 255)"      // Label color
```

- Use high contrast for readability
- Avoid pure white background
- Test in both light and dark modes
- Colors must be RGB format

#### Best Practices
- Keep text concise (character limits vary)
- Use ALL CAPS for labels
- Provide clear value hierarchy
- Include alt text for barcodes
- Test on actual devices
- Use appropriate pass type for content

### 8.2 Google Wallet Design

#### Layout Structure
- **Card Template**: Customizable rows and columns
- **Modules**:
  - Text modules: Header + body pairs
  - Links modules: URLs with descriptions
  - Image modules: Hero, logo, wide images
  - Info modules: Structured data display

#### Image Specifications
| Asset | Minimum Size | Maximum Size | Aspect Ratio | Notes |
|-------|--------------|--------------|--------------|-------|
| logo | 660x660 | 840x840 | 1:1 | Masked to circle |
| hero | 1032x336 | 1860x600 | ~3:1 | Full width |
| wide | 660x248 | 1920x720 | ~8:3 | Feature image |

#### Color Guidelines
```json
"hexBackgroundColor": "#6B46C1",  // Card background
// Text colors controlled by Google
```

- Google determines text colors for readability
- Limited color customization vs Apple
- Must pass accessibility standards
- Test in light and dark themes

#### Best Practices
- Use title case for text
- Provide square logo (circular crop)
- Optimize image file sizes
- Structure content in logical modules
- Provide meaningful link descriptions
- Test on various Android versions

---

## 9. Recommended Libraries and Tools

### 9.1 Node.js/TypeScript Libraries

#### For Apple Wallet
```json
{
  "dependencies": {
    "passkit-generator": "^3.4.0",  // Most popular, well-maintained
    "@walletpass/pass-js": "^3.0.0" // Alternative, pure JS
  }
}
```

**passkit-generator** Features:
- TypeScript support out of the box
- Automatic manifest and signature generation
- Template-based pass creation
- Comprehensive API for all pass types
- Active development and support

**Example**:
```typescript
import { PKPass } from "passkit-generator";

const pass = await PKPass.from({
  model: "./models/EventTicket.pass",
  certificates: {
    wwdr: wwdrPem,
    signerCert: certPem,
    signerKey: keyPem,
    signerKeyPassphrase: password
  }
});

const buffer = await pass.getAsBuffer();
```

#### For Google Wallet
```json
{
  "dependencies": {
    "@googleapis/walletobjects": "^9.0.0", // Official Google library
    "googleapis": "^131.0.0",              // General Google APIs
    "jsonwebtoken": "^9.0.2"               // JWT signing
  }
}
```

**Example**:
```typescript
import { google } from "googleapis";
import jwt from "jsonwebtoken";

const walletobjects = google.walletobjects("v1");

// Create pass object
await walletobjects.eventticketobject.insert({
  requestBody: passObject
});

// Create JWT for "Add to Wallet" button
const token = jwt.sign(claims, privateKey, { algorithm: "RS256" });
const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
```

### 9.2 Development Tools

#### Certificate Management
- **Keychain Access** (macOS): Generate CSR, manage certificates
- **OpenSSL**: Convert certificate formats, sign manifests
- **pass-js-cli**: Command-line tool for pass generation

#### Testing Tools
- **Passbook Validator** (Apple): Validate .pkpass files
- **Google Wallet Test Tool**: Preview passes before publishing
- **iOS Simulator**: Test passes on virtual devices
- **Android Emulator**: Test Google Wallet integration

#### Design Tools
- **Figma Templates**: Official Apple Wallet design templates
- **passkit-visual-designer**: Web-based pass designer
- **Sketch/Illustrator**: Create pass images and logos

---

## 10. Best Practices Summary

### 10.1 Development Best Practices

#### Architecture
```typescript
// ✅ DO: Use abstraction for platform differences
interface WalletPass {
  id: string;
  platform: "apple" | "google";
  data: PassData;
  generate(): Promise<Buffer | string>;
  update(changes: Partial<PassData>): Promise<void>;
}

// ✅ DO: Store platform-specific IDs
interface PassReference {
  ticketId: string;
  applePassSerial?: string;
  googlePassId?: string;
  appleRegistrations?: DeviceRegistration[];
}

// ✅ DO: Handle platform differences gracefully
async function sendToWallet(ticketId: string, platform: "apple" | "google") {
  if (platform === "apple") {
    return generateApplePass(ticketId);
  } else {
    return generateGoogleWalletJWT(ticketId);
  }
}

// ❌ DON'T: Hardcode platform logic everywhere
```

#### Security
```typescript
// ✅ DO: Use environment variables
const certificates = {
  apple: {
    wwdr: process.env.APPLE_WWDR_CERT,
    signerCert: process.env.APPLE_SIGNER_CERT,
    signerKey: process.env.APPLE_SIGNER_KEY,
    passphrase: process.env.APPLE_CERT_PASSPHRASE
  },
  google: {
    serviceAccount: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  }
};

// ✅ DO: Validate inputs
function validatePassData(data: PassData) {
  if (!data.organizationName || data.organizationName.length > 50) {
    throw new Error("Invalid organization name");
  }
  // ... more validations
}

// ❌ DON'T: Store credentials in code or version control
```

#### Error Handling
```typescript
// ✅ DO: Provide fallbacks
async function createWalletPass(ticketId: string) {
  try {
    const [apple, google] = await Promise.allSettled([
      createApplePass(ticketId),
      createGooglePass(ticketId)
    ]);

    return {
      apple: apple.status === "fulfilled" ? apple.value : null,
      google: google.status === "fulfilled" ? google.value : null,
      errors: [
        apple.status === "rejected" ? apple.reason : null,
        google.status === "rejected" ? google.reason : null
      ].filter(Boolean)
    };
  } catch (error) {
    console.error("Wallet pass creation failed:", error);
    throw error;
  }
}
```

### 10.2 User Experience Best Practices

#### Distribution
```typescript
// ✅ DO: Detect platform and show appropriate button
function getWalletButton(userAgent: string) {
  const isIOS = /iPhone|iPad|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  if (isIOS) {
    return { platform: "apple", label: "Add to Apple Wallet" };
  } else if (isAndroid) {
    return { platform: "google", label: "Add to Google Wallet" };
  }
  return { platform: null, label: "Download Pass" };
}

// ✅ DO: Provide email fallback
async function sendWalletPass(email: string, ticketId: string) {
  const passes = await createWalletPass(ticketId);

  await sendEmail({
    to: email,
    subject: "Your Ticket",
    attachments: [
      { filename: "ticket.pkpass", content: passes.apple },
    ],
    html: `
      <p>Add your ticket to your wallet:</p>
      <a href="${passes.google}">Add to Google Wallet</a>
    `
  });
}
```

#### Updates
```typescript
// ✅ DO: Batch updates when possible
async function updateEventTime(eventId: string, newTime: Date) {
  const tickets = await getEventTickets(eventId);

  // Update all tickets in parallel
  await Promise.all(tickets.map(ticket =>
    updateWalletPass(ticket.id, { eventTime: newTime })
  ));

  // Send single push notification
  await notifyPassUpdates(tickets.map(t => t.id), "Event time changed");
}

// ❌ DON'T: Send individual updates for each change
```

---

## 11. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. **Setup**
   - [ ] Apple Developer account and certificates
   - [ ] Google Cloud project and service account
   - [ ] Install required npm packages
   - [ ] Configure environment variables

2. **Basic Pass Generation**
   - [ ] Create pass templates (Apple)
   - [ ] Define pass classes (Google)
   - [ ] Implement signing logic
   - [ ] Test pass creation

### Phase 2: Core Features (Week 3-4)
1. **Pass Types**
   - [ ] Event tickets implementation
   - [ ] Invoice passes (generic)
   - [ ] QR code generation
   - [ ] Basic field mapping

2. **Distribution**
   - [ ] Download endpoints
   - [ ] Email delivery
   - [ ] Platform detection
   - [ ] Error handling

### Phase 3: Advanced Features (Week 5-6)
1. **Updates and Notifications**
   - [ ] Apple web service implementation
   - [ ] Google push messages
   - [ ] Pass update logic
   - [ ] Device registration tracking

2. **Location Features**
   - [ ] Geofencing (Apple)
   - [ ] iBeacon support (Apple)
   - [ ] NFC/Smart Tap (optional)

### Phase 4: Integration (Week 7-8)
1. **Database Integration**
   - [ ] Store pass references in Convex
   - [ ] Track pass status
   - [ ] Link to transactions/tickets
   - [ ] Analytics and reporting

2. **User Interface**
   - [ ] Wallet buttons in checkout
   - [ ] Pass management dashboard
   - [ ] Update notification UI
   - [ ] Testing and refinement

---

## 12. Code Examples for vc83-com Integration

### 12.1 Convex Schema Extensions

```typescript
// Add to convex/schema.ts or create convex/schemas/walletPassSchemas.ts

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const walletPasses = defineTable({
  // Reference to original transaction/ticket
  sourceId: v.id("objects"), // Links to ticket, invoice, etc.
  sourceType: v.string(), // "ticket", "invoice", "loyalty"
  organizationId: v.id("organizations"),

  // Platform-specific identifiers
  applePassSerial: v.optional(v.string()),
  applePassTypeId: v.optional(v.string()),
  googlePassId: v.optional(v.string()),

  // Generation status
  status: v.string(), // "pending", "generated", "delivered", "failed"
  generatedAt: v.optional(v.number()),
  deliveredAt: v.optional(v.number()),

  // Device registrations (Apple only)
  appleDeviceRegistrations: v.optional(v.array(v.object({
    deviceId: v.string(),
    pushToken: v.string(),
    registeredAt: v.number()
  }))),

  // Update tracking
  lastUpdatedAt: v.optional(v.number()),
  updateCount: v.optional(v.number()),

  // Metadata
  passData: v.optional(v.any()), // Cached pass data
  errorLog: v.optional(v.array(v.string()))
});

export const walletPassUpdates = defineTable({
  passId: v.id("walletPasses"),
  platform: v.string(), // "apple" | "google"
  updateType: v.string(), // "field_change", "notification", "status_change"
  changes: v.any(), // Changed fields
  notificationSent: v.boolean(),
  sentAt: v.optional(v.number()),
  status: v.string() // "pending", "sent", "failed"
});
```

### 12.2 Wallet Pass Generation Service

```typescript
// convex/walletPassGeneration.ts

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { PKPass } from "passkit-generator";
import { google } from "googleapis";
import jwt from "jsonwebtoken";

/**
 * GENERATE WALLET PASS
 * Creates both Apple and Google Wallet passes for a ticket or transaction
 */
export const generateWalletPass = action({
  args: {
    sourceId: v.id("objects"),
    sourceType: v.string(), // "ticket", "invoice", "loyalty"
    recipientEmail: v.string()
  },
  handler: async (ctx, args): Promise<{
    applePass?: Buffer;
    googlePassUrl?: string;
    walletPassId: Id<"objects">;
  }> => {
    // 1. Get source data (ticket, invoice, etc.)
    const sourceData = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
      ticketId: args.sourceId
    });

    if (!sourceData) {
      throw new Error(`Source ${args.sourceType} not found`);
    }

    // 2. Map to wallet pass data
    const passData = await mapToWalletPassData(ctx, sourceData, args.sourceType);

    // 3. Generate Apple Wallet pass
    let applePass: Buffer | undefined;
    let applePassSerial: string | undefined;

    try {
      const result = await generateAppleWalletPass(passData);
      applePass = result.buffer;
      applePassSerial = result.serialNumber;
    } catch (error) {
      console.error("Apple Wallet generation failed:", error);
    }

    // 4. Generate Google Wallet pass
    let googlePassUrl: string | undefined;
    let googlePassId: string | undefined;

    try {
      const result = await generateGoogleWalletPass(passData);
      googlePassUrl = result.url;
      googlePassId = result.passId;
    } catch (error) {
      console.error("Google Wallet generation failed:", error);
    }

    // 5. Store wallet pass reference
    const walletPassId = await ctx.runMutation(internal.walletPassOntology.createWalletPass, {
      sourceId: args.sourceId,
      sourceType: args.sourceType,
      organizationId: sourceData.organizationId,
      applePassSerial,
      googlePassId,
      status: "generated",
      passData
    });

    // 6. Send via email
    if (applePass || googlePassUrl) {
      await ctx.runAction(internal.emailService.sendWalletPassEmail, {
        to: args.recipientEmail,
        subject: `Your ${args.sourceType}`,
        applePass,
        googlePassUrl
      });
    }

    return {
      applePass,
      googlePassUrl,
      walletPassId
    };
  }
});

/**
 * MAP SOURCE DATA TO WALLET PASS DATA
 * Converts ticket/invoice data to unified wallet pass format
 */
async function mapToWalletPassData(
  ctx: any,
  sourceData: any,
  sourceType: string
): Promise<WalletPassData> {
  switch (sourceType) {
    case "ticket":
      return mapTicketToPassData(ctx, sourceData);
    case "invoice":
      return mapInvoiceToPassData(ctx, sourceData);
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }
}

/**
 * MAP TICKET TO PASS DATA
 */
async function mapTicketToPassData(ctx: any, ticket: any): Promise<WalletPassData> {
  // Get related product/event data
  const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
    productId: ticket.customProperties.productId
  });

  const event = product.customProperties.eventId
    ? await ctx.runQuery(internal.eventOntology.getEventInternal, {
        eventId: product.customProperties.eventId
      })
    : null;

  return {
    type: "eventTicket",
    serialNumber: ticket._id.toString(),

    // Organization info
    organizationName: "Your Company", // From org data
    description: product.name,

    // Visual
    backgroundColor: "rgb(107, 70, 193)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(255, 255, 255)",
    logoText: "EVENT PASS",

    // QR Code
    barcode: {
      format: "QR",
      message: `${process.env.NEXT_PUBLIC_APP_URL}/verify-ticket/${ticket._id}`,
      altText: ticket._id.toString().slice(-8).toUpperCase()
    },

    // Fields
    primaryFields: [{
      key: "event",
      label: "EVENT",
      value: product.name
    }],

    secondaryFields: [
      {
        key: "holder",
        label: "ATTENDEE",
        value: ticket.customProperties.holderName
      },
      {
        key: "location",
        label: "LOCATION",
        value: event?.customProperties?.location || "TBA"
      }
    ],

    auxiliaryFields: [
      {
        key: "date",
        label: "DATE",
        value: event?.customProperties?.startDate
          ? new Date(event.customProperties.startDate).toLocaleDateString()
          : "TBA"
      },
      {
        key: "time",
        label: "TIME",
        value: event?.customProperties?.startDate
          ? new Date(event.customProperties.startDate).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "TBA"
      }
    ],

    backFields: [
      {
        key: "terms",
        label: "Terms & Conditions",
        value: "Please arrive 30 minutes before the event start time..."
      },
      {
        key: "contact",
        label: "Contact",
        value: "support@yourcompany.com"
      }
    ],

    // Location-based trigger
    locations: event?.customProperties?.latitude ? [{
      latitude: event.customProperties.latitude,
      longitude: event.customProperties.longitude,
      relevantText: "Welcome to the event!"
    }] : undefined,

    // Time-based trigger
    relevantDate: event?.customProperties?.startDate,
    expirationDate: event?.customProperties?.endDate
  };
}

/**
 * GENERATE APPLE WALLET PASS
 */
async function generateAppleWalletPass(data: WalletPassData): Promise<{
  buffer: Buffer;
  serialNumber: string;
}> {
  const pass = await PKPass.from({
    model: "./wallet-templates/EventTicket.pass",
    certificates: {
      wwdr: Buffer.from(process.env.APPLE_WWDR_CERT!, "base64"),
      signerCert: Buffer.from(process.env.APPLE_SIGNER_CERT!, "base64"),
      signerKey: Buffer.from(process.env.APPLE_SIGNER_KEY!, "base64"),
      signerKeyPassphrase: process.env.APPLE_CERT_PASSPHRASE
    }
  });

  // Set pass data
  pass.serialNumber = data.serialNumber;
  pass.description = data.description;
  pass.organizationName = data.organizationName;
  pass.logoText = data.logoText;

  // Set colors
  pass.backgroundColor = data.backgroundColor;
  pass.foregroundColor = data.foregroundColor;
  pass.labelColor = data.labelColor;

  // Set barcode
  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: data.barcode.message,
    messageEncoding: "iso-8859-1",
    altText: data.barcode.altText
  });

  // Set fields
  data.primaryFields.forEach(field => {
    pass.primaryFields.push(field);
  });

  data.secondaryFields?.forEach(field => {
    pass.secondaryFields.push(field);
  });

  data.auxiliaryFields?.forEach(field => {
    pass.auxiliaryFields.push(field);
  });

  data.backFields?.forEach(field => {
    pass.backFields.push(field);
  });

  // Set location
  if (data.locations) {
    pass.setLocations(...data.locations);
  }

  // Set dates
  if (data.relevantDate) {
    pass.setRelevantDate(new Date(data.relevantDate));
  }

  if (data.expirationDate) {
    pass.setExpirationDate(new Date(data.expirationDate));
  }

  const buffer = await pass.getAsBuffer();

  return {
    buffer,
    serialNumber: data.serialNumber
  };
}

/**
 * GENERATE GOOGLE WALLET PASS
 */
async function generateGoogleWalletPass(data: WalletPassData): Promise<{
  url: string;
  passId: string;
}> {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const issuerId = serviceAccount.client_email.split("@")[0];
  const passId = `${issuerId}.${data.serialNumber}`;

  // Create pass object
  const passObject = {
    id: passId,
    classId: `${issuerId}.event-ticket-class`,
    state: "ACTIVE",

    barcode: {
      type: "QR_CODE",
      value: data.barcode.message,
      alternateText: data.barcode.altText
    },

    textModulesData: [
      ...data.primaryFields.map(f => ({
        id: f.key,
        header: f.label,
        body: String(f.value)
      })),
      ...(data.secondaryFields || []).map(f => ({
        id: f.key,
        header: f.label,
        body: String(f.value)
      })),
      ...(data.auxiliaryFields || []).map(f => ({
        id: f.key,
        header: f.label,
        body: String(f.value)
      }))
    ],

    linksModuleData: {
      uris: [{
        uri: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${data.serialNumber}`,
        description: "View Details"
      }]
    }
  };

  // Create JWT
  const claims = {
    iss: serviceAccount.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [process.env.NEXT_PUBLIC_APP_URL],
    payload: {
      eventTicketObjects: [passObject]
    }
  };

  const token = jwt.sign(claims, serviceAccount.private_key, {
    algorithm: "RS256"
  });

  return {
    url: `https://pay.google.com/gp/v/save/${token}`,
    passId
  };
}

// Type definitions
interface WalletPassData {
  type: "eventTicket" | "generic" | "storeCard";
  serialNumber: string;
  organizationName: string;
  description: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  logoText: string;
  barcode: {
    format: "QR" | "PDF417" | "Aztec" | "Code128";
    message: string;
    altText: string;
  };
  primaryFields: Field[];
  secondaryFields?: Field[];
  auxiliaryFields?: Field[];
  backFields?: Field[];
  locations?: Array<{
    latitude: number;
    longitude: number;
    relevantText: string;
  }>;
  relevantDate?: number;
  expirationDate?: number;
}

interface Field {
  key: string;
  label: string;
  value: string | number;
  changeMessage?: string;
}
```

### 12.3 Frontend Integration

```typescript
// src/components/wallet-pass-button.tsx

"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface WalletPassButtonProps {
  ticketId: Id<"objects">;
  recipientEmail: string;
  className?: string;
}

export function WalletPassButton({
  ticketId,
  recipientEmail,
  className
}: WalletPassButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePass = useMutation(api.walletPassGeneration.generateWalletPass);

  // Detect platform
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const handleAddToWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await generatePass({
        sourceId: ticketId,
        sourceType: "ticket",
        recipientEmail
      });

      // Download appropriate pass
      if (isIOS && result.applePass) {
        downloadApplePass(result.applePass, ticketId);
      } else if (isAndroid && result.googlePassUrl) {
        window.location.href = result.googlePassUrl;
      } else {
        // Fallback: show both options
        setError("Pass generated. Check your email for download links.");
      }
    } catch (err) {
      console.error("Failed to generate wallet pass:", err);
      setError("Failed to generate pass. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadApplePass = (passBuffer: Buffer, ticketId: string) => {
    const blob = new Blob([passBuffer], { type: "application/vnd.apple.pkpass" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${ticketId}.pkpass`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isIOS && !isAndroid) {
    return (
      <button
        onClick={handleAddToWallet}
        disabled={loading}
        className={className}
      >
        {loading ? "Generating..." : "Email Pass"}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleAddToWallet}
        disabled={loading}
        className={className}
      >
        {loading ? "Generating..." : (
          <>
            {isIOS && "Add to Apple Wallet"}
            {isAndroid && "Add to Google Wallet"}
          </>
        )}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

---

## 13. Cost Analysis

### 13.1 Apple Wallet Costs

- **Apple Developer Account**: $99/year (required)
- **Certificate Renewal**: Included in developer account
- **APNs (Push Notifications)**: Free (included with developer account)
- **Web Service Hosting**: Variable (your server costs)
- **Pass Storage**: Free (stored on user devices)

**Estimated Annual Cost**: $99 + hosting costs

### 13.2 Google Wallet Costs

- **Google Cloud Project**: Free tier available
- **Google Wallet API**: Free (no per-pass fees)
- **Service Account**: Free
- **JWT Generation**: Free (computational cost only)
- **Cloud Storage**: Minimal (JWT tokens are temporary)

**Estimated Annual Cost**: $0 (within free tier) to $20/year

### 13.3 Third-Party Service Costs

If using managed services like PassKit, PassSlot, etc.:
- **Typical Pricing**: $50-500/month depending on volume
- **Per-Pass Fees**: $0.01-0.10 per pass generated
- **Features**: Hosted solution, analytics, support

**Recommendation**: Build in-house for full control and lower long-term costs.

---

## 14. Security Recommendations

### 14.1 Certificate and Key Management

```typescript
// ✅ RECOMMENDED: Use environment variables
const certificates = {
  apple: {
    wwdr: Buffer.from(process.env.APPLE_WWDR_CERT!, "base64"),
    signerCert: Buffer.from(process.env.APPLE_SIGNER_CERT!, "base64"),
    signerKey: Buffer.from(process.env.APPLE_SIGNER_KEY!, "base64"),
    passphrase: process.env.APPLE_CERT_PASSPHRASE
  },
  google: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
};

// ✅ RECOMMENDED: Use Convex environment variables
// Set in Convex dashboard: npx convex env set APPLE_CERT_PASSPHRASE "secret"

// ❌ NEVER: Commit certificates to git
// ❌ NEVER: Store in frontend code
// ❌ NEVER: Share service account keys
```

### 14.2 Pass Validation

```typescript
// Validate pass authenticity on verification endpoints
export const verifyTicket = query({
  args: {
    ticketId: v.id("objects"),
    verificationToken: v.string()
  },
  handler: async (ctx, args) => {
    // 1. Get ticket from database
    const ticket = await ctx.db.get(args.ticketId);

    // 2. Verify it exists and matches expected data
    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Invalid ticket");
    }

    // 3. Check if already redeemed
    if (ticket.status === "redeemed") {
      throw new Error("Ticket already used");
    }

    // 4. Verify expiration
    if (ticket.customProperties.expirationDate < Date.now()) {
      throw new Error("Ticket expired");
    }

    // 5. Optional: Verify cryptographic signature
    // (for additional security beyond database lookup)

    return {
      valid: true,
      ticket
    };
  }
});
```

### 14.3 Rate Limiting

```typescript
// Implement rate limiting for pass generation
const passGenerationLimits = {
  perUser: 10, // Max 10 passes per user per hour
  perIP: 50,   // Max 50 passes per IP per hour
  perOrg: 1000 // Max 1000 passes per organization per hour
};

// Use Convex scheduled functions for cleanup
export const cleanupRateLimits = internalMutation({
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 3600000;

    // Delete old rate limit records
    const oldRecords = await ctx.db
      .query("rateLimits")
      .withIndex("by_timestamp", q => q.lt("timestamp", oneHourAgo))
      .collect();

    await Promise.all(oldRecords.map(r => ctx.db.delete(r._id)));
  }
});
```

---

## 15. Testing Strategy

### 15.1 Unit Testing

```typescript
// Test wallet pass generation
describe("Wallet Pass Generation", () => {
  it("should generate valid Apple Wallet pass", async () => {
    const ticketData = createMockTicket();
    const pass = await generateAppleWalletPass(ticketData);

    expect(pass.buffer).toBeInstanceOf(Buffer);
    expect(pass.serialNumber).toBe(ticketData.serialNumber);
  });

  it("should generate valid Google Wallet JWT", async () => {
    const ticketData = createMockTicket();
    const pass = await generateGoogleWalletPass(ticketData);

    expect(pass.url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
    expect(pass.passId).toContain(ticketData.serialNumber);
  });

  it("should handle missing data gracefully", async () => {
    const invalidData = { serialNumber: "" };

    await expect(generateAppleWalletPass(invalidData))
      .rejects.toThrow("Invalid pass data");
  });
});
```

### 15.2 Integration Testing

```typescript
// Test end-to-end pass generation flow
describe("Wallet Pass Integration", () => {
  it("should create pass for ticket and store reference", async () => {
    const ctx = convexTest(schema);

    // Create ticket
    const ticketId = await ctx.run(async (ctx) => {
      return await createTicket(ctx, mockTicketData);
    });

    // Generate wallet pass
    const result = await ctx.run(async (ctx) => {
      return await generateWalletPass(ctx, {
        sourceId: ticketId,
        sourceType: "ticket",
        recipientEmail: "test@example.com"
      });
    });

    // Verify wallet pass was created
    expect(result.applePass).toBeDefined();
    expect(result.googlePassUrl).toBeDefined();

    // Verify database record
    const walletPass = await ctx.run(async (ctx) => {
      return await ctx.db.get(result.walletPassId);
    });

    expect(walletPass?.status).toBe("generated");
    expect(walletPass?.sourceId).toBe(ticketId);
  });
});
```

### 15.3 Manual Testing Checklist

#### Apple Wallet Testing
- [ ] Pass installs successfully on iPhone
- [ ] Pass appears on lock screen (if location/time relevant)
- [ ] QR code scans correctly
- [ ] Fields display properly (no text cutoff)
- [ ] Colors render as expected
- [ ] Pass updates when changes are made
- [ ] Push notifications work (max 10/day)
- [ ] Back of pass shows all details
- [ ] Pass expires at correct time
- [ ] Pass can be deleted by user

#### Google Wallet Testing
- [ ] Pass installs successfully on Android
- [ ] Pass appears in Google Wallet app
- [ ] QR code scans correctly
- [ ] All text modules display properly
- [ ] Links work correctly
- [ ] Images load and display well
- [ ] Pass updates when changes are made
- [ ] Push messages work (max 3/day)
- [ ] Pass can be archived by user
- [ ] Pass works in dark mode

---

## 16. Performance Optimization

### 16.1 Caching Strategies

```typescript
// Cache pass templates and certificates
class WalletPassCache {
  private static instance: WalletPassCache;
  private certCache: Map<string, Buffer> = new Map();
  private templateCache: Map<string, PKPass> = new Map();

  static getInstance(): WalletPassCache {
    if (!this.instance) {
      this.instance = new WalletPassCache();
    }
    return this.instance;
  }

  async getCertificates(): Promise<Certificates> {
    const key = "apple-certs";

    if (!this.certCache.has(key)) {
      const certs = {
        wwdr: Buffer.from(process.env.APPLE_WWDR_CERT!, "base64"),
        signerCert: Buffer.from(process.env.APPLE_SIGNER_CERT!, "base64"),
        signerKey: Buffer.from(process.env.APPLE_SIGNER_KEY!, "base64")
      };
      this.certCache.set(key, certs);
    }

    return this.certCache.get(key)!;
  }

  async getTemplate(type: string): Promise<PKPass> {
    if (!this.templateCache.has(type)) {
      const template = await PKPass.from({
        model: `./wallet-templates/${type}.pass`,
        certificates: await this.getCertificates()
      });
      this.templateCache.set(type, template);
    }

    return this.templateCache.get(type)!.clone();
  }
}

// Usage
const cache = WalletPassCache.getInstance();
const pass = await cache.getTemplate("EventTicket");
```

### 16.2 Batch Processing

```typescript
// Generate passes in batches for large events
export const generateEventPasses = internalAction({
  args: {
    eventId: v.id("objects"),
    batchSize: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100;

    // Get all tickets for event
    const tickets = await ctx.runQuery(internal.ticketOntology.getEventTickets, {
      eventId: args.eventId
    });

    // Process in batches
    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, i + batchSize);

      await Promise.all(batch.map(async (ticket) => {
        try {
          await ctx.runAction(api.walletPassGeneration.generateWalletPass, {
            sourceId: ticket._id,
            sourceType: "ticket",
            recipientEmail: ticket.customProperties.holderEmail
          });
        } catch (error) {
          console.error(`Failed to generate pass for ticket ${ticket._id}:`, error);
        }
      }));

      // Small delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
});
```

### 16.3 Image Optimization

```typescript
// Optimize images for wallet passes
import sharp from "sharp";

async function optimizePassImage(
  imageUrl: string,
  type: "logo" | "icon" | "hero"
): Promise<Buffer> {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();

  const dimensions = {
    logo: { width: 320, height: 100 },
    icon: { width: 58, height: 58 },
    hero: { width: 1032, height: 336 }
  };

  return await sharp(Buffer.from(buffer))
    .resize(dimensions[type].width, dimensions[type].height, {
      fit: "cover",
      position: "center"
    })
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();
}
```

---

## 17. Monitoring and Analytics

### 17.1 Pass Generation Metrics

```typescript
// Track pass generation metrics
export const trackPassGeneration = internalMutation({
  args: {
    platform: v.string(),
    sourceType: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    generationTime: v.number()
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("walletPassMetrics", {
      platform: args.platform,
      sourceType: args.sourceType,
      success: args.success,
      errorMessage: args.errorMessage,
      generationTime: args.generationTime,
      timestamp: Date.now()
    });
  }
});

// Query metrics
export const getPassMetrics = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const metrics = await ctx.db
      .query("walletPassMetrics")
      .filter(q => q.gte(q.field("timestamp"), args.startDate || 0))
      .filter(q => q.lte(q.field("timestamp"), args.endDate || Date.now()))
      .collect();

    return {
      total: metrics.length,
      successful: metrics.filter(m => m.success).length,
      failed: metrics.filter(m => !m.success).length,
      byPlatform: {
        apple: metrics.filter(m => m.platform === "apple").length,
        google: metrics.filter(m => m.platform === "google").length
      },
      averageGenerationTime:
        metrics.reduce((sum, m) => sum + m.generationTime, 0) / metrics.length
    };
  }
});
```

### 17.2 Usage Analytics

```typescript
// Track pass installations and updates
export const trackPassInstallation = internalMutation({
  args: {
    passId: v.id("walletPasses"),
    platform: v.string(),
    deviceId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const pass = await ctx.db.get(args.passId);

    if (!pass) return;

    await ctx.db.patch(args.passId, {
      status: "installed",
      installedAt: Date.now()
    });

    // Track device registration (Apple only)
    if (args.deviceId && args.platform === "apple") {
      const registrations = pass.appleDeviceRegistrations || [];
      registrations.push({
        deviceId: args.deviceId,
        registeredAt: Date.now()
      });

      await ctx.db.patch(args.passId, {
        appleDeviceRegistrations: registrations
      });
    }
  }
});
```

---

## 18. Conclusion and Next Steps

### Key Takeaways

1. **Unified Architecture Possible**: While Apple and Google Wallet have different technical implementations, a unified abstraction layer can handle both platforms efficiently.

2. **Platform-Specific Considerations**:
   - Apple requires certificates and PKCS#7 signing
   - Google uses JWT and service accounts
   - Both support similar features with different APIs

3. **Reusable Patterns**: The same data mapping and generation logic can be applied to multiple transaction types (tickets, invoices, loyalty cards).

4. **Security is Critical**: Proper certificate management, JWT signing, and validation are essential for production deployment.

5. **Cost-Effective**: Building in-house costs ~$99/year (Apple) + minimal Google Cloud costs, versus $600-6000/year for managed services.

### Recommended Implementation for vc83-com

Based on the existing codebase structure:

1. **Start with Event Tickets**:
   - Leverage existing ticket generation system
   - Add wallet pass generation as enhancement
   - Use existing QR code generation

2. **Extend to Invoices**:
   - Map invoice data to generic pass type
   - Include payment status and amount
   - Link to PDF invoice

3. **Future: Loyalty/Membership**:
   - Use store card (Apple) / loyalty card (Google)
   - Track points/tier in pass
   - Update on purchases

### Implementation Priority

**Phase 1 (Weeks 1-2)**: Foundation
- Set up Apple and Google developer accounts
- Implement basic pass generation for tickets
- Test on real devices

**Phase 2 (Weeks 3-4)**: Core Features
- Add pass distribution (download/email)
- Implement QR codes
- Basic field mapping

**Phase 3 (Weeks 5-6)**: Advanced Features
- Push notifications/updates
- Location triggers (Apple)
- Pass management dashboard

**Phase 4 (Weeks 7-8)**: Polish
- Analytics and monitoring
- Error handling and retries
- Performance optimization

### Resources for Further Learning

**Official Documentation**:
- Apple: https://developer.apple.com/documentation/walletpasses
- Google: https://developers.google.com/wallet

**Libraries**:
- passkit-generator: https://github.com/alexandercerutti/passkit-generator
- @googleapis/walletobjects: https://www.npmjs.com/package/@googleapis/walletobjects

**Community**:
- Stack Overflow: [apple-wallet] and [google-wallet] tags
- GitHub: Search for real-world implementations
- Reddit: r/iOSProgramming, r/androiddev

---

## Appendix: Complete Type Definitions

```typescript
// Comprehensive TypeScript types for wallet pass system

import type { Id } from "@/convex/_generated/dataModel";

/**
 * Universal wallet pass data structure
 * Maps to both Apple Wallet and Google Wallet formats
 */
export interface WalletPassData {
  // Identity
  serialNumber: string;
  passTypeIdentifier?: string; // Apple-specific
  organizationName: string;
  description: string;

  // Visual styling
  backgroundColor: string; // RGB or hex
  foregroundColor: string;
  labelColor?: string;
  logoText?: string;

  // Barcode/QR Code
  barcode: {
    format: "QR" | "PDF417" | "Aztec" | "Code128";
    message: string;
    messageEncoding?: string;
    altText?: string;
  };

  // Content fields
  primaryFields: PassField[];
  secondaryFields?: PassField[];
  auxiliaryFields?: PassField[];
  headerFields?: PassField[];
  backFields?: PassField[];

  // Location-based features
  locations?: PassLocation[];
  beacons?: PassBeacon[];

  // Time-based features
  relevantDate?: number; // Unix timestamp
  expirationDate?: number;

  // Web service (Apple)
  webServiceURL?: string;
  authenticationToken?: string;

  // NFC
  nfc?: {
    message: string;
    encryptionPublicKey?: string;
  };

  // Platform-specific extensions
  apple?: AppleWalletExtensions;
  google?: GoogleWalletExtensions;
}

export interface PassField {
  key: string;
  label: string;
  value: string | number;
  textAlignment?: "left" | "center" | "right" | "natural";
  dateStyle?: string; // Apple date format style
  timeStyle?: string; // Apple time format style
  currencyCode?: string;
  changeMessage?: string; // Notification message when field changes
}

export interface PassLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  relevantText?: string;
}

export interface PassBeacon {
  proximityUUID: string;
  major?: number;
  minor?: number;
  relevantText?: string;
}

export interface AppleWalletExtensions {
  passTypeIdentifier: string;
  teamIdentifier: string;
  groupingIdentifier?: string;
  maxDistance?: number;
  sharingProhibited?: boolean;
  voided?: boolean;
}

export interface GoogleWalletExtensions {
  classId: string;
  state?: "ACTIVE" | "COMPLETED" | "EXPIRED" | "INACTIVE";
  heroImage?: {
    sourceUri: { uri: string };
    contentDescription?: LocalizedString;
  };
  textModulesData?: TextModule[];
  linksModuleData?: {
    uris: LinkObject[];
  };
  smartTapRedemptionValue?: string;
  enableSmartTap?: boolean;
}

export interface TextModule {
  id: string;
  header: string;
  body: string;
}

export interface LinkObject {
  uri: string;
  description: string;
  id?: string;
}

export interface LocalizedString {
  defaultValue: {
    language: string;
    value: string;
  };
  translatedValues?: Array<{
    language: string;
    value: string;
  }>;
}

/**
 * Wallet pass reference stored in database
 */
export interface WalletPassRecord {
  _id: Id<"objects">;
  _creationTime: number;

  // Source reference
  sourceId: Id<"objects">;
  sourceType: "ticket" | "invoice" | "loyalty" | "membership";
  organizationId: Id<"organizations">;

  // Platform identifiers
  applePassSerial?: string;
  applePassTypeId?: string;
  googlePassId?: string;

  // Status
  status: "pending" | "generated" | "delivered" | "installed" | "failed";
  generatedAt?: number;
  deliveredAt?: number;
  installedAt?: number;

  // Device registrations (Apple)
  appleDeviceRegistrations?: DeviceRegistration[];

  // Update tracking
  lastUpdatedAt?: number;
  updateCount?: number;

  // Cached data
  passData?: WalletPassData;

  // Error tracking
  errorLog?: string[];
}

export interface DeviceRegistration {
  deviceId: string;
  pushToken: string;
  registeredAt: number;
}

/**
 * Pass generation result
 */
export interface PassGenerationResult {
  success: boolean;
  walletPassId?: Id<"objects">;
  applePass?: {
    buffer: Buffer;
    serialNumber: string;
  };
  googlePass?: {
    url: string;
    passId: string;
  };
  errors?: string[];
}

/**
 * Pass update request
 */
export interface PassUpdateRequest {
  passId: Id<"objects">;
  changes: Partial<WalletPassData>;
  notificationMessage?: string;
  platforms?: ("apple" | "google")[];
}

/**
 * Wallet pass factory interface
 */
export interface IWalletPassGenerator {
  createPass(data: WalletPassData): Promise<PassGenerationResult>;
  updatePass(request: PassUpdateRequest): Promise<void>;
  sendPushNotification(passId: string, message: string): Promise<void>;
  validatePass(passId: string): Promise<boolean>;
}
```

---

*End of Digital Wallet Pass Implementation Research Document*

**Document Version**: 1.0
**Last Updated**: January 2025
**Author**: Research Agent
**Project**: vc83-com Digital Wallet Integration
