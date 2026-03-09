import type { CSSProperties } from "react";
import { theme } from "../design/theme";

interface DiffViewerProps {
  diffText: string;
}

function getLineStyle(line: string): CSSProperties {
  if (line.startsWith("+")) {
    return {
      backgroundColor: "rgba(34, 197, 94, 0.16)",
      color: "#bbf7d0",
    };
  }

  if (line.startsWith("-")) {
    return {
      backgroundColor: "rgba(239, 68, 68, 0.16)",
      color: "#fecaca",
    };
  }

  return {
    backgroundColor: "transparent",
    color: theme.colors.textPrimary,
  };
}

export function DiffViewer({ diffText }: DiffViewerProps) {
  const lines = diffText.split(/\r?\n/);

  return (
    <div
      className="rounded border overflow-auto"
      style={{
        borderColor: theme.colors.border,
        backgroundColor: `${theme.colors.background}cc`,
        maxHeight: "220px",
      }}
    >
      {lines.length === 0 || (lines.length === 1 && lines[0] === "") ? (
        <div
          className="text-sm"
          style={{ padding: theme.spacing.sm, color: theme.colors.textSecondary }}
        >
          No diff available.
        </div>
      ) : (
        lines.map((line, index) => (
          <div
            key={`${index}-${line.slice(0, 20)}`}
            style={{
              ...getLineStyle(line),
              fontFamily: theme.typography.editorFontFamily,
              fontSize: "12px",
              lineHeight: 1.5,
              padding: "2px 8px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {line || " "}
          </div>
        ))
      )}
    </div>
  );
}
