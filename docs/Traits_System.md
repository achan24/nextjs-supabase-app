# Traits System - Implementation Requirements

## 1. Purpose & Principles

**Goal:** Reinforce desired "Action & Drive" traits (Initiative, Courage, Discipline, Adaptability, Endurance, Proactiveness, Determination, Resilience, Perseverance) by awarding immediate, visible rewards for real actions—especially high‑friction ones—without ever punishing late starts or misses.

**Non‑negotiables:**

* Never punish. Late/partial efforts still earn rewards (smaller, but never zero).
* Visible, instant feedback (bars, streaks, quest text).
* ADHD‑friendly: emphasize immediate reinforcement, novelty bonuses, tiny first actions, "just start" speed, and short feedback loops.
* Lightweight inputs: quick pre‑start and post‑session questions (tap/swipe radio buttons).
* Long‑term engagement: systems that don't "cap out," stay interesting for years.

## 2. Core Concepts & Definitions

### 2.1 Traits (Action & Drive first)

* **Initiative:** Speed to start relative to plan or opportunity.
* **Courage:** Doing high‑discomfort/high‑stakes tasks.
* **Discipline:** Doing planned tasks when planned, especially after novelty fades.
* **Adaptability:** Switching approach/location/tool when blocked; reducing friction.
* **Endurance:** Sustained focus/time on task or consistent return across sessions.
* **Proactiveness:** Acting before being prompted; anticipating needs.
* **Determination:** Continuing despite resistance within the session (mini setbacks, urges to quit).
* **Resilience:** Returning after an interruption, failure, or long absence.
* **Perseverance:** Repeated sessions across days/weeks to reach completion.

Notes on the "three similar" traits:

* **Determination** = intra‑session persistence; **Resilience** = bouncing back after a break/failure; **Perseverance** = inter‑session continuation over time. Keep all three; measure differently.

### 2.2 Task Types

* **Scheduled:** Has planned start time/date.
* **Opportunity (in the wild):** Unplanned chance aligned with goals (e.g., chance meeting, free hour, sudden access).
* **High‑Friction Flag:** Paperwork, admin, studying, cleaning, phone calls, etc.
* **Novelty Flag:** First time ever / first time in 90 days / new method.

## 3. User Flows

### 3.1 Create/Select Task → Quick Classifier (≤10s)

* Inputs (single‑tap chips / radio):

  * Type: Scheduled / Opportunity
  * High‑Friction? Yes/No
  * First‑Time? Yes/No (or: New Method? Yes/No)
  * Stakes: Low / Medium / High (self‑reported)
  * Anxiety/Discomfort: Low / Med / High
* System infers candidate traits this action *can* improve (preview checklist, auto‑checked; user may toggle).

### 3.2 Pre‑Start "Before" Ping (optional, ≤5s)

* "Starting now?" Yes → timestamp T₀
* "If blocked: what's your first tiny action?" free‑text (optional; used in quest text).

### 3.3 In‑Session

* Timer runs; micro‑events allowed (e.g., "switched location," "changed tool," "took 2‑min break and returned").

### 3.4 Post‑Session "After" Ping (≤10s)

* "How long did you work?" auto from timer; allow manual entry.
* "Did you switch approach to reduce friction?" Yes/No → Adaptability.
* "Did you push through urges to stop?" Low/Med/High → Determination.
* "Was this a return after interruption/fall‑off?" Yes → Resilience.
* "Will you return tomorrow/this week?" Yes → sets Perseverance target.

## 4. Measurement & Scoring

### 4.1 Time Anchors

* **Planned Start (Scheduled):** `T_plan`
* **First Action Timestamp:** `T_start` (button press, file opened, call started)
* **Start Delay:** `Δstart = max(0, T_start − T_plan)` in minutes (scheduled only)
* **Opportunity Start:** immediate on confirmation → use "reaction time" categories.

### 4.2 Trait Triggers & XP Formulas

**All XP add; no negatives.** Use base XP per trait plus multipliers. Suggested base values below (tuneable).

#### Initiative (scheduled)

* Base: 10 XP for starting within **±10 min** of `T_plan`.
* Extra for speed:

  * Early/on‑time start `Δstart ≤ 0`: +10 XP
  * 0 < `Δstart` ≤ 5 min: +8 XP
  * 5–15 min: +6 XP
  * 15–60 min: +4 XP
  * > 60 min: +2 XP
* **Opportunity version:** reaction categories from confirmation to first action:

  * ≤2 min: +20 XP
  * 2–10 min: +12 XP
  * > 10 min: +8 XP
* Multipliers: High‑Friction ×1.5, First‑Time ×2.0, High‑Stakes ×1.5.

#### Courage

