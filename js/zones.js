/**
 * Dishwasher Simulator - Interaction Zones
 * Handles proximity detection for station interactions
 */

import { STATIONS } from './game.js';

// Station zone definitions
// Coordinates are in grid units (1 unit = 32px typically)
// Will be positioned by the avatar agent's kitchen layout
export const STATION_ZONES = {
    [STATIONS.INTAKE]: {
        name: 'Intake',
        emoji: '📥',
        prompt: 'Press SPACE to grab dish',
        promptWithDish: 'Press SPACE to put dish back',
        x: 1,
        y: 3,
        width: 2,
        height: 2,
        radius: 1.5 // Interaction radius in grid units
    },
    [STATIONS.DISHWASHER]: {
        name: 'Dishwasher',
        emoji: '🫧',
        prompt: 'Press SPACE to open dishwasher',
        promptWithDish: 'Press SPACE to load dishwasher',
        x: 5,
        y: 2,
        width: 3,
        height: 2,
        radius: 1.5
    },
    [STATIONS.DRYING]: {
        name: 'Drying Rack',
        emoji: '💨',
        prompt: 'Press SPACE to grab clean dish',
        promptWithDish: 'Press SPACE to place on rack',
        x: 10,
        y: 2,
        width: 2,
        height: 2,
        radius: 1.5
    },
    [STATIONS.STORAGE]: {
        name: 'Storage',
        emoji: '📦',
        prompt: 'Grab a clean dish first',
        promptWithDish: 'Press SPACE to store dish',
        x: 10,
        y: 5,
        width: 2,
        height: 2,
        radius: 1.5
    }
};

export class ZoneManager {
    constructor(game) {
        this.game = game;
        this.currentZone = null;
        this.onZoneEnter = null;
        this.onZoneExit = null;
        this.zones = { ...STATION_ZONES };
    }
    
    /**
     * Update zone positions (called by avatar agent's kitchen layout)
     */
    setZonePosition(stationId, x, y, width = null, height = null) {
        if (this.zones[stationId]) {
            this.zones[stationId].x = x;
            this.zones[stationId].y = y;
            if (width !== null) this.zones[stationId].width = width;
            if (height !== null) this.zones[stationId].height = height;
        }
    }
    
    /**
     * Check if position is within a zone
     */
    isInZone(zone, px, py) {
        const centerX = zone.x + zone.width / 2;
        const centerY = zone.y + zone.height / 2;
        const distance = Math.sqrt(
            Math.pow(px - centerX, 2) + Math.pow(py - centerY, 2)
        );
        return distance <= zone.radius;
    }
    
    /**
     * Update player position and check zones
     * Call this from movement system
     */
    updatePlayerPosition(px, py) {
        let newZone = null;
        
        // Find which zone player is in (if any)
        for (const [stationId, zone] of Object.entries(this.zones)) {
            if (this.isInZone(zone, px, py)) {
                newZone = stationId;
                break;
            }
        }
        
        // Handle zone transitions
        if (newZone !== this.currentZone) {
            if (this.currentZone) {
                this.onZoneExit?.(this.currentZone, this.zones[this.currentZone]);
            }
            if (newZone) {
                this.onZoneEnter?.(newZone, this.zones[newZone]);
                // Update game's current station
                this.game.setStation(newZone);
            }
            this.currentZone = newZone;
        }
        
        return newZone;
    }
    
    /**
     * Get prompt for current zone
     */
    getPrompt() {
        if (!this.currentZone) return null;
        
        const zone = this.zones[this.currentZone];
        const hasDish = this.game.heldDish !== null;
        
        // Special case: storage needs clean dish
        if (this.currentZone === STATIONS.STORAGE && !hasDish) {
            return zone.prompt;
        }
        
        return hasDish ? zone.promptWithDish : zone.prompt;
    }
    
    /**
     * Get all zone data for rendering
     */
    getZones() {
        return this.zones;
    }
    
    /**
     * Get current zone info
     */
    getCurrentZone() {
        if (!this.currentZone) return null;
        return {
            id: this.currentZone,
            ...this.zones[this.currentZone]
        };
    }
    
    /**
     * Check if player can interact with current zone
     */
    canInteract() {
        if (!this.currentZone) return false;
        
        const hasDish = this.game.heldDish !== null;
        
        switch (this.currentZone) {
            case STATIONS.INTAKE:
                return true; // Can always interact (grab or put back)
            case STATIONS.DISHWASHER:
                return true; // Opens modal
            case STATIONS.DRYING:
                // Need clean dish to place, or can grab from rack
                if (hasDish) return !this.game.heldDish.dirty;
                return this.game.dryingRack.some(slot => slot !== null);
            case STATIONS.STORAGE:
                // Need clean dish to store
                return hasDish && !this.game.heldDish.dirty;
            default:
                return false;
        }
    }
}

export default ZoneManager;
