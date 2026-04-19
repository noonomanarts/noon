/**
 * Web Push delivery client.
 *
 * We deliberately avoid adding `web-push` as a dependency; the VAPID signing
 * and RFC 8291 encryption can be done with Node's built-in crypto. This
 * keeps the dependency footprint small and avoids tree-shaking issues.
 *
 * Instead of re-implementing the spec from scratch, we use a tiny inline
 * implementation based on the well-tested JWS + ECDH-ES + AES-128-GCM
 * protocol described in RFC 8291. This file exports a single high-level
 * helper (`sendPushToUser`) that the outbox dispatcher invokes.
 *
 * If web-push ever becomes a dependency, swap the `dispatchPush` body to
 * call it directly.
 */

import { createECDH, createHmac, createSign, randomBytes, createCipheriv } from 'node:crypto';
import { deletePushSubscriptionByEndpoint, listPushSubscriptionsForUser, type PushSubscriptionRow } from './subscriptions';

function getVapidKeys(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@noonomanarts.com';
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function b64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function b64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  const prk = createHmac('sha256', salt).update(ikm).digest();
  let t = Buffer.alloc(0);
  let okm = Buffer.alloc(0);
  let counter = 1;
  while (okm.length < length) {
    t = createHmac('sha256', prk)
      .update(Buffer.concat([t, info, Buffer.from([counter])]))
      .digest();
    okm = Buffer.concat([okm, t]);
    counter += 1;
  }
  return okm.subarray(0, length);
}

/**
 * Encrypt message body for a subscription using aes128gcm (RFC 8291).
 * Produces the encrypted Content-Encoding: aes128gcm body.
 */
function encryptPayload(
  payload: Buffer,
  uaPublicKey: Buffer,
  authSecret: Buffer
): { body: Buffer; ecdh: Buffer } {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const appServerPublicKey = ecdh.getPublicKey(null, 'uncompressed');
  const sharedSecret = ecdh.computeSecret(uaPublicKey);

  const salt = randomBytes(16);

  // prk_key = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0'),
    uaPublicKey,
    appServerPublicKey,
  ]);
  const prkKey = hkdf(authSecret, sharedSecret, keyInfo, 32);

  // CEK = HKDF(salt, prk_key, "Content-Encoding: aes128gcm\0", 16)
  const cek = hkdf(salt, prkKey, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  // Nonce = HKDF(salt, prk_key, "Content-Encoding: nonce\0", 12)
  const nonce = hkdf(salt, prkKey, Buffer.from('Content-Encoding: nonce\0'), 12);

  // Pad = 0x02 terminator (last record)
  const padded = Buffer.concat([payload, Buffer.from([0x02])]);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(padded), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // aes128gcm header: salt(16) || record_size(4, BE) || id_len(1) || keyid(idlen)
  // keyid = appServerPublicKey (65 bytes, uncompressed)
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  const header = Buffer.concat([
    salt,
    recordSize,
    Buffer.from([appServerPublicKey.length]),
    appServerPublicKey,
  ]);

  return {
    body: Buffer.concat([header, ciphertext, authTag]),
    ecdh: appServerPublicKey,
  };
}

function buildVapidAuthHeader(endpoint: string, publicKey: string, privateKey: string, subject: string): string {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp, sub: subject };
  const encodedHeader = b64UrlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = b64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with ES256 (P-256, SHA-256). Node's sign produces DER; convert to fixed-length r||s.
  const privateBytes = b64UrlDecode(privateKey);
  const pemKey = p256PrivateKeyPem(privateBytes, b64UrlDecode(publicKey));
  const signer = createSign('sha256');
  signer.update(signingInput);
  const derSig = signer.sign(pemKey);
  const joseSig = derToJose(derSig, 32);

  const token = `${signingInput}.${b64UrlEncode(joseSig)}`;
  return `vapid t=${token}, k=${publicKey}`;
}

