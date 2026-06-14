const { getAlignmentProvider } = require('../../utils/audio/alignmentProvider');

describe('alignmentProvider', () => {
  test('returns mfa when USE_MFA_ALIGNMENT is true regardless of provider', () => {
    expect(getAlignmentProvider({
      USE_MFA_ALIGNMENT: 'true',
      AUDIO_ALIGNMENT_PROVIDER: 'groq',
    })).toBe('mfa');
  });

  test('returns groq when MFA is disabled and provider is groq', () => {
    expect(getAlignmentProvider({
      USE_MFA_ALIGNMENT: 'false',
      AUDIO_ALIGNMENT_PROVIDER: 'groq',
    })).toBe('groq');
  });

  test('returns tts when MFA is disabled and provider is empty', () => {
    expect(getAlignmentProvider({
      USE_MFA_ALIGNMENT: 'false',
      AUDIO_ALIGNMENT_PROVIDER: '',
    })).toBe('tts');
  });
});
