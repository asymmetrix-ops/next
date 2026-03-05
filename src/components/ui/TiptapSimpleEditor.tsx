"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { Extension, type CommandProps } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

type Props = {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
  minHeightPx?: number;
};

const INDENT_PX = 24;
const MAX_INDENT_LEVEL = 8;

function parseIndentFromElement(el: HTMLElement): number {
  const attr = el.getAttribute("data-indent");
  if (attr) {
    const n = parseInt(attr, 10);
    if (Number.isFinite(n) && n >= 0) return Math.min(MAX_INDENT_LEVEL, n);
  }
  const style = (el.getAttribute("style") || "").toLowerCase();
  const m =
    style.match(/padding-left\s*:\s*([0-9.]+)px/) ||
    style.match(/margin-left\s*:\s*([0-9.]+)px/);
  if (m?.[1]) {
    const px = Math.max(0, Math.round(parseFloat(m[1])));
    const level = Math.round(px / INDENT_PX);
    if (Number.isFinite(level) && level >= 0) {
      return Math.min(MAX_INDENT_LEVEL, level);
    }
  }
  return 0;
}

const IndentExtension = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => parseIndentFromElement(element as HTMLElement),
            renderHTML: (attributes) => {
              const level = Number(attributes.indent || 0);
              if (!Number.isFinite(level) || level <= 0) return {};
              const clamped = Math.min(MAX_INDENT_LEVEL, Math.max(0, level));
              const px = clamped * INDENT_PX;
              return {
                "data-indent": String(clamped),
                style: `padding-left: ${px}px;`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const updateIndent =
      (delta: number) =>
      () =>
      ({ state, dispatch }: CommandProps) => {
        const { from, to } = state.selection;
        let tr = state.tr;
        let changed = false;

        state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
          if (node.type.name !== "paragraph") return;
          const current =
            typeof node.attrs.indent === "number"
              ? node.attrs.indent
              : Number(node.attrs.indent) || 0;
          const next = Math.min(
            MAX_INDENT_LEVEL,
            Math.max(0, Math.round(current) + delta)
          );
          if (next === current) return;
          tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        });

        if (!changed) return false;
        if (dispatch) dispatch(tr);
        return true;
      };

    return {
      indent: updateIndent(1),
      outdent: updateIndent(-1),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive("bulletList") || this.editor.isActive("orderedList")) {
          return this.editor.commands.sinkListItem("listItem");
        }
        return this.editor.commands.indent();
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("bulletList") || this.editor.isActive("orderedList")) {
          return this.editor.commands.liftListItem("listItem");
        }
        return this.editor.commands.outdent();
      },
    };
  },
});

function ToolbarButton(props: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { label, active, disabled, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "px-2 py-1 text-sm rounded border",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50",
        active ? "bg-gray-100 border-gray-400" : "bg-white border-gray-200",
      ].join(" ")}
      aria-pressed={active ? "true" : "false"}
    >
      {label}
    </button>
  );
}