* Trigger: Discomfort High (self‑report) OR Stakes High OR High‑Friction true.
* Base: 12 XP; add:

  * Discomfort: Low/Med/High → +0/+6/+12
  * Stakes: Low/Med/High → +0/+6/+12
* Multipliers: First‑Time ×1.5, Opportunity ×1.25.

#### Discipline

* Trigger: Planned day match (same calendar day).
* Base: 10 XP if started same day; +5 XP if also finished planned sub‑chunk; +5 XP if session ≥20 min after week 2 of a recurring task (novelty faded flag).

#### Adaptability

* Trigger: switched method/location/tool to overcome friction.
* Base: 8 XP per documented switch (cap 2 per session → 16 XP).
* Bonus: +6 XP if switch unblocked progress (self‑report "Yes").

#### Endurance

* Trigger: sustained work and/or cumulative time today.
* Base: `min(20, floor(minutes_worked/10) * 5)` → +5 XP per 10 minutes, capped at 20 XP per session segment.
* Return segments the same day add again (cap total daily Endurance XP at 60).

#### Proactiveness

* Trigger: unprompted action that reduces future work (status update, prep, checklist creation).
* Base: 10 XP; +5 XP if before anyone asked; +5 XP if it unblocks someone else.

#### Determination

* Trigger: within‑session urges to quit overcome.
* Base: 8 XP; add +4/+8 for Med/High urge level.
* Bonus: +6 XP if you completed the originally intended sub‑chunk despite urges.

#### Resilience

* Trigger: you returned after interruption/failure/long gap.
* Base: 15 XP once per day per task chain.
* Add +5 XP if the gap was >3 days; +10 XP if >7 days.

#### Perseverance

* Trigger: repeated sessions on same task across days/weeks until completion.
* Base: 8 XP per distinct day worked on same task.
* Milestones: +20 XP at 3rd day, +30 XP at 7th day, +50 XP at completion.

### 4.3 Global Multipliers (stackable; cap total ×4.0)

* First‑Time Ever: ×2.0
* High‑Friction: ×1.5
* High‑Stakes: ×1.5
* Back‑to‑Back Session (within 30 min): ×1.2
* Streak Day N (consecutive days any work ≥10 min): ×(1 + min(0.05\*N, 0.25))  → +5% per day up to +25%
* Opportunity (in the wild): +flat **Opportunity Bonus** +15 XP (applied once per opportunity), and allow multipliers above.

**Cap rule:** Multiply all applicable, then clamp to ×4.0 to prevent runaway inflation.

### 4.4 Curiosity & Critical Thinking (if added later)

* **Curiosity:** +10 XP when exploring an unfamiliar subtopic or logging a new question; +5 XP per credible source skimmed; novelty decay (same subtopic in 7 days gives +4 XP).
* **Critical Thinking:** +8 XP when logging a flaw/assumption; +12 XP when forming/validating a hypothesis; +15 XP when changing decision based on evidence.

## 5. Streaks, Titles, and Long‑Term Engagement

### 5.1 Streaks

* **Daily Action Streak:** any trait XP ≥10 in a day → streak +1.
* **Trait‑Specific Streaks:** e.g., "Discipline Days" when planned tasks started same day; shown separately.
* **No punishment for break:** streak resets silently; display "Fresh Start" badge next time you act.

### 5.2 Progression Model (durable; not Diablo‑style prestige)

* **Bands per Trait:** Bronze 1–5, Silver 1–5, Gold 1–5, Platinum 1–5, Diamond 1–5, Mythic 1–5 (25 steps).
* Each step requires increasing **Trait XP** (e.g., 150 → 250 → 400 → …; geometric but gentle).
* **Subtle visual upgrades** per band (frame accents, micro‑glows), not flashy; tiny confetti on step ups.
* **Collections & Seasons (optional):**

  * **Collections:** earn set bonuses by achieving small goals across different traits (e.g., "Starter Set": Initiative 3 + Courage 2 + Discipline 3) → unlock a cosmetic border.
  * **Seasons:** quarterly themes with **optional** cosmetic challenges; core XP unaffected. No FOMO penalties.

### 5.3 Titles (lightweight, evergreen)

* Example titles auto‑unlock at band thresholds (e.g., Initiative Gold 3 → "Quickdraw", Endurance Platinum 1 → "Marathon Mind"). Cosmetic only.

## 6. Quest Text System

### 6.1 Trigger

Show after trait selection (pre‑start) and again at post‑session.

### 6.2 Template Components

* **Hook:** "Opportunity detected: +{calc\_reward} XP possible."
* **Tie to goals:** auto‑insert goal/vision name (tag from task).
* **Humorous/encouraging line:** short WoW‑style flourish.
* **Micro‑advice:** one actionable tip (from pre‑start tiny action or trait type).

