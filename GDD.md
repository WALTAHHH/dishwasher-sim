# DISHWASHER SIMULATOR

## One-liner
A zen flow-state game where you manage the chaos of a commercial kitchen's dish station — finding calm in the storm through spatial puzzles, timing, and the satisfaction of a clean rack.

## Design North Star
*"Finding flow and internal calmness in frantic circumstances — a well-timed dance."*

A great run should feel like meditation in motion. The chaos is external; your mind is still.

---

## Core Loop (30 seconds)

```
     DIRTY DISHES ARRIVE (waves)
              ↓
    ┌─────────────────────┐
    │   SCRAPE/SORT       │ → Trash, recycling
    └─────────────────────┘
              ↓
    ┌─────────────────────┐
    │   SOAK SINK         │ → Some dishes need soaking
    └─────────────────────┘
              ↓
    ┌─────────────────────┐
    │   WASH STATION      │ → Manual scrub or...
    └─────────────────────┘
              ↓
    ┌─────────────────────┐
    │   DISHWASHER        │ → Tetris-pack, run cycle
    └─────────────────────┘
              ↓
    ┌─────────────────────┐
    │   DRYING RACK       │ → Some air dry, some towel
    └─────────────────────┘
              ↓
    ┌─────────────────────┐
    │   STORAGE/PASS      │ → Right dish, right place
    └─────────────────────┘
              ↓
      STAFF REQUESTS DISHES
```

**The dance:** Route dishes through stations, manage timing, pack efficiently, keep the flow going.

---

## Game Structure

### Shifts (Levels)
Each shift is a complete play session:
- **Morning Prep** — Tutorial, slow pace
- **Lunch Rush** — Medium intensity
- **Dinner Service** — High intensity
- **Late Night** — Weird items, unpredictable
- **Brunch Chaos** — Everything at once

### Waves (Within a Shift)
Each shift has ~3 waves:
1. **Build-up** — Steady flow, establish rhythm
2. **Peak** — Maximum pressure, test your systems
3. **Wind-down** — Clear the backlog, finish strong

### Endless Mode
Pure zen. No fail state. Just flow. High score chasing optional.

---

## Stations & Mechanics

### 1. Intake/Scrape
- Dishes arrive on bus tubs
- Quick decision: what treatment does this need?
- Scrape food waste → trash
- Sort by type for routing

**Mechanic:** Triage — fast categorization

### 2. Soak Sink
- Crusty/burned items need soaking
- Timer-based: too short = still dirty, too long = wasting space
- Limited capacity (3-4 items)

**Mechanic:** Timer management

### 3. Wash Station (Manual)
- Hand-wash delicate or odd-shaped items
- Rhythm-based scrubbing? Or just hold-to-wash?
- Faster than dishwasher but requires attention

**Mechanic:** Active attention sink

### 4. Dishwasher (THE TETRIS STATION)
- 2D grid packing puzzle
- Different dish shapes:
  - Plates: 2x1 rectangles (stack horizontally)
  - Bowls: 2x2 squares
  - Cups: 1x2 vertical
  - Pans: 3x2 or L-shapes
  - Sheet trays: 4x1 long bois
  - Utensil basket: 1x1 (holds many utensils)
- Run cycle: takes X seconds, can't open mid-cycle
- Efficiency bonus for full loads

**Mechanic:** Spatial puzzle + batch timing

### 5. Drying Rack
- Some items air dry (set and forget)
- Some need towel dry (manual interaction)
- Limited slots
- Items not fully dry → water spots (quality penalty?)

**Mechanic:** Space management + occasional manual

### 6. Storage Shelves
- Sorted storage: plates here, cups there, pans there
- Quick muscle-memory placement
- Wrong spot = time penalty finding it later?

**Mechanic:** Categorization speed

### 7. Pass Window
- FOH staff request specific items
- "Need 4 dinner plates!" — timer starts
- Fulfill quickly = bonus
- Miss it = guest anger / fail progress

**Mechanic:** Output pressure, demand spikes

---

## Dish Variety

| Dish | Shape | Soak? | Dishwasher? | Towel Dry? | Notes |
|------|-------|-------|-------------|------------|-------|
| Dinner Plate | 2x1 | No | Yes | No | Bread and butter |
| Bowl | 2x2 | Sometimes | Yes | No | Soup days are rough |
| Cup | 1x2 | No | Yes | No | Coffee stains |
| Wine Glass | 1x2 | No | NO (hand wash) | Yes | Fragile! |
| Pan | 3x2 | Yes | No | Yes | Always crusty |
| Sheet Tray | 4x1 | Sometimes | Yes | No | The long boi |
| Ramekin | 1x1 | Yes | Yes | No | Burnt cheese hell |
| Utensils | 1x1 basket | No | Yes | No | Batch processing |
| Cutting Board | 2x3 | Yes | No | Yes | Big and awkward |
| Mixing Bowl | 3x3 | Yes | No | Yes | Boss fight energy |

