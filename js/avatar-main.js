/**
 * Dishwasher Simulator - Avatar Mode Entry Point
 * Third-person kitchen movement system
 */

import { Kitchen, OVERFLOW_ZONES } from './kitchen.js';
import { Character } from './character.js';
import { Renderer, RENDER_SETTINGS } from './renderer.js';
import { Game, STATIONS, DISHES } from './game.js';
import { audio } from './audio.js';
import { NPCManager, COLLISION_TYPE } from './npcs.js';
import { TouchControls } from './touch-controls.js';

class AvatarGame {
    constructor() {
        // Core systems
        this.kitchen = new Kitchen();
        this.character = new Character(this.kitchen);
        this.npcManager = new NPCManager();
        
        // Get canvas
        this.canvas = document.getElementById('kitchen-canvas');
        if (!this.canvas) {
            console.error('Kitchen canvas not found!');
            return;
        }
        
        this.renderer = new Renderer(this.canvas);
        
        // Game state (reuse existing Game class for dish logic)
        this.game = new Game();
        this.game.onFeedback = this.showFeedback.bind(this);
        this.game.onGameOver = this.handleGameOver.bind(this);
        
        // Timing
        this.lastTime = 0;
        this.running = false;
        
        // Modal state
        this.modalOpen = false;
        this.currentModal = null;
        
        // Debug mode
        this.debug = false;
        
        // NPC collision cooldown (prevent spam)
        this.lastBumpTime = 0;
        this.bumpCooldown = 1000; // ms
        
        // Overflow state (tracks dishes in overflow zones)
        this.overflowState = {
            counts: [0, 0],
            showWarning: false
        };
        
        // Settings
        this.settings = {
            showNPCProgress: true  // Show chef cooking progress bars
        };
        
        // Setup
        this.setupInput();
        this.setupUI();
        this.setupTouchControls();
        
        // Wire up busser dropoff callback
        this.npcManager.onBusserDropoff = this.onBusserDropoff.bind(this);
    }
    
    /**
     * Called when a busser drops off dishes
     * @param {number} zoneIndex - 0 = primary intake, 1+ = overflow zones
     */
    onBusserDropoff(zoneIndex) {
        // Spawn 1-3 dishes at the appropriate zone
        const dishCount = 1 + Math.floor(Math.random() * 2);
        
        if (zoneIndex === 0) {
            // Primary intake
            for (let i = 0; i < dishCount; i++) {
                this.game.spawnDish();
            }
        } else {
            // Overflow zone
            const overflowIndex = zoneIndex - 1;
            const capacity = OVERFLOW_ZONES[`overflow${zoneIndex}`]?.capacity || 3;
            
            if (this.overflowState.counts[overflowIndex] < capacity) {
                this.overflowState.counts[overflowIndex] += dishCount;
                this.overflowState.counts[overflowIndex] = Math.min(
                    this.overflowState.counts[overflowIndex], 
                    capacity
                );
                this.overflowState.showWarning = true;
            }
        }
        
        this.updateIntakeDisplay();
    }
    
