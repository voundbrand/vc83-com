// Plain text email templates for better deliverability

/**
 * Plain text version of new user invitation email
 */
export function getNewUserInvitationText(args: {
  to: string;
  organizationName: string;
  inviterName: string;
  setupLink: string;
}) {
  return `
sevenlayers - Team Invitation

Welcome to sevenlayers!

${args.inviterName} has invited you to join ${args.organizationName} on sevenlayers.

What is sevenlayers?

sevenlayers is a B2B workflow platform that helps businesses streamline their operations. We bring together all the digital tools your business needs — CRM, email workflows, invoicing, project management, form builders, and more — into one integrated workspace with AI-powered automation.

Each tool is a "layer" that works seamlessly with the others, so your customer data flows between your CRM, invoices, email campaigns, and projects. No more switching between dozens of separate tools.

Get Started

To accept this invitation and set up your account, please visit:
${args.setupLink}

The login window opens directly with your email prefilled, so you can create your password and access your workspace without re-entering it manually.

---

If you have any questions, please don't hesitate to reach out to ${args.inviterName} or our support team.

© ${new Date().getFullYear()} sevenlayers. All rights reserved.

If you received this email by mistake, you can safely ignore it.
  `.trim();
}

/**
 * Plain text version of existing user invitation email
 */
export function getExistingUserInvitationText(args: {
  to: string;
  organizationName: string;
  inviterName: string;
  setupLink: string;
}) {
  return `
sevenlayers - New Organization Access

Hello!

${args.inviterName} has added you to ${args.organizationName} on sevenlayers.

You already have a sevenlayers account, so you can access this new organization immediately.

Access Your New Organization

Visit: ${args.setupLink}

Log in with your existing credentials. The login window opens with your email prefilled, and you'll find ${args.organizationName} in your organization list.

---

If you have any questions, please contact ${args.inviterName}.

© ${new Date().getFullYear()} sevenlayers. All rights reserved.

If you received this email by mistake, you can safely ignore it.
  `.trim();
}

/**
 * Plain text version of password reset email
 */
export function getPasswordResetText(args: {
  userName?: string;
  resetLink: string;
}) {
  const greeting = args.userName ? `Hello ${args.userName}` : "Hello";

  return `
sevenlayers - Password Reset Request

${greeting},

We received a request to reset your password for your sevenlayers account.

Reset Your Password

To create a new password, please visit:
${args.resetLink}

Important:
- This link will expire in 1 hour for security reasons
- If you didn't request this password reset, you can safely ignore this email

---

© ${new Date().getFullYear()} sevenlayers. All rights reserved.

If you have any questions about your account security, please contact our support team.
  `.trim();
}