#### Example (Opportunity, High‑Friction, First‑Time)

```
Opportunity: +42 XP on the table.
Goal: "Finish MSc module early."
You blinked and a door opened — you slipped through it.
Tip: Start with a 90‑second scout: open the doc, write the first sentence, breathe once.
```

#### Example (Scheduled, Late Start)

```
Initiative cash‑in: +18 XP (still counts).
Goal: "Daily study habit."
You arrived fashionably late, but you arrived.
Tip: Set a 10‑minute timer. First paragraph only — the page wants ink, not perfection.
```

## 7. Data Model

### 7.1 Entities (JSON‑y)

**Task**

```json
{
  "task_id": "uuid",
  "title": "Study ML Chapter 3",
  "type": "scheduled|opportunity",
  "t_plan": "2025-08-12T14:00:00Z|null",
  "tags": ["goal:msc", "high_friction", "novelty:first_time", "stakes:high"],
  "notes": "First tiny action: outline headings",
  "goal_id": "uuid|null"
}
```

**Session**

```json
{
  "session_id": "uuid",
  "task_id": "uuid",
  "t_start": "datetime",
  "t_end": "datetime",
  "duration_min": 32,
  "events": [
    {"type":"switch_tool","t":"datetime","meta":{"from":"notes","to":"slides"}},
    {"type":"urge_overcome","level":"high","t":"datetime"}
  ],
  "self_report": {
    "discomfort":"high",
    "stakes":"medium",
    "return_after_gap_days": 5,
    "planned_day_match": true,
    "first_time": true,
    "opportunity_confirmed": true
  },
  "scores": { /* filled after compute */ }
}
```

**TraitXP (per session outcome)**

```json
{
  "session_id":"uuid",
  "trait":"initiative",
  "base_xp": 28,
  "multipliers": {
    "first_time":2.0,
    "high_friction":1.5,
    "streak":1.1
  },
  "final_xp": 46
}
```

**UserTraitState**

```json
{
  "user_id":"uuid",
  "trait":"discipline",
  "total_xp": 3480,
  "band":"Gold",
  "step": 2,            // 1..5
  "next_step_xp": 3800, // threshold
  "streak_days": 7
}
```

## 8. Scoring Engine (Pseudo‑code)

```javascript
function scoreSession(task, session, userState) {
  const traits = inferTraits(task, session);      // see §9
  const xpRecords = [];

  for (const trait of traits) {
    const base = computeBaseXP(trait, task, session); // §4.2
    let mult = product(applyMultipliers(trait, task, session, userState)); // §4.3
    mult = clamp(mult, 1.0, 4.0);

    const finalXP = Math.round(base * mult);

    xpRecords.push({
      session_id: session.id,
      trait: trait,
      base_xp: base,
      multipliers: {...},
      final_xp: finalXP
    });

    updateUserTraitState(userState, trait, finalXP);
  }

  updateStreaks(userState, xpRecords);
  return xpRecords;
}
```

## 9. Trait Inference Rules

```javascript
function inferTraits(task, session) {
  const traits = new Set();

  if (task.type === "scheduled") {
    traits.add("initiative"); 
    traits.add("discipline");
  }
  if (task.type === "opportunity") {
    traits.add("initiative"); 
    traits.add("courage");
  }

  if (task.tags.includes("high_friction") || 
      ["med","high"].includes(session.self_report.discomfort)) {
    traits.add("courage");
  }

  if (session.duration_min >= 20) traits.add("endurance");

  if (hasEvent(session, "switch_tool") || hasEvent(session, "switch_location")) {
    traits.add("adaptability");
  }

  if (session.self_report.return_after_gap_days >= 1) {
    traits.add("resilience");
  }

  if (hasEvent(session, "urge_overcome")) {
    traits.add("determination");
  }

  if (didUserActBeforePrompt(session)) traits.add("proactiveness");

  // User may manually toggle inferred traits pre- or post-session (never more than 6 active).
  return Array.from(traits);
}
```

## 10. UI/UX Requirements

### 10.1 Trait Selection Pane (Pre‑Start)

* Show **auto‑inferred traits** with reasons (tiny text).
* User can toggle on/off; max 6 traits per session to prevent dilution.
* One‑tap start; timer begins; quest text appears.

### 10.2 In‑Session HUD

* Timer, current streak indicator, tiny vertical "charge pips" for Endurance (+1 pip per 10 min).
* Quick buttons: "Switched method," "Overcame urge," "Took 2‑min break," "Back from break."

### 10.3 Post‑Session Sheet

* Summary by trait (bar bumps, numbers, small confetti).
* WoW‑style quest text with the computed reward.
* "Plan next touch" button to set Perseverance target.

