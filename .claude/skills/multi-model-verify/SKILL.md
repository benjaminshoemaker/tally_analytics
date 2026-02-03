---
name: multi-model-verify
description: Cross-model verification using OpenAI Codex as a second opinion. Reusable building block for specs, plans, code review, and other verification tasks.
allowed-tools: Bash, Read, Glob, Grep, Write
---

# Multi-Model Verify

Invoke OpenAI Codex CLI to provide a second-opinion verification on any artifact. This skill is a **reusable building block** designed to be invoked by other skills.

## When to Use

This skill is invoked by other skills when cross-model verification adds value:
- After generating specifications (technical spec, feature spec)
- After generating execution plans
- During phase checkpoints (reviewing completed work)
- When verification requires current documentation research

## Prerequisites

- Codex CLI installed (`codex --version` works)
- Valid OpenAI authentication (`codex login status` shows authenticated)

## Input Parameters

When invoking this skill, the caller provides:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `artifact_type` | Yes | Type: `spec`, `plan`, `code`, `config`, `custom` |
| `artifact_path` | Yes | Path to the file(s) being verified |
| `verification_focus` | No | Specific areas to focus on (e.g., "security", "completeness") |
| `upstream_context` | No | Path to upstream documents for context preservation check |
| `research_topics` | No | Technologies/APIs Codex should research before verifying |

## Workflow

```
Multi-Model Verify Progress:
- [ ] Step 1: Validate prerequisites
- [ ] Step 2: Gather artifact context
- [ ] Step 3: Build verification prompt
- [ ] Step 4: Invoke Codex
- [ ] Step 5: Parse and structure results
- [ ] Step 6: Return findings to caller
```

## Step 1: Validate Prerequisites

### Check if Running Inside Codex

```bash
# Codex sets CODEX_SANDBOX when running
if [ -n "$CODEX_SANDBOX" ]; then
  echo "RUNNING_IN_CODEX"
fi
```

**If running inside Codex CLI:**
```
MULTI-MODEL-VERIFY: SKIPPED
===========================
Reason: Already running inside Codex CLI.

Cross-model verification requires a different model.
When running in Codex, Claude would review instead (not implemented yet).

Continuing without cross-model verification.
```

Return `status: skipped`, reason: "running_in_codex". Do NOT block the parent workflow.

**Note:** The purpose of cross-model verification is to get a *different* model's perspective. Codex reviewing Codex provides no cross-model benefit.

### Check Codex CLI Available

```bash
# Check Codex CLI installed
codex --version

# Check authentication status
codex login status
```

**If Codex CLI not installed:**
```
MULTI-MODEL-VERIFY: SKIPPED
===========================
Reason: Codex CLI not installed.

Install: https://github.com/openai/codex
Then run: codex login

Continuing without cross-model verification.
```

**If not authenticated:**
```
MULTI-MODEL-VERIFY: SKIPPED
===========================
Reason: Codex CLI not authenticated.

Run: codex login

Continuing without cross-model verification.
```

Return `status: skipped` to caller. Do NOT block the parent workflow.

### Read Configuration

Read `.claude/settings.local.json` for settings:

```bash
# Extract config (example using jq)
CODEX_MODEL=$(jq -r '.multiModelVerify.codexModel // "o3"' .claude/settings.local.json 2>/dev/null || echo "o3")
TIMEOUT_MINS=$(jq -r '.multiModelVerify.timeoutMinutes // 10' .claude/settings.local.json 2>/dev/null || echo "10")
```

If `multiModelVerify.enabled` is explicitly `false`, return `status: disabled`.

## Step 2: Gather Artifact Context

Based on `artifact_type`, collect relevant context:

### For `spec` artifacts:
- Read the specification document
- If `upstream_context` provided, read upstream docs
- Extract key sections: requirements, constraints, decisions

### For `plan` artifacts:
- Read the execution plan
- Count phases, tasks, acceptance criteria
- Note any referenced specifications

### For `code` artifacts:
- Get git diff or file contents
- Identify changed files and their purposes
- Note the tech stack from package files

### For `config` artifacts:
- Read the configuration file
- Identify the tool/service it configures

### For `custom` artifacts:
- Read the specified file(s)
- Use caller-provided context

## Step 3: Build Verification Prompt

Write a prompt file to the scratchpad directory:

```markdown
# Cross-Model Verification Request

## Pre-Verification Research (REQUIRED)

Before verifying, research the following:

{For each item in research_topics}
- **{topic}**: Find current official documentation and best practices

{If artifact_type is 'spec' or 'plan'}
- **Project patterns**: Review any CLAUDE.md, AGENTS.md, or coding standards

## Artifact Under Review

Type: {artifact_type}
Path: {artifact_path}

{If upstream_context provided}
## Upstream Context

This artifact should preserve requirements from:
- {upstream_context}

Check that nothing important was lost in translation.
{/If}

## Verification Focus

{If verification_focus provided}
Focus especially on: {verification_focus}
{Else}
Provide general verification covering:
- Completeness: Are all necessary elements present?
- Correctness: Are there logical errors or inconsistencies?
- Clarity: Is the artifact unambiguous?
- Best Practices: Does it follow established patterns?
{/If}

## Artifact Content

```
{artifact_content}
```

## Instructions

Provide verification findings in this exact format:

```
VERIFICATION FINDINGS
=====================
Artifact: {path}
Status: PASS | PASS_WITH_NOTES | NEEDS_ATTENTION

CRITICAL ISSUES (blocking)
--------------------------
{List issues that must be addressed, or "None"}

RECOMMENDATIONS (non-blocking)
------------------------------
{List suggestions for improvement, or "None"}

POSITIVE FINDINGS
-----------------
{What was done well}

CONTEXT PRESERVATION (if upstream provided)
-------------------------------------------
- Items checked: {N}
- All preserved: Yes/No
- Missing items: {list or "None"}
```

Be specific. Reference line numbers or section names. Prioritize by impact.
```

## Step 4: Invoke Codex

Build the command with configuration:

```bash
cat {prompt_file} | codex exec \
  --model "${CODEX_MODEL}" \
  --sandbox danger-full-access \
  --search \
  -o \
  -
```

**Flags explained:**
- `--model`: Use configured model (default: o3)
- `--sandbox danger-full-access`: Enables network access for documentation research
- `--search`: Enables web search tool for the "research-first" pattern
- `-o` / `--output-last-message`: Returns only the final message (cleaner parsing)
- `-`: Read prompt from stdin

**Important:** Do NOT use `2>&1` — Codex streams progress to stderr and final output to stdout. Merging them corrupts the parseable response.

**Timeout:** Use configured timeout (default: 10 minutes). Codex may need time to research.

**Handle failures:**
- If Codex times out: Return partial output if available
- If Codex errors: Log error, return `status: error`
- If output is malformed: Attempt best-effort parsing

## Step 5: Parse Results

Extract structured findings from Codex output:

```json
{
  "status": "pass | pass_with_notes | needs_attention | error | skipped",
  "critical_issues": [
    {
      "description": "string",
      "location": "string (file:line or section name)",
      "suggestion": "string"
    }
  ],
  "recommendations": [
    {
      "description": "string",
      "location": "string",
      "suggestion": "string"
    }
  ],
  "positive_findings": ["string"],
  "context_preservation": {
    "checked": true | false,
    "items_checked": 0,
    "all_preserved": true | false,
    "missing_items": ["string"]
  },
  "raw_output": "string (full Codex response for debugging)"
}
```

## Step 6: Return to Caller

Return the structured results to the invoking skill. The caller decides how to handle findings:

- **PASS**: No action needed
- **PASS_WITH_NOTES**: Show recommendations, don't block
- **NEEDS_ATTENTION**: Show critical issues, may block depending on caller's policy

## Integration Pattern

Other skills invoke this skill by:

1. **Preparing parameters:**
```
artifact_type: spec
artifact_path: TECHNICAL_SPEC.md
upstream_context: PRODUCT_SPEC.md
research_topics: [Supabase, NextAuth]
verification_focus: completeness, API contracts
```

2. **Invoking the skill** (conceptually - the parent skill orchestrates this)

3. **Processing results:**
```
if result.status == "needs_attention":
    for issue in result.critical_issues:
        # Present to user or add to blockers
elif result.status == "pass_with_notes":
    for rec in result.recommendations:
        # Show as non-blocking notes
```

## Configuration

Read from `.claude/settings.local.json`:

```json
{
  "multiModelVerify": {
    "enabled": true,
    "codexModel": "o3",
    "timeoutMinutes": 10,
    "autoInvokeOn": ["phase-checkpoint", "spec-generation"]
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Set to `false` to disable cross-model verification |
| `codexModel` | `"o3"` | Codex model to use (applied via `--model` flag) |
| `timeoutMinutes` | `10` | Max time to wait for Codex response |
| `autoInvokeOn` | `[]` | Skills that auto-invoke this verification |

**For CI/headless environments:** Set `CODEX_API_KEY` environment variable for authentication without interactive login.

If `multiModelVerify.enabled` is false, skip with `status: disabled`.

## Output Formats

### When invoked standalone

Show full results to user:

```
MULTI-MODEL VERIFICATION COMPLETE
=================================
Artifact: TECHNICAL_SPEC.md
Verified by: Codex (o3)
Status: PASS WITH NOTES

