# Feature Plan Templates

## FEATURE_SPEC.md Template

```markdown
# Feature: {FEATURE_NAME}

## Problem

{Extracted from USER_DESCRIPTION — what problem does this solve?}

## Solution

{Derived from USER_DESCRIPTION + codebase patterns — high-level approach}

## Codebase Context

### Patterns to Follow
{From CODEBASE_CONTEXT — specific patterns this feature should match}

### Related Code
{Files that will be modified or serve as templates}

### Integration Points
{How this connects to existing functionality}

## Scope

### In Scope
- {Core functionality items}

### Out of Scope
- {Explicitly excluded items}
- {Future enhancements that are NOT part of this work}

## Acceptance Criteria

### Functional
- [ ] {User-facing criterion}
- [ ] {User-facing criterion}

### Technical
- [ ] {Code quality criterion}
- [ ] Tests pass
- [ ] No new linting errors
```

## EXECUTION_PLAN.md Template

```markdown
# Execution Plan: {FEATURE_NAME}

## Overview

{2-3 sentence summary of what this accomplishes}

## Codebase Context

### Relevant Existing Code
{From scan — files that will be modified or referenced}

### Patterns to Follow
{Specific patterns from CODEBASE_CONTEXT with file references}

### Integration Points
{Where this feature connects to existing code}

## Phase 1: {Phase Name}

### Setup
- [ ] {Any prerequisite setup}

### Step 1.1: {Logical grouping}

#### Task 1.1.A: {Specific task}

{Brief description of what this task accomplishes}

**Files to modify:**
- `{file path}` — {what changes}

**Acceptance Criteria:**
- [ ] (CODE) {Testable code criterion}
- [ ] (TEST) {Test requirement}

#### Task 1.1.B: {Next task}
...

## Phase 2: {If needed}
...

## Out of Scope

- {Things explicitly not included — prevents scope creep}
```

## Guidelines for Plan Generation

- Use 1-3 phases for simple features, more for complex ones
- Each task should be completable in one focused session
- Reference specific files from codebase scan
- Acceptance criteria must be testable/verifiable
- Include codebase context so agents understand existing patterns
