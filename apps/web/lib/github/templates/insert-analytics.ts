function hasNamedImport(content: string, identifier: string): boolean {
  const pattern = new RegExp(String.raw`^import\s+\{[^}]*\b${identifier}\b[^}]*\}\s+from\s+['"][^'"]+['"]\s*;?\s*$`, "m");
  return pattern.test(content);
}

function insertNamedImportAtTop(content: string, identifier: string, importPath: string): string {
  if (hasNamedImport(content, identifier)) return content;

  const lines = content.split("\n");
  let insertAt = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (trimmed === "" || trimmed === "'use client';" || trimmed === '"use client";' || trimmed.startsWith("//")) {
      insertAt = i + 1;
      continue;
    }
    if (trimmed.startsWith("import ")) {
      insertAt = i + 1;
      continue;
    }
    break;
  }

  const importLine = `import { ${identifier} } from '${importPath}';`;
  lines.splice(insertAt, 0, importLine);
  return lines.join("\n");
}

export function insertAnalyticsIntoAppRouterLayout(params: {
  content: string;
  importPath: string;
  componentName: string;
}): string {
  let updated = insertNamedImportAtTop(params.content, params.componentName, params.importPath);

  if (updated.includes(`<${params.componentName}`)) return updated;

  const bodyCloseIndex = updated.indexOf("</body>");
  if (bodyCloseIndex === -1) return updated;

  const before = updated.slice(0, bodyCloseIndex);
  const after = updated.slice(bodyCloseIndex);

  const lastNewline = before.lastIndexOf("\n");
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const indentMatch = before.slice(lineStart).match(/^\s*/);
  const indent = indentMatch?.[0] ?? "";

  const insertion = `${indent}<${params.componentName} />\n`;
  updated = `${before}${insertion}${after}`;
  return updated;
}

export function insertAnalyticsIntoPagesRouterApp(params: { content: string; importPath: string; hookName: string }): string {
  let updated = insertNamedImportAtTop(params.content, params.hookName, params.importPath);
  if (updated.includes(`${params.hookName}(`)) return updated;

  const fnMatch = updated.match(/export\s+default\s+function\s+[A-Za-z0-9_]*\s*\([^)]*\)\s*\{/);
  if (fnMatch?.index === undefined) return updated;

  const insertAt = fnMatch.index + fnMatch[0].length;
  const afterBrace = updated.slice(insertAt);
  const indentMatch = afterBrace.match(/^\n(\s*)/);
  const indent = indentMatch?.[1] ?? "  ";

  const insertion = `\n${indent}${params.hookName}();`;
  updated = `${updated.slice(0, insertAt)}${insertion}${updated.slice(insertAt)}`;
  return updated;
}
