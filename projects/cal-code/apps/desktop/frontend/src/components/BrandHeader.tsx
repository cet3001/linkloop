import { theme } from "../design/theme";

export function BrandHeader() {
  return (
    <div
      className="flex items-center border-b"
      style={{
        borderColor: theme.colors.border,
        padding: `${theme.spacing.md} ${theme.spacing.md}`,
        gap: theme.spacing.sm,
      }}
    >
      <div
        className="flex items-center justify-center rounded-md border text-xs font-semibold"
        style={{
          width: "28px",
          height: "28px",
          borderColor: theme.colors.accentSoft,
          color: theme.colors.accent,
          backgroundColor: `${theme.colors.accentSoft}22`,
          fontFamily: theme.typography.editorFontFamily,
        }}
      >
        {"<C>"}
      </div>
      <div>
        <div className="text-sm font-semibold tracking-tight">Cal Code</div>
        <div
          className="text-xs"
          style={{ color: theme.colors.textSecondary, marginTop: "1px" }}
        >
          Local-first AI IDE
        </div>
      </div>
    </div>
  );
}
