"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorRef } from "react-email-editor";
import { BasicUsersMultiSelect } from "@/components/ui/BasicUsersMultiSelect";
import { authService } from "@/lib/auth";
import type { BasicUserItem } from "@/lib/api";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONTemplate = any;

// Unlayer requires window — load client-side only
const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false });

const XANO_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR";
const EMAIL_CONTENT_URL = `${XANO_BASE}/email_content`;

const UNLAYER_DESIGN_RE = /<!--\s*UNLAYER_DESIGN:([A-Za-z0-9+/=]+)\s*-->/;

function extractDesignFromHtml(html: string): JSONTemplate | null {
  const match = html.match(UNLAYER_DESIGN_RE);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(atob(match[1])) as JSONTemplate;
  } catch {
    return null;
  }
}

function embedDesignInHtml(html: string, design: object): string {
  const comment = `<!-- UNLAYER_DESIGN:${btoa(JSON.stringify(design))} -->`;
  const stripped = html.replace(UNLAYER_DESIGN_RE, "").trim();
  return `${comment}\n${stripped}`;
}

type EntityType = "" | "contributon_email" | "client";

interface Template {
  id: number;
  Headline?: string | null;
  Body?: string | null;
  entity_type?: EntityType | null;
  from_email?: string | null;
  Publication_Date?: unknown;
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("asymmetrix_auth_token");
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function EmailEditorPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const isNew = rawId === "new";
  const templateId = isNew ? null : Number(rawId);

  const editorRef = useRef<EditorRef>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Form fields
  const [headline, setHeadline] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("client");
  const [fromEmail, setFromEmail] = useState("");
  const [existingBody, setExistingBody] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<BasicUserItem[]>([]);
  const apiAuthToken = authService.getToken();

  // Load existing template
  useEffect(() => {
    if (isNew) return;
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${EMAIL_CONTENT_URL}/${templateId}`, {
          headers: { "Content-Type": "application/json", ...authHeaders() },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Template;
        setHeadline(String(data.Headline ?? ""));
        setEntityType(
          data.entity_type === "contributon_email" || data.entity_type === "client"
            ? data.entity_type
            : "client"
        );
        setFromEmail(String(data.from_email ?? ""));
        setExistingBody(String(data.Body ?? ""));
      } catch (err) {
        alert(`Failed to load template: ${err instanceof Error ? err.message : String(err)}`);
        router.push("/admin?tab=emails");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [isNew, templateId, router]);

  // Once both editor and data are ready, load the design
  useEffect(() => {
    if (!editorReady) return;
    if (!isNew && existingBody === null) return; // still loading

    const editor = editorRef.current?.editor;
    if (!editor) return;

    if (existingBody) {
      const design = extractDesignFromHtml(existingBody);
      if (design) {
        editor.loadDesign(design);
        return;
      }
      // No Unlayer design embedded — start with blank template
      // (team will re-build layout; existing HTML is available in HTML source tab)
    }
    editor.loadBlank({ backgroundColor: "#ffffff" });
  }, [editorReady, existingBody, isNew]);

  const handleSave = useCallback(
    async (andSend?: boolean) => {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      editor.exportHtml(async (data) => {
        const { design, html } = data;
        const bodyHtml = embedDesignInHtml(html, design);
        const headlineTrimmed = headline.trim();
        if (!headlineTrimmed) {
          alert("Please enter a subject / headline.");
          return;
        }

        setSaving(true);
        setSaveMsg(null);
        try {
          let savedId: number | null = null;

          if (isNew || !templateId) {
            const res = await fetch(EMAIL_CONTENT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({
                Publication_Date: null,
                Headline: headlineTrimmed,
                Body: bodyHtml,
                entity_type: entityType,
                from_email: fromEmail.trim(),
              }),
            });
            if (!res.ok) throw new Error(`Save failed (${res.status})`);
            const json = await res.json().catch(() => null);
            // Extract new id
            if (json && typeof json === "object") {
              savedId =
                (json as { id?: number }).id ??
                (json as { email_content_id?: number }).email_content_id ??
                null;
            }
          } else {
            const res = await fetch(`${EMAIL_CONTENT_URL}/${templateId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({
                email_content_id: templateId,
                Publication_Date: null,
                Headline: headlineTrimmed,
                Body: bodyHtml,
                entity_type: entityType,
                from_email: fromEmail.trim(),
              }),
            });
            if (!res.ok) throw new Error(`Save failed (${res.status})`);
            savedId = templateId;
          }

