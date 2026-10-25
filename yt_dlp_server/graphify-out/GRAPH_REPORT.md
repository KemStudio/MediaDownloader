# Graph Report - yt_dlp_server  (2026-10-18)

## Corpus Check
- 10 files · ~761 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 62 nodes · 88 edges · 6 communities
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- server.js
- Package Manifest
- downloader.js
- app.js
- download.js
- tiktok.js

## God Nodes (most connected - your core abstractions)
1. `sendJson()` - 7 edges
2. `createRequestHandler()` - 6 edges
3. `handleDownload()` - 6 edges
4. `runDownloader()` - 4 edges
5. `handleHealth()` - 4 edges
6. `setCorsHeaders()` - 3 edges
7. `resolveSource()` - 3 edges
8. `scripts` - 2 edges
9. `port` - 2 edges
10. `defaultYtDlpArgs()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `handleDownload()` --calls--> `runDownloader()`  [EXTRACTED]
  src/routes/download.js → src/downloader.js
- `handleDownload()` --calls--> `resolveSource()`  [EXTRACTED]
  src/routes/download.js → src/sources/index.js
- `createRequestHandler()` --calls--> `sendJson()`  [EXTRACTED]
  src/app.js → src/http.js
- `createRequestHandler()` --calls--> `setCorsHeaders()`  [EXTRACTED]
  src/app.js → src/http.js
- `createRequestHandler()` --calls--> `handleDownload()`  [EXTRACTED]
  src/app.js → src/routes/download.js

## Import Cycles
- None detected.

## Communities (6 total, 0 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.25
Nodes (4): { createRequestHandler }, http, { ip, port }, server

### Community 1 - "Package Manifest"
Cohesion: 0.22
Nodes (8): dependencies, dotenv, name, private, scripts, start, version, dotenv

### Community 2 - "downloader.js"
Cohesion: 0.16
Nodes (9): fs, path, port, defaultYtDlpArgs(), fs, path, runDownloader(), { spawn } (+1 more)

### Community 3 - "app.js"
Cohesion: 0.29
Nodes (10): createRequestHandler(), { handleDownload }, { handleHealth }, { setCorsHeaders, sendJson }, { URL }, sendJson(), setCorsHeaders(), handleDownload() (+2 more)

### Community 4 - "download.js"
Cohesion: 0.18
Nodes (9): fs, os, path, { resolveSource }, { runDownloader }, { sendJson }, resolveSource(), sources (+1 more)

### Community 5 - "tiktok.js"
Cohesion: 0.50
Nodes (3): filename(), match(), { URL }

## Knowledge Gaps
- **1 isolated node(s):** `dotenv`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 36 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sendJson()` connect `app.js` to `download.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `dotenv` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Why does `handleDownload()` connect `app.js` to `downloader.js`, `download.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `createRequestHandler()` connect `app.js` to `server.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._