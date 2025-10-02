/**
 * Email Service using Resend
 *
 * Handles all email sending for the platform including:
 * - Email verification
 * - Password reset
 * - Organization invitations
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = "VC83 Podcast <noreply@vc83.com>";
const APP_NAME = "VC83.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vc83.com";

/**
 * Send email verification (internal action - called by scheduler)
 */
export const sendVerificationEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verificationUrl = `${APP_URL}/verify-email?token=${args.token}`;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: args.email,
        subject: `Welcome to ${APP_NAME}! Verify your email`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify Your Email</title>
            </head>
            <body style="font-family: 'Press Start 2P', monospace, Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; border: 3px solid #6B46C1; padding: 30px; box-shadow: 5px 5px 0px #6B46C1;">
                <h1 style="color: #9F7AEA; font-size: 18px; margin-bottom: 20px; font-family: 'Press Start 2P', monospace;">
                  Welcome to ${APP_NAME}!
                </h1>

                <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Hi ${args.firstName},
                </p>

                <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  Thanks for signing up! Please verify your email address to get started with your retro desktop podcast experience.
                </p>

                <div style="text-align: center; margin: 40px 0;">
                  <a href="${verificationUrl}"
                     style="display: inline-block; background-color: #6B46C1; color: #ffffff; text-decoration: none; padding: 15px 30px; border: 3px solid #ffffff; box-shadow: 4px 4px 0px #9F7AEA; font-family: 'Press Start 2P', monospace; font-size: 12px;">
                    VERIFY EMAIL
                  </a>
                </div>

                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #cccccc; margin-top: 30px;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="font-family: monospace; font-size: 12px; color: #9F7AEA; word-break: break-all; background-color: #1a1a1a; padding: 10px; border: 1px solid #6B46C1;">
                  ${verificationUrl}
                </p>

                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #cccccc; margin-top: 30px; padding-top: 20px; border-top: 1px solid #6B46C1;">
                  This link will expire in 24 hours.
                </p>

                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #cccccc;">
                  If you didn't create an account, you can safely ignore this email.
                </p>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #6B46C1; text-align: center;">
                  <p style="font-family: 'Press Start 2P', monospace; font-size: 10px; color: #9F7AEA;">
                    ${APP_NAME}
                  </p>
                  <p style="font-family: Arial, sans-serif; font-size: 12px; color: #cccccc;">
                    VC Insights from Mecklenburg-Vorpommern, Germany
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send verification email:", error);
        throw new Error(`Failed to send verification email: ${error.message}`);
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw new Error("Failed to send verification email");
    }
  },
});

/**
 * Send password reset email (internal action - called by scheduler)
 */
export const sendPasswordResetEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const resetUrl = `${APP_URL}/reset-password?token=${args.token}`;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: args.email,
        subject: `Reset your ${APP_NAME} password`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
            </head>
            <body style="font-family: 'Press Start 2P', monospace, Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; border: 3px solid #6B46C1; padding: 30px; box-shadow: 5px 5px 0px #6B46C1;">
                <h1 style="color: #9F7AEA; font-size: 18px; margin-bottom: 20px; font-family: 'Press Start 2P', monospace;">
                  Password Reset Request
                </h1>

                <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Hi ${args.firstName},
                </p>

                <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  We received a request to reset your password. Click the button below to choose a new password.
                </p>

                <div style="text-align: center; margin: 40px 0;">
                  <a href="${resetUrl}"
                     style="display: inline-block; background-color: #6B46C1; color: #ffffff; text-decoration: none; padding: 15px 30px; border: 3px solid #ffffff; box-shadow: 4px 4px 0px #9F7AEA; font-family: 'Press Start 2P', monospace; font-size: 12px;">
                    RESET PASSWORD
                  </a>
                </div>

                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #cccccc; margin-top: 30px;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="font-family: monospace; font-size: 12px; color: #9F7AEA; word-break: break-all; background-color: #1a1a1a; padding: 10px; border: 1px solid #6B46C1;">
                  ${resetUrl}
                </p>

                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #cccccc; margin-top: 30px; padding-top: 20px; border-top: 1px solid #6B46C1;">
                  This link will expire in 1 hour.
                </p>

                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #cccccc;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #6B46C1; text-align: center;">
                  <p style="font-family: 'Press Start 2P', monospace; font-size: 10px; color: #9F7AEA;">
                    ${APP_NAME}
                  </p>
                  <p style="font-family: Arial, sans-serif; font-size: 12px; color: #cccccc;">
                    VC Insights from Mecklenburg-Vorpommern, Germany
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send reset email:", error);
        throw new Error(`Failed to send reset email: ${error.message}`);
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending reset email:", error);
      throw new Error("Failed to send reset email");
    }
  },
});

/**
 * Send organization invitation email (internal action - called by scheduler)
 */
export const sendInvitationEmail = internalAction({
  args: {
    email: v.string(),
    organizationName: v.string(),
    inviterName: v.string(),
    role: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const inviteUrl = `${APP_URL}/accept-invite?token=${args.token}`;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: args.email,
        subject: `You've been invited to join ${args.organizationName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Organization Invitation</title>
            </head>
            <body style="font-family: 'Press Start 2P', monospace, Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; border: 3px solid #6B46C1; padding: 30px; box-shadow: 5px 5px 0px #6B46C1;">
                <h1 style="color: #9F7AEA; font-size: 18px; margin-bottom: 20px; font-family: 'Press Start 2P', monospace;">
                  You're Invited!
                </h1>

                <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  ${args.inviterName} has invited you to join <strong style="color: #9F7AEA;">${args.organizationName}</strong> on ${APP_NAME} as a <strong>${args.role}</strong>.
                </p>

                <div style="text-align: center; margin: 40px 0;">
                  <a href="${inviteUrl}"
                     style="display: inline-block; background-color: #6B46C1; color: #ffffff; text-decoration: none; padding: 15px 30px; border: 3px solid #ffffff; box-shadow: 4px 4px 0px #9F7AEA; font-family: 'Press Start 2P', monospace; font-size: 12px;">
                    ACCEPT INVITE
                  </a>
                </div>

                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #cccccc; margin-top: 30px;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="font-family: monospace; font-size: 12px; color: #9F7AEA; word-break: break-all; background-color: #1a1a1a; padding: 10px; border: 1px solid #6B46C1;">
                  ${inviteUrl}
                </p>

                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #cccccc; margin-top: 30px; padding-top: 20px; border-top: 1px solid #6B46C1;">
                  This invitation will expire in 7 days.
                </p>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #6B46C1; text-align: center;">
                  <p style="font-family: 'Press Start 2P', monospace; font-size: 10px; color: #9F7AEA;">
                    ${APP_NAME}
                  </p>
                  <p style="font-family: Arial, sans-serif; font-size: 12px; color: #cccccc;">
                    VC Insights from Mecklenburg-Vorpommern, Germany
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send invitation email:", error);
        throw new Error(`Failed to send invitation email: ${error.message}`);
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending invitation email:", error);
      throw new Error("Failed to send invitation email");
    }
  },
});
