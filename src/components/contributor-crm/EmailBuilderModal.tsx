"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TiptapSimpleEditor } from "@/components/contributor-crm/ui/TiptapSimpleEditor";
import {
  buildBrandedEmailHtml,
  EMAIL_PREVIEW_STORAGE_KEY,
  extractEmbeddedLinks,
  extractInnerContent,
  rewriteCompanyPageUrls,
  sanitizeHtml,
  updateEmbeddedLink,
  type EmailPreviewPayload,
} from "@/lib/contributorCrm/email";
import {
  createCrmEmail,
  createEmailContent,
  getEmailTemplates,
  getUserEmails,
  type EmailTemplateItem,
  type FinMetricsCompanyItem,
  type UserEmailItem,
  updateEmailContent,
  uploadImageToXano,
} from "@/lib/contributorCrm/api";
import { authService, buildContributorEntryPath } from "@/lib/contributorCrm/auth";
import { toast } from "react-hot-toast";
import { SearchableUserEmailSelect } from "@/components/contributor-crm/SearchableUserEmailSelect";

const FROM_EXTRA_OPTIONS: UserEmailItem[] = [
  { name: "Asymmetrix", email: "asymmetrix@asymmetrixintelligence.com" },
];
const DEFAULT_FROM_OPTION = FROM_EXTRA_OPTIONS[0] ?? null;
const ASYMMETRIX_EMAIL_DOMAIN = "@asymmetrixintelligence.com";
const CONTRIBUTOR_PORTAL_URL_TOKEN = "{{contributor_portal_url}}";
const COMPANY_NAME_TOKEN = "{{company_name}}";

function companyName(row: FinMetricsCompanyItem): string {
  return typeof row.company_name === "number"
    ? String(row.company_name)
    : row.company_name;
}

