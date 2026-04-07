# Design Pivot: Avatar-Based Movement

## The Shift

**Before:** Abstract station management (tab/click to switch zones)
**After:** 3rd-person avatar physically moving through kitchen space

## Core Feel Change

The player IS in the kitchen. You walk between stations. You carry dishes. The space matters.

### Movement
- WASD moves your character through the kitchen
- 3rd person camera (top-down or isometric?)
- Collision with counters, stations, other objects
- Walking speed matters — routing decisions

### Carrying
- Pick up dish → character holds it visibly
- Can carry 1 item? Or stack?
- Walk to destination → place
- Drop if needed

### Stations as Zones
- Walk INTO a station zone to interact
- Dishwasher: Enter zone → popup modal for Tetris packing
- Sink: Enter zone → washing minigame or auto-wash
- Each station has a physical footprint in the kitchen

### Kitchen Layout
- Intake area (bus tubs arrive here)
- Sink station
- Dishwasher station  
- Drying racks
- Storage shelves
- Pass window (FOH pickup)
- Physical paths between them

## What Changes

### Keep
- Tetris packing (now as modal/minigame)
- Dish types and properties
- Wave-based shifts
- Designer tools
- Audio/effects (adapt to avatar actions)

### Rework
- Movement system (WASD moves character, not cursor)
- Station interaction (proximity-based, not selection)
- Visual perspective (need to see kitchen layout)
- Carrying system (visible on character)

### New
- Character sprite/model
- Kitchen tilemap or layout
- Walking animation
- Collision detection
- Camera system
- Station interaction zones

## Open Questions

1. **Perspective:** Top-down? Isometric? Side-view?
2. **Carry capacity:** One dish at a time? Tray/stack?
3. **Speed:** Walking speed as upgrade?
4. **Kitchen size:** How big? Multiple rooms eventually?

## MVP for Pivot

1. Character that moves with WASD
2. Simple kitchen layout (rectangular, stations around edges)
3. Pick up / put down dishes
4. Walk to dishwasher → Tetris modal opens
5. Basic flow: Intake → Dishwasher → Storage

## References

- **Overcooked** — avatar movement in kitchen chaos
- **Diner Dash** — spatial routing between zones
- **Stardew Valley** — top-down movement + interaction zones
