# Root Markdown Zero-Inbound Archive (2026-02-16)

Purpose:
- archive root-level markdown files with zero inbound `docs/<file>.md` references at sweep time
- reduce root docs sprawl while preserving historical reference material

Summary:
- archived files: 118 markdown documents
- source location before move: `docs/*.md` (excluding `docs/README.md`)

Notes:
- these docs can be restored if a canonical workflow needs one
- active root markdown is now maintained via `docs/.root-md-allowlist.txt`
