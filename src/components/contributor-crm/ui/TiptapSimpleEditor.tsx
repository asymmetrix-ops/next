"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { toast } from "react-hot-toast";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import { trimTrailingEmptyBlocks } from "@/lib/contributorCrm/email";

function Toolbar({
  editor,
  onUploadImage,
  onImageClick,
  imageUploading,
}: {
  editor: Editor | null;
  onUploadImage?: (file: File) => Promise<string>;
  onImageClick: () => void;
  imageUploading: boolean;
}) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[#2a2a2a] pb-2 mb-2">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="rounded px-2 py-1 text-xs bg-[#2a2a2a] text-[#e8e8e8] hover:bg-[#333] disabled:opacity-50"
        disabled={!editor.can().chain().focus().toggleBold().run()}
      >
        Bold
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="rounded px-2 py-1 text-xs bg-[#2a2a2a] text-[#e8e8e8] hover:bg-[#333] disabled:opacity-50"
        disabled={!editor.can().chain().focus().toggleItalic().run()}
      >
        Italic
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="rounded px-2 py-1 text-xs bg-[#2a2a2a] text-[#e8e8e8] hover:bg-[#333]"
      >
        List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="rounded px-2 py-1 text-xs bg-[#2a2a2a] text-[#e8e8e8] hover:bg-[#333]"
      >
        Numbered
      </button>
      <button
        type="button"
        onClick={() => {
          const existingHref = editor.getAttributes("link").href as string | undefined;

          if (existingHref) {
            const newHref = window.prompt("Edit URL (clear to remove link):", existingHref);
            if (newHref === null) return;
            if (!newHref.trim()) {
              editor.chain().focus().unsetLink().run();
            } else {
              editor.chain().focus().setLink({ href: newHref.trim() }).run();
            }
            return;
          }

          const url = window.prompt("Enter URL:", "https://");
          if (!url?.trim()) return;

          if (editor.state.selection.empty) {
            const text = window.prompt("Link text (leave blank to use URL):") ?? "";
            const displayText = text.trim() || url.trim();
            editor
              .chain()
              .focus()
              .insertContent({
                type: "text",
                text: displayText,
                marks: [{ type: "link", attrs: { href: url.trim() } }],
              })
              .run();
          } else {
            editor.chain().focus().setLink({ href: url.trim() }).run();
          }
        }}
        className="rounded px-2 py-1 text-xs bg-[#2a2a2a] text-[#e8e8e8] hover:bg-[#333]"
        title="Select text then click to add a link, or click to insert a new link"
      >
        {editor.isActive("link") ? "Edit link" : "Link"}
      </button>
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 2, cols: 3 }).run()
        }
        className="rounded px-2 py-1 text-xs bg-[#2a2a2a] text-[#e8e8e8] hover:bg-[#333]"
      >
        Table
      </button>
      <button
        type="button"
        onClick={onImageClick}
        disabled={imageUploading}
        className="rounded px-2 py-1 text-xs bg-[#2a2a2a] text-[#e8e8e8] hover:bg-[#333] disabled:opacity-50 disabled:cursor-wait"
        title={
          onUploadImage
            ? "Upload image (or paste / drag & drop into the editor)"
            : "Insert image by URL"
        }
      >
        {imageUploading ? "Uploading…" : onUploadImage ? "Upload image" : "Image"}
      </button>
    </div>
  );
}

export type TiptapSimpleEditorProps = {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
  minHeightPx?: number;
};

export function TiptapSimpleEditor({
  valueHtml,
  onChangeHtml,
  onUploadImage,
  placeholder = "Write content...",
  minHeightPx = 300,
}: TiptapSimpleEditorProps) {
  const onChangeRef = useRef(onChangeHtml);
  onChangeRef.current = onChangeHtml;
  const [imageUploading, setImageUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "max-w-full h-auto rounded" },
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "email-data-table" } }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: valueHtml,
    editorProps: {},
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (valueHtml !== current && !editor.isFocused) {
      editor.commands.setContent(valueHtml, { emitUpdate: false });
    }
  }, [editor, valueHtml]);

  useEffect(() => {
    if (!editor) return;
    const h = () => onChangeRef.current(editor.getHTML());
    editor.on("update", h);
    return () => {
      editor.off("update", h);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const trimOnBlur = () => {
      const current = editor.getHTML();
      const trimmed = trimTrailingEmptyBlocks(current);
      if (trimmed !== current) {
        editor.commands.setContent(trimmed, { emitUpdate: true });
      }
    };
    editor.on("blur", trimOnBlur);
    return () => {
      editor.off("blur", trimOnBlur);
    };
  }, [editor]);

  const handleImageInput = useCallback(() => {
    if (!onUploadImage) {
      const url = window.prompt("Image URL");
      if (url) editor?.chain().focus().setImage({ src: url }).run();
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = false;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        setImageUploading(true);
        onUploadImage(file)
          .then((url) => {
            editor?.chain().focus().setImage({ src: url }).run();
            toast.success("Image uploaded");
          })
          .catch(() => {
            toast.error("Image upload failed");
          })
          .finally(() => setImageUploading(false));
      }
    };
    input.click();
  }, [editor, onUploadImage]);

  useEffect(() => {
    if (!editor || !onUploadImage) return;
    const handleDrop = (view: unknown, event: DragEvent) => {
      const file = event.dataTransfer?.files?.[0];
      if (file?.type.startsWith("image/")) {
        event.preventDefault();
        setImageUploading(true);
        onUploadImage(file)
          .then((url) => editor.chain().focus().setImage({ src: url }).run())
          .then(() => toast.success("Image uploaded"))
          .catch(() => toast.error("Image upload failed"))
          .finally(() => setImageUploading(false));
        return true;
      }
      return false;
    };
    const handlePaste = (view: unknown, event: ClipboardEvent) => {
      const file = event.clipboardData?.files?.[0];
      if (file?.type.startsWith("image/")) {
        event.preventDefault();
        setImageUploading(true);
        onUploadImage(file)
          .then((url) => editor.chain().focus().setImage({ src: url }).run())
          .then(() => toast.success("Image uploaded"))
          .catch(() => toast.error("Image upload failed"))
          .finally(() => setImageUploading(false));
        return true;
      }
      return false;
    };
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        handleDrop,
        handlePaste,
      },
    });
  }, [editor, onUploadImage]);

  return (
    <div className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-3">
      <Toolbar
        editor={editor}
        onUploadImage={onUploadImage}
        onImageClick={handleImageInput}
        imageUploading={imageUploading}
      />
      <div className="relative">
        <EditorContent
          editor={editor}
          style={{ minHeight: minHeightPx }}
          className="prose prose-invert prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:text-[#e8e8e8] [&_.ProseMirror_p]:my-1 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded"
        />
        {onUploadImage && (
          <p className="mt-2 text-[10px] text-[#555]">
            Paste, drag & drop, or use <strong className="text-[#666]">Upload image</strong> to add
            images. They are uploaded to Xano and inserted by URL.
          </p>
        )}
      </div>
    </div>
  );
}
