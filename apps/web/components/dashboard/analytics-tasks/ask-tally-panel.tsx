'use client';

import React, { useMemo, useState } from 'react';

import {
  useAnalyticsTasks,
  useConfirmAnalyticsTask,
  useDeletePendingAnalyticsTask,
  useMutateAnalyticsTask,
} from '../../../lib/hooks/use-analytics-tasks';
import { useAnalyticsQuestion } from '../../../lib/hooks/use-analytics-question';
import type { AnalyticsQuestionResult } from '../../../lib/analytics/tasks/types';
import AnalyticsQuestionResultCard from './analytics-question-result';
import PendingTaskList from './pending-task-list';
import TaskDraftCard from './task-draft-card';

type Props = {
  projectId: string;
};

export default function AskTallyPanel({ projectId }: Props) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AnalyticsQuestionResult | null>(null);

  const questionMutation = useAnalyticsQuestion(projectId);
  const tasksQuery = useAnalyticsTasks(projectId);
  const confirmMutation = useConfirmAnalyticsTask(projectId);
  const mutateTask = useMutateAnalyticsTask(projectId);
  const deletePendingTask = useDeletePendingAnalyticsTask(projectId);

  const tasks = useMemo(() => tasksQuery.data?.tasks ?? [], [tasksQuery.data]);

  const canAsk = question.trim().length > 0 && !questionMutation.isPending;
  const draft =
    result && (result.kind === 'partial_answer' || result.kind === 'cannot_answer_yet')
      ? result.draft
      : null;

  async function onAsk(): Promise<void> {
    const next = await questionMutation.mutateAsync({
      question: question.trim(),
    });
    setResult(next);
  }

  async function onConfirmDraft(edits: {
    title: string;
    eventName: string;
    implementationNotes: string;
  }): Promise<void> {
    if (!draft) return;
    await confirmMutation.mutateAsync({
      draft,
      edits,
    });
    setResult(null);
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-slate-900">Ask Tally</h2>
        <p className="text-sm text-slate-600">
          Ask about current usage, then confirm before adding any tracking task to the queue.
        </p>
      </div>

      <div className="mt-3 grid gap-2">
        <label htmlFor={`ask-tally-${projectId}`} className="text-sm text-slate-700">
          Question
        </label>
        <textarea
          data-testid="ask-tally-input"
          id={`ask-tally-${projectId}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          placeholder="How many users visited pricing this week?"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAsk}
            disabled={!canAsk}
            className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {questionMutation.isPending ? 'Asking…' : 'Ask'}
          </button>
          {questionMutation.isError && (
            <span className="text-sm text-red-700">
              {(questionMutation.error as Error).message}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <AnalyticsQuestionResultCard result={result} />

        {draft && (
          <TaskDraftCard
            draft={draft}
            onConfirm={onConfirmDraft}
            onDismiss={() => setResult(null)}
            isSubmitting={confirmMutation.isPending}
          />
        )}

        <PendingTaskList
          tasks={tasks}
          isMutating={mutateTask.isPending || deletePendingTask.isPending}
          onDeletePending={async (taskId) => {
            await deletePendingTask.mutateAsync(taskId);
          }}
          onArchive={async (taskId) => {
            await mutateTask.mutateAsync({ taskId, action: { action: 'archive' } });
          }}
          onReopen={async (taskId) => {
            await mutateTask.mutateAsync({ taskId, action: { action: 'reopen' } });
          }}
        />
      </div>
    </section>
  );
}
