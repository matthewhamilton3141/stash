import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { EditorView } from "@codemirror/view";
import { languageExtension } from "../languages";
import type { ThemeMode } from "../useTheme";

interface EditorProps {
  value: string;
  language: string;
  mode: ThemeMode;
  onChange: (value: string) => void;
  onPaste?: (text: string) => void;
}

function pasteHandler(onPaste: (text: string) => void) {
  return EditorView.domEventHandlers({
    paste(event) {
      const text = event.clipboardData?.getData("text");
      if (text) onPaste(text);
      return false; // let the default paste proceed
    },
  });
}

// Default (non-token) text is the inverse of the background — never red.
// Syntax highlighting still colors real tokens via the theme above.
const textColor = (mode: ThemeMode) => (mode === "dark" ? "#e6e6e6" : "#1a1a1a");

function baseTheme(mode: ThemeMode) {
  return EditorView.theme({
    "&": { height: "100%", fontSize: "13px" },
    ".cm-scroller": {
      fontFamily:
        "'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace",
      lineHeight: "1.6",
    },
    ".cm-content": { color: textColor(mode) },
  });
}

export default function Editor({
  value,
  language,
  mode,
  onChange,
  onPaste,
}: EditorProps) {
  const extensions = useMemo(() => {
    const base = [languageExtension(language), baseTheme(mode), EditorView.lineWrapping];
    return onPaste ? [...base, pasteHandler(onPaste)] : base;
  }, [language, mode, onPaste]);

  return (
    <CodeMirror
      value={value}
      theme={mode === "dark" ? vscodeDark : vscodeLight}
      extensions={extensions}
      onChange={onChange}
      height="100%"
      style={{ height: "100%" }}
      basicSetup={{ foldGutter: false, highlightActiveLine: true }}
      placeholder="Paste or write your code snippet…"
    />
  );
}
