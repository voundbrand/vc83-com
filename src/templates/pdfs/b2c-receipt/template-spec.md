# B2C Receipt Template Specification

## Overview
Simple, clean receipt for individual customer purchases. Used for standard B2C checkout transactions.

## Color Scheme
- **Primary**: #6B46C1 (Purple)
- **Secondary**: #9F7AEA (Light Purple)
- **Accent**: #2D3748 (Dark Gray)
- **Text**: #000000 (Black), #646464 (Gray)

## Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  RECEIPT                           Order #12345    │
│                                    Date: Oct 27    │
│                                                     │
│  FROM:                                              │
│  L4YERCAK3.com                                      │
│  contact@example.com                                │
│                                                     │
│  TO:                                                │
│  Max Mustermann                                     │
│  max@example.com                                    │
│                                                     │
│  ITEMS:                                             │
│  ──────────────────────────────────────────────    │
│  Description              Qty    Price    Total    │
│  HaffSymposium 2024        1    €150.00  €150.00  │
│  UCRA Boat Event           1     €30.00   €30.00  │
│                                                     │
│                          Subtotal:        €180.00  │
│                              Tax:           €0.00  │
│                            TOTAL:        €180.00   │
│                                                     │
│  Payment Method: Credit Card                        │
│                                                     │
│  Thank you for your purchase!                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Typography
- **Header**: 20pt Helvetica Bold, Purple
- **Subheadings**: 12pt Helvetica Bold, Black
- **Body**: 10pt Helvetica Normal, Black
- **Labels**: 9pt Helvetica Normal, Gray
- **Footer**: 8pt Helvetica Normal, Light Gray

## Sections

### 1. Header
- "RECEIPT" in large purple text (left)
- Order number (right-aligned)
- Date (right-aligned below order number)

### 2. Seller Information
- Label: "FROM:"
- Business name
- Email address

### 3. Customer Information
- Label: "TO:"
- Customer name
- Customer email

### 4. Line Items Table
- Label: "ITEMS:"
- Column headers: Description, Qty, Price, Total
- Thin gray separator line
- Item rows with:
  - Product name (left-aligned, wraps if needed)
  - Quantity (right-aligned)
  - Unit price (right-aligned with currency)
  - Total price (right-aligned with currency)

### 5. Totals Section
- Right-aligned calculations
- Subtotal (normal weight)
- Tax (if applicable, normal weight)
- Total (bold, larger font)

### 6. Payment Method
- Small text showing payment method used
- Example: "Payment Method: Credit Card"

### 7. Footer
- Thank you message
- Light gray, smaller font
- Centered or left-aligned

## Data Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customerName` | string | Yes | Customer's full name |
| `customerEmail` | string | Yes | Customer's email |
| `orderNumber` | string | Yes | Unique order identifier |
| `orderDate` | timestamp | Yes | Date of purchase |
| `lineItems` | array | Yes | Array of purchased items |
| `lineItems[].description` | string | Yes | Product name |
| `lineItems[].quantity` | number | Yes | Quantity purchased |
| `lineItems[].unitPrice` | number | Yes | Price per unit (in cents) |
| `lineItems[].totalPrice` | number | Yes | Total for this line (in cents) |
| `subtotal` | number | Yes | Subtotal before tax (in cents) |
| `taxAmount` | number | Yes | Tax amount (in cents) |
| `total` | number | Yes | Final total (in cents) |
| `currency` | string | Yes | Currency code (e.g., "EUR") |
| `paymentMethod` | string | Yes | Payment method used |

## Use Cases
- Individual event ticket purchases
- Single product orders
- B2C checkout transactions
- Customer order confirmations

## Features
- Clean, professional design
- Easy to read and understand
- Itemized breakdown
- Tax transparency
- Payment method tracking
- Mobile-friendly layout

## Notes
- All monetary values are displayed with 2 decimal places
- Currency symbol (€) is shown before amounts
- Tax amount can be zero (e.g., for reverse charge)
- Maximum of ~15 line items per page
- Long descriptions wrap to multiple lines
- Footer can include seller contact information