    setupInput() {
        // WASD movement
        document.addEventListener('keydown', (e) => {
            if (this.modalOpen) return;
            
            switch (e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    this.character.setInput('up', true);
                    break;
                case 's':
                case 'arrowdown':
                    this.character.setInput('down', true);
                    break;
                case 'a':
                case 'arrowleft':
                    this.character.setInput('left', true);
                    break;
                case 'd':
                case 'arrowright':
                    this.character.setInput('right', true);
                    break;
                case ' ':
                    e.preventDefault();
                    this.interact();
                    break;
                case 'r':
                    this.rotateHeldItem();
                    break;
                case 'f1':
                    e.preventDefault();
                    this.debug = !this.debug;
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch (e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    this.character.setInput('up', false);
                    break;
                case 's':
                case 'arrowdown':
                    this.character.setInput('down', false);
                    break;
                case 'a':
                case 'arrowleft':
                    this.character.setInput('left', false);
                    break;
                case 'd':
                case 'arrowright':
                    this.character.setInput('right', false);
                    break;
            }
        });
        
        // Click to start audio
        document.addEventListener('click', () => {
            audio.init();
        }, { once: true });
    }
    
    setupUI() {
        // Start button
        document.getElementById('btn-start')?.addEventListener('click', () => {
            audio.init();
            audio.playUIClick();
            this.startGame();
        });
        
        // Retry button
        document.getElementById('btn-retry')?.addEventListener('click', () => {
            audio.playUIClick();
            this.startGame();
        });
        
        // Menu button
        document.getElementById('btn-menu')?.addEventListener('click', () => {
            audio.playUIClick();
            this.showScreen('title');
        });
        
        // Close modal buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });
    }
    
    setupTouchControls() {
        // Initialize touch controls with callbacks
        this.touchControls = new TouchControls({
            onDirectionStart: (direction) => {
                if (this.modalOpen) return;
                this.character.setInput(direction, true);
            },
            onDirectionEnd: (direction) => {
                this.character.setInput(direction, false);
            },
            onInteract: () => {
                if (!this.modalOpen) {
                    this.interact();
                }
            },
            onRotate: () => {
                this.rotateHeldItem();
            }
        });
        
        this.touchControls.init();
        
        // Log touch device detection
        if (this.touchControls.isTouchDevice) {
            console.log('📱 Touch device detected - touch controls enabled');
        }
    }
    
    startGame() {
        this.showScreen('game');
        
        // Reset character to spawn (grid-aligned)
        const spawn = this.kitchen.getSpawnPoint();
        const gridSize = 40; // matches CHARACTER_CONFIG.gridSize
        this.character.gridX = Math.round(spawn.x / gridSize);
        this.character.gridY = Math.round(spawn.y / gridSize);
        this.character.x = this.character.gridX * gridSize;
        this.character.y = this.character.gridY * gridSize;
        this.character.isMoving = false;
        this.character.moveProgress = 0;
        this.character.heldItem = null;
        this.character.stunTime = 0;
        this.character.isStunned = false;
        
        // Start game logic
        this.game.startShift(false);
        
        // Set up NPCs for wave 1
        this.npcManager.setupWave(1);
        
        // Track wave for NPC updates
        this.currentWave = 1;
        
        // Start game loop
        this.running = true;
        this.lastTime = performance.now();
        this.lastBumpTime = 0;
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    gameLoop(timestamp) {
        if (!this.running) return;
        
        // Calculate delta time
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = timestamp;
        
        // Update
        this.update(dt);
        
        // Render
        this.render();
        
        // Continue loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update(dt) {
        if (!this.modalOpen) {
            this.character.update(dt);
            
            // Update NPCs
            this.npcManager.update(dt);
            
            // Check NPC collisions
            this.checkNPCCollisions();
        }
        
        // Check if wave changed (spawn more NPCs)
        if (this.game.wave !== this.currentWave) {
            this.currentWave = this.game.wave;
            this.npcManager.setupWave(this.currentWave);
        }
        
        // Update HUD
        this.updateHUD();
    }
    
    checkNPCCollisions() {
        const now = performance.now();
        
        // Cooldown check
        if (now - this.lastBumpTime < this.bumpCooldown) return;
        
        const collision = this.npcManager.checkPlayerCollision(this.character);
        
        if (collision) {
            const { npc, type, overlap } = collision;
            this.lastBumpTime = now;
            
            // Handle collision based on type
            switch (type) {
                case COLLISION_TYPE.LIGHT_BUMP:
                    // Light bump - just a warning with grid movement
                    this.showFeedback('Watch your step!', 'info');
                    break;
                    
                case COLLISION_TYPE.HARD_COLLISION:
                    // Drop dish if carrying, apply stun
                    if (this.character.heldItem) {
                        this.dropHeldItem();
                        this.showFeedback('Dropped the dish!', 'error');
                    }
                    this.character.applyStun(npc.type);
                    this.showFeedback(this.character.lastNPCBumpMessage, 'warning');
                    break;
                    
                case COLLISION_TYPE.HEAD_ON:
                    // Both drop items, chaos moment!
                    if (this.character.heldItem) {
                        this.dropHeldItem();
                    }
                    // NPC also drops their dish
                    if (npc.carryingDish) {
                        npc.carryingDish = false;
                    }
                    this.character.applyStun(npc.type);
                    this.showFeedback('💥 CRASH! Dishes everywhere!', 'error');
                    break;
                    
                default:
                    // Light bump fallback
                    this.showFeedback('Watch it!', 'info');
            }
            
            // Play bump sound (if available)
            // audio.playBump?.();
        }
    }
    
    /**
     * Drop the currently held item (goes back to intake)
     */
    dropHeldItem() {
        if (this.character.heldItem) {
            // Add back to intake
            this.game.intake.unshift(this.character.heldItem);
            this.character.heldItem = null;
            this.game.heldDish = null;
            audio.playDishPickup();
            this.updateIntakeDisplay();
        }
    }
    
    render() {
        // Update NPC manager with current intake state
        this.npcManager.setIntakeState(
            this.game.intake.length,
            this.overflowState.counts[0],
            this.overflowState.counts[1]
        );
        
        this.renderer.render(this.kitchen, this.character, {
            heldItem: this.game.heldDish,
            npcs: this.npcManager.getAll(),
            overflowState: this.overflowState,
            restaurantState: this.npcManager.getRestaurantState(),
            showNPCProgress: this.settings.showNPCProgress
        });
        
        // Debug overlay
        if (this.debug) {
            this.renderer.drawDebugCollision(this.kitchen);
        }
    }
    
    interact() {
        const station = this.character.getCurrentStation();
        if (!station) {
            this.showFeedback('Walk to a station first!', 'warning');
            return;
        }
        
        // Sync held item between character and game
        this.game.heldDish = this.character.heldItem;
        this.game.currentStation = station;
        
        // Handle station-specific interactions
        switch (station) {
            case 'intake':
                this.interactIntake();
                break;
            case 'dishwasher':
                this.interactDishwasher();
                break;
            case 'drying':
                this.interactDrying();
                break;
            case 'storage':
                this.interactStorage();
                break;
        }
        
        // Sync back
        this.character.heldItem = this.game.heldDish;
        this.updateHUD();
    }
    
    interactIntake() {
        if (this.character.heldItem) {
            // Put dish back
            this.game.intake.unshift(this.character.heldItem);
            this.character.heldItem = null;
            this.game.heldDish = null;
            audio.playDishPickup();
        } else if (this.game.intake.length > 0) {
            // Pick up dish from primary intake
            const dish = this.game.intake.shift();
            this.character.heldItem = dish;
            this.game.heldDish = dish;
            audio.playDishPickup();
            this.showFeedback(`Picked up ${dish.name}`, 'info');
            
            // If primary intake has room, pull from overflow
            this.pullFromOverflow();
        } else if (this.hasOverflowDishes()) {
            // Pick up from overflow (creates a dish)
            const overflowIndex = this.overflowState.counts[0] > 0 ? 0 : 1;
            this.overflowState.counts[overflowIndex]--;
            
            // Create a random dish from overflow
            this.game.spawnDish();
            const dish = this.game.intake.shift();
            this.character.heldItem = dish;
            this.game.heldDish = dish;
            audio.playDishPickup();
            this.showFeedback(`Picked up ${dish.name} from overflow`, 'info');
        } else {
            this.showFeedback('No dishes in intake!', 'warning');
        }
        this.updateIntakeDisplay();
    }
    
    /**
     * Check if there are dishes in overflow zones
     */
    hasOverflowDishes() {
        return this.overflowState.counts[0] > 0 || this.overflowState.counts[1] > 0;
    }
    
    /**
     * Pull dishes from overflow into primary intake when room is available
     */
    pullFromOverflow() {
        const intakeCapacity = 5; // Max dishes in primary intake
        
        while (this.game.intake.length < intakeCapacity && this.hasOverflowDishes()) {
            // Pull from first available overflow
            const overflowIndex = this.overflowState.counts[0] > 0 ? 0 : 1;
            this.overflowState.counts[overflowIndex]--;
            this.game.spawnDish();
        }
        
        // Check if overflow is now clear
        if (!this.hasOverflowDishes()) {
            this.overflowState.showWarning = false;
        }
    }
    
    interactDishwasher() {
        if (this.game.dishwasherRunning) {
            this.showFeedback("Can't open during cycle!", 'warning');
            return;
        }
        
        // Open dishwasher modal (Tetris packing)
        this.openModal('dishwasher');
    }
    
    interactDrying() {
        if (this.character.heldItem) {
            if (this.character.heldItem.dirty) {
                this.showFeedback('Wash it first!', 'warning');
                return;
            }
            
            const emptySlot = this.game.dryingRack.findIndex(s => s === null);
            if (emptySlot !== -1) {
                this.game.dryingRack[emptySlot] = this.character.heldItem;
                this.character.heldItem = null;
                this.game.heldDish = null;
                audio.playDishPlace();
                this.showFeedback('Placed on drying rack', 'success');
            } else {
                this.showFeedback('Drying rack full!', 'warning');
            }
        } else {
            const occupiedSlot = this.game.dryingRack.findIndex(s => s !== null);
            if (occupiedSlot !== -1) {
                this.character.heldItem = this.game.dryingRack[occupiedSlot];
                this.game.heldDish = this.character.heldItem;
                this.game.dryingRack[occupiedSlot] = null;
                audio.playDishPickup();
            }
        }
        this.updateDryingDisplay();
    }
    
    interactStorage() {
        if (this.character.heldItem) {
            if (this.character.heldItem.dirty) {
                this.showFeedback("Can't store dirty dishes!", 'error');
                return;
            }
            
            this.game.storage[this.character.heldItem.type]++;
            this.game.dishesClean++;
            audio.playDishStore();
            this.showFeedback(`${this.character.heldItem.name} stored! +1`, 'success');
            this.character.heldItem = null;
            this.game.heldDish = null;
            
            this.updateStorageDisplay();
            this.game.checkWaveCompletion();
        } else {
            this.showFeedback('Nothing to store!', 'info');
        }
    }
    
    rotateHeldItem() {
        if (this.character.heldItem) {
            this.character.heldItem.rotation = (this.character.heldItem.rotation + 1) % 4;
            audio.playUIClick();
        }
    }
    
    openModal(modalType) {
        this.modalOpen = true;
        this.currentModal = modalType;
        
        const modal = document.getElementById(`${modalType}-modal`);
        if (modal) {
            modal.classList.remove('hidden');
            
            if (modalType === 'dishwasher') {
                this.setupDishwasherModal();
            }
        }
    }
    
    closeModal() {
        this.modalOpen = false;
        
        const modal = document.getElementById(`${this.currentModal}-modal`);
        if (modal) {
            modal.classList.add('hidden');
        }
        
        this.currentModal = null;
    }
    
    setupDishwasherModal() {
        const grid = document.getElementById('modal-dishwasher-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Create grid cells
        for (let y = 0; y < this.game.gridHeight; y++) {
            for (let x = 0; x < this.game.gridWidth; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // Check if occupied
                const dish = this.game.grid[y][x];
                if (dish) {
                    cell.classList.add('occupied');
                    if (!dish.dirty) cell.classList.add('clean');
                    cell.textContent = dish.emoji;
                }
                
                // Click to place/pickup
                cell.addEventListener('click', () => {
                    this.handleGridClick(x, y);
                });
                
                grid.appendChild(cell);
            }
        }
        
        // Update run button
        const runBtn = document.getElementById('modal-run-cycle');
        if (runBtn) {
            runBtn.disabled = !this.hasDishesInDishwasher();
            runBtn.onclick = () => this.runDishwasherCycle();
        }
    }
    
    handleGridClick(x, y) {
        this.game.cursorX = x;
        this.game.cursorY = y;
        this.game.interactDishwasher();
        
        // Sync held item
        this.character.heldItem = this.game.heldDish;
        
        // Refresh grid
        this.setupDishwasherModal();
        this.updateHeldDisplay();
    }
    
    runDishwasherCycle() {
        this.game.runDishwasherCycle();
        this.closeModal();
        
        // Wait for cycle to complete
        const checkCycle = setInterval(() => {
            if (!this.game.dishwasherRunning) {
                clearInterval(checkCycle);
            }
        }, 100);
    }
    
    hasDishesInDishwasher() {
        for (let y = 0; y < this.game.gridHeight; y++) {
            for (let x = 0; x < this.game.gridWidth; x++) {
                if (this.game.grid[y][x]) return true;
            }
        }
        return false;
    }
    
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screenName}-screen`)?.classList.add('active');
        
        if (screenName !== 'game') {
            this.running = false;
        }
    }
    
    showFeedback(message, type = 'info') {
        const toast = document.getElementById('feedback-toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `feedback-toast ${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }
    
    updateHUD() {
        // Wave/time
        const waveEl = document.getElementById('hud-wave');
        const timeEl = document.getElementById('hud-time');
        const cleanEl = document.getElementById('hud-clean');
        
        if (waveEl) waveEl.textContent = `${this.game.wave}/${this.game.totalWaves}`;
        if (timeEl) {
            const mins = Math.floor(this.game.timeRemaining / 60);
            const secs = this.game.timeRemaining % 60;
            timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        if (cleanEl) cleanEl.textContent = this.game.dishesClean;
        
        // Held item
        this.updateHeldDisplay();
    }
    
    updateHeldDisplay() {
        const held = document.getElementById('held-item-display');
        if (!held) return;
        
        if (this.character.heldItem) {
            held.innerHTML = `
                <div class="held-icon">${this.character.heldItem.emoji}</div>
                <div class="held-info">
                    <span class="held-name">${this.character.heldItem.name}</span>
                    <span class="held-status ${this.character.heldItem.dirty ? 'dirty' : 'clean'}">
                        ${this.character.heldItem.dirty ? 'Dirty' : 'Clean'}
                    </span>
                </div>
            `;
            held.classList.remove('hidden');
        } else {
            held.classList.add('hidden');
        }
    }
    
    updateIntakeDisplay() {
        const intakeCount = document.getElementById('intake-count');
        if (intakeCount) {
            intakeCount.textContent = `${this.game.intake.length} dishes`;
        }
    }
    
    updateDryingDisplay() {
        const slotsAvailable = this.game.dryingRack.filter(s => s === null).length;
        const dryingSlots = document.getElementById('drying-slots');
        if (dryingSlots) {
            dryingSlots.textContent = `${slotsAvailable}/4 slots available`;
        }
    }
    
    updateStorageDisplay() {
        Object.entries(this.game.storage).forEach(([type, count]) => {
            const shelf = document.querySelector(`.shelf[data-type="${type}"] .shelf-count`);
            if (shelf) shelf.textContent = count;
        });
    }
    
    handleGameOver(results) {
        this.running = false;
        this.showScreen('results');
        
        // Clear NPCs
        this.npcManager.clear();
        
        // Populate results
        document.getElementById('result-cleaned').textContent = results.dishesClean;
        document.getElementById('result-efficiency').textContent = `${results.efficiency}%`;
        
        // Rating stars
        const rating = results.success ? 
            (results.efficiency >= 80 ? '⭐⭐⭐' : results.efficiency >= 50 ? '⭐⭐' : '⭐') : 
            '💔';
        document.getElementById('result-rating').textContent = rating;
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.avatarGame = new AvatarGame();
    console.log('🧽 Dishwasher Simulator - Avatar Mode loaded');
    console.log('👤 You are the DISHWASHER - avoid the chefs and waiters!');
    console.log('🎮 Controls: WASD=move, Space=interact, R=rotate');
    console.log('📱 Touch: D-Pad to move, Action button to interact');
    console.log('🔧 Press F1 for debug collision view');
});