### 10.4 Trait Overview

* Horizontal cards with bars; band/step indicator; tiny animated accent per band.
* Tap → history (timeline of XP events with reasons).

### 10.5 Accessibility & Speed

* All taps reachable one‑handed.
* Pre‑start and post‑session flows complete in ≤10 sec each.

## 11. API Endpoints (example)
## 12. Current Build Status (Phases)

- Phase 1: Session Tracking — DONE
  - Timer/session tracker integrated into task cards
  - Sessions persist across refresh; micro-events: distraction, urge_overcome, approach_change
  - Sessions saved to trait_sessions

- Phase 2: XP & Character Growth — IN PROGRESS (v1 shipped)
  - XP engine live; currently computes: Discipline, Adaptability, Perseverance, Endurance, Determination, Resilience (Initiative/Proactiveness/Courage wired via classifiers and post‑session soon)
  - XP awarded on task completion (aggregates unscored sessions)
  - Tokens minted from total trait XP; wallet pill with hover history
  - Character dashboard reads trait_xp_records and shows progress
  - Next: add post-completion questionnaire; expand scoring to all 9 traits; show per-trait breakdown in all toasts/hover (added in app)

- Phase 3: Quest Text & Motivation — ✅ COMPLETE
  - ✅ Dynamic quest text generation for all 9 traits
  - ✅ Motivational feedback system with 3 levels (encouraging, celebratory, inspiring)
  - ✅ ADHD-friendly immediate reinforcement with animated toasts
  - ✅ Context-aware messaging (time of day, difficulty, stakes)
  - ✅ Token bonus calculations and display
  - ✅ Level-up detection and celebration
  - ✅ Streak milestone recognition
  - ✅ Personalized quest text based on trait progress


* `POST /tasks` → create task
* `GET /tasks/:id`
* `POST /sessions` → start/end session (or separate `/sessions/start`, `/sessions/end`)
* `POST /sessions/:id/events` → log micro‑events
* `POST /score` → compute XP for session (idempotent; returns TraitXP list + quest text)
* `GET /traits/state` → aggregate current trait states
* `GET /streaks` → current streaks
* `POST /goals/link` → link task to goal for quest text personalization

## 12. Quest Text Generation Spec

**Inputs:** session, computed XP per trait, task.title, goal.name, first\_tiny\_action (optional), tone="playful-epic", user\_persona tags.

**Process:**

1. Compute `totalPotential = sum(final_xp)` and highlight the highest‑earning trait in headline.
2. Select template based on task.type (scheduled/opportunity) and top trait.
3. Insert one tailored tip:

   * Initiative → "start with 90 seconds / first sentence"
   * Courage → "dial now, script the first line"
   * Discipline → "set 10‑min timer"
   * Endurance → "stretch once, resume, next 10"
4. Link to goal: "This nudges **{goal}**."

**Output:** short paragraph + bullet of tip (max 2 lines).

## 13. Analytics & Anti‑Grind

* Track per‑trait weekly XP; detect plateaus; trigger suggestions (e.g., "Try Opportunity hunts for Initiative.")
* Soft daily caps only for *Endurance* to avoid over‑farming; all other traits uncapped.
* Random small "crit" events: 5% chance to +5 bonus XP on high‑friction starts (surprise dopamine).

## 14. Privacy

* All self‑reports optional; defaults are conservative.
* Local‑first notes; goal names redacted in analytics.
* Export/erase controls.

## 15. Edge Cases

* No `T_plan` for scheduled? Treat as flexible scheduled; Initiative uses same‑day start window.
* Very short sessions (<2 min): still grant Initiative/Courage XP if high‑friction; Endurance = 0.
* Manual sessions (no timer): allow self‑enter duration; trust user (no punishment).

## 16. Tuning Defaults (initial)

* Global multiplier cap: ×4.0
* Endurance session cap: 60 XP/day
* Streak bonus: +5% per day up to +25%
* First‑Time horizon: 90 days
* High‑friction library: user‑editable seed list (paperwork, forms, email triage, phone calls, taxes, cleaning, revision, cold outreach)

## 17. Examples (Worked)

### Example 1: Scheduled Study Session

**Scheduled study @14:00; start 14:06; 32 min; high‑friction; discomfort=med; urge=high; switched method once.**

* Initiative base: 6 (5–15 min late)
* Courage base: 12 + discomfort Med 6 = 18
* Discipline base: 10 (same day) + 5 (≥20 min after week 2) = 15
* Adaptability base: 8 (one switch)
* Endurance base: floor(32/10)*5 = 15
* Determination base: 8 + high urge 8 = 16

Multipliers: High‑Friction ×1.5; Streak +10% (×1.10) → Combined ×1.65 (under ×4 cap).

