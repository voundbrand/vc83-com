#!/bin/bash
# Simplified Stripe Products Script with Image Support and Tax Code
set -e

IMAGE_URL="https://agreeable-lion-828.convex.cloud/api/storage/71319665-bf58-4978-8227-17c1928e87b6"
TAX_CODE="txcd_10103001"  # SaaS - Software as a Service

if [ "$1" == "--execute" ]; then
  echo "Ready to create 5 products with 10 prices in Stripe"
  read -p "Type CREATE to confirm: " c
  [ "$c" != "CREATE" ] && exit 1
  echo "Creating..."
else
  echo "DRY RUN - use --execute to actually create"
  exit 0
fi

ENV_FILE="stripe-price-ids.env"
echo "# Generated $(date)" > $ENV_FILE

# Community €9
echo "1/5 Community..."
C=$(stripe products create --name "l4yercak3 Community" --description "Course, templates, calls, Skool" --tax-code "$TAX_CODE" --images "$IMAGE_URL" -d "metadata[plan_tier]=community" -d "metadata[max_users]=1" -d "metadata[max_contacts]=100" -d "metadata[community_access]=true")
CID=$(echo "$C" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "COMMUNITY_PRODUCT=$CID" >> $ENV_FILE

CM=$(stripe prices create --product "$CID" --unit-amount 900 --currency eur -d "recurring[interval]=month" -d "recurring[trial_period_days]=14")
CMID=$(echo "$CM" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "COMMUNITY_MONTHLY=$CMID" >> $ENV_FILE

CA=$(stripe prices create --product "$CID" --unit-amount 9000 --currency eur -d "recurring[interval]=year" -d "recurring[trial_period_days]=14")
CAID=$(echo "$CA" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "COMMUNITY_ANNUAL=$CAID" >> $ENV_FILE
echo "✅ Community done"

# Starter €199
echo "2/5 Starter..."
S=$(stripe products create --name "l4yercak3 Starter" --description "1K contacts, AI, email support" --tax-code "$TAX_CODE" --images "$IMAGE_URL" -d "metadata[plan_tier]=starter" -d "metadata[max_users]=3" -d "metadata[max_contacts]=1000" -d "metadata[community_access_included]=true")
SID=$(echo "$S" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "STARTER_PRODUCT=$SID" >> $ENV_FILE

SM=$(stripe prices create --product "$SID" --unit-amount 19900 --currency eur -d "recurring[interval]=month" -d "recurring[trial_period_days]=14")
SMID=$(echo "$SM" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "STARTER_MONTHLY=$SMID" >> $ENV_FILE

SA=$(stripe prices create --product "$SID" --unit-amount 199000 --currency eur -d "recurring[interval]=year" -d "recurring[trial_period_days]=14")
SAID=$(echo "$SA" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "STARTER_ANNUAL=$SAID" >> $ENV_FILE
echo "✅ Starter done"

# Professional €399
echo "3/5 Professional..."
P=$(stripe products create --name "l4yercak3 Professional" --description "5K contacts, white-label, advanced" --tax-code "$TAX_CODE" --images "$IMAGE_URL" -d "metadata[plan_tier]=professional" -d "metadata[max_users]=10" -d "metadata[max_contacts]=5000" -d "metadata[community_access_included]=true")
PID=$(echo "$P" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "PROFESSIONAL_PRODUCT=$PID" >> $ENV_FILE

PM=$(stripe prices create --product "$PID" --unit-amount 39900 --currency eur -d "recurring[interval]=month" -d "recurring[trial_period_days]=14")
PMID=$(echo "$PM" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "PROFESSIONAL_MONTHLY=$PMID" >> $ENV_FILE

PA=$(stripe prices create --product "$PID" --unit-amount 399000 --currency eur -d "recurring[interval]=year" -d "recurring[trial_period_days]=14")
PAID=$(echo "$PA" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "PROFESSIONAL_ANNUAL=$PAID" >> $ENV_FILE
echo "✅ Professional done"

# Agency €599
echo "4/5 Agency..."
A=$(stripe products create --name "l4yercak3 Agency" --description "Sub-orgs, white-label, priority support" --tax-code "$TAX_CODE" --images "$IMAGE_URL" -d "metadata[plan_tier]=agency" -d "metadata[max_users]=15" -d "metadata[max_contacts]=10000" -d "metadata[sub_orgs_included]=2" -d "metadata[community_access_included]=true")
AID=$(echo "$A" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "AGENCY_PRODUCT=$AID" >> $ENV_FILE

AM=$(stripe prices create --product "$AID" --unit-amount 59900 --currency eur -d "recurring[interval]=month" -d "recurring[trial_period_days]=14")
AMID=$(echo "$AM" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "AGENCY_MONTHLY=$AMID" >> $ENV_FILE

AA=$(stripe prices create --product "$AID" --unit-amount 599000 --currency eur -d "recurring[interval]=year" -d "recurring[trial_period_days]=14")
AAID=$(echo "$AA" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "AGENCY_ANNUAL=$AAID" >> $ENV_FILE
echo "✅ Agency done"

# Sub-Org €79
echo "5/5 Sub-Organization..."
SO=$(stripe products create --name "Agency Sub-Organization" --description "Additional sub-org for Agency" --tax-code "$TAX_CODE" --images "$IMAGE_URL" -d "metadata[addon_type]=sub_organization" -d "metadata[requires_plan]=agency")
SOID=$(echo "$SO" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "SUB_ORG_PRODUCT=$SOID" >> $ENV_FILE

SOM=$(stripe prices create --product "$SOID" --unit-amount 7900 --currency eur -d "recurring[interval]=month")
SOMID=$(echo "$SOM" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "SUB_ORG_MONTHLY=$SOMID" >> $ENV_FILE

SOA=$(stripe prices create --product "$SOID" --unit-amount 79000 --currency eur -d "recurring[interval]=year")
SOAID=$(echo "$SOA" | grep '"id"' | head -1 | cut -d'"' -f4)
echo "SUB_ORG_ANNUAL=$SOAID" >> $ENV_FILE
echo "✅ Sub-Organization done"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All 5 products with 10 prices created!"
echo "Tax code: $TAX_CODE (SaaS - Software as a Service)"
echo "IDs saved to: $ENV_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