---

## Making 2D Tetris Fun

The dishwasher rack is a 2D grid (maybe 6x8?). Ideas to add depth:

### Spray Coverage
- Water sprays from specific points
- Items block spray — nested items might not get clean
- Optimal packing ≠ just filling space

### Heat Zones
- Top rack = less heat (delicate items OK)
- Bottom rack = high heat (plastics warp!)
- Strategic placement matters

### Combo Bonuses
- "Full row" clear bonus (Tetris callback)
- "All same type" bonus
- "Perfect load" (100% efficiency) celebration

### Dirty→Clean Reveal
- Pack the dirty dishes
- Run cycle (anticipation...)
- Doors open: satisfying "all clean" reveal
- Any items that didn't get coverage = still dirty (redo)

---

## Controls (Keyboard/Gamepad)

```
WASD / Left Stick     — Move cursor / selection
Space / A Button      — Pick up / Place item
Shift / B Button      — Rotate item
Tab / Bumpers         — Switch station focus
Enter / Start         — Start cycle / Confirm
```

Single-hand friendly for zen sessions.

---

## Progression / Meta-game

### Unlocks (earned through play)
- **Bigger dishwasher** — More grid space
- **Faster cycles** — Reduced wait time
- **Extra soak sink** — More capacity
- **Premium drying rack** — Faster air dry
- **Storage upgrades** — More shelf space

### Cosmetics
- Kitchen themes (diner, fine dining, food truck, home kitchen)
- Dish skins (vintage, modern, fancy)
- Music/ambiance packs

### Mastery
- Star rating per shift (1-3 stars)
- Speed records
- Efficiency records
- "Perfect shift" achievements

---

## Fail State

**How you lose a shift:**

1. **Dish overflow** — Intake backs up, bus tubs stack to ceiling
2. **Staff walkout** — Too many missed pass window requests
3. **Time runs out** — Shift ends with dirty dishes remaining

**Generous design:**
- Warnings before failure
- "Almost there!" encouragement
- Retry is instant
- Endless mode = no fail, just flow

---

## Audio/Vibe

**Soundscape:**
- Water running (constant, soothing)
- Dishes clinking (satisfying feedback)
- Dishwasher humming (white noise)
- Gentle kitchen ambiance

**Music:**
- Lo-fi beats default
- Option for silence (pure kitchen sounds)
- Unlockable soundtracks

**The vibe:** Coffee shop meets back-of-house. Cozy chaos.

---

## Visual Style (TBD)

Options to explore:
- Clean vector/flat (Unpacking vibes)
- Pixel art (cozy retro)
- Soft 3D (isometric kitchen)

Key: Readable shapes, satisfying animations, clean UI.

---

## MVP Scope (v0.1)

**Must have:**
- [ ] One kitchen layout
- [ ] Intake → Dishwasher → Drying → Storage flow
- [ ] 2D Tetris dishwasher packing
- [ ] 3 dish types (plate, bowl, cup)
- [ ] One shift with 3 waves
- [ ] Basic fail state (overflow)
- [ ] Keyboard controls

**Nice to have:**
- [ ] Soak sink station
- [ ] Manual wash station
- [ ] Pass window requests
- [ ] Sound effects

**Later:**
- [ ] Progression/unlocks
- [ ] Multiple shifts
- [ ] Endless mode
- [ ] Gamepad support

---

## Open Questions

1. **Camera perspective:** Top-down? Side view? Isometric?
2. **Movement model:** Do you physically walk between stations or instant-switch?
3. **Dish physics:** Do dishes break if mishandled? (Adds stress, maybe optional)
4. **Multiplayer potential?** Co-op dish pit could be fun
5. **Mobile port?** Touch controls for packing could work

---

## References

- **Unpacking** — Spatial satisfaction, cozy vibes
- **Overcooked** — Kitchen chaos (but we're less stressful)
- **PowerWash Simulator** — Zen through mundane tasks
- **Tetris** — The OG packing game
- **Wilmot's Warehouse** — Sorting/organization satisfaction

---

*"Clean dishes. Clear mind."*
