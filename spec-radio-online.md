# 📻 Rokolita Latina — Project Spec

> Personal radio station management panel. CentovaCast replacement with modern stack and architecture.
> 
> **Repo:** `rokolita-latina`
> 
> **Full exploration report:** See `radio-online-exploration-report.md` artifact.

## Scope

- **Single station / Personal use** — No multi-tenancy, no billing, no reseller
- **Separate repository** — `rokolita-latina` — Independent from Beils dashboard
- **Dedicated VPS** — Isolated deployment

## Stack

- **Framework:** Nuxt 4 (full-stack)
- **DB:** Prisma + MySQL 8
- **UI:** TailwindCSS 4 + DaisyUI + Lucide Icons + ECharts
- **Streaming:** Icecast 2.4+ (integrated, managed by panel)
- **AutoDJ:** Liquidsoap 2.x (Hybrid: AutoDJ 24/7 + Live DJ takeover)
- **Testing:** Vitest (TDD)

## Architecture

- **Hexagonal (Ports & Adapters)** — Backend AND Frontend
- **Methodology:** SDD + TDD (Red-Green-Refactor)
- **Principles:** SOLID, KISS, DRY — NO over-engineering
- **Design Patterns:** Repository, Strategy, Observer, Factory, Command, Adapter, Template Method

## MVP Features (Phase 1)

- Dashboard (server status, now playing, listeners, quick actions)
- Media Library (web upload, drag & drop, SFTP, file watcher, ID3 metadata)
- Playlist Management (general rotation, scheduled, interval, immediate, smart rules)
- DJ Management (accounts, status, source switching)
- Statistics (real-time, trends, top tracks, track history)
- Webhooks & API (Discord, Telegram, generic HTTP, REST API)
- Embeddable Player Widget (iframe, themed, responsive)
- Metadata Intelligence (ID3 + MusicBrainz artwork + waveform)

## Deferred Features (Phase 2+)

- Web DJ (browser-based live broadcasting via WebRTC)
- Podcasting (RSS feed generation)
- GeoIP Blocking (Nginx/firewall level)
- Relaying (Icecast native config)
- Recording/Archiving live shows
- External Storage (S3)
- Advanced Analytics (geo maps, royalty reports, export)

## References

- https://centova.com/es/cast/packages
- https://centova.com/es/cast/tour/broadcaster
- https://streamingpulse.com/main/category/centova-cast/overview
- AzuraCast (open source alternative): https://www.azuracast.com/
