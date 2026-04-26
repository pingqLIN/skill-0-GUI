import type { UploadedContextFile } from './intake';
import type { ReviewChecklist } from './skillDocument';

export type DemoReviewPreset = {
  focus: string;
  id: string;
  nextStep: string;
  notes: string[];
  reviewChecklist: ReviewChecklist;
  reviewStatus: 'draft' | 'in_review' | 'changes_requested' | 'approved';
  reviewSummary: string;
  reviewerSignoff: string;
  seedConsistencyRun?: boolean;
  seedPathRun?: boolean;
  seedValidationRun?: boolean;
  title: string;
};

export type DemoScenarioDefinition = {
  artifacts: string;
  body: string;
  cta: string;
  focus: string;
  id: string;
  primaryPath?: string;
  reviewPreset?: DemoReviewPreset;
  skillName?: string;
  text?: string;
  title: string;
  contextFiles?: UploadedContextFile[];
  type: 'server-example' | 'local-bundle';
};