export default function TiptapSimpleEditor({
  valueHtml,
  onChangeHtml,
  onUploadImage,
  placeholder = "Write…",
  minHeightPx = 420,
}: Props) {
  const lastEmittedHtmlRef = useRef<string | null>(null);
  const applyingExternalRef = useRef(false);

  const extensions = useMemo(() => {
    return [
      StarterKit,
      IndentExtension,
      TableKit.configure({
        table: {
          HTMLAttributes: { class: "border-collapse w-full my-2" },
          resizable: false,
        },
        tableCell: {
          HTMLAttributes: { class: "border border-gray-300 px-2 py-1.5 align-top" },
        },
        tableHeader: {
          HTMLAttributes: { class: "border border-gray-300 px-2 py-1.5 bg-gray-100 font-semibold text-left" },
        },
        tableRow: {
          HTMLAttributes: {},
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { class: "text-blue-600 underline" },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "max-w-full h-auto rounded" },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ];
  }, [placeholder]);

  const editor = useEditor({
    extensions,
    content: valueHtml || "<p></p>",
    onUpdate: ({ editor: ed }) => {
      if (applyingExternalRef.current) return;
      const html = ed.getHTML();
      lastEmittedHtmlRef.current = html;
      onChangeHtml(html);
    },
    editorProps: {
      attributes: {
        class: [
          "prose max-w-none",
          "focus:outline-none",
          "px-3 py-3",
          // Reduce list indentation inside the editor
          "[&_ul]:pl-5 [&_ul]:ml-0 [&_ul]:my-2 [&_ul]:list-outside",
          "[&_ol]:pl-5 [&_ol]:ml-0 [&_ol]:my-2 [&_ol]:list-outside",
          "[&_li]:my-1",
          // Table styling
          "[&_table]:border-collapse [&_table]:w-full [&_table]:my-2",
          "[&_th]:border [&_th]:border-gray-300 [&_th]:px-2 [&_th]:py-1.5 [&_th]:bg-gray-100 [&_th]:font-semibold [&_th]:text-left",
          "[&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top",
        ].join(" "),
        style: `min-height: ${minHeightPx}px;`,
      },
      handlePaste: (_view, event) => {
        const dt = event.clipboardData;
        if (!dt) return false;
        const files = Array.from(dt.files || []);
        const img = files.find((f) => f.type.startsWith("image/"));
        if (!img) return false;
        if (!onUploadImage) return false;
        event.preventDefault();
        void (async () => {
          try {
            const url = await onUploadImage(img);
            editor?.chain().focus().setImage({ src: url }).run();
          } catch (e) {
            alert(e instanceof Error ? e.message : "Image upload failed");
          }
        })();
        return true;
      },
      handleDrop: (_view, event) => {
        const dt = event.dataTransfer;
        if (!dt) return false;
        const files = Array.from(dt.files || []);
        const img = files.find((f) => f.type.startsWith("image/"));
        if (!img) return false;
        if (!onUploadImage) return false;
        event.preventDefault();
        void (async () => {
          try {
            const url = await onUploadImage(img);
            editor?.chain().focus().setImage({ src: url }).run();
          } catch (e) {
            alert(e instanceof Error ? e.message : "Image upload failed");
          }
        })();
        return true;
      },
    },
  });

  // Sync editor content when parent changes (e.g. selecting "Edit Content")
  useEffect(() => {
    if (!editor) return;
    const next = valueHtml || "<p></p>";
    const lastEmitted = lastEmittedHtmlRef.current;
    if (next === lastEmitted) return;
    const current = editor.getHTML();
    if (next === current) return;
    applyingExternalRef.current = true;
    try {
      editor.commands.setContent(next, { emitUpdate: false });
    } finally {
      applyingExternalRef.current = false;
    }
  }, [editor, valueHtml]);

  const canUse = Boolean(editor);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const inTable = Boolean(editor?.isActive("table"));

  // Close table menu when clicking outside
  useEffect(() => {
    if (!tableMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) {
        setTableMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tableMenuOpen]);

  const onInsertLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link")?.href as string | undefined;
    const url = window.prompt("Link URL", prev || "");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  const onInsertImage = async () => {
    if (!editor) return;
    if (!onUploadImage) {
      const src = window.prompt("Image URL");
      if (src?.trim()) editor.chain().focus().setImage({ src: src.trim() }).run();
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const url = await onUploadImage(f);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Image upload failed");
      }
    };
    input.click();
  };

  return (
    <div className="rounded border bg-white">
      <div className="flex flex-wrap gap-2 items-center p-2 border-b bg-gray-50">
        <ToolbarButton
          label="B"
          active={editor?.isActive("bold")}
          disabled={!canUse}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="I"
          active={editor?.isActive("italic")}
          disabled={!canUse}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="H2"
          active={editor?.isActive("heading", { level: 2 })}
          disabled={!canUse}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="Indent"
          disabled={!canUse}
          onClick={() => editor?.chain().focus().indent().run()}
        />
        <ToolbarButton
          label="Outdent"
          disabled={!canUse}
          onClick={() => editor?.chain().focus().outdent().run()}
        />
        <ToolbarButton
          label="• List"
          active={editor?.isActive("bulletList")}
          disabled={!canUse}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="1. List"
          active={editor?.isActive("orderedList")}
          disabled={!canUse}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Link"
          active={editor?.isActive("link")}
          disabled={!canUse}
          onClick={onInsertLink}
        />
        <ToolbarButton
          label="Image"
          disabled={!canUse}
          onClick={() => void onInsertImage()}
        />
        <div className="relative" ref={tableMenuRef}>
          <ToolbarButton
            label="Table ▾"
            active={tableMenuOpen || inTable}
            disabled={!canUse}
            onClick={() => setTableMenuOpen((open) => !open)}
          />
          {tableMenuOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 min-w-[180px] rounded border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                  setTableMenuOpen(false);
                }}
              >
                Insert table (3×3)
              </button>
              {inTable && (
                <>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => { editor?.chain().focus().addRowBefore().run(); setTableMenuOpen(false); }}
                  >
                    Add row above
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => { editor?.chain().focus().addRowAfter().run(); setTableMenuOpen(false); }}
                  >
                    Add row below
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => { editor?.chain().focus().addColumnBefore().run(); setTableMenuOpen(false); }}
                  >
                    Add column left
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => { editor?.chain().focus().addColumnAfter().run(); setTableMenuOpen(false); }}
                  >
                    Add column right
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => { editor?.chain().focus().deleteRow().run(); setTableMenuOpen(false); }}
                  >
                    Delete row
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => { editor?.chain().focus().deleteColumn().run(); setTableMenuOpen(false); }}
                  >
                    Delete column
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 text-red-600"
                    onClick={() => { editor?.chain().focus().deleteTable().run(); setTableMenuOpen(false); }}
                  >
                    Delete table
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => { editor?.chain().focus().toggleHeaderRow().run(); setTableMenuOpen(false); }}
                  >
                    Toggle header row
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => { editor?.chain().focus().mergeOrSplit().run(); setTableMenuOpen(false); }}
                  >
                    Merge / Split cells
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

