/**
 * NPC System for Dishwasher Sim
 * Chefs, waitstaff, and bussers that create moving obstacles
 */

import { KITCHEN_CONFIG, OBSTACLES, STATION_ZONES } from './kitchen.js';
import { CHARACTER_CONFIG } from './character.js';

// Collision types for refined collision system
export const COLLISION_TYPE = {
    NONE: 'none',
    LIGHT_BUMP: 'light_bump',     // Glancing contact - slowdown only
    HARD_COLLISION: 'hard',       // Direct hit - drop dish if carrying
    HEAD_ON: 'head_on'            // Both moving toward each other - chaos!
};

// NPC Configuration
export const NPC_CONFIG = {
    // Chef NPCs
    chef: {
        emoji: '👨‍🍳',
        bodyColor: '#e8e8e8',  // White chef coat
        speed: 80,
        speedVariance: 30,
        width: 32,
        height: 32,
        pauseMin: 1.0,        // Min seconds at waypoint
        pauseMax: 3.0,        // Max seconds at waypoint
        cookTime: 4.0,        // Seconds to "cook" at a station
        cookTimeVariance: 2.0 // Random variance
    },
    // Waiter NPCs  
    waiter: {
        emoji: '🧑‍💼',
        bodyColor: '#2c2c2c',  // Black vest
        speed: 120,
        speedVariance: 20,
        width: 28,
        height: 28,
        pauseMin: 0.5,
        pauseMax: 1.5,
    },
    // Busser NPCs - bring dirty dishes from dining
    busser: {
        emoji: '🧑‍🔧',
        bodyColor: '#4a4a5a',  // Gray uniform
        speed: 100,
        speedVariance: 15,
        width: 30,
        height: 30,
        pauseMin: 0.3,
        pauseMax: 1.0,
        tubEmoji: '🗑️'        // Bus tub indicator
    }
};

// Waypoint zones for NPCs (areas they patrol between)
const WAYPOINTS = {
    chef: [
        // Prep area (top left of center island)
        { x: 280, y: 200, name: 'prep', isStation: true },
        // Stove area (bottom left)
        { x: 180, y: 450, name: 'stove', isStation: true },
        // Plating area (right side, near drying)
        { x: 600, y: 350, name: 'plating', isStation: true },
        // Center island
        { x: 420, y: 200, name: 'island', isStation: true },
        // Near storage
        { x: 420, y: 180, name: 'storage-area', isStation: false }
    ],
    waiter: [
        // Pass window (left side intake area)
        { x: 160, y: 350, name: 'pass' },
        // Offscreen dining (right edge)
        { x: 720, y: 400, name: 'dining' },
        // Near intake (bringing dirty dishes)
        { x: 130, y: 380, name: 'intake-drop' },
        // Near plating (picking up orders)
        { x: 620, y: 280, name: 'pickup' }
    ],
    busser: [
        // Offscreen dining area (where dirty dishes come from)
        { x: 760, y: 350, name: 'dining' },
        // Primary intake zone
        { x: 110, y: 350, name: 'intake-primary', isDropZone: true, priority: 0 },
        // Overflow zone 1 (above primary)
        { x: 110, y: 240, name: 'overflow-1', isDropZone: true, priority: 1 },
        // Overflow zone 2 (below primary)
        { x: 110, y: 460, name: 'overflow-2', isDropZone: true, priority: 2 }
    ]
};

/**
 * Individual NPC entity
 */
export class NPC {
    constructor(type, id, npcManager = null) {
        this.type = type;
        this.id = id;
        this.config = NPC_CONFIG[type];
        this.npcManager = npcManager;
        
        // Position - start at random waypoint
        const waypoints = WAYPOINTS[type];
        const startWP = waypoints[Math.floor(Math.random() * waypoints.length)];
        this.x = startWP.x + (Math.random() - 0.5) * 40;
        this.y = startWP.y + (Math.random() - 0.5) * 40;
        
        // Movement
        this.speed = this.config.speed + (Math.random() - 0.5) * this.config.speedVariance * 2;
        this.vx = 0;
        this.vy = 0;
        this.targetX = this.x;
        this.targetY = this.y;
        this.currentWaypoint = null;
        
        // State
        this.state = 'idle'; // 'idle', 'walking', 'paused', 'cooking'
        this.pauseTimer = Math.random() * 2; // Start with random pause
        this.facingRight = Math.random() > 0.5;
        this.walkTime = 0;
        
        // Carrying item (for waiters/bussers bringing dishes)
        this.carryingDish = false;
        this.carryingTub = false; // Bussers carry bus tubs
        
        // Chef cooking progress (for progress bars)
        this.cookingProgress = 0;     // 0-1 progress
        this.cookingDuration = 0;     // Total cooking time for this station
        this.isCooking = false;
        
        // Pick initial target
        this.pickNewTarget();
    }
    
