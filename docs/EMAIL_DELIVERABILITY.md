# Email Deliverability Guidelines

This document outlines the configuration and best practices for ensuring high email deliverability for L4YERCAK3 transactional emails.

## ✅ Current Configuration

### 1. From Address (AUTH_RESEND_FROM)
```
L4YERCAK3 <team@mail.l4yercak3.com>
```

**Why:**
- ✅ Uses `team@` instead of `noreply@` (increases trust)
- ✅ Allows recipients to reply (better engagement signals)
- ✅ Matches the verified sending domain `mail.l4yercak3.com`

### 2. Reply-To Address
```
team@mail.l4yercak3.com
```

**Why:**
- ✅ Explicit reply-to header signals this is legitimate communication
- ✅ Shows willingness to engage with recipients
- ✅ Reduces spam filter triggers

### 3. Plain Text + HTML
All emails include both:
- HTML version (styled, branded)
- Plain text version (accessible, spam-filter friendly)

**Why:**
- ✅ Email clients prefer multipart emails
- ✅ Plain text ensures deliverability even if HTML is blocked
- ✅ Spam filters trust emails that work without HTML

### 4. No External Resources
- ❌ No Google Fonts imports
- ❌ No external image hosting
- ✅ System fonts only (`Courier New` for retro headers)

**Why:**
- ✅ External resources can trigger spam filters (especially Gmail)
- ✅ Faster email loading
- ✅ No privacy concerns from external trackers

## 🚨 IMPORTANT: Production URL Requirement

### Current Issue
The `setupLink` parameter in invitation emails is currently using:
```
http://localhost:3000/
```

### Required Fix
You MUST update the production environment variable to use the actual production URL:

```bash
# Set production URL in Convex
npx convex env set NEXT_PUBLIC_APP_URL "https://app.l4yercak3.com"
```

Or update it in your Convex dashboard:
1. Go to Settings → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` to `https://app.l4yercak3.com`

### Why This Matters
- ❌ `localhost` URLs in emails are a **major spam signal**
- ❌ Links won't work for recipients
- ❌ Mismatched domains (mail.l4yercak3.com sending links to localhost) trigger spam filters

## 📋 DNS Requirements

Ensure these DNS records are properly configured for `mail.l4yercak3.com`:

### SPF Record
```
v=spf1 include:_spf.resend.com ~all
```
**Status:** Check with your DNS provider
**Why:** Authorizes Resend to send emails on your behalf

### DKIM Record
```
(Provided by Resend - add as TXT record)
```
**Status:** Check Resend dashboard for your specific DKIM values
**Why:** Cryptographically signs your emails to prove authenticity

### DMARC Record
```
v=DMARC1; p=none; rua=mailto:dmarc@l4yercak3.com
```
**Status:** Recommended for monitoring
**Why:** Provides feedback about email authentication results

## 🎯 Email Content Best Practices

### Subject Lines
- ✅ Clear, specific purpose (e.g., "You've been invited to [Org] on L4YERCAK3")
- ✅ Avoid spam trigger words (FREE, URGENT, !!!, etc.)
- ✅ Professional tone

### Body Content
- ✅ Clear sender identification
- ✅ Legitimate business purpose
- ✅ Single, clear call-to-action
- ✅ Professional formatting
- ✅ Footer with company info and year

### What We Avoid
- ❌ ALL CAPS text
- ❌ Excessive exclamation marks
- ❌ "Click here" without context
- ❌ Shortened URLs (bit.ly, etc.)
- ❌ Deceptive subject lines

## 📊 Monitoring Deliverability

### Tools to Use
1. **mail-tester.com** - Score your emails (aim for 9+/10)
2. **Resend Dashboard** - Monitor bounces, complaints, opens
3. **Google Postmaster Tools** - Gmail-specific insights

### Key Metrics to Watch
- **Bounce Rate:** Should be <2%
- **Complaint Rate:** Should be <0.1%
- **Open Rate:** 20-30% is normal for transactional emails

## 🔧 Troubleshooting

### If Emails Still Bounce as Spam

1. **Check DNS Records:** Verify SPF, DKIM, DMARC are properly set
2. **Warm Up Domain:** Start with small volumes, gradually increase
3. **Monitor Feedback Loops:** Review bounces and complaints
4. **Test Email Content:** Use mail-tester.com before sending
5. **Verify Production URL:** Ensure no localhost or development URLs

### Common Issues
- **554 5.7.1 Spam message rejected:** Content issue or authentication problem
- **550 5.7.1 Relaying denied:** SPF/DKIM not configured
- **550 5.1.1 User unknown:** Recipient address doesn't exist

## 📝 Checklist for New Email Types

When adding new transactional emails:

- [ ] Create both HTML and plain text versions
- [ ] Use `team@mail.l4yercak3.com` as from address
- [ ] Add `replyTo: "team@mail.l4yercak3.com"`
- [ ] Include tracking headers (`X-Entity-Ref-ID`)
- [ ] Use production URLs only (no localhost/development)
- [ ] No external fonts or images
- [ ] Test with mail-tester.com
- [ ] Professional subject line
- [ ] Clear call-to-action
- [ ] Company footer with year

## 🔗 Related Documentation

- [Resend Documentation](https://resend.com/docs)
- [Email Authentication (SPF, DKIM, DMARC)](https://www.cloudflare.com/learning/email-security/dmarc-dkim-spf/)
- [Gmail Best Practices](https://support.google.com/mail/answer/81126)

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}
**Maintained By:** Development Team