function parseRecipientEmails(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function emailLocalPart(value: string): string {
  return value.trim().split("@")[0].trim();
}

function toAsymmetrixEmail(value: string): string {
  const localPart = emailLocalPart(value);
  return localPart ? `${localPart}${ASYMMETRIX_EMAIL_DOMAIN}` : "";
}

function toAsymmetrixUserSearchQuery(value: string): string {
  return emailLocalPart(value) || ASYMMETRIX_EMAIL_DOMAIN.slice(1);
}

function isAsymmetrixEmail(user: UserEmailItem): boolean {
  return user.email.toLowerCase().endsWith(ASYMMETRIX_EMAIL_DOMAIN);
}

function applyContributionTemplateTokens(
  bodyHtml: string,
  tokens: { companyName: string; contributorPortalUrl: string },
  companyId: number | string
): string {
  const withTokens = bodyHtml
    .split("{{company_name}}")
    .join(tokens.companyName)
    .split("{{contributor_portal_url}}")
    .join(tokens.contributorPortalUrl);
  return rewriteCompanyPageUrls(withTokens, companyId);
}

type EmailBuilderModalProps = {
  row: FinMetricsCompanyItem;
  onClose: () => void;
};

type ContentArticleItem = {
  id: number;
  Headline: string;
  Content_Type: string;
  Publication_Date: string;
};

type ContentArticlesResponse = {
  items: ContentArticleItem[];
  nextPage: number | null;
  curPage: number;
};

export function EmailBuilderModal({ row, onClose }: EmailBuilderModalProps) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [fromUser, setFromUser] = useState<UserEmailItem | null>(DEFAULT_FROM_OPTION);
  const [fromManual, setFromManual] = useState("");
  const [sending, setSending] = useState(false);
  const [singleRecipient, setSingleRecipient] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // ── Insights & Analysis article search ──────────────────────────────────
  const [articleSearch, setArticleSearch] = useState("");
  const [articleResults, setArticleResults] = useState<ContentArticleItem[]>([]);
  const [articlePage, setArticlePage] = useState(1);
  const [articleHasMore, setArticleHasMore] = useState(false);
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleDropdownOpen, setArticleDropdownOpen] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<ContentArticleItem[]>([]);
  const articleDropdownRef = useRef<HTMLDivElement>(null);

  const token = authService.getAuthToken();
  const companyLabel = companyName(row);
  const contributorPortalUrl = useMemo(() => {
    const path = buildContributorEntryPath(row.company_id, { review: true });
    if (typeof window === "undefined") return path;
    return new URL(path, window.location.origin).toString();
  }, [row.company_id]);
  const resolvedBodyHtml = useMemo(
    () =>
      applyContributionTemplateTokens(
        bodyHtml,
        {
          companyName: companyLabel,
          contributorPortalUrl,
        },
        row.company_id
      ),
    [bodyHtml, companyLabel, contributorPortalUrl, row.company_id]
  );
  const embeddedLinks = useMemo(
    () => extractEmbeddedLinks(bodyHtml),
    [bodyHtml]
  );

  const handleUpdateEmbeddedLink = useCallback(
    (index: number, updates: { href?: string; text?: string }) => {
      setBodyHtml((prev) => updateEmbeddedLink(prev, index, updates));
    },
    []
  );

  useEffect(() => {
    if (!token) return;
    getEmailTemplates(token, "contributon_email")
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, [token]);

  const searchArticles = useCallback(async (query: string, page: number, append: boolean) => {
    setArticleLoading(true);
    try {
      const params = new URLSearchParams({
        search_query: query,
        Offset: String(page),
        Per_page: "15",
      });
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles?${params.toString()}`,
        { headers }
      );
      if (!res.ok) throw new Error("Failed to fetch articles");
      const data: ContentArticlesResponse = await res.json();
      setArticleResults((prev) =>
        append ? [...prev, ...(data.items ?? [])] : (data.items ?? [])
      );
      setArticleHasMore(data.nextPage !== null);
      setArticlePage(page);
    } catch {
      if (!append) setArticleResults([]);
    } finally {
      setArticleLoading(false);
    }
  }, [token]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        articleDropdownRef.current &&
        !articleDropdownRef.current.contains(e.target as Node)
      ) {
        setArticleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!articleDropdownOpen) return;
    const timer = setTimeout(() => {
      searchArticles(articleSearch, 1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [articleSearch, articleDropdownOpen, searchArticles]);

  const handleToggleArticle = useCallback((article: ContentArticleItem) => {
    setSelectedArticles((prev) => {
      const exists = prev.some((a) => a.id === article.id);
      return exists ? prev.filter((a) => a.id !== article.id) : [...prev, article];
    });
  }, []);

  const handleInsertArticleLinks = useCallback(() => {
    if (selectedArticles.length === 0) return;
    const linksHtml = selectedArticles
      .map(
        (a) =>
          `<p><a href="https://asymmetrixintelligence.com/insights/${a.id}">${escapeHtml(a.Headline)}</a></p>`
      )
      .join("");
    setBodyHtml((prev) => `${prev}${linksHtml}`);
    toast.success(
      `${selectedArticles.length} report link${selectedArticles.length > 1 ? "s" : ""} inserted`
    );
  }, [selectedArticles]);

  const handleSelectTemplate = useCallback((id: number | "") => {
    setSelectedTemplateId(id);
    if (id === "") return;
    const t = templates.find((x) => x.id === id);
    if (t) {
      if (t.Headline != null) setSubject(t.Headline);
      if (t.Body != null) {
        const raw = extractInnerContent(t.Body);
        setBodyHtml(rewriteCompanyPageUrls(raw, row.company_id));
      }
    }
  }, [templates, row.company_id]);

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      if (!token) throw new Error("Authentication required");
      return uploadImageToXano(token, file);
    },
    [token]
  );

  const buildHtml = useCallback(() => {
    const safe = sanitizeHtml(resolvedBodyHtml);
    const html = buildBrandedEmailHtml({ bodyHtml: safe, subject });
    setGeneratedHtml(html);
    return html;
  }, [resolvedBodyHtml, subject]);

  const handleExportHtml = useCallback(() => {
    buildHtml();
    toast.success("HTML generated");
  }, [buildHtml]);

  const handleCopyHtml = useCallback(() => {
    const html = generatedHtml ?? buildHtml();
    navigator.clipboard.writeText(html).then(
      () => toast.success("HTML copied to clipboard"),
      () => toast.error("Failed to copy")
    );
  }, [generatedHtml, buildHtml]);

  const fromManualEmail = toAsymmetrixEmail(fromManual);
  const fromEmail =
    fromManualEmail || fromUser?.email || "";
  const hasValidFromEmail = isValidEmailAddress(fromEmail);
  const toEmails = parseRecipientEmails(row.key_contact_email);
  const primaryRecipientEmail = toEmails[0] ?? "";
  const handleCopyPortalUrl = useCallback(() => {
    navigator.clipboard.writeText(contributorPortalUrl).then(
      () => toast.success("Review link copied"),
      () => toast.error("Failed to copy link")
    );
  }, [contributorPortalUrl]);

  const handleInsertPortalLink = useCallback(() => {
    const safeUrl = escapeHtml(contributorPortalUrl);
    setBodyHtml(
      (prev) =>
        `${prev}<p><a href="${safeUrl}">Review Asymmetrix\u2019s financial metrics estimate for your company here</a></p>`
    );
    toast.success("Review link inserted");
  }, [contributorPortalUrl]);

  const handlePreview = useCallback(() => {
    if (!subject.trim()) {
      toast.error("Subject is required for preview");
      return;
    }
    const html = generatedHtml ?? buildHtml();
    const payload: EmailPreviewPayload = {
      created_at: Date.now(),
      subject,
      html,
    };
    if (primaryRecipientEmail) {
      payload.to = primaryRecipientEmail;
      payload.toName =
        toEmails.length > 1
          ? `${companyName(row)} (+${toEmails.length - 1} more)`
          : companyName(row);
    } else if (singleRecipient && recipientEmail.trim()) {
      payload.to = recipientEmail.trim();
    }
    if (fromManualEmail) {
      payload.from = fromManualEmail;
      payload.fromName = undefined;
    } else if (fromUser) {
      payload.from = fromUser.email;
      payload.fromName = fromUser.name;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(EMAIL_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
      window.open("/email/preview", "_blank");
    }
  }, [
    subject,
    primaryRecipientEmail,
    row,
    fromUser,
    fromManualEmail,
    singleRecipient,
    recipientEmail,
    generatedHtml,
    buildHtml,
    toEmails.length,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!fromEmail) {
      toast.error("Invalid FROM email address entered");
      return;
    }
    if (!hasValidFromEmail) {
      toast.error("Invalid FROM email address entered");
      return;
    }
    if (toEmails.length === 0) {
      toast.error("Company contact email is required");
      return;
    }
    const safe = sanitizeHtml(resolvedBodyHtml);
    const body = buildBrandedEmailHtml({ bodyHtml: safe, subject });
    try {
      const created = await createEmailContent(token, {
        Headline: subject,
        Body: body,
        Publication_Date: null,
        entity_type: "contributon_email",
      });
      await createCrmEmail(token, {
        from: fromEmail,
        to: toEmails,
        email_content_id: created.id,
        new_company_id: row.company_id,
        ...(selectedArticles.length > 0 && {
          content_ids: selectedArticles.map((a) => a.id),
        }),
      });
      toast.success("Email template created and sent");
      onClose();
    } catch (e) {
      toast.error(
        (e as Error).message ?? "Failed to create template and send email"
      );
    }
  }, [
    token,
    subject,
    fromEmail,
    hasValidFromEmail,
    toEmails,
    resolvedBodyHtml,
    row.company_id,
    selectedArticles,
    onClose,
  ]);

  const handleSave = useCallback(async () => {
    if (!token || selectedTemplateId === "") {
      toast.error("Select a template to update");
      return;
    }
    // Save raw body (tokens intact) so the template stays reusable across companies.
    const safe = sanitizeHtml(bodyHtml);
    const body = buildBrandedEmailHtml({ bodyHtml: safe, subject });
    try {
      await updateEmailContent(token, selectedTemplateId as number, {
        Headline: subject,
        Body: body,
        Publication_Date: undefined,
      });
      toast.success("Template saved");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to save template");
    }
  }, [token, selectedTemplateId, subject, bodyHtml, onClose]);

  const handleSendEmail = useCallback(async () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!fromEmail) {
      toast.error("Invalid FROM email address entered");
      return;
    }
    if (!hasValidFromEmail) {
      toast.error("Invalid FROM email address entered");
      return;
    }
    if (toEmails.length === 0) {
      toast.error("Company contact email is required");
      return;
    }
    setSending(true);
    try {
      const resolvedSafe = sanitizeHtml(resolvedBodyHtml);
      const resolvedBody = buildBrandedEmailHtml({ bodyHtml: resolvedSafe, subject });
      let emailContentId: number;
      if (selectedTemplateId !== "") {
        // Keep the template's tokens intact — save raw body to the template record.
        const rawSafe = sanitizeHtml(bodyHtml);
        const rawBody = buildBrandedEmailHtml({ bodyHtml: rawSafe, subject });
        await updateEmailContent(token, selectedTemplateId as number, {
          Headline: subject,
          Body: rawBody,
          Publication_Date: undefined,
        });
        // Create a separate resolved record for this specific send.
        const created = await createEmailContent(token, {
          Headline: subject,
          Body: resolvedBody,
          Publication_Date: null,
          entity_type: "contributon_email",
        });
        emailContentId = created.id;
      } else {
        const created = await createEmailContent(token, {
          Headline: subject,
          Body: resolvedBody,
          Publication_Date: null,
          entity_type: "contributon_email",
        });
        emailContentId = created.id;
      }
      await createCrmEmail(token, {
        from: fromEmail,
        to: toEmails,
        email_content_id: emailContentId,
        new_company_id: row.company_id,
        ...(selectedArticles.length > 0 && {
          content_ids: selectedArticles.map((a) => a.id),
        }),
      });
      toast.success("Email stored and sent");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to send email");
    } finally {
      setSending(false);
    }
  }, [
    token,
    subject,
    bodyHtml,
    resolvedBodyHtml,
    fromEmail,
    hasValidFromEmail,
    toEmails,
    selectedTemplateId,
    selectedArticles,
    row.company_id,
    onClose,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-builder-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="email-builder-title"
            className="text-lg font-semibold text-gray-900"
          >
            Email builder — {companyName(row)}
            {toEmails.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                To: {toEmails.join(", ")}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <SearchableUserEmailSelect
                token={token}
                fetchUsers={getUserEmails}
                value={fromUser}
                onChange={(user) => {
                  setFromUser(user);
                  if (user) setFromManual("");
                }}
                label="From"
                placeholder="Search sender local part..."
                extraOptions={FROM_EXTRA_OPTIONS}
                defaultQuery="asymmetrix"
                inputSuffix={ASYMMETRIX_EMAIL_DOMAIN}
                normalizeInput={emailLocalPart}
                searchQuery={toAsymmetrixUserSearchQuery}
                optionFilter={isAsymmetrixEmail}
              />
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">
                  Or enter From email local part manually
                </label>
                <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 focus-within:ring-1 focus-within:ring-gray-300">
                  <input
                    type="text"
                    value={fromManual}
                    onChange={(e) => {
                      const localPart = emailLocalPart(e.target.value);
                      setFromManual(localPart);
                      if (localPart) setFromUser(null);
                    }}
                    placeholder="e.g. sender"
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                  <span className="shrink-0 pr-3 text-sm text-gray-500">
                    {ASYMMETRIX_EMAIL_DOMAIN}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">
                To
              </label>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                {toEmails.length > 0
                  ? toEmails.join(", ")
                  : "No contact email available"}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">
              Template
            </label>
            <select
              value={selectedTemplateId === "" ? "" : selectedTemplateId}
              onChange={(e) =>
                handleSelectTemplate(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              disabled={loadingTemplates}
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-300"
            >
              <option value="">— New / none —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.Headline ?? `Template ${t.id}`}
                </option>
              ))}
            </select>
            {selectedTemplateId !== "" && (
              <div className="mt-2 flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-700">
                  <strong>Heads up:</strong> Saving or sending will overwrite this template with your edits.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateId("")}
                  className="shrink-0 rounded border border-amber-300 bg-white px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100"
                >
                  Use as starting point
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">
              Body
            </label>
            <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">
                Review URL
              </div>
              <div className="break-all text-xs text-gray-600">
                {contributorPortalUrl}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyPortalUrl}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                >
                  Copy review link
                </button>
                <button
                  type="button"
                  onClick={handleInsertPortalLink}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                >
                  Insert review link into body
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-gray-400">
                Company page links (e.g. <code>/contributor-crm/123</code>) are
                automatically rewritten to the current company when you load a
                template, preview, or send. You can also use{" "}
                <code>{CONTRIBUTOR_PORTAL_URL_TOKEN}</code> and{" "}
                <code>{COMPANY_NAME_TOKEN}</code> for company name and review URL.
              </p>
            </div>

            {embeddedLinks.length > 0 && (
              <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-400">
                  Embedded links
                </div>
                <div className="space-y-3">
                  {embeddedLinks.map((link) => (
                    <div
                      key={link.index}
                      className="rounded-md border border-gray-200 bg-white p-3"
                    >
                      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Link {link.index + 1}
                      </div>
                      <label className="mb-2 block">
                        <span className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">
                          Display text
                        </span>
                        <input
                          type="text"
                          value={link.text}
                          onChange={(e) =>
                            handleUpdateEmbeddedLink(link.index, {
                              text: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-300"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">
                          URL
                        </span>
                        <input
                          type="text"
                          value={link.href}
                          onChange={(e) =>
                            handleUpdateEmbeddedLink(link.index, {
                              href: e.target.value,
                            })
                          }
                          placeholder="https:// or {{contributor_portal_url}}"
                          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300"
                        />
                      </label>
                      {link.href !== contributorPortalUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateEmbeddedLink(link.index, {
                              href: contributorPortalUrl,
                            })
                          }
                          className="mt-2 rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-100"
                        >
                          Use current company review URL
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-5 text-gray-400">
                  Company page URLs are rewritten to match the company you are
                  emailing when you load a template, preview, or send.
                </p>
              </div>
            )}

            {/* ── Insights & Analysis report attachment ─────────────────── */}
            <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-400">
                Insights &amp; Analysis Reports
              </div>
              <div className="relative" ref={articleDropdownRef}>
                <input
                  type="text"
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  onFocus={() => {
                    setArticleDropdownOpen(true);
                    if (articleResults.length === 0) {
                      searchArticles(articleSearch, 1, false);
                    }
                  }}
                  placeholder="Search reports by title..."
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300"
                  autoComplete="off"
                />
                {articleDropdownOpen && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {articleLoading && articleResults.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
                    )}
                    {!articleLoading && articleResults.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400">No results found</div>
                    )}
                    {articleResults.map((a) => {
                      const isSelected = selectedArticles.some((s) => s.id === a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => handleToggleArticle(a)}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 ${
                            isSelected ? "text-blue-600" : "text-gray-700"
                          }`}
                        >
                          <span className="truncate">{a.Headline}</span>
                          {isSelected && (
                            <span className="shrink-0 text-blue-600">✓</span>
                          )}
                        </button>
                      );
                    })}
                    {articleHasMore && (
                      <button
                        type="button"
                        onClick={() =>
                          searchArticles(articleSearch, articlePage + 1, true)
                        }
                        disabled={articleLoading}
                        className="w-full border-t border-gray-100 px-3 py-2 text-center text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {articleLoading ? "Loading…" : "Load more"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {selectedArticles.length > 0 && (
                <>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedArticles.map((a) => (
                      <span
                        key={a.id}
                        className="flex max-w-xs items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
                      >
                        <span className="truncate">{a.Headline}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleArticle(a)}
                          className="shrink-0 text-blue-400 hover:text-blue-700"
                          aria-label={`Remove ${a.Headline}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleInsertArticleLinks}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                    >
                      Insert report links into body
                    </button>
                  </div>
                </>
              )}

              <p className="mt-2 text-[11px] leading-5 text-gray-400">
                Optionally attach Insights &amp; Analysis reports as links in the email.
                Select one or more reports, then click <em>Insert report links into body</em>.
              </p>
            </div>

            <TiptapSimpleEditor
              valueHtml={bodyHtml}
              onChangeHtml={setBodyHtml}
              onUploadImage={token ? uploadImage : undefined}
              placeholder="Write the email body..."
              minHeightPx={500}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={singleRecipient}
                onChange={(e) => setSingleRecipient(e.target.checked)}
                className="rounded border-gray-300 bg-white text-blue-500"
              />
              <span className="text-xs text-gray-500">Single recipient (preview)</span>
            </label>
            {singleRecipient && (
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Recipient email"
                className="w-56 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleExportHtml}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
            >
              Export HTML
            </button>
            <button
              type="button"
              onClick={handleCopyHtml}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
            >
              Copy HTML
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!subject.trim()}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                selectedTemplateId !== "" ||
                !subject.trim() ||
                !primaryRecipientEmail
              }
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Submit (new)
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={selectedTemplateId === ""}
              className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              Save (update)
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sending || !subject.trim() || !primaryRecipientEmail}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send email"}
            </button>
          </div>

          {generatedHtml && (
            <div className="rounded border border-gray-200 bg-gray-50 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">
                Generated HTML
              </div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] text-gray-500">
                {generatedHtml.slice(0, 500)}
                {generatedHtml.length > 500 ? "…" : ""}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
