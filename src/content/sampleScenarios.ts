type LocalizedValue = {
  en: string;
  zh: string;
};

type LocalizedSamplePreset = {
  nextStep: LocalizedValue;
  note: LocalizedValue;
  reviewChecklist: {
    diffReviewed: boolean;
    evidenceReady: boolean;
    modeConfirmed: boolean;
    validationReviewed: boolean;
  };
  reviewStatus: 'draft' | 'in_review' | 'changes_requested' | 'approved';
  reviewSummary: LocalizedValue;
  reviewerSignoff: string;
  seedConsistencyRun?: boolean;
  seedPathRun?: boolean;
  seedValidationRun?: boolean;
};

type LocalizedSampleScenario = {
  artifacts: LocalizedValue;
  body: LocalizedValue;
  cta: LocalizedValue;
  focus: LocalizedValue;
  preset: LocalizedSamplePreset;
  title: LocalizedValue;
};

export type SampleScenarioContent = {
  artifacts: string;
  body: string;
  cta: string;
  focus: string;
  id: 'mode-aware' | 'bundle-review' | 'publish-gate';
  preset: {
    nextStep: string;
    note: string;
    reviewChecklist: LocalizedSamplePreset['reviewChecklist'];
    reviewStatus: LocalizedSamplePreset['reviewStatus'];
    reviewSummary: string;
    reviewerSignoff: string;
    seedConsistencyRun?: boolean;
    seedPathRun?: boolean;
    seedValidationRun?: boolean;
  };
  title: string;
};