          if (andSend && savedId) {
            const sendRes = await fetch(`${XANO_BASE}/send_email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({
                email_from: fromEmail.trim() || null,
                email_content_id: savedId,
                emails_to: recipients.map((u) => u.email.trim()).filter(Boolean),
              }),
            });
            if (!sendRes.ok) {
              const t = await sendRes.text().catch(() => "");
              throw new Error(`Send failed (${sendRes.status}): ${t}`);
            }
            setSaveMsg(`Saved & sent to ${recipients.length || "all"} recipient(s).`);
          } else {
            setSaveMsg("Saved.");
            if (isNew && savedId) {
              router.replace(`/admin/email-editor/${savedId}`);
            }
          }
        } catch (err) {
          alert(err instanceof Error ? err.message : "An error occurred");
        } finally {
          setSaving(false);
          setTimeout(() => setSaveMsg(null), 3000);
        }
      });
    },
    [headline, entityType, fromEmail, recipients, isNew, templateId, router]
  );

  const projectId = Number(process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID ?? "0") || undefined;

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b bg-white px-4 py-2.5 shadow-sm">
        <Link
          href="/admin?tab=emails"
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          ← Back
        </Link>

        <div className="h-5 w-px bg-gray-200" />

        <input
          type="text"
          placeholder="Subject / Headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className="h-9 w-72 rounded border border-gray-300 px-3 text-sm focus:border-blue-400 focus:outline-none"
        />

        <select
          value={entityType}
          onChange={(e) =>
            setEntityType(
              e.target.value === "contributon_email" || e.target.value === "client"
                ? e.target.value
                : "client"
            )
          }
          className="h-9 rounded border border-gray-300 px-2 text-sm focus:outline-none"
        >
          <option value="client">client</option>
          <option value="contributon_email">contributon_email</option>
        </select>

        <input
          type="email"
          placeholder="From email (optional)"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          className="h-9 w-64 rounded border border-gray-300 px-3 text-sm focus:border-blue-400 focus:outline-none"
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {saveMsg && (
            <span className="text-sm text-green-600">{saveMsg}</span>
          )}

          {/* Recipients picker */}
          <div className="w-64">
            <BasicUsersMultiSelect
              token={apiAuthToken}
              value={recipients}
              onChange={setRecipients}
              label="Recipients"
            />
          </div>

          <button
            type="button"
            disabled={saving || !editorReady}
            onClick={() => void handleSave(false)}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={saving || !editorReady || recipients.length === 0}
            title={recipients.length === 0 ? "Select at least one recipient" : `Send to ${recipients.length} recipient(s)`}
            onClick={() => void handleSave(true)}
            className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Sending…" : "Save & Send"}
          </button>
        </div>
      </header>

      {/* Editor body */}
      <div className="relative min-h-0 flex-1">
        {(loading) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="text-sm text-gray-500">Loading template…</div>
          </div>
        )}
        <EmailEditor
          ref={editorRef}
          projectId={projectId}
          style={{ height: "100%" }}
          options={{
            displayMode: "email",
            features: {
              imageEditor: true,
              stockImages: false,
            },
            appearance: {
              theme: "light",
              panels: { tools: { dock: "right" } },
            },
          }}
          onReady={() => setEditorReady(true)}
        />
      </div>
    </div>
  );
}
