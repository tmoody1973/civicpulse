/**
 * MailSlurp Test Helper
 *
 * Provides utilities for email testing in E2E tests.
 * Uses MailSlurp JS SDK: https://docs.mailslurp.com/js/
 *
 * Common use cases:
 * - Create temporary test inboxes
 * - Wait for verification/notification emails
 * - Extract links from email bodies
 * - Verify email content
 */

import { MailSlurp } from 'mailslurp-client';

// Initialize MailSlurp client with API key from environment
const mailslurp = new MailSlurp({ apiKey: process.env.MAILSLURP_API_KEY! });

export interface TestInbox {
  id: string;
  email: string;
}

export class EmailTestHelper {
  /**
   * Create a temporary test inbox
   *
   * @returns Inbox ID and email address
   *
   * @example
   * const inbox = await EmailTestHelper.createInbox();
   * console.log(inbox.email); // "abc123@mailslurp.com"
   */
  static async createInbox(): Promise<TestInbox> {
    const inbox = await mailslurp.createInbox();

    if (!inbox.id || !inbox.emailAddress) {
      throw new Error('Failed to create inbox: missing id or email address');
    }

    return {
      id: inbox.id,
      email: inbox.emailAddress,
    };
  }

  /**
   * Wait for the latest email and extract verification link
   *
   * @param inboxId - Inbox ID to check
   * @param timeout - Timeout in milliseconds (default: 60s)
   * @returns Email object and extracted verification link
   *
   * @example
   * const { email, verificationLink } = await EmailTestHelper.waitForVerificationEmail(inbox.id);
   * await page.goto(verificationLink);
   */
  static async waitForVerificationEmail(
    inboxId: string,
    timeout = 60_000
  ): Promise<{
    email: any;
    verificationLink: string;
  }> {
    // Wait for email to arrive
    const email = await mailslurp.waitForLatestEmail(inboxId, timeout);

    if (!email.body) {
      throw new Error('Email body is empty');
    }

    // Extract verification link from email body
    // Matches: href="https://example.com/verify?token=..." or similar
    const linkMatch = email.body.match(/href="([^"]*(?:verify|confirm)[^"]*)"/i);

    if (!linkMatch) {
      throw new Error(
        `No verification link found in email. Email body:\n${email.body.substring(0, 500)}...`
      );
    }

    return {
      email,
      verificationLink: linkMatch[1],
    };
  }

  /**
   * Wait for notification email matching subject
   *
   * @param inboxId - Inbox ID to check
   * @param subject - Subject line to match (partial match)
   * @param timeout - Timeout in milliseconds (default: 60s)
   * @returns Matching email object
   *
   * @example
   * const email = await EmailTestHelper.waitForNotificationEmail(
   *   inbox.id,
   *   'Bill Update: H.R. 1234'
   * );
   * expect(email.subject).toContain('H.R. 1234');
   */
  static async waitForNotificationEmail(
    inboxId: string,
    subject: string,
    timeout = 60_000
  ) {
    const emails = await mailslurp.waitForMatchingEmails({
      inboxId,
      count: 1,
      timeout,
      matchOptions: {
        subject,
      },
    });

    if (!emails || emails.length === 0) {
      throw new Error(`No email found with subject: ${subject}`);
    }

    return emails[0];
  }

  /**
   * Verify email contains expected content
   *
   * @param inboxId - Inbox ID to check
   * @param expectedContent - Array of strings that should appear in email body
   * @param timeout - Timeout in milliseconds (default: 60s)
   * @returns Email object if content found
   *
   * @example
   * await EmailTestHelper.verifyEmailContent(inbox.id, [
   *   'Welcome to HakiVo',
   *   'Your representatives',
   *   'Healthcare'
   * ]);
   */
  static async verifyEmailContent(
    inboxId: string,
    expectedContent: string[],
    timeout = 60_000
  ) {
    const email = await mailslurp.waitForLatestEmail(inboxId, timeout);

    if (!email.body) {
      throw new Error('Email body is empty');
    }

    const missingContent = expectedContent.filter(
      (content) => !email.body!.includes(content)
    );

    if (missingContent.length > 0) {
      throw new Error(
        `Email missing expected content: ${missingContent.join(', ')}\n\nEmail body:\n${email.body.substring(0, 500)}...`
      );
    }

    return email;
  }

