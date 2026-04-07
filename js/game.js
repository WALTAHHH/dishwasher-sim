/**
 * Dishwasher Simulator - Core Game Logic
 */

// Dish definitions with Tetris shapes
export const DISHES = {
    plate: {
        name: 'Plate',
        emoji: '🍽️',
        shape: [[1, 1]], // 2x1 horizontal
        canDishwasher: true,
        needsSoak: false,
        needsTowelDry: false
    },
    bowl: {
        name: 'Bowl',
        emoji: '🥣',
        shape: [[1, 1], [1, 1]], // 2x2
        canDishwasher: true,
        needsSoak: false,
        needsTowelDry: false
    },
    cup: {
        name: 'Cup',
        emoji: '☕',
        shape: [[1], [1]], // 1x2 vertical
        canDishwasher: true,
        needsSoak: false,
        needsTowelDry: false
    },
    pan: {
        name: 'Pan',
        emoji: '🍳',
        shape: [[1, 1, 1], [1, 0, 0]], // L-shape
        canDishwasher: false,
        needsSoak: true,
        needsTowelDry: true
    },
    glass: {
        name: 'Wine Glass',
        emoji: '🍷',
        shape: [[1], [1]], // 1x2 vertical
        canDishwasher: false, // Hand wash only!
        needsSoak: false,
        needsTowelDry: true
    }
};

// Station types
export const STATIONS = {
    INTAKE: 'intake',
    DISHWASHER: 'dishwasher',
    DRYING: 'drying',
    STORAGE: 'storage'
};

export class Game {
    constructor() {
        this.isRunning = false;
        this.currentStation = STATIONS.INTAKE;
        this.heldDish = null;
        
        // Dishwasher grid (8 wide, 6 tall)
        this.gridWidth = 8;
        this.gridHeight = 6;
        this.grid = this.createEmptyGrid();
        
        // Game state
        this.intake = [];
        this.dryingRack = [null, null, null, null]; // 4 slots
        this.storage = { plate: 0, bowl: 0, cup: 0, pan: 0, glass: 0 };
        this.dishwasherRunning = false;
        this.cycleProgress = 0;
        
        // Cursor position (for grid navigation)
        this.cursorX = 0;
        this.cursorY = 0;
        
        // Shift state
        this.wave = 1;
        this.totalWaves = 3;
        this.timeRemaining = 180; // 3 minutes
        this.dishesClean = 0;
        
        // Callbacks for UI updates
        this.onUpdate = null;
        this.onGameOver = null;
        
        // Wave spawning
        this.spawnTimer = null;
        this.gameTimer = null;
    }
    
    createEmptyGrid() {
        return Array(this.gridHeight).fill(null)
            .map(() => Array(this.gridWidth).fill(null));
    }
    
