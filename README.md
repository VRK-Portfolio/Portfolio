This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Theme preference

The public header's light/dark toggle saves the selection to localStorage under
`theme` and restores it when the header mounts, including after reloads. Only
`light` and `dark` are accepted; missing or invalid values leave the existing
theme unchanged (light by default). If browser storage is unavailable, the
toggle still works for the current page and a console warning reports that
the preference could not be loaded or saved.

## Basic info API

The public site layout reads the Basic Info collection server-side to generate
its default page title/title template, description, author/creator, favicon,
Open Graph, and Twitter metadata. It uses `name`, `bio`, `website_url`,
`avatar_url`, and `favicon_url`; private contact fields are not included.
The website URL supplies the metadata base for relative images/icons. Public
routes remain dynamic so saved profile changes appear on the next request.
An unconfigured collection uses a generic "Portfolio" title and logs a warning;
database failures or invalid saved metadata are surfaced rather than hidden.
The layout does not assign a homepage canonical URL to every blog.

`POST /api/basic-info` accepts a JSON body validated by
[`BasicInfoSchema`](./src/app/_types/BasicInfo.types.ts).
The `bio` must contain at least 100 characters and at most 15 words.
The `about_me` must contain 100 to 300 words. Do not send `created_at`
or `updated_at`; Mongoose generates these timestamps.

Invalid fields return HTTP 422 with `success: false`,
`error: "Parameter validation failed"`, and a `validationErrors` array
containing each field name and validation message. Malformed JSON
returns HTTP 400 with `error: "Invalid request body"`.

## Certification dates

Certification issue and expiration dates use `Date` objects in the application
and Mongoose model. The admin form displays them as `YYYY-MM-DD` values and
converts submitted values to UTC dates, preserving the selected calendar day.
New certifications default both dates to today (UTC).

## Experience editor

The admin experience page supports adding and editing company details,
responsibility tags, and multiple positions. Add responsibility tags with Enter
or the Add Responsibility button. Each experience keeps at least one position.
Position end dates are optional; marking a position as current clears its end
date. Date inputs use `YYYY-MM-DD` and are submitted as UTC dates.
Failed saves leave the form open with its values and an error message.

## Blog data

Blog creation uses `BlogsTypeSchema`: `title`, `slug`, `category`, and `content`
are required. Optional fields include skill IDs, status, author, cover image,
and timestamps. The API serializes timestamps as ISO strings; the listing schema
parses them into `Date` values while preserving omitted timestamps.
The listing API populates skills as `{ _id, name }`
objects, validated by `BlogListingSchema`.
Recent blog cards use the slug for their links and display content previews,
cover images, skill names, and creation dates when available. `maxCount` limits
the displayed cards; View More appears only when additional records exist.

The admin blog form supports creating and editing title, URL slug, category,
author, cover image upload, draft/published status, skill references, and rich-text
content. A slug is suggested from the title when the slug is empty. Image
uploads must finish before saving. Save failures keep the form and its content
open; successful creates, updates, and deletions refresh the listing.
Edit and Delete act on the selected blog ID; Delete removes it immediately.
Cover files upload through `/api/upload`; the returned persistent URL is saved
as `coverImage`. The form previews the uploaded or existing image. Editing
preserves the current cover unless a replacement upload succeeds or Remove
cover image is selected. Failed uploads block saving until retried or explicitly
discarded.

Blog writes require authentication: `POST /api/blogs` creates a blog, while
`PUT /api/blogs/[id]` updates it and `DELETE /api/blogs/[id]` deletes it.
`BlogWriteSchema` validates nonempty fields/content, URL-safe slugs, skill IDs,
and optional cover image URLs or root-relative paths. Identity and timestamps
cannot be overwritten by the form: the server generates creation/update
timestamps and preserves the original creation timestamp when editing.
Invalid input returns HTTP 400, unauthenticated writes return HTTP 401, and
missing update/delete targets return HTTP 404.

## Image uploads

`POST /api/upload` stores SVG, PNG, JPG, and WebP images in public Vercel Blob
storage. Blog covers, the rich text editor, profile images, and skill icons use
this endpoint.

For local development:

1. Create or open a public Blob store in your Vercel project's Storage settings.
2. Obtain a read/write token for that store and add it to the existing
   `.env.local` file as `BLOB_READ_WRITE_TOKEN=<your-token>`. Preserve the other
   environment variables.