Critical Issues: None

Recommendations:
1. [Section "API Design"] Consider adding rate limiting details
   → Suggestion: Add rate limit headers to response schema

2. [Section "Data Model"] User.email uniqueness not explicitly stated
   → Suggestion: Add unique constraint to schema definition

Positive Findings:
- Clear separation of concerns in architecture
- Comprehensive error handling section
- Good traceability to product requirements

Context Preservation: ✓ All 8 items from PRODUCT_SPEC.md preserved
```

### When invoked by another skill

Return structured JSON for programmatic handling.

## Error Handling

**Codex CLI not found:**
- Return `status: skipped`, reason: "Codex CLI not installed"
- Do NOT block parent workflow

**Codex authentication failed:**
- Return `status: error`, reason: "Authentication failed"
- Suggest: `codex login`

**Codex timeout:**
- Return `status: error`, reason: "Timeout after {N} minutes"
- Include any partial output received

**Malformed Codex output:**
- Attempt best-effort parsing
- Return `status: pass_with_notes` with raw output in recommendations
- Note: "Output parsing incomplete, review raw output"

**Network unavailable:**
- Return `status: error`, reason: "Network required for documentation research"
- Suggest checking connectivity

## Limitations

- **No conversation context**: Codex starts fresh, doesn't see chat history
- **Latency**: Codex with research typically takes 2-5 minutes
- **Cost**: Each invocation uses Codex API credits
- **Research quality**: Codex may not find all relevant documentation

## Evaluation Best Practices

For reliable multi-model verification, follow these patterns:

### Rubric-First Approach

Define clear evaluation criteria in the prompt before asking for verification. The prompt template in Step 3 uses structured categories (Completeness, Correctness, Clarity, Best Practices) as a rubric.

### Severity Classification

Use consistent severity levels:
- **CRITICAL**: Blocks progress, must be addressed
- **RECOMMENDATION**: Should be considered, doesn't block
- **POSITIVE**: Reinforces good patterns

This aligns with [OpenAI's evaluation best practices](https://platform.openai.com/docs/guides/evaluation-best-practices) for LLM-as-judge patterns.

### Handling Model Disagreement

When Claude and Codex disagree, follow these guidelines:

| Scenario | Action |
|----------|--------|
| **Both agree: PASS** | High confidence, proceed |
| **Both agree: NEEDS_ATTENTION** | High confidence, address issues |
| **Claude: PASS, Codex: NEEDS_ATTENTION** | Review Codex's specific findings — it may have researched current docs |
| **Claude: NEEDS_ATTENTION, Codex: PASS** | Trust Claude's context awareness, but note the disagreement |
| **Conflicting critical issues** | Present both perspectives to user for decision |

**Disagreement signals:**
- If models disagree on >50% of findings, flag for human review
- If one model finds critical issues the other missed, always surface them
- Never silently discard findings from either model

**Resolution strategies:**
1. **Union approach** (default): Surface all unique findings from both models
2. **Intersection approach**: Only flag issues both models identified (higher precision, lower recall)
3. **Weighted approach**: Weight findings by model strength (e.g., Codex for current docs, Claude for context)

**When in doubt:** Present disagreements to the user with context from both models. The goal is catching blind spots, not achieving false consensus.

## Portability Note

This skill uses the `.claude/skills/` directory structure with `allowed-tools` in YAML frontmatter, which is a convention in this toolkit.

For reference, official Claude Code documentation describes:
- Custom slash commands in `.claude/commands/`
- Subagents in `.claude/agents/` with `tools` field

See [Anthropic's slash commands documentation](https://docs.anthropic.com/en/docs/claude-code/slash-commands) for the official format.

## Example Invocations

### From /spec-verification
```
Invoke multi-model-verify with:
  artifact_type: spec
  artifact_path: TECHNICAL_SPEC.md
  upstream_context: PRODUCT_SPEC.md
  verification_focus: context preservation, completeness
```

### From /phase-checkpoint
```
Invoke multi-model-verify with:
  artifact_type: code
  artifact_path: (git diff of phase branch)
  research_topics: (technologies used in this phase)
  verification_focus: correctness, best practices, security
```

### From /generate-plan
```
Invoke multi-model-verify with:
  artifact_type: plan
  artifact_path: EXECUTION_PLAN.md
  upstream_context: TECHNICAL_SPEC.md
  verification_focus: completeness, task sizing, dependencies
```
