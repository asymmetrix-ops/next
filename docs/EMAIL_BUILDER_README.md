
# Admin Email Builder – Specs & How It Works

This document describes the **Email Template Builder** in the Admin panel (`/admin` → Emails tab): components, libraries, image upload, templates, and preview flow.

---

## Summary: How the Email Builder Works

1. **Location**: Admin page → **Emails** tab (`src/app/admin/page.tsx`, `EmailsTab` component).
2. **Flow**: Admin edits **subject** and **body** (rich text), sets optional **From** (free-form email + separate directory suggestion panel), optional **Basic users** multi-select (`all_users`), optionally picks a **template** from Xano, can **preview** in a new tab, **export/copy** full HTML, or **submit/save** to Xano as email content.
3. **Body editor**: Tiptap-based rich text editor (`TiptapSimpleEditor`) with paste/drop/image upload. Images are uploaded to Xano and inserted as URLs (see **How images work** and **Image upload** below).
4. **Output**: Emails are wrapped in a branded HTML shell (fonts, layout, badges, mobile styles). That full HTML can be exported, previewed, or stored in Xano.

---

## Components & Libraries

### UI Components Used in the Email Builder

| Component | Import Path | Purpose |
|-----------|-------------|---------|
| **TiptapSimpleEditor** | `@/components/ui/TiptapSimpleEditor` | Rich text body editor (bold, lists, links, tables, images, etc.). |
| **SuggestedSenderEmailInput** | `@/components/ui/SuggestedSenderEmailInput` | **From** field: free-text email in a bordered row; while focused, a **separate** portal panel lists directory suggestions (`fetchAsymmetrixUsersForEmailSelect` → `/api/asymmetrix-users`). Type anything, or click a suggestion row to fill the email. |
| **BasicUsersMultiSelect** | `@/components/ui/BasicUsersMultiSelect` | **Basic users**: separate control with its own dropdown — multi-select checkboxes over `GET …/api:jlAOWruI/all_users` via `/api/all-users` (`fetchAllUsers` in `src/lib/api.ts`). Not sent on Submit/Save until Xano adds fields. |
| **Native elements** | — | Subject input, template `<select>`, checkboxes, buttons. No generic `SearchableSelect` in the Emails tab. |

### TiptapSimpleEditor – Under the Hood

- **Package**: `TiptapSimpleEditor` is built with **Tiptap**.
- **NPM packages** (from `package.json`):
  - `@tiptap/react` ^3.19.0
  - `@tiptap/starter-kit` ^3.19.0
  - `@tiptap/extension-image` ^3.19.0
  - `@tiptap/extension-link` ^3.19.0
  - `@tiptap/extension-placeholder` ^3.19.0
  - `@tiptap/extension-table` ^3.20.0

- **Props used by the Email Builder**:
  - `valueHtml` – current body HTML (e.g. `bodyHtml` state).
  - `onChangeHtml` – `setBodyHtml` to persist edits.
  - `onUploadImage` – `uploadImageToXano`; when provided, paste/drop/file-picker uploads go to Xano and the editor gets back a URL.
  - `placeholder` – e.g. `"Write the email body..."`.
  - `minHeightPx` – e.g. `500`.

- **Image handling in the editor**:
  - If `onUploadImage` is set: paste image, drop image, or toolbar “Image” open file dialog → file is passed to `onUploadImage(file)` → returned URL is inserted via `setImage({ src: url })`.
  - If not set: “Image” prompts for a URL and inserts it (no upload).
  - Image extension is configured with `allowBase64: false` and `HTMLAttributes: { class: "max-w-full h-auto rounded" }`.

---

## Image Upload

### Endpoint & Auth

- **URL**: `https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/images`
- **Method**: `POST`
- **Auth**: `Authorization: Bearer <token>` where token is `localStorage.getItem("asymmetrix_auth_token")`. No token → throws “Authentication required”.

### Request

