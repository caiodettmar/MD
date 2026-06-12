import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { LinkConfirmDialog } from "../components/LinkConfirmDialog";
import {
  ReferenceDefinitionDialog,
  type ReferenceDefinitionDialogValues,
} from "../components/ReferenceDefinitionDialog";
import { SlashMenu } from "../components/SlashMenu";
import { createEditorExtensions } from "./extensions";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { EditorImageMenu } from "./EditorImageMenu";
import { refreshImageDisplaySrc } from "./markdownImage";
import { useEditorStore } from "../stores/editorStore";
import { insertConfirmedReferenceDefinition } from "./linkReferenceDefinitionUtils";
import { setLinkClickHandler } from "./linkClickGuard";
import {
  setReferenceDefinitionDialogHandler,
  type ReferenceDefinitionDialogRequest,
} from "./referenceDefinitionDialogBridge";
import {
  markdownToUnicodeEmojis,
  unicodeToEmojiShortcodes,
} from "../lib/emojiConvert";

interface MdEditorProps {
  tabId: string;
  documentPath: string | null;
  markdown: string;
  editable: boolean;
  wordWrap: boolean;
  fontSize: number;
  zoom: number;
  isActive: boolean;
  onMarkdownChange: (markdown: string) => void;
  onEditorReady: (tabId: string, editor: Editor | null) => void;
}

async function openExternalLink(href: string) {
  try {
    await openUrl(href);
  } catch {
    window.open(href, "_blank", "noopener,noreferrer");
  }
}

export function MdEditor({
  tabId,
  documentPath,
  markdown,
  editable,
  wordWrap,
  fontSize,
  zoom,
  isActive,
  onMarkdownChange,
  onEditorReady,
}: MdEditorProps) {
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [referenceDefinitionDialog, setReferenceDefinitionDialog] =
    useState<ReferenceDefinitionDialogRequest | null>(null);
  const skipExternalSyncRef = useRef(false);
  const isEditorReadyRef = useRef(false);
  const markdownRef = useRef(markdown);
  const onMarkdownChangeRef = useRef(onMarkdownChange);
  markdownRef.current = markdown;
  onMarkdownChangeRef.current = onMarkdownChange;
  const documentPathRef = useRef(documentPath);
  documentPathRef.current = documentPath;
  const extensions = useMemo(
    () => createEditorExtensions(() => documentPathRef.current),
    [],
  );

  const handleLinkConfirm = useCallback(async (href: string) => {
    setPendingLink(null);
    await openExternalLink(href);
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    setLinkClickHandler((href) => {
      setPendingLink(href);
    });

    setReferenceDefinitionDialogHandler((request) => {
      setReferenceDefinitionDialog(request);
    });

    return () => {
      setLinkClickHandler(null);
      setReferenceDefinitionDialogHandler(null);
    };
  }, [isActive]);

  const editor = useEditor(
    {
      extensions,
      contentType: "markdown",
      editable,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          class: "md-editor-surface",
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor: currentEditor, transaction }) => {
        if (!isEditorReadyRef.current || !transaction.docChanged) {
          return;
        }

        skipExternalSyncRef.current = true;
        const nextRaw = currentEditor.getMarkdown();
        const next =
          useEditorStore.getState().config.emojiSaveMode === "shortcode"
            ? unicodeToEmojiShortcodes(nextRaw)
            : nextRaw;

        if (next === markdownRef.current) {
          skipExternalSyncRef.current = false;
          return;
        }

        markdownRef.current = next;
        onMarkdownChangeRef.current(next);
      },
    },
    [extensions],
  );

  useEffect(() => {
    isEditorReadyRef.current = false;
  }, [editor, tabId]);

  useEffect(() => {
    onEditorReady(tabId, editor);
    return () => onEditorReady(tabId, null);
  }, [editor, onEditorReady, tabId]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(editable, false);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    const setFindSearchTarget = useEditorStore.getState().setFindSearchTarget;
    const handleFocus = () => setFindSearchTarget("editor");
    editor.on("focus", handleFocus);
    return () => {
      editor.off("focus", handleFocus);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }

    const unicodeMarkdown = markdownToUnicodeEmojis(markdown);
    if (editor.getMarkdown() === unicodeMarkdown) {
      markdownRef.current = markdown;
      isEditorReadyRef.current = true;
      refreshImageDisplaySrc(editor);
      return;
    }

    editor.commands.setContent(unicodeMarkdown, {
      contentType: "markdown",
      emitUpdate: false,
    });
    queueMicrotask(() => {
      if (!editor.isDestroyed) {
        refreshImageDisplaySrc(editor);
      }
    });
    markdownRef.current = markdown;
    isEditorReadyRef.current = true;
  }, [editor, markdown, tabId]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    refreshImageDisplaySrc(editor);
  }, [editor, documentPath]);

  const handleReferenceDefinitionConfirm = useCallback(
    (values: ReferenceDefinitionDialogValues) => {
      if (!editor || !referenceDefinitionDialog) {
        return;
      }

      insertConfirmedReferenceDefinition(editor, {
        id: values.id,
        href: values.href,
        title: values.title || null,
        returnBlockIndex: referenceDefinitionDialog.returnBlockIndex,
      });
      setReferenceDefinitionDialog(null);
    },
    [editor, referenceDefinitionDialog],
  );

  const config = useEditorStore((state) => state.config);
  const contentWidthStyle = useMemo(() => {
    if (config.useMaxWidth === false) {
      return { "--content-width": "100%" } as React.CSSProperties;
    }

    let width = "720px";
    const preset = config.maxWidthPreset || "Default";

    if (preset === "A0") width = "841mm";
    else if (preset === "A1") width = "594mm";
    else if (preset === "A2") width = "420mm";
    else if (preset === "A3") width = "297mm";
    else if (preset === "A4") width = "210mm";
    else if (preset === "A5") width = "148mm";
    else if (preset === "A6") width = "105mm";
    else if (preset === "Letter") width = "8.5in";
    else if (preset === "Legal") width = "8.5in";
    else if (preset === "Custom") {
      const val = config.maxWidthCustomValue ?? 720;
      const unit = config.maxWidthCustomUnit ?? "px";
      width = `${val}${unit}`;
    }

    return { "--content-width": width } as React.CSSProperties;
  }, [
    config.useMaxWidth,
    config.maxWidthPreset,
    config.maxWidthCustomValue,
    config.maxWidthCustomUnit,
  ]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <div
        className={`md-editor-shell ${wordWrap ? "is-wrap" : "is-nowrap"}`}
        style={{
          fontSize: `${fontSize}%`,
          zoom: zoom / 100,
          ...contentWidthStyle,
        }}
      >
        <EditorContent editor={editor} />
        {isActive ? (
          <>
            <EditorBubbleMenu editor={editor} />
            <EditorImageMenu editor={editor} />
            <SlashMenu editor={editor} />
          </>
        ) : null}
      </div>
      <LinkConfirmDialog
        href={pendingLink}
        onCancel={() => setPendingLink(null)}
        onConfirm={handleLinkConfirm}
      />
      <ReferenceDefinitionDialog
        initialId={referenceDefinitionDialog?.id ?? null}
        onCancel={() => setReferenceDefinitionDialog(null)}
        onConfirm={handleReferenceDefinitionConfirm}
      />
    </>
  );
}
