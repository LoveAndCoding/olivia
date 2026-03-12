# Olivia Design System — Screens & Information Architecture

> This document defines the structure, purpose, and layout rules for each screen in Olivia. Use this as the authoritative reference for what belongs where, and why.

---

## Navigation Model

Olivia uses a **flat four-tab navigation model**. There is no hierarchy deeper than one level within a tab. There are no modals in the MVP — all interactions happen within or between these four screens.

```
┌─────────────┬──────────────┬──────────────┬──────────────┐
│  🏡 Home    │  ✅ Tasks    │  ✦ Olivia   │  🗂️ Memory  │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

**Design principle:** Each tab has a single, clear job. A user should be able to describe what each tab does in one sentence.

| Tab | One-sentence purpose |
|---|---|
| Home | Shows what matters right now and what Olivia has noticed |
| Tasks | The full task list — manage, filter, complete, assign |
| Olivia | Conversational access to the assistant |
| Memory | Browse and search the household knowledge store |

---

## Screen Anatomy (All Screens)

Every screen shares the same shell structure:

```
┌──────────────────────┐
│  Status bar (44px)   │  — System time, icons
├──────────────────────┤
│  Screen header       │  — Title, subtitle, contextual actions
├──────────────────────┤
│                      │
│  Scroll area         │  — flex: 1, overflow-y: auto, no scrollbar
│  (main content)      │
│                      │
├──────────────────────┤
│  Sticky bottom       │  — Input bar (Olivia) OR nothing (Tasks, Memory)
├──────────────────────┤
│  Bottom nav (66px)   │  — Always present, always synced
└──────────────────────┘
```

The bottom nav is **always visible** on all screens. It never hides on scroll.

---

## Home Screen

**Purpose:** The daily briefing. What Olivia has noticed, what needs doing today, and what's coming up. Designed to be glanceable — the user should be able to get oriented in under 10 seconds.

### Header

```
wordmark ("olivia" — Fraunces italic, violet, 30px)     [Avatar stack]
Good morning,                                            ← Fraunces 700
Lexi.                                                    ← Fraunces italic 300, violet
Thursday, March 12 · 3 things need you today            ← Plus Jakarta Sans 13px, ink-2
```

The greeting is **time-aware**: "Good morning" / "Good afternoon" / "Good evening" based on time of day.

The subtitle count line ("3 things need you today") should reflect the actual number of open tasks due today or overdue.

### Olivia Nudge Card

Always the **first major element** below the header. This is Olivia's primary surface for proactive communication.

- There is always exactly **one nudge** visible.
- If there is nothing to nudge, do not show the card — the greeting area expands naturally.
- Nudge priority: overdue items > items due today > items due tomorrow > general check-ins.
- Tapping anywhere on the card navigates to the Olivia screen with context pre-loaded.

### "Needs doing" Section

Shows the **top 3 tasks** by priority (overdue first, then by due date). This is a summary, not the full list.

- "All tasks →" link navigates to the Tasks screen.
- Tasks here are tappable but minimal — no editing in-place from Home.
- Do not show completed tasks here.

### "Coming up" Section

Horizontal-scroll strip of upcoming events (next 7–14 days).

- Show up to 6 events but don't truncate the list visually — let it scroll.
- Events from the household calendar; also shows task due dates as events if they have specific dates.
- No editing from this strip. Tiles are informational.

### Scroll Behavior

The Home screen scrolls as a single continuous column. The nudge card and greeting are above the fold; sections below require a scroll. This is intentional — the most critical content is always immediately visible.

---

## Tasks Screen

**Purpose:** The complete task management surface. Create, complete, filter, and assign tasks.

### Header
```
Tasks                           ← Fraunces 700, 28px
5 open · 2 completed this week  ← Plus Jakarta Sans 13px, ink-2
```

### Filter Tabs

Horizontal-scroll pill tabs. Default active tab: "All".

```
All  |  Mine  |  Shared  |  Overdue  |  Snoozed
```

- "Mine" filters to tasks assigned to the primary user (Lexi).
- "Shared" shows tasks with two or more assignees, or tasks explicitly marked shared.
- "Overdue" filters to tasks past their due date.
- "Snoozed" is a future feature — include the tab but show empty state for MVP.

### Add Task Button

Sits at the top of the list, below filter tabs. Dashed border style — clearly an invitation to create, not a real card.

### Task List

Full task cards with two-row layout (name + metadata/assignee row). Grouped:

1. **Open tasks** — sorted: overdue first (badge: rose), then by due date ascending
2. **Completed** — section label "Completed", shown below a divider, reduced opacity (0.55)

Completed tasks show the last 5–7 completions. "See all completed" link if more exist (future).

### Empty States

- All tasks complete: Show a short celebration message in Fraunces italic. "Nothing left to do today — nice work."
- Filtered view with no results: "No [filter] tasks right now." No illustration needed.

---

## Olivia Screen

**Purpose:** Conversational access to the AI assistant. Ask questions, get help, take actions.

### Header

```
[Olivia orb]  Olivia
              Your household assistant · always here
