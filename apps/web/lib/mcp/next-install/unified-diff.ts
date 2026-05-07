export type UnifiedDiffFileChange = {
  path: string;
  oldContent: string | null;
  newContent: string;
};

function normalizeContent(content: string): string {
  const normalized = content.replace(/\r\n?/g, "\n");
  return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
}

function linesForDiff(content: string): string[] {
  const normalized = normalizeContent(content);
  return normalized.slice(0, -1).split("\n");
}

function hunkRange(start: number, count: number): string {
  return count === 1 ? `${start}` : `${start},${count}`;
}

function renderFileChange(change: UnifiedDiffFileChange): string {
  const oldLines = change.oldContent === null ? [] : linesForDiff(change.oldContent);
  const newLines = linesForDiff(change.newContent);
  const oldPath = change.oldContent === null ? "/dev/null" : `a/${change.path}`;
  const newPath = `b/${change.path}`;
  const oldRange = change.oldContent === null ? "0,0" : hunkRange(1, oldLines.length);
  const newRange = hunkRange(1, newLines.length);
  const header = [
    `diff --git a/${change.path} b/${change.path}`,
    change.oldContent === null ? "new file mode 100644" : null,
    `--- ${oldPath}`,
    `+++ ${newPath}`,
    `@@ -${oldRange} +${newRange} @@`,
  ].filter((line): line is string => line !== null);
  const removed = oldLines.map((line) => `-${line}`);
  const added = newLines.map((line) => `+${line}`);

  return [...header, ...removed, ...added].join("\n");
}

export function unifiedDiff(changes: UnifiedDiffFileChange[]): string {
  return `${changes.map(renderFileChange).join("\n")}\n`;
}
