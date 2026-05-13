'use client';

import React, { useMemo, useState } from 'react';

import type { AnalyticsTaskDraft } from '../../../lib/analytics/tasks/types';

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{0,99}$/;

type DraftEdits = {
  title: string;
  eventName: string;
  implementationNotes: string;
};

type Props = {
  draft: AnalyticsTaskDraft;
  onConfirm: (edits: DraftEdits) => Promise<void> | void;
  onDismiss: () => void;
  isSubmitting?: boolean;
};

function requiredPropertiesFromDraft(draft: AnalyticsTaskDraft): string[] {
  const schema = draft.propertiesSchema as Record<string, unknown>;
  const required = schema.required;
  if (!Array.isArray(required)) return [];
  return required.filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
}

export default function TaskDraftCard({
  draft,
  onConfirm,
  onDismiss,
  isSubmitting = false,
}: Props) {
  const [title, setTitle] = useState(draft.title);
  const [eventName, setEventName] = useState(draft.eventName);
  const [implementationNotes, setImplementationNotes] = useState(
    draft.implementationGuidance ?? ''
  );

  const requiredProperties = useMemo(() => requiredPropertiesFromDraft(draft), [draft]);
  const titleValid = title.trim().length > 0;
  const eventNameValid = EVENT_NAME_PATTERN.test(eventName.trim().toLowerCase());
  const isValid = titleValid && eventNameValid;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h3 className="text-sm font-semibold text-slate-900">Proposed task</h3>

      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-sm text-slate-700">
          <span>Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Event name</span>
          <input
            type="text"
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-sm"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Implementation notes</span>
          <textarea
            value={implementationNotes}
            onChange={(event) => setImplementationNotes(event.target.value)}
            className="min-h-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {requiredProperties.length > 0 && (
        <p className="mt-2 text-xs text-slate-600">
          Required properties: {requiredProperties.join(', ')}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          data-testid="add-task-to-queue"
          type="button"
          onClick={() =>
            onConfirm({
              title: title.trim(),
              eventName: eventName.trim().toLowerCase(),
              implementationNotes: implementationNotes.trim(),
            })
          }
          disabled={!isValid || isSubmitting}
          className="min-h-11 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Adding…' : 'Add task to queue'}
        </button>
        <button
          data-testid="dismiss-task-draft"
          type="button"
          onClick={onDismiss}
          className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
