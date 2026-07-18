const {
  MediaValidationError,
  normalizeCampaignInput,
  mapQualityRun,
  mapQualityAssessment,
  mapQualityFinding,
} = require('../services/mediaCampaignService.js');

describe('LingRoot Media campaign contract', () => {
  const validInput = {
    name: 'Istanbul series',
    topic: 'The seven hills of Istanbul',
    language: 'tr',
    objective: 'education',
    tone: 'educational',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    sceneCount: 4,
    targetDurationSeconds: 60,
    targets: [
      { platform: 'youtube', format: 'vertical_video', hashtags: ['english'] },
      { platform: 'instagram', format: 'vertical_video' },
    ],
  };

  test('normalizes a complete six-level campaign', () => {
    const result = normalizeCampaignInput(validInput);
    expect(result.levels).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    expect(result.targets).toHaveLength(2);
    expect(result.sceneCount).toBe(4);
  });

  test('requires a topic, level and target', () => {
    expect(() => normalizeCampaignInput({ ...validInput, topic: '' })).toThrow(MediaValidationError);
    expect(() => normalizeCampaignInput({ ...validInput, levels: [] })).toThrow(/CEFR/);
    expect(() => normalizeCampaignInput({ ...validInput, targets: [] })).toThrow(/platform/);
  });

  test('accepts a seven-minute high-quality horizontal YouTube campaign', () => {
    const result = normalizeCampaignInput({
      ...validInput,
      sceneCount: 12,
      targetDurationSeconds: 420,
      voiceProfile: 'openai_marin',
      voiceQuality: 'high',
      targets: [{
        platform: 'youtube',
        format: 'horizontal_video',
        title: 'The Seven Hills of Istanbul',
        caption: 'Six CEFR levels, one fascinating topic.',
        hashtags: ['EnglishListening', '#LingRoot'],
        config: { privacyStatus: 'public', categoryId: '27', madeForKids: false },
      }],
    });

    expect(result.targetDurationSeconds).toBe(420);
    expect(result.voiceQuality).toBe('high');
    expect(result.targets[0].format).toBe('horizontal_video');
    expect(result.targets[0].hashtags).toEqual(['EnglishListening', 'LingRoot']);
    expect(result.targets[0].config).toEqual({
      privacyStatus: 'public', categoryId: '27', madeForKids: false,
    });
  });

  test('accepts only full-minute five-to-ten-minute YouTube options', () => {
    for (const targetDurationSeconds of [300, 360, 420, 480, 540, 600]) {
      expect(normalizeCampaignInput({
        ...validInput,
        targetDurationSeconds,
        targets: [{ platform: 'youtube', format: 'horizontal_video' }],
      }).targetDurationSeconds).toBe(targetDurationSeconds);
    }
    expect(() => normalizeCampaignInput({
      ...validInput,
      targetDurationSeconds: 330,
      targets: [{ platform: 'youtube', format: 'horizontal_video' }],
    })).toThrow(/tam dakika/);
  });

  test('rejects unsupported voice quality and long vertical duration', () => {
    expect(() => normalizeCampaignInput({ ...validInput, voiceQuality: 'lossless' })).toThrow(/ses kalitesi/);
    expect(() => normalizeCampaignInput({ ...validInput, targetDurationSeconds: 300 })).toThrow(/Dikey video/);
  });

  test('uses safe YouTube publishing defaults', () => {
    const result = normalizeCampaignInput({
      ...validInput,
      targets: [{ platform: 'youtube', format: 'vertical_video' }],
    });
    expect(result.targets[0].config).toEqual({
      privacyStatus: 'private', categoryId: '27', madeForKids: false,
    });
  });

  test('rejects unsupported YouTube publishing parameters', () => {
    expect(() => normalizeCampaignInput({
      ...validInput,
      targets: [{ platform: 'youtube', config: { privacyStatus: 'unlisted' } }],
    })).toThrow(/gizlilik/);
    expect(() => normalizeCampaignInput({
      ...validInput,
      targets: [{ platform: 'youtube', scheduledAt: '2026-08-01T09:00:00Z' }],
    })).toThrow(/zamanlaması/);
    expect(() => normalizeCampaignInput({
      ...validInput,
      humanApprovalRequired: false,
      targets: [{ platform: 'youtube' }],
    })).toThrow(/insan onayı/);
  });

  test('rejects mixed horizontal and vertical render targets', () => {
    expect(() => normalizeCampaignInput({
      ...validInput,
      sceneCount: 12,
      targetDurationSeconds: 360,
      targets: [
        { platform: 'youtube', format: 'horizontal_video' },
        { platform: 'instagram', format: 'vertical_video' },
      ],
    })).toThrow(/ayrı bir kampanya/);
  });

  test('rejects duplicate and malformed platform targets', () => {
    expect(() => normalizeCampaignInput({
      ...validInput,
      targets: [{ platform: 'youtube' }, { platform: 'youtube' }],
    })).toThrow(/benzersiz/);
    expect(() => normalizeCampaignInput({ ...validInput, targets: [null] })).toThrow(/platform hedefi/);
    expect(() => normalizeCampaignInput({
      ...validInput,
      targets: [{ platform: 'x', hashtags: 'english' }],
    })).toThrow(/Etiketler/);
  });

  test('does not clear omitted fields during a partial update', () => {
    const result = normalizeCampaignInput({ targets: [{ platform: 'tiktok' }] }, { partial: true });
    expect(result.cta).toBeUndefined();
    expect(result.name).toBeUndefined();
  });

  test('maps agent quality records to the admin API contract', () => {
    expect(mapQualityRun({
      id: 'run-1', campaign_id: 'campaign-1', generation_job_id: 'job-1',
      status: 'completed', mode: 'shadow', stage: 'completed', progress: 100,
      rubric_version: 'v1', provider: 'openai', model: 'gpt-5-mini',
      overall_score: '91.5', recommendation: 'accept', summary: 'Ready.',
      dimension_scores: { content: 92 }, usage: { totalTokens: 100 },
      prompt_versions: { content: 'content-v1' }, package_ref: 'file:///tmp/package',
      attempt: 1, max_attempts: 2, worker_id: 'quality-1', error_message: null,
      created_at: 'created', started_at: 'started', finished_at: 'finished', updated_at: 'updated',
    })).toMatchObject({
      id: 'run-1', overallScore: 91.5, dimensionScores: { content: 92 },
      recommendation: 'accept', mode: 'shadow',
    });

    expect(mapQualityAssessment({
      id: 'assessment-1', quality_run_id: 'run-1', agent_type: 'content',
      scope: 'package', level: null, scene_id: null, platform: null,
      score: '93', confidence: '0.82', summary: 'Content is aligned.',
      dimension_scores: { cefr: 94 }, provider: 'openai', model: 'gpt-5-mini',
      prompt_version: 'content-v1', usage: {}, created_at: 'created',
    })).toMatchObject({ score: 93, confidence: 0.82, agentType: 'content' });

    expect(mapQualityFinding({
      id: 'finding-1', quality_run_id: 'run-1', assessment_id: 'assessment-1',
      agent_type: 'visual', severity: 'medium', category: 'composition', scope: 'scene',
      level: null, scene_id: 'scene-2', platform: null, artifact_uri: 'file:///scene-2.png',
      evidence: 'Text is too close to the edge.', suggested_action: 'regenerate_visual',
      auto_fixable: true, status: 'open', created_at: 'created', updated_at: 'updated',
    })).toMatchObject({
      agentType: 'visual', sceneId: 'scene-2', autoFixable: true,
      suggestedAction: 'regenerate_visual',
    });
  });
});
