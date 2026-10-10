# Requests for shared files

Section agents never edit shared files (see `docs/ARCHITECTURE.md` §3). If you need a change in one, add it to **`docs/requests/<your-section-key>.md`** — e.g. `experiences.md`, `meet-us.md` — using this shape:

```markdown
## <short title>
- File: <shared file you need changed>
- What: <the exact change>
- Why: <what it unblocks>
- Meanwhile: <the workaround inside your own files>
```

The foundation owner applies requests, notes the date under each one, and the section agent then removes its workaround.
