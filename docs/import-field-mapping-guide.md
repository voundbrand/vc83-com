# Import Field Mapping Guide

This document provides a comprehensive mapping between CSV import fields and database fields for the Eventrrr CRM system.

## Contact Import Fields

### Personal Information
| CSV Field | Database Field | Type | Required | Description |
|-----------|---------------|------|----------|-------------|
| salutation | contacts.salutation | String | No | Herr, Frau, Dr., Prof., Mr., Ms., etc. |
| firstName | contacts.firstName | String | No | Contact's first name |
| lastName | contacts.lastName | String | No | Contact's last name |
| email | contacts.email | String | No | Primary email address |
| phone | contacts.phone | String | No | Primary phone number |
| mobilePhone | contacts.mobilePhone | String | No | Mobile phone number |
| title | contacts.title | String | No | Job title (e.g., CEO, Manager) |
| profession | contacts.profession | String | No | Professional occupation |

### CRM Data
| CSV Field | Database Field | Type | Required | Description |
|-----------|---------------|------|----------|-------------|
| status | contacts.status | String | No | Lead, Customer, Vendor, etc. |
| tags | contacts.tags | Array[ID] | No | Comma-separated tag names |
| notes | contacts.notes | String | No | General notes about contact |
| eventsPerYear | contacts.eventsPerYear | String | No | Number of events attended/year |
| eventRevenue | contacts.eventRevenue | String | No | Revenue generated from events |
| meetupLocationCity | contacts.meetupLocationCity | String | No | Preferred meeting location |

### Organization Link
| CSV Field | Database Field | Type | Required | Description |
|-----------|---------------|------|----------|-------------|
| organizationName | organizations.name | String | No | Name of associated organization |
| organizationType | organizations.organizationType | String | No | Type of organization relationship |

### Event & Billing Information
| CSV Field | Database Field | Type | Required | Description |
|-----------|---------------|------|----------|-------------|
| billingAddress | contacts.billingAddress | String | No | Complete billing address |
| dietaryRequirements | contacts.dietaryRequirements | String | No | Dietary restrictions/preferences |
| specialNeeds | contacts.specialNeeds | String | No | Accessibility requirements |
| arrivalTime | contacts.arrivalTime | String | No | Expected arrival time for events |
| accommodationNeeds | contacts.accommodationNeeds | String | No | Hotel/lodging requirements |

## Organization Import Fields

### Basic Information
| CSV Field | Database Field | Type | Required | Description |
|-----------|---------------|------|----------|-------------|
| name | organizations.name | String | Yes | Organization name |
| slug | organizations.slug | String | Yes | URL-friendly identifier |
| organizationType | organizations.organizationType | String | No | Client, Partner, Vendor, etc. |
| status | organizations.status | Enum | No | active, invited, prospect, reference, inactive |

### Contact Information
| CSV Field | Database Field | Type | Required | Description |
|-----------|---------------|------|----------|-------------|
| primaryContactEmail | organizations.primaryContactEmail | String | No | Main contact email |
| primaryContactName | organizations.primaryContactName | String | No | Main contact person |
| contactPerson | organizations.contactPerson | String | No | Primary contact name |
| customerServiceEmail | organizations.customerServiceEmail | String | No | Support email |
| phoneNumbers | organizations.phoneNumbers | Array | No | Phone numbers (parse as array) |

### Company Details
| CSV Field | Database Field | Type | Required | Description |
|-----------|---------------|------|----------|-------------|
| industry | organizations.industry | String | No | Industry sector |
| companySize | organizations.companySize | String | No | Company size category |
| employeeCount | organizations.employeeCount | String | No | Number of employees |
| annualRevenue | organizations.annualRevenue | String | No | Revenue range |
| website | organizations.website | String | No | Company website |
| description | organizations.description | String | No | Company description |

### Billing Information
| CSV Field | Database Field | Type | Required | Description |
|-----------|---------------|------|----------|-------------|
| billingStreet | organizations.billingStreet | String | No | Billing street address |
| billingCity | organizations.billingCity | String | No | Billing city |
| billingPostalCode | organizations.billingPostalCode | String | No | Billing postal code |
| billingState | organizations.billingState | String | No | Billing state/province |
| billingCountry | organizations.billingCountry | String | No | Billing country |
| vatNumber | organizations.vatNumber | String | No | VAT registration number |
| billingEmail | organizations.billingEmail | String | No | Email for invoices |
| taxId | organizations.taxId | String | No | Tax identification number |

### Internal Information
| CSV Field | Database Field | Type | Required | Description |
|-----------|---------------|------|----------|-------------|
| notes | organizations.notes | String | No | Internal notes |

## Import Process Notes

### Contact Import Logic
1. **Email Matching**: System checks for existing contacts by email first
2. **Organization Linking**: If organizationName provided, system will:
   - Search for existing organization by name
   - Create new organization if not found
   - Link contact to organization via contactOrgLinks table
3. **Tag Processing**: Tag names are converted to tag IDs during import
4. **Status Values**: Recommend using standard values (Lead, Customer, Vendor)

### Organization Import Logic
1. **Slug Generation**: If not provided, auto-generated from name
2. **Phone Number Parsing**: Multiple phone numbers should be comma-separated
3. **Status Defaults**: If not provided, defaults to "prospect"
4. **Duplicate Handling**: Checked by name and slug

### Special Considerations

#### German Market Fields
- **Salutation**: Support for German titles (Herr, Frau, Dr., Prof.)
- **VAT Number**: Format validation for EU VAT numbers
- **Billing Address**: Support for German address format

#### Event-Specific Fields
Some contact fields are event-specific and might be better stored in a separate registrations table in the future:
- arrivalTime
- accommodationNeeds
- dietaryRequirements
- specialNeeds

These are currently stored on the contact for simplicity but could be moved to event registrations for better data organization.

## Example Import Workflow

1. **Prepare CSV files** using the provided templates
2. **Validate data** ensuring required fields are populated
3. **Import Organizations first** (if importing both)
4. **Import Contacts second** to properly link to organizations
5. **Review import results** and handle any errors
6. **Update tags and relationships** as needed post-import

## Data Validation Rules

### Email Validation
- Must be valid email format
- Checked for duplicates within organization

### Phone Number Format
- Supports international formats
- Recommended format: +[country code] [number]

### Date/Time Fields
- ISO 8601 format recommended (YYYY-MM-DD HH:MM)
- Time zones should be specified when relevant

### Monetary Values
- Store as strings to preserve formatting
- Include currency if not EUR/USD default