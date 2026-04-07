/**
 * Kitchen Layout & Collision System
 * Defines the spatial kitchen floor with stations, walls, and walkable areas
 */

export const KITCHEN_CONFIG = {
    // Kitchen dimensions (in pixels)
    width: 800,
    height: 600,
    
    // Tile size for collision grid
    tileSize: 40,
    
    // Station zone radius for interaction
    interactionRadius: 60
};

// Station definitions with positions and dimensions
export const STATION_ZONES = {
    intake: {
        x: 60,
        y: 300,
        width: 100,
        height: 150,
        emoji: '📥',
        label: 'Intake',
        color: '#e74c3c'
    },
    dishwasher: {
        x: 350,
        y: 480,
        width: 150,
        height: 100,
        emoji: '🫧',
        label: 'Dishwasher',
        color: '#0f9b8e'
    },
    drying: {
        x: 680,
        y: 300,
        width: 100,
        height: 150,
        emoji: '💨',
        label: 'Drying',
        color: '#3498db'
    },
    storage: {
        x: 350,
        y: 60,
        width: 150,
        height: 100,
        emoji: '📦',
        label: 'Storage',
        color: '#9b59b6'
    }
};

// Obstacle/collision rectangles (counters, walls, etc.)
export const OBSTACLES = [
    // Top counter (behind storage)
    { x: 200, y: 0, width: 450, height: 40 },
    // Bottom counter (below dishwasher)
    { x: 200, y: 560, width: 450, height: 40 },
    // Left wall area
    { x: 0, y: 0, width: 40, height: 600 },
    // Right wall area
    { x: 760, y: 0, width: 40, height: 600 },
    // Kitchen island (center)
    { x: 320, y: 250, width: 200, height: 120 }
];

// Floor tiles for visual grid (optional visual element)
export const FLOOR_PATTERN = {
    tileSize: 40,
    primaryColor: '#2a2a3e',
    secondaryColor: '#252538',
    groutColor: '#1a1a2e'
};

/**
 * Kitchen class manages spatial layout and collision detection
 */
export class Kitchen {
    constructor() {
        this.width = KITCHEN_CONFIG.width;
        this.height = KITCHEN_CONFIG.height;
        this.stations = { ...STATION_ZONES };
        this.obstacles = [...OBSTACLES];
        
        // Generate collision grid for efficient checking
        this.collisionGrid = this.buildCollisionGrid();
    }
    
    /**
     * Build a grid-based collision map for efficient lookups
     */
    buildCollisionGrid() {
        const tileSize = KITCHEN_CONFIG.tileSize;
        const cols = Math.ceil(this.width / tileSize);
        const rows = Math.ceil(this.height / tileSize);
        
        // Initialize grid (true = walkable, false = blocked)
        const grid = Array(rows).fill(null).map(() => Array(cols).fill(true));
        
        // Mark obstacles as blocked
        for (const obs of this.obstacles) {
            const startCol = Math.floor(obs.x / tileSize);
            const endCol = Math.ceil((obs.x + obs.width) / tileSize);
            const startRow = Math.floor(obs.y / tileSize);
            const endRow = Math.ceil((obs.y + obs.height) / tileSize);
            
            for (let r = startRow; r < endRow && r < rows; r++) {
                for (let c = startCol; c < endCol && c < cols; c++) {
                    if (r >= 0 && c >= 0) {
                        grid[r][c] = false;
                    }
                }
            }
        }
        
        return grid;
    }
    
    /**
     * Check if a point is walkable (not inside an obstacle)
     */
    isWalkable(x, y) {
        // Check bounds
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        
        const tileSize = KITCHEN_CONFIG.tileSize;
        const col = Math.floor(x / tileSize);
        const row = Math.floor(y / tileSize);
        
        if (row < 0 || row >= this.collisionGrid.length || 
            col < 0 || col >= this.collisionGrid[0].length) {
            return false;
        }
        
        return this.collisionGrid[row][col];
    }
    
    /**
     * Check collision for a rectangular hitbox
     */
    canMoveTo(x, y, width, height) {
        // Check all four corners plus center points
        const points = [
            [x - width/2, y - height/2],           // top-left
            [x + width/2, y - height/2],           // top-right
            [x - width/2, y + height/2],           // bottom-left
            [x + width/2, y + height/2],           // bottom-right
            [x, y - height/2],                      // top-center
            [x, y + height/2],                      // bottom-center
            [x - width/2, y],                       // left-center
            [x + width/2, y]                        // right-center
        ];
        
        return points.every(([px, py]) => this.isWalkable(px, py));
    }
    
    /**
     * Get the station at a given position (if any)
     */
    getStationAt(x, y) {
        for (const [name, zone] of Object.entries(this.stations)) {
            const centerX = zone.x + zone.width / 2;
            const centerY = zone.y + zone.height / 2;
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            
            if (dist <= KITCHEN_CONFIG.interactionRadius) {
                return name;
            }
        }
        return null;
    }
    
    /**
     * Get the station zone the player is closest to
     */
    getNearestStation(x, y) {
        let nearest = null;
        let nearestDist = Infinity;
        
        for (const [name, zone] of Object.entries(this.stations)) {
            const centerX = zone.x + zone.width / 2;
            const centerY = zone.y + zone.height / 2;
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = { name, zone, distance: dist };
            }
        }
        
        return nearest;
    }
    
    /**
     * Check if player is within interaction range of a station
     */
    canInteractWith(playerX, playerY, stationName) {
        const zone = this.stations[stationName];
        if (!zone) return false;
        
        const centerX = zone.x + zone.width / 2;
        const centerY = zone.y + zone.height / 2;
        const dist = Math.sqrt((playerX - centerX) ** 2 + (playerY - centerY) ** 2);
        
        return dist <= KITCHEN_CONFIG.interactionRadius;
    }
    
    /**
     * Get spawn position (starting point for player)
     */
    getSpawnPoint() {
        return {
            x: this.width / 2,
            y: this.height / 2 + 50
        };
    }
}
