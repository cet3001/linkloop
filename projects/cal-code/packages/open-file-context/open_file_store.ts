import { OpenFileContext } from "./open_file_types";

const context: OpenFileContext = {
  activeFile: "",
  cursorLine: 1,
  openFiles: [],
};

export function setOpenFiles(files: string[]): void {
  context.openFiles = [...new Set(files)];
  if (!context.activeFile && context.openFiles.length > 0) {
    context.activeFile = context.openFiles[0];
  }
}

export function setActiveFile(file: string): void {
  context.activeFile = file;
  if (file && !context.openFiles.includes(file)) {
    context.openFiles = [file, ...context.openFiles];
  }
}

export function setCursorPosition(line: number): void {
  context.cursorLine = Number.isFinite(line) && line > 0 ? Math.floor(line) : 1;
}

export function getOpenFileContext(): OpenFileContext {
  return {
    activeFile: context.activeFile,
    cursorLine: context.cursorLine,
    openFiles: [...context.openFiles],
  };
}
