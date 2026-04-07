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
        needsTowelDry: false,
        color: 'plate'
    },
    bowl: {
        name: 'Bowl',
        emoji: '🥣',
        shape: [[1, 1], [1, 1]], // 2x2
        canDishwasher: true,
        needsSoak: false,
        needsTowelDry: false,
        color: 'bowl'
    },
    cup: {
        name: 'Cup',
        emoji: '☕',
        shape: [[1], [1]], // 1x2 vertical
        canDishwasher: true,
        needsSoak: false,
        needsTowelDry: false,
        color: 'cup'
    },
    pan: {
        name: 'Pan',
        emoji: '🍳',
        shape: [[1, 1, 1], [1, 0, 0]], // L-shape
        canDishwasher: false,
        needsSoak: true,
        needsTowelDry: true,
        color: 'pan'
    },
    glass: {
        name: 'Wine Glass',
        emoji: '🍷',
        shape: [[1], [1]], // 1x2 vertical
        canDishwasher: false, // Hand wash only!
        needsSoak: false,
        needsTowelDry: true,
        color: 'glass'
    }
};

// Station types
export const STATIONS = {
    INTAKE: 'intake',
    DISHWASHER: 'dishwasher',
    DRYING: 'drying',
    STORAGE: 'storage'
};

// Station order for tab cycling (left to right)
const STATION_ORDER = [
    STATIONS.INTAKE,
    STATIONS.DISHWASHER,
    STATIONS.DRYING,
    STATIONS.STORAGE
];

export class Game {
    constructor() {
        this.isRunning = false;
        this.practiceMode = false;
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
        this.dishesSpawned = 0;
        
        // Callbacks for UI updates
        this.onUpdate = null;
        this.onGameOver = null;
        this.onFeedback = null;
        
        // Wave spawning
        this.spawnTimer = null;
        this.gameTimer = null;
    }
    
    createEmptyGrid() {
        return Array(this.gridHeight).fill(null)
            .map(() => Array(this.gridWidth).fill(null));
    }
    
