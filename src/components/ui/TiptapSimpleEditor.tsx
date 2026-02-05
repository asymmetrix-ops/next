"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

type Props = {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
  minHeightPx?: number;
};

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
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