Final XP (rounded):
* Initiative: 6×1.65=10 → 10
* Courage: 18×1.65=29.7 → 30
* Discipline: 15×1.65=24.75 → 25
* Adaptability: 8×1.65=13.2 → 13
* Endurance: 15×1.65=24.75 → 25
* Determination: 16×1.65=26.4 → 26

Quest text: "+129 XP available — you cut through study‑resistance for **MSc module**. First line, then the next. Keep the pen moving."

### Example 2: Opportunity Session

**Opportunity chat; start ≤2 min; first‑time; high‑stakes.**

* Initiative (opp): 20 base; multipliers First‑Time ×2.0, High‑Stakes ×1.5 → ×3.0; Opp bonus +15 → 20×3.0=60 +15 = 75
* Courage: 12 + stakes High 12 + discomfort Med 6 = 30; multipliers ×3.0 → 90

Total ~165 XP, plus quest text with actionable tip.

## 18. Implementation Notes

* **Latency:** show bar fills and quest text within 150 ms of scoring.
* **Offline:** queue sessions/events; score locally; sync on reconnect.
* **Configurability:** expose trait thresholds and multipliers via remote config.
* **Testing:** property‑based tests for scoring; snapshot tests for quest text template fills.

## 19. Integration with Existing Guardian Angel Systems

### 19.1 Database Integration

The trait system will extend the existing character system. Key integrations:

* **Tasks Table:** Add `trait_impacts` JSONB column for storing trait tags
* **Character Traits:** Use existing `character_traits` table from database model
* **Trait History:** Use existing `trait_history` table for tracking changes
* **Sessions:** Create new `trait_sessions` table for detailed session tracking

### 19.2 Frontend Integration

* Integrate with existing Character Dashboard (`src/app/dashboard/character/`)
* Extend TaskTimer component for session tracking
* Add trait selection to task creation flows
* Integrate with existing goal system for quest text personalization

### 19.3 API Integration

* Extend existing character API endpoints
* Add trait-specific endpoints to existing API structure
* Integrate with existing task completion handlers

---

**Next Steps for Implementation:**

1. Create TypeScript interfaces based on data models above
2. Implement scoring engine functions
3. Create React components for trait selection and display
4. Build quest text generation system
5. Add database migrations for new trait session tracking
6. Integrate with existing task and character systems

This document provides a complete specification for implementing the traits system within the existing Guardian Angel architecture while maintaining consistency with current patterns and database models.

---

# Token & Shop System — Requirements (v1)

## 1) Purpose

Turn trait XP into **spendable tokens** you can redeem immediately for small, meaningful perks that (a) make starting easier, (b) reduce friction, or (c) deliver a quick treat. Immediate, concrete reinforcement counters ADHD delay discounting and sustains engagement over time. ([PMC][1], [ScienceDirect][2], [Taylor & Francis Online][3])

**Principles**

* Never punish. Late/short sessions still earn something.
* **Immediate payouts** at session start/finish beat delay discounting. ([PMC][4])
* Use a **token economy** (earn → exchange) with small, frequent redemptions. ([SAGE Journals][5], [PMC][6])
* Avoid overjustification: aim tangible rewards at low-interest/high-friction tasks; use informational/visual rewards for already-fun tasks. ([PubMed][7], [University of Baltimore][8])

---

## 2) Currencies

* **Trait XP (non-spendable):** builds long-term identity (Initiative, Discipline, etc.). Unlocks subtle cosmetics/titles.
* **Tokens (spendable):** session outputs you can **redeem instantly** for shop items (perks, friction-reducers, treats).

---

## 3) Token Minting (Earning)

Calculate tokens at **session end** (and some **micro-payouts** during the session).

**Formula (server-side):**

```
base_tokens = floor(total_trait_xp / 20)         // fast feedback
hi_friction_bonus = 2 if task.hasHighFriction else 0
opportunity_bonus = 3 if task.type == "opportunity" else 0
first_time_bonus = 2 if session.firstTime else 0
streak_bonus = min(3, floor(consecutive_days / 3))  // +1 per 3-day streak, cap +3

tokens_awarded = clamp(base_tokens + hi_friction_bonus + opportunity_bonus
                       + first_time_bonus + streak_bonus, 1, 15)
```

**Instant micro-mints (client shows immediately; server confirms):**

* Start on time (scheduled) or ≤2 min (opportunity): **+2–5** tokens.
* First 10 minutes worked: **+1**; each additional 10 minutes: **+1** (cap **+3**/session).
* High-friction start: **+2**; high-friction finish: **+2**.
* **Surprise drop** on high-friction start: **6%** chance → **+5–10** tokens (keeps novelty without turning into a slot machine). ([JMIR Serious Games][9])