3. Restart `npm run dev`, then retry the upload.

Keep the token server-side: never use a `NEXT_PUBLIC_` prefix, commit it, or
share it in chat. Environment files are already ignored by Git.

Vercel deployments can also use a valid `VERCEL_OIDC_TOKEN` together with
`BLOB_STORE_ID`. OIDC tokens expire; a copied token in `.env.local` is not a
permanent local credential. Refresh the OIDC credentials through your Vercel
setup, or use a store read/write token for local development.
If the SDK cannot find usable credentials, the endpoint returns HTTP 503 with
setup guidance. Failed uploads do not insert an image into the editor.

## Site footer

Public pages share a theme-aware footer with the current copyright year,
section navigation, and a floating bottom-right Chat with me button. The button
smoothly docks into its reserved footer slot when that slot is fully visible,
then floats again when scrolling away. The same button keeps keyboard focus
throughout; reduced-motion preferences disable the transition.
The portfolio chatbot opens as a fixed bottom-right
panel. The panel stays visible while scrolling, fits mobile viewports, and
scrolls messages independently. Close it with the close button or Escape.
User messages appear in right-aligned blue bubbles, and assistant responses
(including any requested blog titles) appear in left-aligned neutral bubbles.
Both bubble colors adapt to the selected light or dark theme.
The chatbot posts
`{ prompt, pathname }` to `/api/chat` and expects `{ success: true, text, blogs }`.
Retrieved published blogs appear only as clickable titles that open in a new
tab. Link data comes from matched blog records, not AI-generated links;
repeated chunks of the same blog produce one title. Deleted or unpublished
blogs are excluded.

On `/blogs/[slug]`, the current path is passed through a per-request Mastra
context. When asked about "this blog" or to summarize the current article, the
agent requests `currentBlog: true` from the retrieval tool. This fetches the
published article directly by its URL slug, including full readable content,
author, category, dates, and skills; it does not depend on vector indexing or
similarity thresholds. Other questions continue to use normal RAG search.
Missing or unpublished current articles return no blog details, and navigating
to another page updates the context on the next chat request.

Skill-only questions about the current article use a direct lookup of its
saved skill associations and return only those names, without model generation.
Missing skills are reported explicitly; they are never inferred from the URL,
title, category, or content. The retrieval tool also supports `detail: "skills"`
for equivalent questions routed by the agent, with a verbatim answer enforced
by the API. Blog links are opt-in (`includeBlogLinks: true`) for explicit blog
lists, recommendations, or link requests, not appended to factual answers.

Requests for the owner's complete skills list read all records from the skills
collection directly, independently of vector indexing and the four-match
semantic-search limit. The answer includes every saved, nonempty skill name
(deduplicated), with no model summarization or inferred additions. The tool
exposes the same exhaustive lookup with `currentBlog: false, detail: "skills"`;
current-blog skill requests remain scoped to that article.
Skill lookups are authorized by the original question, not a model-selected
`detail` flag or rewritten query. Certificate issue-date questions (including
"certficate") look up the named certification directly and return only its
saved issue date. Missing records or dates are reported without guessing;
these answers do not depend on embeddings or model generation.
Failed requests display an error and keep the question for retrying.
Unfiltered blog-list requests such as "show me the list of blogs" fetch every
published blog's title and slug directly from MongoDB, newest first. They do
not require Gemini, credential decryption, local embeddings, or existing
vector chunks. Drafts are excluded and links remain title-only.
Named-skill capability questions return only saved capabilities from the MongoDB
vector collection, without model generation, web search, or added technology
features. Unknown skills or missing capabilities return an explicit not-found
message. Legacy skill text remains readable; the next skills ingestion writes
embeddings and structured skill metadata on every chunk for exact, complete
capability answers. Other generated answers require successful, nonempty
retrieval evidence; a model-only response is never returned.
### Chatbot settings

Open **Chatbot Settings** in the admin sidebar (`/admin/chat-settings`) to save
the active provider, model ID, temperature, output token limit, API key, and
site-wide chat-button visibility. Supported providers are Ollama, Google Gemini,
OpenAI, Anthropic, and Groq. Use a model that supports tool calling. Model IDs
must be available to your account/local Ollama installation. Provider errors
are surfaced rather than silently switching models. New Google configurations
suggest `gemini-3.8-flash`; Google no longer makes `gemini-2.5-flash` available
to new users. Existing saved model IDs are not silently replaced at runtime.
Unavailable-model, invalid-key/access, quota, and service-overload errors show
actionable messages in the chat window without exposing provider payloads or
credentials. Failed questions remain in the input for retrying.

