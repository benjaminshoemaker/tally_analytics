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

const SUGGESTED_QUESTIONS = [
  'Which pages are bringing users to signup?',
  'What should we track next?',
  'How many users visited pricing this month?',
];

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
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
      <div className="rounded-lg border border-brand-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Answers or agent tasks
          </p>
          <h2 className="text-lg font-semibold text-slate-950">Ask Tally</h2>
          <p className="max-w-2xl text-sm text-slate-600">
            Tally generates answers from the events it can already see. If the data is missing, it
            drafts a task your AI agent can pull and implement.
          </p>
        </div>

        <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <span className="mt-1 size-2 rounded-full bg-brand-500" aria-hidden="true" />
            <span>Generate answers on the fly from production analytics.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 size-2 rounded-full bg-brand-500" aria-hidden="true" />
            <span>Create confirmed tasks for AI agents when tracking is missing.</span>
          </li>
        </ul>

        <div className="mt-4 grid gap-2">
          <label htmlFor={`ask-tally-${projectId}`} className="text-sm font-medium text-slate-800">
            Question
          </label>
          <textarea
            data-testid="ask-tally-input"
            id={`ask-tally-${projectId}`}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Which pages are bringing users to signup?"
          />
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setQuestion(suggestion)}
                className="min-h-9 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAsk}
              disabled={!canAsk}
              className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {questionMutation.isPending ? 'Asking...' : 'Ask Tally'}
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
        </div>
      </div>

      <div>
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