**Guardrails**

* Daily token hard cap (default **75/day**) to avoid grind.
* Anti-spam: minimum 4 minutes between micro-mints from time-based ticks.

---

## 4) Redemption Rules

* **Instant claim**: redeem in 1 tap, effect applies immediately (focus scene, break animation, start script).
* **Budgeted treats**: user defines weekly limits (time/€/calories). Shop enforces available "treat budget."
* **Cooldowns**: most items have cooldowns (e.g., 60–240 minutes) to keep redemption meaningful.
* **No gating of essentials**: meals are **low-cost "meal upgrades"** not permission to eat (see catalog).

---

## 5) Shop Catalog (Season Q3–Q4 2025)

### A. Daily Menus (time-of-day shelves)

**Morning (05:00–12:00) — easy wins & breakfast upgrades**

* **Breakfast Boost (basic)** — 5 tokens — *1×/morning* — Log breakfast + add a small upgrade (fruit shot / nicer coffee). Cooldown 180m.
* **Focus Scene: Library 25** — 25 tokens — Preset 25–5 timer + ambient audio + quick blocklist for 45m.
* **Start Script: First Sentence** — 10 tokens — Auto-insert a starter line in your next task note.

**Afternoon (12:00–18:00) — friction reducers**

* **Admin Blitz 20** — 20 tokens — Generates a 20-min micro-checklist (forms/calls) from notes; one-tap dial/open.
* **Adaptability Re-roll** — 15 tokens — Retro-log one "switch" you forgot (data honesty with flexibility).
* **Snack Upgrade** — 8 tokens — Swap planned snack for a nicer option (user-defined).

**Evening (18:00–24:00) — wind-down & reflection**

* **Reward Break 7** — 7 tokens — 7-minute guided chill (breath/stretch).
* **Reflection Prompt** — 10 tokens — Micro-prompt ties today's actions to a goal; saves summary.
* **Dinner Upgrade (basic)** — 6 tokens — Small improvement (side, seasoning kit).

### B. Weekly Rotations (reset Mondays 00:00)

* **Boss Treat: Gourmet Breakfast** — 40 tokens — Once/week; bigger upgrade (budget-checked).
* **Goal Accelerator: Study Sprint 45** — 30 tokens — Template (3×15-min) + scene + auto-notes.
* **Social Microquest** — 15 tokens — Structured 10-min reach-out template; logs win.

### C. Always-On Core

* **Cosmetics: Trait Bar Accent** — 5–15 tokens — Visual micro-upgrades (no gameplay power).
* **Music Packs** — 15–25 tokens — Unlock curated focus/wind-down playlists.
* **Nudge Pack** — 12 tokens — 24h of smarter notifications (startup nudge + resume ping).

### D. Monthly Events (first week of month)

* **Environment Theme (City / Forest / Ocean)** — 20 tokens — Ambient pack for focus scenes.
* **"Opportunity Hunter" Bundle** — 35 tokens — +1% drop chance for 48h (capped; cosmetic badge included).

**Notes on Meals**

* Meals are **not** paywalled. Tokens **upgrade or ritualize** them (nice coffee, plated breakfast, eat outside). ADHD-friendly because they're **easy, predictable redemptions** that maintain momentum.

---

## 6) UX Flow

**Session End Panel**

1. Tokens minted appear with count-up (≤150 ms).
2. Top 3 recommended redemptions (contextual): e.g., "Focus Scene," "Reward Break," "Breakfast Boost."
3. One-tap redeem → immediate effect. Budget warnings if treat limits reached.

**Wallet Chip**

* Persistent token balance + weekly earned/spent.
* Tap → Shop with Daily/Weekly tabs. Items show cost, cooldown, and effect.

**Budget Setup**

* User sets weekly treat caps (time, € or custom). Shop checks before redemption.

---

## 7) Data Model (key objects)

**Wallet**

```json
{ "user_id":"...", "balance":137, "week_earned":86, "week_spent":44, "updated_at":"..." }
```

**Shop Item**

```json
{
  "item_id":"focus_scene_library_25",
  "name":"Focus Scene: Library 25",
  "cost_tokens":25,
  "category":"friction_reducer",
  "availability":{"type":"daily","window":"morning|afternoon|evening|always"},
  "cooldown_minutes":60,
  "effects":[
    {"type":"timer_preset","value":"25-5-25-5"},
    {"type":"soundscape","value":"library"},
    {"type":"blocklist","value":["social","news"],"duration":45}
  ],
  "budget_check": false
}
```

**Treat (budgeted)**

