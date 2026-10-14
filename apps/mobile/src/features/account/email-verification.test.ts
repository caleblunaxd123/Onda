import {describe, expect, it} from 'vitest';
import {verificationMessage, verificationToken} from './email-verification';

describe('email confirmation links', () => {
  it('accepts a fragment secret and ignores query strings and malformed tokens', () => {
    const token = 'a'.repeat(64);
    expect(verificationToken(`https://onda.lunalav.pe/verify-email#token=${token}`)).toBe(token);
    expect(verificationToken(`https://onda.lunalav.pe/verify-email?token=${token}`)).toBeNull();
    expect(verificationToken('https://onda.lunalav.pe/verify-email#token=bad')).toBeNull();
    expect(verificationToken(null)).toBeNull();
  });
  it('does not claim mail was sent when the provider is unavailable or failed', () => {
    expect(verificationMessage('sent')).toContain('Enviamos');
    expect(verificationMessage('failed')).toContain('No pudimos');
    expect(verificationMessage('unavailable')).toContain('se está preparando');
  });
});
