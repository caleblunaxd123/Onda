import {describe, expect, it} from 'vitest';
import decode from 'decode-uri-component';

describe('SDK 57 URI decoder compatibility', () => {
  it('decodes invitation parameters and Unicode', () => {
    expect(decode('https%3A%2F%2Fonda.lunalav.pe%2Froom%3Fcode%3Dabc123')).toBe('https://onda.lunalav.pe/room?code=abc123');
    expect(decode('Per%C3%BA%20%F0%9F%8E%B5')).toBe('Perú 🎵');
  });
  it('preserves malformed bytes while decoding valid sequences without recursive splitting', () => {
    const input = '%FF%C3%A9'.repeat(20000);
    expect(decode(input)).toBe('%FFé'.repeat(20000));
    expect(decode('%G1%C3%A9')).toBe('%G1é');
  });
});
