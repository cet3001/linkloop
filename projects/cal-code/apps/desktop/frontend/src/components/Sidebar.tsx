import { BrandHeader } from "./BrandHeader";
import { theme } from "../design/theme";

const sections = [
  { title: "Files", icon: "</>", items: ["src/", "apps/", "docs/"] },
  {
    title: "Plugins",
    icon: "+",
    items: ["web_app_plugin", "mobile_app_plugin", "design_system_plugin"],
  },
  { title: "Memory", icon: "M", items: ["Recent Context", "Saved Notes"] },
  { title: "Settings", icon: "S", items: ["General", "Models", "Shortcuts"] },
];

export function Sidebar() {
  return (
    <aside
      className="h-full border-r"
      style={{
        backgroundColor: theme.colors.sidebar,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
      }}
    >
      <BrandHeader />
      <div
        style={{
          padding: theme.spacing.md,
          display: "grid",
          gap: theme.spacing.layout.sectionGap,
        }}
      >
        {sections.map((section) => (
          <section key={section.title}>
            <h2
              className="flex items-center gap-2 text-xs uppercase tracking-wide"
              style={{
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing.xs,
              }}
            >
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] font-semibold"
                style={{
                  borderColor: theme.colors.border,
                  color: theme.colors.accent,
                }}
              >
                {section.icon}
              </span>
              {section.title}
            </h2>
            <ul
              className="text-sm"
              style={{ display: "grid", gap: theme.spacing.xxs }}
            >
              {section.items.map((item) => (
                <li
                  className="cursor-pointer rounded-md border transition-colors"
                  key={item}
                  style={{
                    borderColor: "transparent",
                    color: theme.colors.textPrimary,
                    padding: `${theme.spacing.xxs} ${theme.spacing.xs}`,
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = theme.colors.panel;
                    event.currentTarget.style.borderColor = theme.colors.border;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "transparent";
                    event.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}