  /**
   * Extract all links from email body
   *
   * @param inboxId - Inbox ID to check
   * @param timeout - Timeout in milliseconds (default: 60s)
   * @returns Array of URLs found in email
   *
   * @example
   * const links = await EmailTestHelper.extractLinks(inbox.id);
   * const podcastLink = links.find(link => link.includes('/podcast/'));
   */
  static async extractLinks(inboxId: string, timeout = 60_000): Promise<string[]> {
    const email = await mailslurp.waitForLatestEmail(inboxId, timeout);

    if (!email.body) {
      throw new Error('Email body is empty');
    }

    // Extract all URLs from href attributes
    const linkMatches = email.body.matchAll(/href="([^"]*)"/g);
    const links = Array.from(linkMatches, (match) => match[1]);

    return links;
  }

  /**
   * Wait for email with specific sender
   *
   * @param inboxId - Inbox ID to check
   * @param senderEmail - Sender email address (e.g., "notifications@hakivo.app")
   * @param timeout - Timeout in milliseconds (default: 60s)
   * @returns Matching email object
   *
   * @example
   * const email = await EmailTestHelper.waitForEmailFrom(
   *   inbox.id,
   *   'notifications@hakivo.app'
   * );
   */
  static async waitForEmailFrom(
    inboxId: string,
    senderEmail: string,
    timeout = 60_000
  ) {
    const emails = await mailslurp.waitForMatchingEmails({
      inboxId,
      count: 1,
      timeout,
      matchOptions: {
        from: senderEmail,
      },
    });

    if (!emails || emails.length === 0) {
      throw new Error(`No email found from sender: ${senderEmail}`);
    }

    return emails[0];
  }

  /**
   * Get all emails in inbox
   *
   * @param inboxId - Inbox ID to check
   * @returns Array of email objects
   *
   * @example
   * const emails = await EmailTestHelper.getAllEmails(inbox.id);
   * expect(emails).toHaveLength(3);
   */
  static async getAllEmails(inboxId: string) {
    const emails = await mailslurp.getEmails({
      inboxId,
    });

    return emails;
  }

  /**
   * Delete test inbox (cleanup)
   *
   * @param inboxId - Inbox ID to delete
   *
   * @example
   * test.afterEach(async () => {
   *   await EmailTestHelper.deleteInbox(inbox.id);
   * });
   */
  static async deleteInbox(inboxId: string): Promise<void> {
    await mailslurp.deleteInbox(inboxId);
  }

  /**
   * Empty inbox (delete all emails)
   *
   * @param inboxId - Inbox ID to empty
   *
   * @example
   * await EmailTestHelper.emptyInbox(inbox.id);
   */
  static async emptyInbox(inboxId: string): Promise<void> {
    await mailslurp.emptyInbox(inboxId);
  }

  /**
   * Wait for N emails to arrive
   *
   * @param inboxId - Inbox ID to check
   * @param count - Number of emails to wait for
   * @param timeout - Timeout in milliseconds (default: 60s)
   * @returns Array of email objects
   *
   * @example
   * // Wait for 3 notifications
   * const emails = await EmailTestHelper.waitForEmailCount(inbox.id, 3);
   * expect(emails).toHaveLength(3);
   */
  static async waitForEmailCount(
    inboxId: string,
    count: number,
    timeout = 60_000
  ) {
    const emails = await mailslurp.waitForEmailCount(count, inboxId, timeout);
    return emails;
  }
}
