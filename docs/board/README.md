# The board UX round

Sebastian's scope: research the kanban field (Trello and the AI-native
boards), decide what the factory's board should steal, refuse, and leave
out, then iterate a first improved board on a local click dummy with real
card data. No cluster, no cloud, no paid service: local files and web
research only.

The plan of record lives in the session ledger's handover
(`../../.superpowers/sdd/2026-09-24-build-plan/handover-board-ux.md`).
This folder holds the round's artifacts:

| Artifact | Path | State |
|---|---|---|
| Per-solution report format | [research-template.md](research-template.md) | final, use as-is |
| Scan table over the field | [scan.md](scan.md) | written (Task 143) |
| Deep reports, one per kept solution | `reports/<name>.md` with `reports/shots/` | written (Tasks 144 to 155) |
| Aggregate report (steal / exclusive alternatives / expectations / leave out) | [report-final.md](report-final.md) | written (Task 156) |
| First improved board proposal | [proposal-v1.md](proposal-v1.md) | written (Task 157, rulings 243-248) |
| The board-only roadmap (everything later) | [roadmap.md](roadmap.md) | written (Task 157) |
| Local click dummy with real card data | [../../board-lab/](../../board-lab/) | built (Task 158): `python3 -m http.server 8765` in board-lab, open http://localhost:8765/ |