- **Content-Type**: `multipart/form-data` (browser-set; do not set `Content-Type` manually).
- **Field name**: `img`.
- **Payload**: single file, e.g. `fd.append("img", file, file.name)`.

### Response Handling

- Success: JSON body. The code looks for an image URL in this order:
  - `json.url`
  - `json.file?.url`
  - `json.image?.url`
  - `json.path`
  - `json.file?.path`
- If the chosen value is a path starting with `/vault/`, it is turned into an absolute URL: `https://xdil-abvj-o7rq.e2.xano.io` + path.
- That final URL string is returned to the editor and inserted as the image `src`.
- Non-OK response or missing URL → throws; the editor shows an alert.

### Flow Summary

1. User pastes/drops an image or clicks Image → chooses file.
2. `TiptapSimpleEditor` calls `onUploadImage(file)` (i.e. `uploadImageToXano`).
3. `uploadImageToXano` POSTs the file to the Xano images API with Bearer token.
4. Response is parsed for URL; relative `/vault/` paths are made absolute.
5. URL is returned; editor inserts `<img src="...">`.

---

## How Images Work (End-to-End)

### Ways to add an image

1. **Paste** – Copy an image (e.g. from browser or screenshot), focus the body editor, paste. The editor’s paste handler detects an image file and calls `onUploadImage` with it.
2. **Drag and drop** – Drag an image file from the OS or another tab and drop it into the editor. The drop handler treats it like paste and uploads via `onUploadImage`.
3. **Toolbar “Image”** – Click the Image button in the Tiptap toolbar. A file input opens; after the user picks an image file, that file is passed to `onUploadImage`.

In all cases the **file** is sent to Xano; the editor never embeds base64 or a raw data URL (Tiptap Image is configured with `allowBase64: false`).

### What happens when you add an image

1. **Upload** – The selected/pasted/dropped `File` is sent to Xano as `multipart/form-data` with field name `img` and `Authorization: Bearer <asymmetrix_auth_token>`.
2. **URL from Xano** – The API returns JSON. The app reads the image URL from `url`, `file.url`, `image.url`, `path`, or `file.path`. If the value starts with `/vault/`, it’s turned into a full URL: `https://xdil-abvj-o7rq.e2.xano.io` + path.
3. **Insert in editor** – The returned URL is inserted with Tiptap’s `setImage({ src: url })`. The node is rendered as `<img src="..." class="max-w-full h-auto rounded">` in the document.
4. **Stored in email** – The body HTML (and thus the exported/preview/saved email) contains that `<img>` with the Xano URL. Images are always hosted on Xano; the email HTML only references them by URL.

### What is *not* done with images

- **No base64 in email** – Images are not inlined as data URIs; they are always external URLs.
- **No client-side resize/crop** – The file is uploaded as-is; any resizing would be on the Xano/backend side if configured there.
- **Sanitization** – `sanitizeHtml()` does not strip `<img>` or change `src` unless it’s a `javascript:` URL (which gets replaced with `#`). Normal `https://` image URLs are left as-is.

### Requirements for images to work

- User must be **logged in** so `asymmetrix_auth_token` exists in `localStorage`; otherwise `uploadImageToXano` throws “Authentication required”.
- The **Xano images API** must accept `POST` with field `img` and return a JSON body that includes the URL in one of the supported shapes (see Response Handling above).

### Where the upload is implemented

- **Email builder** – `EmailsTab` in `src/app/admin/page.tsx` defines `uploadImageToXano` and passes it to `TiptapSimpleEditor` as `onUploadImage`.
- **Editor** – `TiptapSimpleEditor` in `src/components/ui/TiptapSimpleEditor.tsx` uses `onUploadImage` in its paste handler, drop handler, and “Image” button file input; on success it inserts the returned URL with `setImage({ src: url })`.

---

## HTML Sanitization

Before the body is used in the branded email or sent to the API, it is sanitized with `sanitizeHtml()`:

- Removes all `<script>...</script>` tags.
- Removes `on*` event handler attributes (e.g. `onclick`, `onerror`).
- Replaces `javascript:` in `href`/`src` with `#`.

So only the **body** HTML is sanitized; the outer branded wrapper is built in code and is not user HTML.

---

## Branded Email HTML

`buildBrandedEmailHtml({ bodyHtml, subject })` produces a full HTML document:

- **Doctype**: `<!doctype html>`, `lang="en"`.
- **Head**: charset, viewport, `<title>` (subject escaped for HTML).
- **Styles** (inline in `<style>`):
  - Fonts: Arial, sans-serif; body background #fff, text #333.
  - Links: #1a73e8.
  - Layout: table-based; `.container` max-width 720px, centered.
  - Cards: `.card` with border, rounded corners; table header/row styles.
  - Badges: `.badge`, `.badge.hot-take`, `.company-analysis`, `.deal-brief`, `.market-map`, `.default` (colors and borders).
  - Mobile: `@media (max-width:600px)` – stack table columns (thead hidden, cells block).
- **Body**: Outer table → centered container table → single `<td>` that contains `bodyHtml`.

So “branded” = same layout/fonts/badges for every email; only the inner `bodyHtml` (and title from subject) change.

---

## Templates (Xano)

- **List**: `GET https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_content` → array of templates.
- **Template shape**: `{ id, Headline?, Body?, Publication_Date?, entity_type?, from_email?, created_at? }`. `Headline` = subject line; `Body` = full branded HTML (or similar); `from_email` = sender address stored with the template.
- **Selecting a template**: Populates **Subject** from `Headline`, **Body** from `Body`, **From** from `from_email` when present (local part of the email used as display name when no separate name exists). Body is normalized with `extractInnerContent()` so only the inner content (e.g. container `<td>`) is loaded into the editor; the outer wrapper is stripped to avoid double-wrapping when saving.
- **Create**: “Submit” with no template selected → `POST` to `.../email_content` with `Publication_Date: null`, `Headline`, `Body`, `entity_type`, `from_email` (whatever address is in the From field — typed or chosen from suggestions — or `""`).
- **Update**: Template selected → “Save” → `PATCH .../email_content/:id` with `email_content_id`, `Publication_Date`, `Headline`, `Body`, `entity_type`, `from_email`.

---

## Sender (From)

- **UI**: “From (sender email)” — editable email row **above**; directory matches appear in a **separate** labeled panel below it (portal), opened while the email field is focused.
- **Typing**: Any email address can be entered manually (`from_email` is saved exactly as submitted after trim).
- **Suggestions**: Asymmetrix directory users from Xano `GET …/api:jlAOWruI/asymmetrix_users`, proxied by **`GET /api/asymmetrix-users`** with Bearer auth; filtered by current input via `fetchAsymmetrixUsersForEmailSelect` in `src/lib/api.ts`. Choosing a row fills the email and stores the directory **name** for preview labeling only.
- **Save to Xano**: **Submit** / **Save** sends `from_email` as the field text (empty string if cleared).

---

## Basic users (multi-select)

- **UI**: “Basic users” sits **below From**, above **Entity Type**. Button opens a dedicated dropdown: filter box + checklist over all rows from **`GET …/api:jlAOWruI/all_users`**, proxied as **`GET /api/all-users`** with Bearer auth. Selected users appear as removable chips outside the dropdown.
- **Submit/Save**: Selection is stored in React state and included in **preview** localStorage.
- **Save & Send**: Each selected basic user’s **email** is sent in `emails_to` on `POST https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/send_email` (after `email_content` succeeds). Empty selection → `[]`.

---

## Send email (after save)

