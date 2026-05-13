'use client';

import React from 'react';

import type { AnalyticsTaskRecord } from '../../../lib/analytics/tasks/types';
import TaskStatusBadge from './task-status-badge';

type Props = {
  tasks: AnalyticsTaskRecord[];
  onDeletePending?: (taskId: string) => Promise<void> | void;
  onArchive?: (taskId: string) => Promise<void> | void;
  onReopen?: (taskId: string) => Promise<void> | void;
  isMutating?: boolean;
};

function statusDetail(task: AnalyticsTaskRecord): string | null {
  if (task.status === 'implemented_locally') {
    return 'Local implementation was reported. Waiting for production verification.';
  }
  if (task.status === 'awaiting_deploy') {
    return task.lastError ?? 'Waiting for matching production telemetry.';
  }
  if (task.status === 'verified') {
    return 'Verified from production telemetry.';
  }
  if (task.status === 'failed') {
    return task.lastError ?? 'Implementation failed. Reopen after fixing the issue.';
  }
  return null;
}

export default function PendingTaskList({
  tasks,
  onDeletePending,
  onArchive,
  onReopen,
  isMutating = false,
}: Props) {
  if (tasks.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Agent task queue</h3>
        <p className="mt-1 text-sm text-slate-600">
          No tasks yet. Ask Tally for a metric that is not tracked, then confirm the draft before
          agents act on it.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Agent task queue</h3>
      <ul className="mt-3 grid gap-2">
        {tasks.map((task) => {
          const detail = statusDetail(task);
          return (
            <li key={task.id} className="rounded-md border border-slate-200 p-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{task.title}</p>
                  <p className="text-xs text-slate-600">{task.eventName}</p>
                  {detail && <p className="mt-1 text-xs text-slate-600">{detail}</p>}
                </div>
                <TaskStatusBadge status={task.status} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                {task.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onDeletePending?.(task.id)}
                    disabled={isMutating}
                    className="min-h-11 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}

                {task.status === 'failed' && (
                  <button
                    type="button"
                    onClick={() => onReopen?.(task.id)}
                    disabled={isMutating}
                    className="min-h-11 rounded-md border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 disabled:opacity-50"
                  >
                    Reopen
                  </button>
                )}

                {task.status !== 'pending' && task.status !== 'archived' && (
                  <button
                    type="button"
                    onClick={() => onArchive?.(task.id)}
                    disabled={isMutating}
                    className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                  >
                    Archive
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