```json
{
  "item_id":"breakfast_boost_basic",
  "name":"Breakfast Boost (basic)",
  "cost_tokens":5,
  "category":"meal_upgrade",
  "availability":{"type":"daily","window":"morning"},
  "cooldown_minutes":180,
  "effects":[{"type":"journal_tag","value":"meal_upgraded"}],
  "budget_check": true
}
```

**Mint Event**

```json
{
  "session_id":"...",
  "reasons":["on_time_start","hi_friction_finish","time_block_20m"],
  "tokens":12,
  "drop":{"awarded":true,"amount":6,"reason":"hi_friction_start"}
}
```

---

## 8) API (minimal)

* `POST /economy/mint` → `{ session_id, reasons[] }` ⇒ `{ tokens, drop_awarded, balance }`
* `GET /economy/wallet` ⇒ `{ balance, week_earned, week_spent }`
* `GET /economy/shop?scope=daily|weekly|all` ⇒ `[items]`
* `POST /economy/redeem` → `{ item_id }` ⇒ `{ success, new_balance, effects_applied[] }`
* `POST /economy/budget` → set/update treat budgets
* `GET /economy/history` ⇒ last 50 mints/redemptions

**Idempotency:** `X-Idempotency-Key` on mint/redeem to prevent double-claims.

---

## 9) Limits & Anti-abuse

* Daily token cap (default **75**).
* Treat redemption gate: **max 2/day**, **10/week** (configurable).
* Cooldowns enforced server-side.
* Surprise drop chance small (6%), no loot-box UI, odds disclosed.

---

## 10) Evidence Mapping (why each design choice)

* **Immediate, small rewards** (tokens at start/finish; micro-mints) counter **steep delay discounting** in ADHD. ([PMC][4], [ScienceDirect][2], [Taylor & Francis Online][3])
* **Token economy** (earn → exchange) is a well-established behavior intervention; specify clear exchange rules (costs, schedules). ([SAGE Journals][5], [PMC][6])
* **Variable/partial reinforcement** (rare drops) helps sustain engagement over long horizons. ([JMIR Serious Games][9])
* **Externalizing motivation & context-at-point-of-performance** (shop items that lower friction right now) aligns with Barkley's self-regulation model. ([Russell Barkley][10], [PubMed][11])
* **Avoid overjustification** by not attaching big tangible rewards to already-enjoyable tasks; use informational feedback (quest text, mastery cues) there instead. ([PubMed][7], [University of Baltimore][8])

---

## 11) Copy & Quest Text (examples)

**After morning study (late but done):**

> **+11 Tokens banked | +26 Trait XP**
> Goal: *Finish MSc module early.*
> You showed up — momentum beats the clock.
> **Redeem now:** *Breakfast Boost (5 tokens)* → treat + plan your next 10-minute block.

**After an opportunity pounce:**

> **+14 Tokens | Drop +6**
> Door opened; you walked through it.
> **Try:** *Focus Scene: Library 25* (25 tokens) to lock in gains.

---

## 12) Rollout Plan

* **Week 1:** Wallet + Daily Menu (morning/evening shelves), Breakfast Boost, Reward Break, Focus Scene.
* **Week 2:** Add Admin Blitz 20, Adaptability Re-roll, Reflection Prompt.
* **Week 3:** Weekly Rotations + Boss Treat.
* **Week 4+:** Monthly Event cosmetics; tune caps from analytics.

---

If you want, I can also hand you **TypeScript interfaces + scoring/minting stubs + a minimal React shop panel** next so you can drop this straight into Guardian Angel.

[1]: https://pmc.ncbi.nlm.nih.gov/articles/PMC3059765/?utm_source=chatgpt.com "Delay discounting of reward in ADHD: Application in young ..."
[2]: https://www.sciencedirect.com/science/article/abs/pii/S0010945218301746?utm_source=chatgpt.com "Waiting and working for rewards: Attention-Deficit ..."
[3]: https://www.tandfonline.com/doi/full/10.1080/09297049.2022.2068518?utm_source=chatgpt.com "Disrupted waiting behavior in ADHD: exploring the impact ..."
[4]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5049699/?utm_source=chatgpt.com "Attention-Deficit/Hyperactivity Disorder and Monetary ..."
[5]: https://journals.sagepub.com/doi/10.1177/0145445517699559?utm_source=chatgpt.com "Token Economy: A Systematic Review of Procedural ..."
[6]: https://pmc.ncbi.nlm.nih.gov/articles/PMC4659172/?utm_source=chatgpt.com "Use of Cognitive Behavioral Therapy and Token Economy ..."
[7]: https://pubmed.ncbi.nlm.nih.gov/10589297/?utm_source=chatgpt.com "A meta-analytic review of experiments examining the ..."
[8]: https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf?utm_source=chatgpt.com "A Meta-Analytic Review of Experiments Examining the ..."
[9]: https://games.jmir.org/2016/2/e11/PDF?utm_source=chatgpt.com "Gamification of Cognitive Assessment and Cognitive Training"
[10]: https://www.russellbarkley.org/factsheets/ADHD_EF_and_SR.pdf?utm_source=chatgpt.com "The Important Role of Executive Functioning and Self- ..."
[11]: https://pubmed.ncbi.nlm.nih.gov/9000892/?utm_source=chatgpt.com "Behavioral inhibition, sustained attention, and executive ..."