    /**
     * Choose a new waypoint to walk to
     */
    pickNewTarget() {
        const waypoints = WAYPOINTS[this.type];
        let target;
        
        // Busser logic: check if carrying dishes and find appropriate drop zone
        if (this.type === 'busser') {
            if (this.carryingTub) {
                // Find the best available drop zone
                target = this.findBestDropZone();
            } else {
                // Go to dining to pick up dishes
                target = waypoints.find(wp => wp.name === 'dining');
            }
        } else {
            // Don't pick the same waypoint we're at
            do {
                target = waypoints[Math.floor(Math.random() * waypoints.length)];
            } while (
                Math.abs(target.x - this.x) < 50 && 
                Math.abs(target.y - this.y) < 50 &&
                waypoints.length > 1
            );
        }
        
        this.currentWaypoint = target;
        
        // Add some randomness to exact position
        this.targetX = target.x + (Math.random() - 0.5) * 60;
        this.targetY = target.y + (Math.random() - 0.5) * 60;
        
        // Clamp to bounds
        this.targetX = Math.max(60, Math.min(KITCHEN_CONFIG.width - 60, this.targetX));
        this.targetY = Math.max(60, Math.min(KITCHEN_CONFIG.height - 60, this.targetY));
        
        // Waiters sometimes carry dishes
        if (this.type === 'waiter') {
            this.carryingDish = Math.random() > 0.6;
        }
    }
    
    /**
     * Find the best drop zone for a busser (primary first, then overflow)
     */
    findBestDropZone() {
        const dropZones = WAYPOINTS.busser.filter(wp => wp.isDropZone);
        dropZones.sort((a, b) => a.priority - b.priority);
        
        // Check if primary intake is full (use npcManager callback)
        if (this.npcManager && this.npcManager.isIntakeFull()) {
            // Try overflow zones
            for (let i = 1; i < dropZones.length; i++) {
                if (!this.npcManager.isOverflowFull(i)) {
                    return dropZones[i];
                }
            }
        }
        
        // Default to primary
        return dropZones[0];
    }
    
    /**
     * Update NPC position and state
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        switch (this.state) {
            case 'idle':
                this.state = 'walking';
                break;
                
            case 'paused':
                this.pauseTimer -= dt;
                if (this.pauseTimer <= 0) {
                    this.pickNewTarget();
                    this.state = 'walking';
                }
                break;
                
            case 'cooking':
                // Chef cooking progress
                this.cookingProgress += dt / this.cookingDuration;
                if (this.cookingProgress >= 1) {
                    this.cookingProgress = 0;
                    this.isCooking = false;
                    this.pickNewTarget();
                    this.state = 'walking';
                }
                break;
                
            case 'walking':
                this.moveTowardTarget(dt);
                break;
        }
        
        // Update animation
        if (this.state === 'walking') {
            this.walkTime += dt * 8;
        }
    }
    
    /**
     * Move toward current target
     */
    moveTowardTarget(dt) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Arrived at target?
        if (dist < 10) {
            this.vx = 0;
            this.vy = 0;
            
            // Chef behavior: start cooking at stations
            if (this.type === 'chef' && this.currentWaypoint?.isStation) {
                this.state = 'cooking';
                this.isCooking = true;
                this.cookingProgress = 0;
                const baseTime = this.config.cookTime;
                const variance = this.config.cookTimeVariance;
                this.cookingDuration = baseTime + (Math.random() - 0.5) * variance * 2;
                return;
            }
            
            // Busser behavior: drop dishes or pick them up
            if (this.type === 'busser') {
                if (this.currentWaypoint?.name === 'dining') {
                    // Pick up dirty dishes from dining
                    this.carryingTub = true;
                } else if (this.currentWaypoint?.isDropZone && this.carryingTub) {
                    // Drop off dishes at intake
                    this.carryingTub = false;
                    // Notify the game to spawn dishes
                    if (this.npcManager?.onBusserDropoff) {
                        this.npcManager.onBusserDropoff(this.currentWaypoint.priority || 0);
                    }
                }
            }
            
            this.state = 'paused';
            this.pauseTimer = this.config.pauseMin + 
                Math.random() * (this.config.pauseMax - this.config.pauseMin);
            return;
        }
        
        // Calculate velocity
        const moveX = (dx / dist) * this.speed;
        const moveY = (dy / dist) * this.speed;
        