```

The orb pulses continuously. This header is static — it does not scroll away.

### Chat Area

Full-height scrollable message history. Newest messages at the bottom.

**Message types:**
- User message (right-aligned, violet)
- Olivia text response (left-aligned, white card)
- Olivia action card (embedded inside Olivia message bubble — draft, reminder, lookup result)

**On first open:** Pre-populate with Olivia's most recent proactive nudge as the first message. This creates continuity — the user doesn't land on an empty chat.

**Scroll:** Always auto-scroll to bottom when a new message arrives.

### Quick Suggestion Chips

Shown above the input bar when the chat has few messages (less than 4). Hide once the conversation is underway.

Chips are short conversational prompts, not commands:
- "📅 What's this week?"
- "🛠️ Home maintenance due"
- "👤 What's Alexander working on?"
- "💡 What should I remember?"

### Input Bar

Always visible, sticks above the bottom nav. Multiline textarea that auto-resizes.

Send on: button tap, or `Enter` key (Shift+Enter for new line).

### Chat History

For MVP: chat history is session-only. A new app open starts a fresh chat. (Persistence is a future feature.)

---

## Memory Screen

**Purpose:** Browse and search the household knowledge store. Things Olivia has remembered — decisions, maintenance records, contacts, notes.

### Header
```
Household memory    ← Fraunces 700, 28px
Things worth keeping  ← Plus Jakarta Sans 13px, ink-2
```

### Search Bar

Sits immediately below the header, above the categories. Full-width, single-line. Searches across all memory card titles and detail text.

For MVP, search can be client-side (filter visible cards). No server-side search required.

### Memory Categories

Cards are grouped into labeled sections. Section labels use the `mem-cat-label` style: all-caps, 10px, ink-3, left padding aligned with cards.

**Default categories:**
1. **Decisions made** — household choices with permanence (paint color, budget agreed, vendor selected)
2. **Home maintenance** — dated service records, product specs, next-due calculations
3. **Contacts & services** — vendors, contractors, recurring services with phone/status
4. **Notes** — catch-all for context that doesn't fit elsewhere (future expansion)

### Memory Card Metadata

Each card shows an **age indicator** (right-aligned, 10px, ink-3):
- `< 1 week:` show days — "3d"
- `1–8 weeks:` show weeks — "2w"
- `> 2 months:` show months — "3m"

This helps the user quickly understand how fresh the information is.

### Empty State

"Olivia hasn't saved anything here yet. She'll remember things as you use the app." — written in Fraunces italic.

### Add to Memory

For MVP, Olivia adds memories automatically through conversation. There is no manual "add" button on the Memory screen. (Future versions may add manual entry.)

---

## Status Bar

The status bar appears on every screen. It shows:
- Left: time (12-hour format, no seconds)
- Right: signal/battery indicators (placeholder icons in prototype: "●●●")

In a real PWA, the status bar is native and not rendered by the app. In prototypes and design files, mock it at 44px height.

---

## Information Hierarchy Summary

```
App
├── Home
│   ├── Greeting (time-aware)
│   ├── Olivia nudge (1 max, conditional)
│   ├── Top 3 tasks (summary)
│   └── Upcoming events (horizontal scroll)
│
├── Tasks
│   ├── Filter tabs
│   ├── Add task (top of list)
│   ├── Open tasks (grouped by urgency/date)
│   └── Recent completions (reduced opacity)
│
├── Olivia
│   ├── Header (orb + identity)
│   ├── Chat history (session)
│   ├── Quick chips (conditional)
│   └── Input bar (sticky)
│
└── Memory
    ├── Search
    ├── Decisions made
    ├── Home maintenance
    ├── Contacts & services
    └── Notes
```

---

## Future Screens (Not in MVP)

These screens are anticipated but out of scope for the first build:

- **Calendar** — Full month/week view of household events
- **Settings** — Household member management, notification preferences, **and theme preference** (Light / Dark / Auto toggle)
- **Onboarding** — First-run setup flow (household name, member invite)
- **Task Detail** — Expanded single task view with notes, history, attachments

---

## Dark Mode Considerations by Screen

All screens theme automatically via CSS variables. The notes below cover per-screen details worth being explicit about.

### Home Screen
- The greeting italic name (`em` element) uses `--violet` — unchanged in dark, reads well on the dark background
- The nudge card gradient is identical in both modes
- The ambient background blobs use reduced opacity values in dark mode — see Foundations doc

### Tasks Screen
- Completed tasks at reduced opacity (0.55) — verify the reduced-opacity text still meets contrast minimums on the dark surface background in dark mode
- The dashed "Add task" border uses `--lavender-mid` — resolves to `#3D3660` in dark, a visible but subtle deep indigo dashed line

### Olivia Screen
- The chat background is `--bg` (`#12101C` in dark), while message bubbles use `--surface` (`#1C1A2E`) — the 1–2 shade difference is the primary visual separator between the chat area and message cards in dark mode
- Quick suggestion chips use `--surface` background and `--ink-4` border in dark mode — they should still be clearly distinguishable from the chat background. If contrast is insufficient, upgrade chip background to `--surface-2`

### Memory Screen
- Category section labels (`mem-cat-label`) use `--ink-3` — resolves to `rgba(237,233,255,0.35)` in dark, a soft visible label
- The search bar border uses `--lavender-mid` at rest — resolves to `#3D3660` in dark, clearly visible
