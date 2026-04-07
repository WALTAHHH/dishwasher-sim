/**
 * Character/Avatar System
 * Handles WASD movement, collision response, and character state
 */

import { KITCHEN_CONFIG } from './kitchen.js';

export const CHARACTER_CONFIG = {
    // Movement
    speed: 200,          // pixels per second
    acceleration: 1200,  // pixels per second squared
    friction: 800,       // deceleration when not moving
    
    // Hitbox
    width: 32,
    height: 32,
    
    // Visual
    emoji: '🧑‍🍳',      // Chef emoji
    bobSpeed: 8,        // walking animation bob speed
    bobAmount: 3        // walking animation bob pixels
};

export class Character {
    constructor(kitchen) {
        this.kitchen = kitchen;
        
        // Position
        const spawn = kitchen.getSpawnPoint();
        this.x = spawn.x;
        this.y = spawn.y;
        
        // Velocity
        this.vx = 0;
        this.vy = 0;
        
        // Input state
        this.input = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        // Animation state
        this.walkTime = 0;
        this.isWalking = false;
        this.facingRight = true;
        
        // Held item
        this.heldItem = null;
        
        // Current station proximity
        this.nearStation = null;
    }
    
    /**
     * Set input state from key events
     */
    setInput(direction, pressed) {
        this.input[direction] = pressed;
    }
    
    /**
     * Update character position and state
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        const config = CHARACTER_CONFIG;
        
        // Calculate target velocity from input
        let targetVx = 0;
        let targetVy = 0;
        
        if (this.input.left) targetVx -= 1;
        if (this.input.right) targetVx += 1;
        if (this.input.up) targetVy -= 1;
        if (this.input.down) targetVy += 1;
        
        // Normalize diagonal movement
        const inputMag = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
        if (inputMag > 0) {
            targetVx = (targetVx / inputMag) * config.speed;
            targetVy = (targetVy / inputMag) * config.speed;
            this.isWalking = true;
        } else {
            this.isWalking = false;
        }
        
        // Track facing direction
        if (targetVx > 0) this.facingRight = true;
        if (targetVx < 0) this.facingRight = false;
        
        // Apply acceleration/friction
        if (this.isWalking) {
            // Accelerate toward target
            const ax = (targetVx - this.vx) * config.acceleration * dt;
            const ay = (targetVy - this.vy) * config.acceleration * dt;
            this.vx += ax;
            this.vy += ay;
        } else {
            // Apply friction when not moving
            const friction = config.friction * dt;
            if (Math.abs(this.vx) < friction) {
                this.vx = 0;
            } else {
                this.vx -= Math.sign(this.vx) * friction;
            }
            if (Math.abs(this.vy) < friction) {
                this.vy = 0;
            } else {
                this.vy -= Math.sign(this.vy) * friction;
            }
        }
        
        // Calculate new position
        let newX = this.x + this.vx * dt;
        let newY = this.y + this.vy * dt;
        
        // Collision response - try each axis separately
        const hw = config.width / 2;
        const hh = config.height / 2;
        
        // Check X movement
        if (this.kitchen.canMoveTo(newX, this.y, config.width, config.height)) {
            this.x = newX;
        } else {
            this.vx = 0;
        }
        
        // Check Y movement
        if (this.kitchen.canMoveTo(this.x, newY, config.width, config.height)) {
            this.y = newY;
        } else {
            this.vy = 0;
        }
        
        // Update walking animation
        if (this.isWalking) {
            this.walkTime += dt * config.bobSpeed;
        }
        
        // Update station proximity
        this.nearStation = this.kitchen.getStationAt(this.x, this.y);
    }
    
    /**
     * Get the visual bob offset for walking animation
     */
    getBobOffset() {
        if (!this.isWalking && Math.abs(this.vx) < 10 && Math.abs(this.vy) < 10) {
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
}
