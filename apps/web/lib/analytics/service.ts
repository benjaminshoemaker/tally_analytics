export * from './periods';
export * from './tinybird';
export * from './types';
export * from './urls';

import type {
  AnalyticsProvenance,
  AnalyticsQuerySemantics,
} from './types';
import type { ResolvedAnalyticsDataWindow } from './periods';
import { serializeAnalyticsDataWindow } from './periods';

export function createAnalyticsProvenance(params: {
  projectName: string;
  tool: string;
  semantics: AnalyticsQuerySemantics;
  dataWindow?: ResolvedAnalyticsDataWindow;
  generatedAt?: Date;
}): AnalyticsProvenance {
  return {
    projectName: params.projectName,
    generatedAt: (params.generatedAt ?? new Date()).toISOString(),
    dataWindow: params.dataWindow ? serializeAnalyticsDataWindow(params.dataWindow) : undefined,
    queryBasis: {
      tool: params.tool,
      semantics: params.semantics,
    },
  };
}