- **Trigger**: **Save & Send** (indigo button) runs the same `email_content` **POST** (new) or **PATCH** (existing template) as **Submit** / **Save**. Only after that request succeeds, it calls **send_email**.
- **Endpoint**: `POST https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/send_email` with `Authorization: Bearer` when a token is in `localStorage`.
- **Body**: `{ email_from, email_content_id, emails_to }` — `email_from` is `null` if the From field is empty, otherwise the trimmed string; `email_content_id` is parsed from the POST response (`id` / `email_content_id` / first array element) or the selected template id after PATCH; `emails_to` is the list of trimmed emails from **Basic users** (or `[]`).

---

## Preview

- **Storage key**: `asymmetrix_email_preview_v1` (localStorage).
- **Payload**: `{ created_at, subject, html, from?, to?, basic_users? }`. `html` = full branded HTML. `from` / `to` as before. `basic_users` is an array of `{ id, name, email }` when the Basic users picker has selections (preview-only until API wiring).
- **Action**: “Preview” builds the branded HTML, writes the payload to localStorage, and opens `/email/preview` in a new tab.
- **Preview page** (`src/app/email/preview/page.tsx`): Reads the same key, renders `html` in an iframe (or similar), shows subject, **From**, **To**, **Basic users** when present, “Back to Admin” link, and “Copy HTML” if needed.

---

## Single Recipient

- Checkbox “Single recipient” plus optional “Recipient email” field.
- Used only for **preview**: when opening preview, `to` is included in the stored payload and shown on the preview page. It does **not** affect submit/save to Xano (Xano stores content only).

---

## Buttons Summary

| Button | Action |
|--------|--------|
| **Export HTML** | Builds branded HTML from current subject + body, sets local `html` state (and shows “Generated HTML” below). |
| **Copy HTML** | Copies that generated `html` to clipboard (no export if not already built). |
| **Preview** | Builds branded HTML, saves to localStorage under `asymmetrix_email_preview_v1`, opens `/email/preview`. Disabled if subject is empty. |
| **Submit** | No template: POST new `email_content` to Xano (`Headline`, `Body`, `entity_type`, `from_email`, …). |
| **Save & Send** | Same POST as **Submit**; after a successful response, reads **`email_content_id`** from the JSON (supports `id` / `email_content_id`), then `POST …/send_email` with `email_from` (null if From empty), `email_content_id`, `emails_to` (emails from **Basic users** multi-select). |
| **Save** | Template selected: PATCH existing `email_content` by id (same body fields including `from_email`). |
| **Save & Send** (editing) | Same PATCH as **Save**; on success, `POST …/send_email` using the selected template id as `email_content_id`. |

---

## File / Code References

| Item | Location |
|------|----------|
| Email builder UI & logic | `src/app/admin/page.tsx` – `EmailsTab`, `sanitizeHtml`, `buildBrandedEmailHtml`, `extractInnerContent`, sender + basic-user pickers |
| Asymmetrix users API proxy | `src/app/api/asymmetrix-users/route.ts` |
| All users (`all_users`) API proxy | `src/app/api/all-users/route.ts` |
| Sender search helper | `src/lib/api.ts` – `UserEmailItem`, `fetchAsymmetrixUsersForEmailSelect`, `BasicUserItem`, `fetchAllUsers` |
| Sender combobox (free text + separate suggestion panel) | `src/components/ui/SuggestedSenderEmailInput.tsx` |
| Basic users multi-select | `src/components/ui/BasicUsersMultiSelect.tsx` |
| Rich text editor | `src/components/ui/TiptapSimpleEditor.tsx` |
| Email preview page | `src/app/email/preview/page.tsx` |
| Tiptap/table deps | `package.json` – `@tiptap/*` |

---

## Dependencies Quick Reference

- **Editor**: Tiptap (React, StarterKit, Image, Link, Placeholder, Table).
- **Backend**: Xano (email content + image upload APIs).
- **Auth**: `asymmetrix_auth_token` in localStorage for Xano requests.
- **Styling**: Inline CSS in the branded HTML; admin UI uses Tailwind (existing app styles).