Before saving a cloud API key, set the server-only environment variable
`CHAT_SETTINGS_ENCRYPTION_KEY` to a random 32-byte hexadecimal value (generate
with `openssl rand -hex 32`) and restart the server. Keep it outside source
control, backed up securely, and stable across deployments: changing it makes
existing saved keys unreadable. Keys are encrypted with AES-256-GCM in MongoDB;
authenticated settings responses expose only a saved-key indicator. Leaving
the key field blank keeps the key only for the same provider. Switching
providers requires a new key; saving Ollama removes the saved cloud key.
Only one provider configuration is retained at a time.

On Vercel, configure the encryption key in the **Production** environment and
redeploy; a local environment file is not deployed. Local and hosted servers
sharing saved credentials must use the same encryption key. Configuration
failures report stable `CHAT_ENCRYPTION_KEY_MISSING`,
`CHAT_ENCRYPTION_KEY_INVALID`, `CHAT_API_KEY_DECRYPTION_FAILED`, or
`CHAT_API_KEY_MISSING` codes without exposing keys. Chat server logs identify
the failing phase and error type/status without logging provider request
payloads.

Without saved settings, chat keeps the Ollama `llama3.2` default. Ollama generation
uses its OpenAI-compatible `/v1` API at server-only `OLLAMA_BASE_URL` (default
`http://localhost:11434`). Embeddings/ingestion keep their existing local Ollama
configuration; changing the chat provider does not change embedding models.
Semantic queries still require the local Ollama embedding service; selecting
Gemini alone does not make that service available inside Vercel. Until a
hosted embedding service using the same model/vectors is configured in the
retrieval and ingestion code, use direct database lookups for full blog/skill
lists and the existing exact-fact lookups.
Cloud generation sends retrieved portfolio context and the visitor's question
to the selected provider.

Visibility changes apply after **Save chat settings**. Public pages refresh
visibility every 30 seconds while open, on focus, or on reload. Hiding removes
both the floating/footer launcher and chat panel, and `/api/chat` rejects new
questions while disabled. Settings reads and writes require the existing admin
authentication; the public visibility endpoint returns only the visibility flag,
provider, and model ID. The chat window displays the configured LLM provider
and model as compact badges below the question input, using the same refresh interval. No API keys,
saved-key indicators, or private generation settings are exposed publicly.

## RAG ingestion

The full ingestion flow in `src/mastra/ingestion/index.ts` also runs
`seedBlogs`, `seedCertifications`, and `seedExperience`. These functions can
be called individually from a server-side ingestion script after configuring
the MongoDB environment. Ingestion uses local Ollama with `nomic-embed-text`,
the same embedding model used by the chatbot's retrieval tool.

Only published blogs are indexed, including content, category, author, dates,
related skill names, and a public blog path. Certifications include issuer,
issue/expiration dates, credentials, and covered skills. Experience is indexed
per position with company, location, responsibilities, dates, and description.
HTML content is converted to text before chunking.

Chunks retain their record context and are stored in the existing vector
collection under `blogs`, `certifications`, and `experience`. Stable IDs allow
reruns to update existing chunks; stale chunks (including unpublished or deleted
records) are removed after successful writes. An empty source clears only its
own chunks. Embedding failures leave existing vectors untouched and propagate
to the caller. Run ingestion again after editing source records; CRUD endpoints
do not automatically reindex content. Importing the full-ingestion entry point
currently starts the full ingestion automatically.

## Testing

Run the unit test suite with `npm test -- --run`.

Tests for components that use TanStack Query should use
`renderWithQueryClient` from [`src/tests/tan-query.ts`](./src/tests/tan-query.ts).
It creates an isolated query client for each render, disables retries, and
disables cache garbage-collection timers. Mock API requests with MSW using
schema-valid fixtures, and await loaded content with `findByRole` or
`findByText` rather than asserting synchronously while loading placeholders
are displayed.

Hook tests can pass the `wrapper` from `createTestQueryWrapper` to
Testing Library's `renderHook`; the helper also exposes the isolated
`queryClient` for cache assertions and cleanup.

Run `npm run test:coverage` for application and
[`Next.js configuration`](./next.config.ts) coverage.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