const sampleScenarioCatalog: Record<SampleScenarioContent['id'], LocalizedSampleScenario> = {
  'mode-aware': {
    title: {
      en: 'Mode overview',
      zh: '模式總覽',
    },
    body: {
      en: 'Inspect parser mode, reviewer checks, and export flow before loading your own material.',
      zh: '先看 parser mode、review checks 與 export flow，再決定是否帶入自己的內容。',
    },
    focus: {
      en: 'First-time reviewers who want to understand the full workspace path.',
      zh: '第一次使用工作台、想先理解完整流程的 reviewer。',
    },
    artifacts: {
      en: 'Review report, SkillDocument JSON, skill export.',
      zh: 'Review report、SkillDocument JSON、skill 匯出。',
    },
    cta: {
      en: 'Open mode overview',
      zh: '開啟模式總覽',
    },
    preset: {
      nextStep: {
        en: 'Confirm the parser mode banner, then export one review report from the sample workspace.',
        zh: '先確認 parser mode 狀態，再從 sample workspace 匯出一份 review report。',
      },
      reviewSummary: {
        en: 'Use the sample run to confirm parser mode visibility before doing a full review.',
        zh: '先用這個樣本確認 parser mode 是否清楚可見，再進入完整審查。',
      },
      note: {
        en: 'Sample note: re-run with the canonical bridge before final approval.',
        zh: '樣本備註：正式核准前，請再用 canonical bridge 重新執行一次。',
      },
      reviewerSignoff: 'sample-reviewer',
      reviewStatus: 'in_review',
      reviewChecklist: {
        modeConfirmed: true,
        validationReviewed: true,
        diffReviewed: false,
        evidenceReady: false,
      },
      seedValidationRun: true,
    },
  },
  'bundle-review': {
    title: {
      en: 'Bundle intake review',
      zh: 'Bundle 匯入審查',
    },
    body: {
      en: 'Load a sample bundle with supporting files so you can inspect references, authority, and evidence gates together.',
      zh: '載入含 supporting files 的 bundle 樣本，一次檢查 references、authority 與 evidence gate。',
    },
    focus: {
      en: 'Bundle review, supporting file resolution, and manifest-oriented findings.',
      zh: 'bundle 審查、supporting file resolution、manifest-oriented findings。',
    },
    artifacts: {
      en: 'Supporting files panel, diff summary, review report.',
      zh: 'supporting files 面板、diff summary、review report。',
    },
    cta: {
      en: 'Open bundle sample',
      zh: '開啟 bundle 樣本',
    },
    preset: {
      nextStep: {
        en: 'Review the supporting files first, then decide whether the last evidence gate can be closed.',
        zh: '先檢查 supporting files，再決定最後一個 evidence gate 是否可以關閉。',
      },
      reviewSummary: {
        en: 'Supporting files still need one more evidence pass before this bundle can move forward.',
        zh: '這個 bundle 還需要完成一輪 supporting files evidence 檢查，才能往下走。',
      },
      note: {
        en: 'Sample note: verify the helper script and references before moving this bundle back to review.',
        zh: '樣本備註：把 bundle 切回 review 前，先確認 helper script 與 references。',
      },
      reviewerSignoff: 'bundle-reviewer',
      reviewStatus: 'changes_requested',
      reviewChecklist: {
        modeConfirmed: true,
        validationReviewed: true,
        diffReviewed: true,
        evidenceReady: false,
      },
      seedValidationRun: true,
      seedConsistencyRun: true,
      seedPathRun: true,
    },
  },
  'publish-gate': {
    title: {
      en: 'Publish approval gate',
      zh: '發佈前核准',
    },
    body: {
      en: 'Walk through a release-oriented sample that emphasizes sign-off gates, summary quality, and export readiness.',
      zh: '走一個 release 樣本，重點看 sign-off gates、summary 品質與 export readiness。',
    },
    focus: {
      en: 'Release sign-off, reviewer checklist, and export readiness.',
      zh: 'release sign-off、reviewer checklist、export readiness。',
    },
    artifacts: {
      en: 'Sign-off checklist, review report, skill export.',
      zh: 'sign-off checklist、review report、skill 匯出。',
    },
    cta: {
      en: 'Open release sample',
      zh: '開啟 release 樣本',
    },
    preset: {
      nextStep: {
        en: 'Export the report and compare it with the release checklist before treating the workspace as approval-ready.',
        zh: '先匯出 report，並和 release checklist 對照，再把這個 workspace 視為可核准狀態。',
      },
      reviewSummary: {
        en: 'This sample shows a release flow where sign-off gates and reviewer summary are already complete.',
        zh: '這個樣本展示的是一條 sign-off gates 與 reviewer summary 都已完成的 release flow。',
      },
      note: {
        en: 'Sample note: use the exported report as the release handoff artifact.',
        zh: '樣本備註：把匯出的 report 當作 release handoff artifact。',
      },
      reviewerSignoff: 'release-reviewer',
      reviewStatus: 'approved',
      reviewChecklist: {
        modeConfirmed: true,
        validationReviewed: true,
        diffReviewed: true,
        evidenceReady: true,
      },
      seedValidationRun: true,
      seedConsistencyRun: true,
    },
  },
};

function isZhLanguage(language: string) {
  return language.toLowerCase().startsWith('zh');
}

function pickLocalizedValue(language: string, value: LocalizedValue) {
  return isZhLanguage(language) ? value.zh : value.en;
}

export function getSampleScenarioContent(language: string): SampleScenarioContent[] {
  return (Object.entries(sampleScenarioCatalog) as Array<[SampleScenarioContent['id'], LocalizedSampleScenario]>).map(([id, scenario]) => ({
    id,
    title: pickLocalizedValue(language, scenario.title),
    body: pickLocalizedValue(language, scenario.body),
    focus: pickLocalizedValue(language, scenario.focus),
    artifacts: pickLocalizedValue(language, scenario.artifacts),
    cta: pickLocalizedValue(language, scenario.cta),
    preset: {
      nextStep: pickLocalizedValue(language, scenario.preset.nextStep),
      reviewSummary: pickLocalizedValue(language, scenario.preset.reviewSummary),
      note: pickLocalizedValue(language, scenario.preset.note),
      reviewerSignoff: scenario.preset.reviewerSignoff,
      reviewStatus: scenario.preset.reviewStatus,
      reviewChecklist: scenario.preset.reviewChecklist,
      seedValidationRun: scenario.preset.seedValidationRun,
      seedConsistencyRun: scenario.preset.seedConsistencyRun,
      seedPathRun: scenario.preset.seedPathRun,
    },
  }));
}
