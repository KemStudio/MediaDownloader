# Graph Report - yt_dlp_server  (2026-10-18)

## Corpus Check
- 9 files · ~686 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 57 nodes · 83 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- server.js
- Package Manifest
- downloader.js
- app.js
- download.js
- tiktok.js
- handleDownload

## God Nodes (most connected - your core abstractions)
1. `sendJson()` - 7 edges
2. `handleDownload()` - 7 edges
3. `createRequestHandler()` - 6 edges
4. `handleHealth()` - 4 edges
5. `runDownloader()` - 3 edges
6. `setCorsHeaders()` - 3 edges
7. `isTikTokUrl()` - 3 edges
8. `getVideoFilename()` - 3 edges
9. `scripts` - 2 edges
10. `port` - 2 edges

## Surprising Connections (you probably didn't know these)
- `createRequestHandler()` --calls--> `handleDownload()`  [EXTRACTED]
  src/app.js → src/routes/download.js
- `handleDownload()` --calls--> `sendJson()`  [EXTRACTED]
  src/routes/download.js → src/http.js
- `handleDownload()` --calls--> `getVideoFilename()`  [EXTRACTED]
  src/routes/download.js → src/tiktok.js
- `createRequestHandler()` --calls--> `sendJson()`  [EXTRACTED]
  src/app.js → src/http.js
- `createRequestHandler()` --calls--> `setCorsHeaders()`  [EXTRACTED]
  src/app.js → src/http.js

## Import Cycles
- None detected.

## Communities (7 total, 1 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.25
Nodes (4): { createRequestHandler }, http, { ip, port }, server

### Community 1 - "Package Manifest"
Cohesion: 0.22
Nodes (8): dependencies, dotenv, name, private, scripts, start, version, dotenv

### Community 2 - "downloader.js"
Cohesion: 0.18
Nodes (7): fs, path, port, fs, path, { spawn }, { ytDlpCommand }

### Community 3 - "app.js"
Cohesion: 0.30
Nodes (9): createRequestHandler(), { handleDownload }, { handleHealth }, { setCorsHeaders, sendJson }, { URL }, sendJson(), setCorsHeaders(), handleHealth() (+1 more)

### Community 4 - "download.js"
Cohesion: 0.25
Nodes (6): fs, { isTikTokUrl, getVideoFilename }, os, path, { runDownloader }, { sendJson }

### Community 6 - "handleDownload"
Cohesion: 0.67
Nodes (3): runDownloader(), handleDownload(), isTikTokUrl()

## Knowledge Gaps
- **1 isolated node(s):** `dotenv`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 34 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleDownload()` connect `handleDownload` to `app.js`, `download.js`, `tiktok.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `dotenv` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Why does `sendJson()` connect `app.js` to `download.js`, `handleDownload`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `createRequestHandler()` connect `app.js` to `server.js`, `handleDownload`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._