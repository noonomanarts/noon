import fs from 'node:fs';
for (const line of fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const { issueWhatsAppVerificationCode, validateWhatsAppVerificationCode, normalizePhoneDigits } = await import('../src/lib/db/whatsappAuth.ts');

async function cycle(issuePhone, verifyPhone, purpose) {
  const issued = await issueWhatsAppVerificationCode({ phoneNumber: issuePhone, purpose });
  // wait >45s rule not needed because different phone each time
  const res = await validateWhatsAppVerificationCode({
    verificationId: issued.verificationId,
    code: issued.code,
    purpose,
    phoneNumber: verifyPhone,
  });
  console.log(`issue="${issuePhone}" (digits=${normalizePhoneDigits(issuePhone)}) verify="${verifyPhone}" (digits=${normalizePhoneDigits(verifyPhone)}) purpose=${purpose} => ${JSON.stringify(res)}`);
}

try {
  // Exact same string the frontend sends
  await cycle('+96891200635', '+96891200635', 'REGISTER');
  // With a space (if one side trims and other doesn't)
  await cycle('+968 91200636', '+96891200636', 'REGISTER');
  // login purpose
  await cycle('+96891200637', '+96891200637', 'LOGIN');
} catch (e) {
  console.error('ERROR:', e);
} finally {
  process.exit(0);
}
