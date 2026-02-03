# Codebase Scan Details

Scan the codebase to understand structure and patterns, **guided by USER_DESCRIPTION**.

## 4.1 Directory Structure

List top-level directories and key locations:
```bash
ls -la PROJECT_ROOT
ls PROJECT_ROOT/src PROJECT_ROOT/lib PROJECT_ROOT/app 2>/dev/null
```

Note the primary source directory structure.

## 4.2 Technology Detection

Check for project configuration files:
```bash
ls PROJECT_ROOT/package.json PROJECT_ROOT/requirements.txt PROJECT_ROOT/go.mod \
   PROJECT_ROOT/Cargo.toml PROJECT_ROOT/pyproject.toml PROJECT_ROOT/composer.json \
   PROJECT_ROOT/Gemfile PROJECT_ROOT/pom.xml PROJECT_ROOT/build.gradle 2>/dev/null
```

If found, read the main config file to extract:
- Language/runtime version
- Key dependencies
- Framework being used
- Build/test commands

## 4.3 Pattern Discovery (Informed by USER_DESCRIPTION)

Search for code related to what the user wants to build:

```bash
# Search for keywords from USER_DESCRIPTION
grep -r "{keywords}" PROJECT_ROOT/src --include="*.{ext}" -l | head -10
```

For each relevant file found:
- Read the file to understand patterns
- Note naming conventions
- Note file organization patterns
- Note testing approach (if test files found)

Look for patterns that should be followed:
- Component structure (if UI)
- API route patterns (if backend)
- Database access patterns
- Error handling patterns
- Logging patterns

## 4.4 Read Context Documents

Read available context files:

```bash
# Required
cat PROJECT_ROOT/AGENTS.md

# Optional (if exist)
cat PROJECT_ROOT/LEARNINGS.md 2>/dev/null
cat PROJECT_ROOT/TECHNICAL_SPEC.md 2>/dev/null
cat PROJECT_ROOT/PRODUCT_SPEC.md 2>/dev/null
```

## 4.5 Compile Codebase Context

Summarize findings as `CODEBASE_CONTEXT`:
```
CODEBASE CONTEXT
================
Language/Framework: {detected}
Primary source: {src directory}

Patterns to follow:
- {pattern 1 with file reference}
- {pattern 2 with file reference}

Related existing code:
- {file}: {what it does, relevance to feature}

Testing approach: {how tests are structured}
```