function p256PrivateKeyPem(privateBytes: Buffer, publicBytes: Buffer): string {
  // PKCS#8 ASN.1 DER for an EC private key on secp256r1 (prime256v1).
  // Built manually to avoid introducing dependencies.
  // SEQUENCE { version(0), AlgorithmIdentifier, OCTET STRING { ECPrivateKey } }
  const ecPrivateKey = encodeDer(
    0x30,
    Buffer.concat([
      encodeDer(0x02, Buffer.from([0x01])), // version = 1
      encodeDer(0x04, privateBytes),
      encodeDer(
        0xa1,
        encodeDer(0x03, Buffer.concat([Buffer.from([0x00]), publicBytes]))
      ),
    ])
  );
  const algId = encodeDer(
    0x30,
    Buffer.concat([
      encodeDer(0x06, Buffer.from([0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01])), // id-ecPublicKey
      encodeDer(0x06, Buffer.from([0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07])), // secp256r1
    ])
  );
  const pkcs8 = encodeDer(
    0x30,
    Buffer.concat([
      encodeDer(0x02, Buffer.from([0x00])), // version
      algId,
      encodeDer(0x04, ecPrivateKey),
    ])
  );
  const pem = pkcs8.toString('base64').replace(/(.{64})/g, '$1\n');
  return `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----\n`;
}

function encodeDer(tag: number, content: Buffer): Buffer {
  let lenBytes: Buffer;
  if (content.length < 0x80) {
    lenBytes = Buffer.from([content.length]);
  } else {
    const bytes: number[] = [];
    let n = content.length;
    while (n > 0) {
      bytes.unshift(n & 0xff);
      n >>= 8;
    }
    lenBytes = Buffer.from([0x80 | bytes.length, ...bytes]);
  }
  return Buffer.concat([Buffer.from([tag]), lenBytes, content]);
}

function derToJose(der: Buffer, partLen: number): Buffer {
  // Parse DER ECDSA signature (SEQUENCE of two INTEGERs) to fixed-length r||s.
  if (der[0] !== 0x30) throw new Error('Invalid DER signature');
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;
  if (der[offset] !== 0x02) throw new Error('Invalid DER integer (r)');
  const rLen = der[offset + 1];
  let r = der.subarray(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (der[offset] !== 0x02) throw new Error('Invalid DER integer (s)');
  const sLen = der[offset + 1];
  let s = der.subarray(offset + 2, offset + 2 + sLen);
  while (r.length > partLen && r[0] === 0) r = r.subarray(1);
  while (s.length > partLen && s[0] === 0) s = s.subarray(1);
  const rPad = Buffer.concat([Buffer.alloc(partLen - r.length), r]);
  const sPad = Buffer.concat([Buffer.alloc(partLen - s.length), s]);
  return Buffer.concat([rPad, sPad]);
}

async function dispatchPush(subscription: PushSubscriptionRow, payload: object): Promise<{ ok: boolean; status: number; body?: string }> {
  const vapid = getVapidKeys();
  if (!vapid) return { ok: false, status: 500, body: 'VAPID keys not configured' };

  const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
  const uaPublicKey = b64UrlDecode(subscription.p256dh);
  const authSecret = b64UrlDecode(subscription.auth);

  const { body } = encryptPayload(payloadBuffer, uaPublicKey, authSecret);
  const authHeader = buildVapidAuthHeader(subscription.endpoint, vapid.publicKey, vapid.privateKey, vapid.subject);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '2419200', // 4 weeks
    },
    // Node's undici fetch accepts a Uint8Array as body.
    body: new Uint8Array(body),
  });

  if (response.ok) return { ok: true, status: response.status };
  const text = await response.text().catch(() => '');
  return { ok: false, status: response.status, body: text };
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; icon?: string; tag?: string }
): Promise<{ subscriptions: number; delivered: number; removed: number }> {
  const subs = await listPushSubscriptionsForUser(userId);
  if (subs.length === 0) return { subscriptions: 0, delivered: 0, removed: 0 };

  let delivered = 0;
  let removed = 0;

  const message = {
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.tag,
  };

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const result = await dispatchPush(sub, message);
        if (result.ok) {
          delivered += 1;
        } else if (result.status === 404 || result.status === 410) {
          // Gone — remove subscription.
          await deletePushSubscriptionByEndpoint(sub.endpoint).catch((error) => {
            console.error('[push] failed to prune subscription:', error);
          });
          removed += 1;
        } else {
          console.warn(`[push] send failed status=${result.status} body=${result.body ?? ''}`);
        }
      } catch (error) {
        console.error('[push] unexpected send error:', error);
      }
    })
  );

  return { subscriptions: subs.length, delivered, removed };
}