    startShift() {
        this.isRunning = true;
        this.wave = 1;
        this.timeRemaining = 180;
        this.dishesClean = 0;
        this.grid = this.createEmptyGrid();
        this.intake = [];
        this.dryingRack = [null, null, null, null];
        this.storage = { plate: 0, bowl: 0, cup: 0, pan: 0, glass: 0 };
        this.heldDish = null;
        this.dishwasherRunning = false;
        this.currentStation = STATIONS.INTAKE;
        
        // Start spawning dishes
        this.startWave();
        
        // Start game timer
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            this.onUpdate?.();
            
            if (this.timeRemaining <= 0) {
                this.endShift(false);
            }
        }, 1000);
        
        this.onUpdate?.();
    }
    
    startWave() {
        // Spawn dishes for this wave
        const dishesToSpawn = 5 + (this.wave * 3); // More each wave
        let spawned = 0;
        
        this.spawnTimer = setInterval(() => {
            if (spawned >= dishesToSpawn) {
                clearInterval(this.spawnTimer);
                return;
            }
            
            this.spawnDish();
            spawned++;
            
            // Check for overflow
            if (this.intake.length > 10) {
                this.endShift(false);
            }
            
            this.onUpdate?.();
        }, 2000); // Spawn every 2 seconds
    }
    
    spawnDish() {
        const types = ['plate', 'plate', 'plate', 'bowl', 'bowl', 'cup', 'cup', 'pan', 'glass'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.intake.push({
            id: Date.now() + Math.random(),
            type: type,
            ...DISHES[type],
            rotation: 0,
            dirty: true
        });
    }
    
    moveCursor(dx, dy) {
        if (this.currentStation === STATIONS.DISHWASHER) {
            this.cursorX = Math.max(0, Math.min(this.gridWidth - 1, this.cursorX + dx));
            this.cursorY = Math.max(0, Math.min(this.gridHeight - 1, this.cursorY + dy));
            this.onUpdate?.();
        }
    }
    
    interact() {
        switch (this.currentStation) {
            case STATIONS.INTAKE:
                this.interactIntake();
                break;
            case STATIONS.DISHWASHER:
                this.interactDishwasher();
                break;
            case STATIONS.DRYING:
                this.interactDrying();
                break;
            case STATIONS.STORAGE:
                this.interactStorage();
                break;
        }
        this.onUpdate?.();
    }
    
    interactIntake() {
        if (this.heldDish) {
            // Put dish back in intake
            this.intake.unshift(this.heldDish);
            this.heldDish = null;
        } else if (this.intake.length > 0) {
            // Pick up dish from intake
            this.heldDish = this.intake.shift();
        }
    }
    
    interactDishwasher() {
        if (this.dishwasherRunning) return;
        
        if (this.heldDish) {
            // Try to place dish at cursor position
            if (this.canPlaceDish(this.heldDish, this.cursorX, this.cursorY)) {
                this.placeDish(this.heldDish, this.cursorX, this.cursorY);
                this.heldDish = null;
            }
        } else {
            // Try to pick up dish from grid
            const dish = this.grid[this.cursorY][this.cursorX];
            if (dish) {
                this.removeDish(dish);
                this.heldDish = dish;
            }
        }
    }
    
    interactDrying() {
        if (this.heldDish) {
            // Find empty drying slot
            const emptySlot = this.dryingRack.findIndex(slot => slot === null);
            if (emptySlot !== -1 && !this.heldDish.dirty) {
                this.dryingRack[emptySlot] = this.heldDish;
                this.heldDish = null;
            }
        } else {
            // Pick up from first occupied slot
            const occupiedSlot = this.dryingRack.findIndex(slot => slot !== null);
            if (occupiedSlot !== -1) {
                this.heldDish = this.dryingRack[occupiedSlot];
                this.dryingRack[occupiedSlot] = null;
            }
        }
    }
    
    interactStorage() {
        if (this.heldDish && !this.heldDish.dirty) {
            // Store the dish
            this.storage[this.heldDish.type]++;
            this.dishesClean++;
            this.heldDish = null;
            
            // Check for wave completion
            if (this.intake.length === 0 && !this.hasAnyDirtyDishes()) {
                this.nextWave();
            }
        }
    }
    
    hasAnyDirtyDishes() {
        // Check grid
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x]?.dirty) return true;
            }
        }
        // Check drying rack
        if (this.dryingRack.some(d => d?.dirty)) return true;
        // Check held
        if (this.heldDish?.dirty) return true;
        return false;
    }
    
    canPlaceDish(dish, startX, startY) {
        if (!dish.canDishwasher) return false;
        
        const shape = this.getRotatedShape(dish);
        
        for (let dy = 0; dy < shape.length; dy++) {
            for (let dx = 0; dx < shape[dy].length; dx++) {
                if (shape[dy][dx]) {
                    const x = startX + dx;
                    const y = startY + dy;
                    
                    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
                        return false;
                    }
                    if (this.grid[y][x] !== null) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    placeDish(dish, startX, startY) {
        const shape = this.getRotatedShape(dish);
        
        for (let dy = 0; dy < shape.length; dy++) {
            for (let dx = 0; dx < shape[dy].length; dx++) {
                if (shape[dy][dx]) {
                    this.grid[startY + dy][startX + dx] = dish;
                }
            }
        }
    }
    
    removeDish(dish) {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === dish) {
                    this.grid[y][x] = null;
                }
            }
        }
    }
    
    getRotatedShape(dish) {
        let shape = dish.shape;
        const rotations = dish.rotation % 4;
        
        for (let r = 0; r < rotations; r++) {
            shape = this.rotateShape(shape);
        }
        
        return shape;
    }
    
    rotateShape(shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = [];
        
        for (let c = 0; c < cols; c++) {
            rotated[c] = [];
            for (let r = rows - 1; r >= 0; r--) {
                rotated[c].push(shape[r][c]);
            }
        }
        
        return rotated;
    }
    
    rotateDish() {
        if (this.heldDish) {
            this.heldDish.rotation = (this.heldDish.rotation + 1) % 4;
            this.onUpdate?.();
        }
    }
    
    cycleStation() {
        const stations = Object.values(STATIONS);
        const currentIndex = stations.indexOf(this.currentStation);
        this.currentStation = stations[(currentIndex + 1) % stations.length];
        this.onUpdate?.();
    }
    
    confirmAction() {
        if (this.currentStation === STATIONS.DISHWASHER && !this.dishwasherRunning) {
            this.runDishwasherCycle();
        }
    }
    
    runDishwasherCycle() {
        // Check if there are dishes to wash
        let hasDishes = false;
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x]) {
                    hasDishes = true;
                    break;
                }
            }
            if (hasDishes) break;
        }
        
        if (!hasDishes) return;
        
        this.dishwasherRunning = true;
        this.cycleProgress = 0;
        
        const cycleDuration = 5000; // 5 seconds
        const updateInterval = 100;
        
        const cycleTimer = setInterval(() => {
            this.cycleProgress += (updateInterval / cycleDuration) * 100;
            this.onUpdate?.();
            
            if (this.cycleProgress >= 100) {
                clearInterval(cycleTimer);
                this.completeCycle();
            }
        }, updateInterval);
    }
    
    completeCycle() {
        // Mark all dishes in dishwasher as clean
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x]) {
                    this.grid[y][x].dirty = false;
                }
            }
        }
        
        this.dishwasherRunning = false;
        this.cycleProgress = 0;
        this.onUpdate?.();
    }
    
    nextWave() {
        if (this.wave >= this.totalWaves) {
            this.endShift(true);
        } else {
            this.wave++;
            this.startWave();
        }
    }
    
    endShift(success) {
        this.isRunning = false;
        clearInterval(this.spawnTimer);
        clearInterval(this.gameTimer);
        
        this.onGameOver?.({
            success,
            dishesClean: this.dishesClean,
            timeRemaining: this.timeRemaining,
            efficiency: Math.round((this.dishesClean / (5 + 8 + 11)) * 100) // Based on expected dishes
        });
    }
    
    // Get grid with preview of held dish placement
    getGridWithPreview() {
        const preview = this.grid.map(row => [...row]);
        
        if (this.heldDish && this.currentStation === STATIONS.DISHWASHER) {
            const canPlace = this.canPlaceDish(this.heldDish, this.cursorX, this.cursorY);
            const shape = this.getRotatedShape(this.heldDish);
            
            for (let dy = 0; dy < shape.length; dy++) {
                for (let dx = 0; dx < shape[dy].length; dx++) {
                    if (shape[dy][dx]) {
                        const x = this.cursorX + dx;
                        const y = this.cursorY + dy;
                        
                        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
                            if (preview[y][x] === null) {
                                preview[y][x] = { preview: true, valid: canPlace };
                            }
                        }
                    }
                }
            }
        }
        
        return preview;
    }
}
