/**
 * NPC System for Dishwasher Sim
 * Chefs and waitstaff that create moving obstacles
 */

import { KITCHEN_CONFIG, OBSTACLES } from './kitchen.js';
import { CHARACTER_CONFIG } from './character.js';

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
    }
};

// Waypoint zones for NPCs (areas they patrol between)
const WAYPOINTS = {
    chef: [
        // Prep area (top left of center island)
        { x: 280, y: 200, name: 'prep' },
        // Stove area (bottom left)
        { x: 180, y: 450, name: 'stove' },
        // Plating area (right side, near drying)
        { x: 600, y: 350, name: 'plating' },
        // Center island
        { x: 420, y: 200, name: 'island' },
        // Near storage
        { x: 420, y: 180, name: 'storage-area' }
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
    ]
};

/**
 * Individual NPC entity
 */
export class NPC {
    constructor(type, id) {
        this.type = type;
        this.id = id;
        this.config = NPC_CONFIG[type];
        
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
        
        // State
        this.state = 'idle'; // 'idle', 'walking', 'paused'
        this.pauseTimer = Math.random() * 2; // Start with random pause
        this.facingRight = Math.random() > 0.5;
        this.walkTime = 0;
        
        // Carrying item (for waiters bringing dirty dishes)
        this.carryingDish = false;
        
        // Pick initial target
        this.pickNewTarget();
    }
    
    /**
     * Choose a new waypoint to walk to
     */
    pickNewTarget() {
        const waypoints = WAYPOINTS[this.type];
        let target;
        
        // Don't pick the same waypoint we're at
        do {
            target = waypoints[Math.floor(Math.random() * waypoints.length)];
        } while (
            Math.abs(target.x - this.x) < 50 && 
            Math.abs(target.y - this.y) < 50 &&
            waypoints.length > 1
        );
        
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
            this.state = 'paused';
            this.pauseTimer = this.config.pauseMin + 
                Math.random() * (this.config.pauseMax - this.config.pauseMin);
            this.vx = 0;
            this.vy = 0;
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
        this.currentWave = 1;
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
        
        // Spawn chefs
        for (let i = 0; i < chefCount; i++) {
            this.spawnNPC('chef');
        }
        
        // Spawn waiters
        for (let i = 0; i < waiterCount; i++) {
            this.spawnNPC('waiter');
        }
        
        console.log(`Wave ${wave}: Spawned ${chefCount} chefs, ${waiterCount} waiters`);
    }
    
    /**
     * Spawn a new NPC
     */
    spawnNPC(type) {
        const npc = new NPC(type, this.nextId++);
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
    }
    
    /**
     * Check collision between player and NPCs
     * @param {Character} character - The player character
     * @returns {NPC|null} The NPC that was collided with, or null
     */
    checkPlayerCollision(character) {
        if (character.isStunned) return null; // Can't bump while stunned
        
        const charBox = character.getHitbox();
        
        for (const npc of this.npcs) {
            const npcBox = npc.getHitbox();
            
            // AABB collision check
            if (charBox.x < npcBox.x + npcBox.width &&
                charBox.x + charBox.width > npcBox.x &&
                charBox.y < npcBox.y + npcBox.height &&
                charBox.y + charBox.height > npcBox.y) {
                return npc;
            }
        }
        
        return null;
    }
    
    /**
     * Get all NPCs for rendering
     */
    getAll() {
        return this.npcs;
    }
    
    /**
     * Clear all NPCs
     */
    clear() {
        this.npcs = [];
    }
}
