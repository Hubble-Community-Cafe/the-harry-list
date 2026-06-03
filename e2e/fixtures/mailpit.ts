import type { APIRequestContext } from '@playwright/test';
import { MAILPIT_URL } from '../playwright.config';

/**
 * Minimal client for the Mailpit REST API (https://mailpit.axllent.org/docs/api-v1/).
 * Lets specs assert on the emails the backend actually delivered during a flow.
 */

export interface MailpitMessageSummary {
  ID: string;
  Subject: string;
  To: Array<{ Address: string; Name: string }>;
  From: { Address: string; Name: string };
}

export interface MailpitMessage extends MailpitMessageSummary {
  HTML: string;
  Text: string;
}

/** Delete all captured messages — call in beforeEach to isolate email assertions. */
export async function clearMailbox(request: APIRequestContext): Promise<void> {
  await request.delete(`${MAILPIT_URL}/api/v1/messages`);
}

/** List message summaries, newest first. */
export async function listMessages(request: APIRequestContext): Promise<MailpitMessageSummary[]> {
  const res = await request.get(`${MAILPIT_URL}/api/v1/messages`);
  if (!res.ok()) throw new Error(`Mailpit list failed: ${res.status()}`);
  return (await res.json()).messages ?? [];
}

/** Fetch the full (rendered) message by id. */
export async function getMessage(request: APIRequestContext, id: string): Promise<MailpitMessage> {
  const res = await request.get(`${MAILPIT_URL}/api/v1/message/${id}`);
  if (!res.ok()) throw new Error(`Mailpit get failed: ${res.status()}`);
  return res.json();
}

/**
 * Poll until an email addressed to `recipient` arrives, then return it fully rendered.
 * Email delivery is async, so we retry briefly rather than asserting immediately.
 */
export async function waitForEmailTo(
  request: APIRequestContext,
  recipient: string,
  { timeoutMs = 10_000, intervalMs = 500 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const summary = (await listMessages(request)).find(m =>
      m.To.some(t => t.Address.toLowerCase() === recipient.toLowerCase())
    );
    if (summary) return getMessage(request, summary.ID);
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`No email to ${recipient} arrived within ${timeoutMs}ms`);
}
