function getAlignmentProvider(env = process.env) {
  if (env.USE_MFA_ALIGNMENT === 'true') {
    return 'mfa';
  }

  const provider = String(env.AUDIO_ALIGNMENT_PROVIDER || '').trim().toLowerCase();
  if (provider === 'groq') {
    return 'groq';
  }

  return 'tts';
}

module.exports = {
  getAlignmentProvider,
};
