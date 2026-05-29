type ProjectContextInput = {
  source?: string | null;
  githubRepoFullName?: string | null;
  displayName?: string | null;
  mcpNormalizedGitRemote?: string | null;
  mcpAppRoot?: string | null;
  mcpPackageManager?: string | null;
};

function compactParts(parts: Array<string | null | undefined>): string[] {
  return parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0);
}

export function formatProjectContext(project: ProjectContextInput): string | null {
  if (project.source === "mcp_codex") {
    const parts = compactParts([
      "MCP",
      project.mcpNormalizedGitRemote,
      project.mcpAppRoot && project.mcpAppRoot !== "." ? project.mcpAppRoot : null,
      project.mcpPackageManager,
    ]);
    return parts.length > 1 ? parts.join(" · ") : "MCP";
  }

  if (
    project.source === "github_app" &&
    project.githubRepoFullName &&
    project.githubRepoFullName !== project.displayName
  ) {
    return project.githubRepoFullName;
  }

  return null;
}
