/**
 * Character/Avatar System
 * Grid-based movement with tap-to-step and hold-to-walk mechanics
 */

import { KITCHEN_CONFIG } from './kitchen.js';

export const CHARACTER_CONFIG = {
    // Grid movement
    gridSize: 40,           // pixels per grid cell (matches kitchen tile)
    moveTime: 0.15,         // seconds to move one cell (smooth interpolation)
    holdThreshold: 180,     // ms before continuous movement kicks in
    continuousDelay: 350,   // ms between steps when holding (2.8 cells/sec)
    
    // Hitbox
    width: 32,
    height: 32,
    
    // Visual - Dishwasher (the person washing dishes!)
    emoji: '🧽',            // Sponge - represents the dishwasher
    bodyColor: '#5a9bd4',   // Blue apron
    bobSpeed: 8,            // walking animation bob speed
    bobAmount: 3,           // walking animation bob pixels
    
    // NPC collision
    stunDuration: 0.5,      // seconds stunned after NPC bump
    stunSlowdown: 1.5       // movement time multiplier while stunned
};

export class Character {
    constructor(kitchen) {
        this.kitchen = kitchen;
        
        // Grid position (in cells)
        const spawn = kitchen.getSpawnPoint();
        this.gridX = Math.round(spawn.x / CHARACTER_CONFIG.gridSize);
        this.gridY = Math.round(spawn.y / CHARACTER_CONFIG.gridSize);
        
        // Actual render position (for smooth interpolation)
        this.x = this.gridX * CHARACTER_CONFIG.gridSize;
        this.y = this.gridY * CHARACTER_CONFIG.gridSize;
        
        // Movement interpolation
        this.isMoving = false;
        this.moveProgress = 0;      // 0 to 1
        this.fromX = this.x;
        this.fromY = this.y;
        this.toX = this.x;
        this.toY = this.y;
        
        // Input state with timing
        this.input = {
            up: { pressed: false, startTime: 0, lastStep: 0 },
            down: { pressed: false, startTime: 0, lastStep: 0 },
            left: { pressed: false, startTime: 0, lastStep: 0 },
            right: { pressed: false, startTime: 0, lastStep: 0 }
        };
        
        // Animation state
        this.walkTime = 0;
        this.isWalking = false;
        this.facingRight = true;
        
        // Held item
        this.heldItem = null;
        
        // Current station proximity
        this.nearStation = null;
        
        // Stun state (from NPC collisions)
        this.stunTime = 0;
        this.isStunned = false;
        this.lastNPCBumpMessage = '';
        
        // Movement queue - allows buffering next direction
        this.queuedDirection = null;
    }
    
    /**
     * Set input state from key events
     */
    setInput(direction, pressed) {
        const now = performance.now();
        const inputState = this.input[direction];
        
        if (pressed && !inputState.pressed) {
            // Key just pressed
            inputState.pressed = true;
            inputState.startTime = now;
            inputState.lastStep = 0;
            
            // Try to move immediately (tap response)
            this.tryMove(direction);
        } else if (!pressed && inputState.pressed) {
            // Key released
            inputState.pressed = false;
            inputState.startTime = 0;
            inputState.lastStep = 0;
        }
    }
    
    /**
     * Get direction vector for a direction name
     */
    getDirectionVector(direction) {
        switch (direction) {
            case 'up': return { dx: 0, dy: -1 };
            case 'down': return { dx: 0, dy: 1 };
            case 'left': return { dx: -1, dy: 0 };
            case 'right': return { dx: 1, dy: 0 };
            default: return { dx: 0, dy: 0 };
        }
    }
    
    /**
     * Attempt to move one cell in a direction
     */
    tryMove(direction) {
        // Can't start new move while already moving
        if (this.isMoving) {
            // Queue this direction for when current move completes
            this.queuedDirection = direction;
            return false;
        }
        
        const config = CHARACTER_CONFIG;
        const { dx, dy } = this.getDirectionVector(direction);
        
        if (dx === 0 && dy === 0) {
            return false;
        }
        
        // Calculate target grid position
        const targetGridX = this.gridX + dx;
        const targetGridY = this.gridY + dy;
        
        // Convert to pixel position (center of cell)
        const targetX = targetGridX * config.gridSize;
        const targetY = targetGridY * config.gridSize;
        
        // Check collision
        if (!this.kitchen.canMoveTo(targetX, targetY, config.width, config.height)) {
            return false;
        }
        
        // Update facing direction
        if (dx > 0) this.facingRight = true;
        if (dx < 0) this.facingRight = false;
        
        // Start the move
        this.isMoving = true;
        this.moveProgress = 0;
        this.fromX = this.x;
        this.fromY = this.y;
        this.toX = targetX;
        this.toY = targetY;
        this.gridX = targetGridX;
        this.gridY = targetGridY;
        
        return true;
    }
    
    /**
     * Get the currently active direction (prioritizes most recent)
     */
    getActiveDirection() {
        const now = performance.now();
        let activeDir = null;
        let latestTime = 0;
        
        for (const [dir, state] of Object.entries(this.input)) {
            if (state.pressed && state.startTime > latestTime) {
                latestTime = state.startTime;
                activeDir = dir;
            }
        }
        
        return activeDir;
    }
    