        // Smooth acceleration
        this.vx += (moveX - this.vx) * 5 * dt;
        this.vy += (moveY - this.vy) * 5 * dt;
        
        // Update facing
        if (Math.abs(this.vx) > 10) {
            this.facingRight = this.vx > 0;
        }
        
        // Calculate new position
        let newX = this.x + this.vx * dt;
        let newY = this.y + this.vy * dt;
        
        // Simple obstacle avoidance - check if new position is valid
        if (this.isPositionValid(newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else {
            // Try to slide along obstacle
            if (this.isPositionValid(newX, this.y)) {
                this.x = newX;
                this.vy *= 0.5;
            } else if (this.isPositionValid(this.x, newY)) {
                this.y = newY;
                this.vx *= 0.5;
            } else {
                // Stuck - pick new target
                this.pickNewTarget();
            }
        }
    }
    
    /**
     * Get cooking progress (0-1) for progress bar display
     */
    getCookingProgress() {
        if (this.type !== 'chef' || !this.isCooking) return 0;
        return Math.min(1, Math.max(0, this.cookingProgress));
    }
    
    /**
     * Check if position is valid (not in obstacle)
     */
    isPositionValid(x, y) {
        // Check bounds
        const margin = 30;
        if (x < margin || x > KITCHEN_CONFIG.width - margin ||
            y < margin || y > KITCHEN_CONFIG.height - margin) {
            return false;
        }
        
        // Check obstacles
        const hw = this.config.width / 2;
        const hh = this.config.height / 2;
        
        for (const obs of OBSTACLES) {
            if (x + hw > obs.x && x - hw < obs.x + obs.width &&
                y + hh > obs.y && y - hh < obs.y + obs.height) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get bob offset for walking animation
     */
    getBobOffset() {
        if (this.state !== 'walking') return 0;
        return Math.sin(this.walkTime) * 2;
    }
    
    /**
     * Get hitbox for collision detection
     */
    getHitbox() {
        return {
            x: this.x - this.config.width / 2,
            y: this.y - this.config.height / 2,
            width: this.config.width,
            height: this.config.height
        };
    }
}

/**
 * NPC Manager - handles spawning and updating all NPCs
 */
export class NPCManager {
    constructor() {
        this.npcs = [];
        this.nextId = 1;
        
        // Wave-based spawning config
        this.baseChefCount = 1;
        this.baseWaiterCount = 1;
        this.baseBusserCount = 1;
        this.currentWave = 1;
        
        // Restaurant state (drives dish spawn rate)
        this.restaurantState = {
            tablesSeated: 0,
            tablesTotal: 10,
            guestsWaiting: 0
        };
        
        // Intake/overflow state (callbacks from game)
        this.intakeCount = 0;
        this.intakeCapacity = 5;
        this.overflowCapacity = [3, 3]; // Two overflow zones
        this.overflowCounts = [0, 0];
        
        // Callback for when busser drops off dishes
        this.onBusserDropoff = null;
    }
    
    /**
     * Set up NPCs for a wave
     * @param {number} wave - Current wave number (1-based)
     */
    setupWave(wave) {
        this.currentWave = wave;
        this.npcs = [];
        
        // More NPCs in later waves
        const chefCount = this.baseChefCount + Math.floor(wave / 2);
        const waiterCount = this.baseWaiterCount + Math.floor((wave - 1) / 2);
        const busserCount = this.baseBusserCount + Math.floor((wave - 1) / 3);
        
        // Spawn chefs
        for (let i = 0; i < chefCount; i++) {
            this.spawnNPC('chef');
        }
        
        // Spawn waiters
        for (let i = 0; i < waiterCount; i++) {
            this.spawnNPC('waiter');
        }
        
        // Spawn bussers
        for (let i = 0; i < busserCount; i++) {
            this.spawnNPC('busser');
        }
        
        // Initialize restaurant state based on wave
        this.restaurantState.tablesSeated = Math.min(wave * 2, this.restaurantState.tablesTotal);
        this.restaurantState.guestsWaiting = Math.floor(wave * 1.5);
        
        console.log(`Wave ${wave}: Spawned ${chefCount} chefs, ${waiterCount} waiters, ${busserCount} bussers`);
    }
    
    /**
     * Spawn a new NPC
     */
    spawnNPC(type) {
        const npc = new NPC(type, this.nextId++, this);
        this.npcs.push(npc);
        return npc;
    }
    
    /**
     * Update all NPCs
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        for (const npc of this.npcs) {
            npc.update(dt);
        }
        
        // Slowly fluctuate restaurant state
        if (Math.random() < 0.01) { // ~1% chance per frame
            this.updateRestaurantState();
        }
    }
    
    /**
     * Update restaurant state (simulates dining room activity)
     */
    updateRestaurantState() {
        const state = this.restaurantState;
        
        // Random fluctuation
        if (Math.random() > 0.5 && state.guestsWaiting > 0 && state.tablesSeated < state.tablesTotal) {
            // Seat a guest
            state.tablesSeated++;
            state.guestsWaiting--;
        } else if (Math.random() > 0.7 && state.tablesSeated > 0) {
            // Table finishes and leaves
            state.tablesSeated--;
        }
        
        // New guests arrive
        if (Math.random() > 0.6) {
            state.guestsWaiting = Math.min(state.guestsWaiting + 1, 15);
        }
    }
    
    /**
     * Check if primary intake is full
     */
    isIntakeFull() {
        return this.intakeCount >= this.intakeCapacity;
    }
    
    /**
     * Check if an overflow zone is full
     */
    isOverflowFull(index) {
        if (index < 1 || index > this.overflowCounts.length) return true;
        return this.overflowCounts[index - 1] >= this.overflowCapacity[index - 1];
    }
    
    /**
     * Update intake counts (called by game)
     */
    setIntakeState(intakeCount, overflow1 = 0, overflow2 = 0) {
        this.intakeCount = intakeCount;
        this.overflowCounts = [overflow1, overflow2];
    }
    
    /**
     * Get restaurant state for HUD display
     */
    getRestaurantState() {
        return { ...this.restaurantState };
    }
    
    /**
     * Refined collision detection between player and NPCs
     * @param {Character} character - The player character
     * @returns {{ npc: NPC, type: string, overlap: number } | null} Collision info or null
     */
    checkPlayerCollision(character) {
        if (character.isStunned) return null; // Can't bump while stunned
        
        const charBox = character.getHitbox();
        const charVx = character.vx || 0;
        const charVy = character.vy || 0;
        const charSpeed = Math.sqrt(charVx * charVx + charVy * charVy);
        
        for (const npc of this.npcs) {
            const npcBox = npc.getHitbox();
            
            // AABB collision check
            if (charBox.x < npcBox.x + npcBox.width &&
                charBox.x + charBox.width > npcBox.x &&
                charBox.y < npcBox.y + npcBox.height &&
                charBox.y + charBox.height > npcBox.y) {
                
                // Calculate overlap amount
                const overlapX = Math.min(
                    charBox.x + charBox.width - npcBox.x,
                    npcBox.x + npcBox.width - charBox.x
                );
                const overlapY = Math.min(
                    charBox.y + charBox.height - npcBox.y,
                    npcBox.y + npcBox.height - charBox.y
                );
                const overlap = Math.min(overlapX, overlapY);
                
                // Determine collision type based on velocities and overlap
                const collisionType = this.determineCollisionType(
                    character, npc, overlap, charSpeed
                );
                
                return { npc, type: collisionType, overlap };
            }
        }
        
        return null;
    }
    
    /**
     * Determine collision type based on velocities and overlap
     */
    determineCollisionType(character, npc, overlap, charSpeed) {
        const npcSpeed = Math.sqrt(npc.vx * npc.vx + npc.vy * npc.vy);
        
        // Check if moving toward each other (head-on)
        const charVx = character.vx || 0;
        const charVy = character.vy || 0;
        const dotProduct = charVx * (-npc.vx) + charVy * (-npc.vy);
        const isHeadOn = dotProduct > 0 && charSpeed > 50 && npcSpeed > 30;
        
        // Waiter carrying dishes + head-on = chaos
        if (isHeadOn && npc.carryingDish && npc.type === 'waiter') {
            return COLLISION_TYPE.HEAD_ON;
        }
        
        // Small overlap + low speed = light bump
        if (overlap < 8 && charSpeed < 100) {
            return COLLISION_TYPE.LIGHT_BUMP;
        }
        
        // Significant overlap or high speed = hard collision
        if (overlap > 12 || charSpeed > 150) {
            return COLLISION_TYPE.HARD_COLLISION;
        }
        
        // Default to light bump
        return COLLISION_TYPE.LIGHT_BUMP;
    }
    
    /**
     * Get all NPCs for rendering
     */
    getAll() {
        return this.npcs;
    }
    
    /**
     * Get all chefs (for progress bar rendering)
     */
    getChefs() {
        return this.npcs.filter(npc => npc.type === 'chef');
    }
    
    /**
     * Get all bussers
     */
    getBussers() {
        return this.npcs.filter(npc => npc.type === 'busser');
    }
    
    /**
     * Clear all NPCs
     */
    clear() {
        this.npcs = [];
    }
}
