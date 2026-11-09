import DOMPurify from "isomorphic-dompurify";

/** Sanitize untrusted HTML (from API) before dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html ?? "", {
    ADD_ATTR: ["target", "rel"],
    FORBID_TAGS: ["style", "form", "input", "button"],
  });
}
