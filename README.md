# whatheheckisthis.github.io

This repository builds one GitHub Pages site from two sources: a landing page and blog written in React 18, TypeScript and Vite (prerendered to static HTML), and a documentation section built with MkDocs Material. It is the source for Dhruv Setty's personal site. It is not a reusable template, a library or a hosted service, and it contains no server-side code.

The key words MUST, MUST NOT, SHALL, SHOULD and MAY in this document are to be interpreted as described in BCP 14 (RFC 2119 and RFC 8174).

## Scope

The site is assembled from these sources:

| Path | Source | Tool |
|---|---|---|
| `/` (landing page), `/blog/`, `/blog/<slug>/` | `landing/` | React 18, TypeScript, Vite (prerendered to static HTML) |
| `/overview/`, `/architecture/`, `/reference/`, `/deployment/` | `docs/`, `mkdocs.yml` | MkDocs Material |

In scope:

- The landing page, its content files and its components (`landing/src/`).
- Blog posts written in Markdown (`landing/posts/`).
- The MkDocs documentation pages (`docs/`, `mkdocs.yml`), which describe the IATO Control Evaluation Framework.
- The build, merge and deployment workflow (`.github/workflows/docs.yml`).

Out of scope:

- The contact form relay. The form posts to a Cloudflare Worker configured as `SITE.contactEndpoint` in `landing/src/content/site.ts`; the Worker and its Resend integration are not part of this repository.
- The IATO framework code itself, which lives in its own repository and is linked from the documentation.
- Jekyll. The site does not use Jekyll.

## Requirements

- Node.js and npm for the landing app. The CI workflow uses Node.js 22; other versions have not been tested by this repository.
- Python and pip for MkDocs. The CI workflow uses Python 3.12 and installs `mkdocs-material==9.7.*` from `requirements.txt`.
- A GitHub repository with Pages source set to GitHub Actions (Settings, then Pages) for deployment.

## Installation and Build

Install dependencies and run the landing page locally:

```bash
cd landing
npm ci
npm run dev        # http://localhost:5173
```

Build and preview the whole site:

```bash
pip install -r requirements.txt
mkdocs build --strict --site-dir site
(cd landing && npm ci && npm run build)
cp -R landing/dist/. site/
python3 -m http.server -d site 8000   # http://localhost:8000
```

`npm run build` type-checks, builds the client bundle, then prerenders `/`, `/blog/` and every post to its own `index.html`.

## Usage

### Editing content

- Personal story: `landing/src/content/story.ts`. If it is left empty, the page shows the marked `[STORY]` placeholder.
- Name, positioning, contact links and featured project: `landing/src/content/site.ts`. Contact links show their label (GitHub, LinkedIn). No email address is published on the site, and one MUST NOT be added to this README or to the contact links. The featured project links to the repository and to the profile README.
- Blog posts: add `landing/posts/YYYY-MM-DD-slug.md` with front matter:

  ```markdown
  ---
  title: Post title
  date: 2026-11-12
  summary: One sentence used for the page description.
  ---
  ```

  The URL is `/blog/<slug>/` (the date prefix is dropped). Posts are compiled at build time; no Markdown parser ships to the browser.

### Deployment

`.github/workflows/docs.yml` runs on pushes to `main` that touch `docs/**`, `mkdocs.yml`, `landing/**` or the workflow itself. It:

1. builds MkDocs into `site/` (`--strict`),
2. builds and prerenders the landing app into `landing/dist/`,
3. copies `landing/dist/` into `site/`, failing if any file would overwrite a docs file,
4. uploads `site/` as one Pages artifact and deploys it.

## Configuration

Collision rules between the two builds:

- Vite assets MUST go to `/app-assets/` (set as `assetsDir` in `landing/vite.config.ts`), because MkDocs owns `/assets/`.
- The landing app MUST NOT write a `404.html`, so unknown paths get the MkDocs 404 page.
- A landing file that would overwrite a docs file SHALL fail the build at the merge step.

Documentation that tracks code in the IATO repository is governed by `DOCS_MAINTENANCE.md`, which states which changes MUST update `docs/reference.md`, `docs/architecture.md` or `docs/deployment.md` in the same pull request.

## Verification

- Pull requests run steps 1 to 3 of the deployment workflow, then Lighthouse CI on `/`, `/blog/` and the sample post (`landing/lighthouserc.json`), without deploying. Any Lighthouse category (performance, accessibility, best practices, SEO) below 95 fails the run.
- Pull requests also run the Agent Q review workflow (`.github/workflows/agent-q.yml`), which posts or updates a review comment and fails the check if the review requests changes.
- `mkdocs build --strict` fails on documentation warnings.

Known limitations:

- Docs links (`/overview/` and the rest) are served by MkDocs, so they return 404 in the Vite dev server. To check the combined site, build both and serve the merged folder as shown above.
- Lighthouse CI runs on pull requests only, against three pages, with one run each. It does not run on direct pushes to `main`.

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability reporting process and [KEYS.asc](KEYS.asc) for the maintainer signing key.
