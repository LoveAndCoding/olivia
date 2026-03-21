import { createSign } from 'node:crypto';
import http2 from 'node:http2';
import webPush from 'web-push';
import type { PushSubscription as WebPushSubscription } from 'web-push';
import type { ApnsConfig } from './config';

const { generateVAPIDKeys, sendNotification, setVapidDetails } = webPush;

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type ApnsSubscriptionPayload = {
  type: 'apns';
  token: string;
  [key: string]: unknown;
};

export type NotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export interface PushProvider {
  isConfigured(): boolean;
  send(subscription: PushSubscriptionPayload, notification: NotificationPayload): Promise<void>;
}

export interface ApnsPushProvider {
  isConfigured(): boolean;
  send(deviceToken: string, notification: NotificationPayload): Promise<void>;
  close(): void;
}

export function isApnsSubscriptionPayload(payload: Record<string, unknown>): payload is ApnsSubscriptionPayload {
  return payload.type === 'apns' && typeof payload.token === 'string';
}

// ─── Web Push ────────────────────────────────────────────────────────────────

export class WebPushProvider implements PushProvider {
  constructor(vapidPublicKey: string, vapidPrivateKey: string, contact: string) {
    setVapidDetails(contact, vapidPublicKey, vapidPrivateKey);
  }

  isConfigured(): boolean {
    return true;
  }

  async send(subscription: PushSubscriptionPayload, notification: NotificationPayload): Promise<void> {
    const webPushSub: WebPushSubscription = { endpoint: subscription.endpoint, keys: subscription.keys };
    await sendNotification(webPushSub, JSON.stringify(notification));
  }
}

export class DisabledPushProvider implements PushProvider {
  isConfigured(): boolean {
    return false;
  }

  async send(_subscription: PushSubscriptionPayload, _notification: NotificationPayload): Promise<void> {
    // Push notifications are disabled; no-op.
  }
}

export function createPushProvider(config: {
  vapidPublicKey: string | null;
  vapidPrivateKey: string | null;
  vapidContact: string;
}): PushProvider {
  if (config.vapidPublicKey && config.vapidPrivateKey) {
    return new WebPushProvider(config.vapidPublicKey, config.vapidPrivateKey, config.vapidContact);
  }
  return new DisabledPushProvider();
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return generateVAPIDKeys();
}

// ─── APNs ────────────────────────────────────────────────────────────────────

const APNS_PRODUCTION_HOST = 'api.push.apple.com';
const APNS_SANDBOX_HOST = 'api.sandbox.push.apple.com';
const APNS_JWT_LIFETIME_MS = 50 * 60 * 1000; // Refresh every 50 min (APNs allows 1 hour)

function buildApnsJwt(keyId: string, teamId: string, privateKey: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString('base64url');
  const signingInput = `${header}.${claims}`;

  const sign = createSign('SHA256');
  sign.update(signingInput);
  const derSignature = sign.sign(privateKey);

  // Convert DER signature to raw r||s format (64 bytes) for ES256 JWT
  const rawSignature = derToRawEs256(derSignature);
  const signature = rawSignature.toString('base64url');

  return `${signingInput}.${signature}`;
}

function derToRawEs256(der: Buffer): Buffer {
  // DER: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  let offset = 2; // skip SEQUENCE tag and length
  if (der[1]! > 0x80) offset += (der[1]! - 0x80); // long-form length

  offset += 1; // skip 0x02 INTEGER tag
  const rLen = der[offset]!;
  offset += 1;
  const r = der.subarray(offset, offset + rLen);
  offset += rLen;

  offset += 1; // skip 0x02 INTEGER tag
  const sLen = der[offset]!;
  offset += 1;
  const s = der.subarray(offset, offset + sLen);

  // Pad or trim to 32 bytes each
  const raw = Buffer.alloc(64);
  r.subarray(Math.max(0, r.length - 32)).copy(raw, 32 - Math.min(r.length, 32));
  s.subarray(Math.max(0, s.length - 32)).copy(raw, 64 - Math.min(s.length, 32));
  return raw;
}

export class Http2ApnsPushProvider implements ApnsPushProvider {
  private client: http2.ClientHttp2Session | null = null;
  private jwt: string | null = null;
  private jwtIssuedAt = 0;
  private readonly host: string;

  constructor(private readonly config: ApnsConfig & { keyId: string; teamId: string; privateKey: string }) {
    this.host = config.useSandbox ? APNS_SANDBOX_HOST : APNS_PRODUCTION_HOST;
  }

  isConfigured(): boolean {
    return true;
  }

  async send(deviceToken: string, notification: NotificationPayload): Promise<void> {
    const jwt = this.getJwt();
    const client = this.getClient();

    const payload = JSON.stringify({
      aps: {
        alert: { title: notification.title, body: notification.body },
        sound: 'default',
        'thread-id': notification.tag,
      },
      url: notification.url,
    });

    return new Promise<void>((resolve, reject) => {
      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        'authorization': `bearer ${jwt}`,
        'apns-topic': this.config.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
      });

      req.setEncoding('utf8');
      let responseData = '';

      req.on('response', (headers) => {
        const status = headers[':status'];
        if (status === 200) {
          req.destroy();
          resolve();
          return;
        }

        req.on('data', (chunk) => { responseData += chunk; });
        req.on('end', () => {
          const error = new Error(`APNs ${status}: ${responseData}`);
          (error as unknown as Record<string, unknown>).statusCode = status;
          reject(error);
        });
      });

      req.on('error', reject);
      req.end(payload);
    });
  }

  close(): void {
    if (this.client && !this.client.closed) {
      this.client.close();
    }
    this.client = null;
  }

  private getJwt(): string {
    const now = Date.now();
    if (!this.jwt || now - this.jwtIssuedAt > APNS_JWT_LIFETIME_MS) {
      this.jwt = buildApnsJwt(this.config.keyId, this.config.teamId, this.config.privateKey);
      this.jwtIssuedAt = now;
    }
    return this.jwt;
  }

  private getClient(): http2.ClientHttp2Session {
    if (this.client && !this.client.closed && !this.client.destroyed) {
      return this.client;
    }
    this.client = http2.connect(`https://${this.host}`);
    this.client.on('error', () => {
      this.client = null;
    });
    return this.client;
  }
}

export class DisabledApnsPushProvider implements ApnsPushProvider {
  isConfigured(): boolean {
    return false;
  }

  async send(_deviceToken: string, _notification: NotificationPayload): Promise<void> {
    // APNs is disabled; no-op.
  }

  close(): void {
    // Nothing to close.
  }
}

export function createApnsPushProvider(config: ApnsConfig): ApnsPushProvider {
  if (config.keyId && config.teamId && config.privateKey) {
    return new Http2ApnsPushProvider({
      ...config,
      keyId: config.keyId,
      teamId: config.teamId,
      privateKey: config.privateKey,
    });
  }
  return new DisabledApnsPushProvider();
}