    startShift(practiceMode = false) {
        this.practiceMode = practiceMode;
        this.isRunning = true;
        this.wave = 1;
        this.timeRemaining = practiceMode ? 300 : 180; // 5 minutes for practice
        this.dishesClean = 0;
        this.dishesSpawned = 0;
        this.grid = this.createEmptyGrid();
        this.intake = [];
        this.dryingRack = [null, null, null, null];
        this.storage = { plate: 0, bowl: 0, cup: 0, pan: 0, glass: 0 };
        this.heldDish = null;
        this.dishwasherRunning = false;
        this.currentStation = STATIONS.INTAKE;
        this.cursorX = 0;
        this.cursorY = 0;
        
        // Start spawning dishes
        this.startWave();
        
        // Start game timer
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            this.onUpdate?.();
            
            if (this.timeRemaining <= 0 && !this.practiceMode) {
                this.endShift(false);
            }
        }, 1000);
        
        this.onUpdate?.();
        
        if (practiceMode) {
            this.onFeedback?.('Practice Mode - No fail state!', 'success');
        }
    }
    
    startWave() {
        // Spawn dishes for this wave
        const dishesToSpawn = this.practiceMode ? 4 : 5 + (this.wave * 3);
        let spawned = 0;
        
        const spawnInterval = this.practiceMode ? 3000 : 2000;
        
        this.spawnTimer = setInterval(() => {
            if (spawned >= dishesToSpawn) {
                clearInterval(this.spawnTimer);
                return;
            }
            
            this.spawnDish();
            spawned++;
            this.dishesSpawned++;
            
            // Check for overflow (only in normal mode)
            if (this.intake.length > 10 && !this.practiceMode) {
                this.onFeedback?.('Too many dishes! Overflow!', 'error');
                this.endShift(false);
            } else if (this.intake.length > 7) {
                this.onFeedback?.('Dishes piling up!', 'warning');
            }
            
            this.onUpdate?.();
        }, spawnInterval);
    }
    
    spawnDish() {
        // Weighted distribution favoring dishwasher-safe dishes
        const types = this.practiceMode 
            ? ['plate', 'plate', 'bowl', 'cup'] // Easy dishes only in practice
            : ['plate', 'plate', 'plate', 'bowl', 'bowl', 'cup', 'cup', 'pan', 'glass'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.intake.push({
            id: Date.now() + Math.random(),
            type: type,
            ...DISHES[type],
            rotation: 0,
            dirty: true
        });
    }
    
    setStation(station) {
        if (Object.values(STATIONS).includes(station)) {
            this.currentStation = station;
            this.onUpdate?.();
        }
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
        if (this.dishwasherRunning) {
            this.onFeedback?.("Can't open during cycle!", 'warning');
            return;
        }
        
        if (this.heldDish) {
            // Check if dish can go in dishwasher
            if (!this.heldDish.canDishwasher) {
                this.onFeedback?.(`${this.heldDish.name} needs hand washing!`, 'warning');
                return;
            }
            
            // Try to place dish at cursor position
            if (this.canPlaceDish(this.heldDish, this.cursorX, this.cursorY)) {
                this.placeDish(this.heldDish, this.cursorX, this.cursorY);
                this.heldDish = null;
            } else {
                this.onFeedback?.("Can't place here!", 'error');
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
            // Check if dish is clean
            if (this.heldDish.dirty) {
                this.onFeedback?.('Wash it first!', 'warning');
                return;
            }
            
            // Find empty drying slot
            const emptySlot = this.dryingRack.findIndex(slot => slot === null);
            if (emptySlot !== -1) {
                this.dryingRack[emptySlot] = this.heldDish;
                this.heldDish = null;
            } else {
                this.onFeedback?.('Drying rack full!', 'warning');
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
        if (this.heldDish) {
            if (this.heldDish.dirty) {
                this.onFeedback?.("Can't store dirty dishes!", 'error');
                return;
            }
            
            // Store the dish
            this.storage[this.heldDish.type]++;
            this.dishesClean++;
            this.onFeedback?.(`${this.heldDish.name} stored! +1`, 'success');
            this.heldDish = null;
            
            // Check for wave completion
            this.checkWaveCompletion();
        }
    }
    
    checkWaveCompletion() {
        // Check if all dishes are processed
        if (this.intake.length === 0 && 
            !this.hasAnyDirtyDishes() && 
            !this.heldDish &&
            this.dryingRack.every(slot => slot === null)) {
            
            // Small delay before checking so spawner can catch up
            setTimeout(() => {
                if (this.intake.length === 0 && !this.hasAnyDirtyDishes()) {
                    this.nextWave();
                }
            }, 500);
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
        const currentIndex = STATION_ORDER.indexOf(this.currentStation);
        this.currentStation = STATION_ORDER[(currentIndex + 1) % STATION_ORDER.length];
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
        
        if (!hasDishes) {
            this.onFeedback?.('Load some dishes first!', 'warning');
            return;
        }
        
        this.dishwasherRunning = true;
        this.cycleProgress = 0;
        
        const cycleDuration = this.practiceMode ? 3000 : 5000;
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
        // Count and mark all dishes in dishwasher as clean
        let dishCount = 0;
        const uniqueDishes = new Set();
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x]) {
                    if (!uniqueDishes.has(this.grid[y][x].id)) {
                        uniqueDishes.add(this.grid[y][x].id);
                        dishCount++;
                    }
                    this.grid[y][x].dirty = false;
                }
            }
        }
        
        this.dishwasherRunning = false;
        this.cycleProgress = 0;
        
        const efficiency = Math.round((this.getGridUsage() / (this.gridWidth * this.gridHeight)) * 100);
        this.onFeedback?.(`✨ ${dishCount} dishes clean! (${efficiency}% load)`, 'success');
        
        this.onUpdate?.();
    }
    
    getGridUsage() {
        let count = 0;
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x]) count++;
            }
        }
        return count;
    }
    
    nextWave() {
        if (this.wave >= this.totalWaves) {
            this.onFeedback?.('All waves complete!', 'success');
            this.endShift(true);
        } else {
            this.wave++;
            this.onFeedback?.(`Wave ${this.wave} starting!`, 'success');
            this.startWave();
            this.onUpdate?.();
        }
    }
    
    endShift(success) {
        this.isRunning = false;
        clearInterval(this.spawnTimer);
        clearInterval(this.gameTimer);
        
        const expectedDishes = this.practiceMode ? 12 : (5 + 8 + 11);
        const timeBonus = success ? Math.floor(this.timeRemaining / 10) : 0;
        
        this.onGameOver?.({
            success,
            dishesClean: this.dishesClean,
            timeRemaining: this.timeRemaining,
            timeBonus,
            efficiency: Math.round((this.dishesClean / Math.max(this.dishesSpawned, 1)) * 100),
            storage: { ...this.storage },
            practiceMode: this.practiceMode
        });
    }
    
    // Get grid with preview of held dish placement
    getGridWithPreview() {
        const preview = this.grid.map(row => [...row]);
        
        if (this.heldDish && this.currentStation === STATIONS.DISHWASHER && this.heldDish.canDishwasher) {
            const canPlace = this.canPlaceDish(this.heldDish, this.cursorX, this.cursorY);
            const shape = this.getRotatedShape(this.heldDish);
            
            for (let dy = 0; dy < shape.length; dy++) {
                for (let dx = 0; dx < shape[dy].length; dx++) {
                    if (shape[dy][dx]) {
                        const x = this.cursorX + dx;
                        const y = this.cursorY + dy;
                        
                        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
                            if (preview[y][x] === null) {
                                preview[y][x] = { 
                                    preview: true, 
                                    valid: canPlace,
                                    type: this.heldDish.type 
                                };
                            }
                        }
                    }
                }
            }
        }
        
        return preview;
    }
}
