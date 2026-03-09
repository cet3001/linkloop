import { ChatPanel } from "./components/ChatPanel";
import { EditorPanel } from "./components/EditorPanel";
import { InspectorPanel } from "./components/InspectorPanel";
import { Sidebar } from "./components/Sidebar";
import { theme } from "./design/theme";

export default function App() {
  return (
    <div
      className="h-screen"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.uiFontFamily,
      }}
    >
      <main className="flex h-full min-h-0">
        <div className="shrink-0" style={{ width: theme.spacing.layout.sidebarWidth }}>
          <Sidebar />
        </div>
        <div className="min-w-0 flex-1">
          <EditorPanel />
        </div>
        <div className="shrink-0" style={{ width: theme.spacing.layout.chatWidth }}>
          <ChatPanel />
        </div>
        <div className="shrink-0" style={{ width: "300px" }}>
          <InspectorPanel />
        </div>
      </main>
    </div>
  );
}