    /**
     * Update character position and state
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        const config = CHARACTER_CONFIG;
        const now = performance.now();
        
        // Update stun timer
        if (this.stunTime > 0) {
            this.stunTime -= dt;
            if (this.stunTime <= 0) {
                this.stunTime = 0;
                this.isStunned = false;
            }
        }
        
        // Handle move interpolation
        if (this.isMoving) {
            const moveSpeed = this.isStunned ? config.moveTime * config.stunSlowdown : config.moveTime;
            this.moveProgress += dt / moveSpeed;
            
            if (this.moveProgress >= 1) {
                // Movement complete - snap to grid
                this.moveProgress = 1;
                this.x = this.toX;
                this.y = this.toY;
                this.isMoving = false;
                
                // Check for queued direction first
                if (this.queuedDirection) {
                    const queuedDir = this.queuedDirection;
                    this.queuedDirection = null;
                    if (this.input[queuedDir]?.pressed) {
                        this.tryMove(queuedDir);
                    }
                }
                
                // If no queued move started, check for held key continuous movement
                if (!this.isMoving) {
                    const activeDir = this.getActiveDirection();
                    if (activeDir) {
                        const state = this.input[activeDir];
                        const holdDuration = now - state.startTime;
                        
                        // Only continue if held long enough
                        if (holdDuration > config.holdThreshold) {
                            this.tryMove(activeDir);
                            state.lastStep = now;
                        }
                    }
                }
            } else {
                // Smooth interpolation with easing (ease-out for snappy feel)
                const t = this.easeOutQuad(this.moveProgress);
                this.x = this.fromX + (this.toX - this.fromX) * t;
                this.y = this.fromY + (this.toY - this.fromY) * t;
            }
            
            this.isWalking = true;
        } else {
            // Not moving - check for held keys that should trigger continuous movement
            const activeDir = this.getActiveDirection();
            if (activeDir) {
                const state = this.input[activeDir];
                const holdDuration = now - state.startTime;
                const timeSinceLastStep = now - state.lastStep;
                
                // Continuous movement after hold threshold
                if (holdDuration > config.holdThreshold && timeSinceLastStep > config.continuousDelay) {
                    if (this.tryMove(activeDir)) {
                        state.lastStep = now;
                    }
                }
            }
            
            this.isWalking = false;
        }
        
        // Update walking animation
        if (this.isWalking) {
            this.walkTime += dt * config.bobSpeed;
        }
        
        // Update station proximity
        this.nearStation = this.kitchen.getStationAt(this.x, this.y);
    }
    
    /**
     * Ease-out quadratic for snappy movement feel
     */
    easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }
    
    /**
     * Apply stun effect from NPC collision
     */
    applyStun(npcType) {
        const config = CHARACTER_CONFIG;
        this.stunTime = config.stunDuration;
        this.isStunned = true;
        
        // Generate bump message
        const messages = {
            chef: ["Watch it!", "Coming through!", "Hot pan!", "Behind you!"],
            waiter: ["Excuse me!", "Order up!", "Make way!", "Busy here!"]
        };
        const msgList = messages[npcType] || messages.chef;
        this.lastNPCBumpMessage = msgList[Math.floor(Math.random() * msgList.length)];
    }
    
    /**
     * Get the visual bob offset for walking animation
     */
    getBobOffset() {
        if (!this.isWalking) {
            return 0;
        }
        return Math.sin(this.walkTime) * CHARACTER_CONFIG.bobAmount;
    }
    
    /**
     * Pick up an item
     */
    pickUp(item) {
        if (this.heldItem) return false;
        this.heldItem = item;
        return true;
    }
    
    /**
     * Put down held item
     */
    putDown() {
        const item = this.heldItem;
        this.heldItem = null;
        return item;
    }
    
    /**
     * Check if character has an item
     */
    isHolding() {
        return this.heldItem !== null;
    }
    
    /**
     * Get current station (if in range)
     */
    getCurrentStation() {
        return this.nearStation;
    }
    
    /**
     * Get position
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    /**
     * Get hitbox
     */
    getHitbox() {
        return {
            x: this.x - CHARACTER_CONFIG.width / 2,
            y: this.y - CHARACTER_CONFIG.height / 2,
            width: CHARACTER_CONFIG.width,
            height: CHARACTER_CONFIG.height
        };
    }
    
    /**
     * Get grid position (for debugging/display)
     */
    getGridPosition() {
        return { gridX: this.gridX, gridY: this.gridY };
    }
    
    /**
     * Get effective velocity (for collision detection compatibility)
     * Returns a velocity vector based on current movement direction
     */
    get vx() {
        if (!this.isMoving) return 0;
        const direction = this.toX - this.fromX;
        // Return a normalized velocity representing movement speed
        return direction !== 0 ? Math.sign(direction) * 100 : 0;
    }
    
    get vy() {
        if (!this.isMoving) return 0;
        const direction = this.toY - this.fromY;
        return direction !== 0 ? Math.sign(direction) * 100 : 0;
    }
}