---

# ADHD Motivation Analysis & Token System Solution

## The Core ADHD Motivation Problem

**User Insight:** "The XP system is kind of meh... I don't get any real boost from it because the points are kind of meaningless, once they pass from the today view, they're just collect to the heap. I mean I guess there's some meaning there but it's most effective during the day to keep things accountable and aiming for something. Once it goes past the day, then it's kind of meaningless."

### ADHD Motivation Reality:
- **Today's XP = Meaningful** ✅ (immediate accountability, visible progress)
- **Yesterday's XP = Meh** ❌ (out of sight, out of mind)
- **Long-term XP = Abstract** ❌ (feels disconnected from current actions)

**User Insight:** "Once the day is over, I kind of don't care, but I guess for things like traits, I like to see if I'm headed in the right direction, in regards to discipline and other traits... And doing a difficult task knowing I will get some specific points will help a lot."

## The Token System Solution

### Immediate → Tangible → Actionable
- **Tokens earned TODAY** → **Spend TODAY** → **Get something NOW**
- **Trait classifications** → **Token bonuses** → **Shop items**
- **High-friction task** → **+2 tokens** → **Breakfast upgrade** → **Immediate satisfaction**

### Traits = Direction, Tokens = Action
- **Traits**: "Am I getting more disciplined?" (long-term identity)
- **Tokens**: "What can I get RIGHT NOW for this hard task?" (immediate motivation)

## Perfect Implementation Strategy

1. **Trait Classifications** (working) → **Token Bonuses** (immediate)
2. **Daily Token Earning** → **Daily Shop Spending** → **Daily Satisfaction**
3. **Traits Build in Background** → **Weekly/Monthly Progress Check** → **Direction Validation**

### User Experience Flow:
- **Today**: "I get 8 tokens for this admin task → I can buy a focus scene"
- **This Week**: "My discipline trait went up 2 levels"
- **This Month**: "I'm definitely getting better at starting on time"

The token system makes **every single action** immediately rewarding, while traits give you the **long-term satisfaction** of seeing growth. This addresses the fundamental ADHD challenge: **immediate reinforcement for immediate actions**.

---

# Area-Specific Traits - Future Enhancement

## The Context-Dependent Trait Reality

**User Insight:** "I have areas, 7 different areas in life. And whilst I am persistent and dedicated in health and fitness and AI programming, I am not so in relationships and work and study.... so thoughts on that?"

### The Problem with Universal Traits:
- **Current approach**: Single trait scores across all areas
- **Reality**: Traits are **context-dependent** and **area-specific**
- **Example**: High discipline in Health/Fitness, but low discipline in Work/Study

### Area-Specific Trait Examples:
- **Health & Fitness**: High Discipline, Endurance, Perseverance ✅
- **AI Programming**: High Initiative, Adaptability, Determination ✅  
- **Relationships**: Low Discipline, Initiative, Proactiveness ❌
- **Work & Study**: Low Courage, Endurance, Resilience ❌

## Implementation Strategy (Future)

### 1. Area-Trait Matrix
```
Areas: Health, Fitness, AI Programming, Relationships, Work, Study, Personal
Traits: Initiative, Courage, Discipline, Adaptability, Endurance, etc.

Each cell = separate trait level for that area
```

### 2. Smart Token Bonuses
- **Cross-area bonuses**: "You used your Health discipline to tackle Work admin: +3 tokens"
- **Area-specific shop items**: "Work Focus Scene" vs "Relationship Check-in"
- **Progress transfer**: "Your AI Programming adaptability helped with Study: +2 tokens"

### 3. Contextual Quest Text
- "Your Health discipline is Gold 4 - use that momentum for Work"
- "Relationships need your AI Programming initiative"

### 4. Area-Specific Motivation
- **Contextual goals**: "Build Discipline in Work" vs generic "Build Discipline"
- **Progress tracking**: Separate trait progress per life area
- **Transfer learning**: Highlight when skills from strong areas can help weak areas

This enhancement would make the trait system **much more realistic** and **personally relevant** by acknowledging that traits manifest differently across different life contexts.

**Note**: This is a future enhancement to consider after the basic token system is implemented.
