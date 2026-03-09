export interface ProjectFile {
  path: string;
  name: string;
}

export interface FileContext {
  path: string;
  content: string;
}

export interface ProjectContext {
  files: ProjectFile[];
}
