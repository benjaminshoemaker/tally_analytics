export interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    id: number;
    type: "User" | "Organization";
  };
  repositorySelection: "all" | "selected";
}

export interface GitHubRepository {
  id: number;
  fullName: string;
  name: string;
  owner: {
    login: string;
    id: number;
  };
  private: boolean;
  defaultBranch: string;
}

