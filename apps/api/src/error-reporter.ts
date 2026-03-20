import { z } from 'zod';
import type { FastifyBaseLogger } from 'fastify';
import type { PaperclipConfig } from './config';

export const errorReportSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(10000).optional(),
  source: z.enum(['fe', 'be']),
  url: z.string().max(2000).optional(),
  timestamp: z.string().datetime().optional(),
  userAgent: z.string().max(500).optional(),
  route: z.string().max(500).optional(),
  method: z.string().max(10).optional(),
  statusCode: z.number().int().optional(),
});

export type ErrorReport = z.infer<typeof errorReportSchema>;

const MAX_ISSUES_PER_HOUR = 10;
const HOUR_MS = 3_600_000;

export function createErrorReporter(paperclip: PaperclipConfig, log: FastifyBaseLogger) {
  const timestamps: number[] = [];

  const isConfigured = !!(paperclip.apiUrl && paperclip.apiKey && paperclip.companyId && paperclip.sreAgentId);

  function isRateLimited(): boolean {
    const now = Date.now();
    // Remove timestamps older than 1 hour
    while (timestamps.length > 0 && timestamps[0] < now - HOUR_MS) {
      timestamps.shift();
    }
    return timestamps.length >= MAX_ISSUES_PER_HOUR;
  }

  async function report(error: ErrorReport): Promise<void> {
    if (!isConfigured) {
      log.warn({ error: error.message, source: error.source }, 'Error reported but Paperclip not configured — skipping issue creation');
      return;
    }

    if (isRateLimited()) {
      log.warn({ error: error.message }, 'Error report rate-limited — skipping issue creation');
      return;
    }

    timestamps.push(Date.now());

    const title = error.message.length > 100
      ? error.message.slice(0, 97) + '...'
      : error.message;

    const descriptionParts = [
      `**Source:** ${error.source === 'fe' ? 'Frontend' : 'Backend'}`,
      `**Timestamp:** ${error.timestamp ?? new Date().toISOString()}`,
    ];

    if (error.url) descriptionParts.push(`**URL:** ${error.url}`);
    if (error.route) descriptionParts.push(`**Route:** ${error.method ?? 'GET'} ${error.route}`);
    if (error.statusCode) descriptionParts.push(`**Status Code:** ${error.statusCode}`);
    if (error.userAgent) descriptionParts.push(`**User Agent:** ${error.userAgent}`);

    descriptionParts.push('');
    descriptionParts.push('## Error Message');
    descriptionParts.push(`\`\`\`\n${error.message}\n\`\`\``);

    if (error.stack) {
      descriptionParts.push('');
      descriptionParts.push('## Stack Trace');
      descriptionParts.push(`\`\`\`\n${error.stack}\n\`\`\``);
    }

    const body = {
      title: `[Error] ${title}`,
      description: descriptionParts.join('\n'),
      status: 'todo' as const,
      priority: 'medium' as const,
      assigneeAgentId: paperclip.sreAgentId,
    };

    try {
      const response = await fetch(`${paperclip.apiUrl}/api/companies/${paperclip.companyId}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paperclip.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        log.error({ status: response.status, body: text }, 'Failed to create Paperclip error issue');
      } else {
        const issue = await response.json() as { identifier?: string };
        log.info({ identifier: issue.identifier }, 'Created Paperclip error issue');
      }
    } catch (err) {
      log.error({ err }, 'Failed to reach Paperclip API for error reporting');
    }
  }

  return { report, isConfigured };
}

export type ErrorReporter = ReturnType<typeof createErrorReporter>;
