"use client";

import React from "react";

import {
  matchDemoQuestion,
  type PublicDemoQuestionResult,
} from "../../lib/demo/public-demo-data";
import DemoAgentTaskPreview from "./demo-agent-task-preview";

export default function DemoQuestionPanel({ questions }: { questions: readonly string[] }) {
  const [question, setQuestion] = React.useState("");
  const [submittedQuestion, setSubmittedQuestion] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PublicDemoQuestionResult | null>(null);
  const [validation, setValidation] = React.useState<string | null>(null);

  function submitQuestion(nextQuestion: string) {
    const trimmedQuestion = nextQuestion.trim();

    if (!trimmedQuestion) {
      setValidation("Choose or type a demo question first.");
      return;
    }

    setValidation(null);
    setQuestion(trimmedQuestion);
    setSubmittedQuestion(trimmedQuestion);
    setResult(matchDemoQuestion(trimmedQuestion));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-lg border border-warm-200 bg-white p-4 shadow-warm">
        <h2 className="font-display text-lg font-semibold text-warm-950">Ask Tally</h2>
        <p className="mt-2 text-sm text-warm-600">
          Try a deterministic demo question. No LLM or API call runs here.
        </p>

        <label className="mt-4 block text-sm font-medium text-warm-800" htmlFor="public-demo-question">
          Ask Tally a question
        </label>
        <textarea
          id="public-demo-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="mt-2 min-h-24 w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm text-warm-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          aria-describedby={validation ? "public-demo-question-error" : undefined}
        />
        {validation ? (
          <p id="public-demo-question-error" role="alert" className="mt-2 text-sm font-medium text-red-700">
            {validation}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => submitQuestion(question)}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Ask question
        </button>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Suggested questions</p>
          <div className="mt-2 flex flex-col gap-2">
            {questions.map((suggestedQuestion) => (
              <button
                key={suggestedQuestion}
                type="button"
                onClick={() => submitQuestion(suggestedQuestion)}
                className="rounded-lg border border-warm-200 bg-warm-50 px-3 py-2 text-left text-sm font-medium text-warm-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                {suggestedQuestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-warm-200 bg-white p-4 shadow-warm" aria-live="polite">
        {result ? (
          <div>
            {submittedQuestion ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Question: {submittedQuestion}</p>
            ) : null}
            <p className="mt-2 inline-flex rounded-full bg-warm-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-warm-700">
              {result.kind.replaceAll("_", " ")}
            </p>
            <h2 className="mt-3 font-display text-xl font-semibold text-warm-950">{result.title}</h2>
            <p className="mt-2 text-sm text-warm-700">{result.summary}</p>
            {result.limitation ? <p className="mt-2 text-sm text-warm-500">{result.limitation}</p> : null}
            {result.metrics ? (
              <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {result.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-warm-200 bg-warm-50 p-3">
                    <dt className="text-xs font-medium text-warm-500">{metric.label}</dt>
                    <dd className="mt-1 font-display text-lg font-semibold text-warm-950">{metric.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {result.task && result.agentPreview ? (
              <div className="mt-4">
                <DemoAgentTaskPreview task={result.task} agentPreview={result.agentPreview} />
              </div>
            ) : null}
            {result.task && !result.agentPreview ? (
              <div className="mt-4 rounded-lg border border-warm-200 bg-warm-50 p-4">
                <h3 className="font-display text-base font-semibold text-warm-950">{result.task.title}</h3>
                <p className="mt-2 font-mono text-sm text-brand-700">{result.task.eventName}</p>
                <p className="mt-2 text-sm text-warm-700">{result.task.why}</p>
              </div>
            ) : null}
            {result.suggestedQuestions ? (
              <ul className="mt-4 space-y-1 text-sm text-warm-700">
                {result.suggestedQuestions.map((suggestedQuestion) => (
                  <li key={suggestedQuestion}>- {suggestedQuestion}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div>
            <h2 className="font-display text-xl font-semibold text-warm-950">Ask a question about Acme Forms</h2>
            <p className="mt-2 text-sm text-warm-600">
              Tally answers from available analytics, then shows the task an agent would receive when tracking is missing.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
