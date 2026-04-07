/**
 * Dishwasher Simulator - UI Rendering
 */

import { STATIONS, DISHES } from './game.js';

export class UI {
    constructor(game) {
        this.game = game;
        
        // Cache DOM elements
        this.screens = {
            title: document.getElementById('title-screen'),
            game: document.getElementById('game-screen'),
            results: document.getElementById('results-screen')
        };
        
        this.elements = {
            intakeQueue: document.querySelector('.intake-queue'),
            dishwasherGrid: document.querySelector('.dishwasher-grid'),
            dryingSlots: document.querySelector('.drying-slots'),
            storageShelves: document.querySelector('.storage-shelves'),
            runCycleBtn: document.getElementById('btn-run-cycle'),
            cycleTimer: document.querySelector('.cycle-timer'),
            timerBar: document.querySelector('.timer-bar'),
            hudWave: document.getElementById('hud-wave'),
            hudTime: document.getElementById('hud-time'),
            hudClean: document.getElementById('hud-clean'),
            waveBar: document.getElementById('wave-bar'),
            gridUsageFill: document.getElementById('grid-usage-fill'),
            gridUsageText: document.getElementById('grid-usage-text'),
            heldItem: document.getElementById('held-item'),
            feedbackToast: document.getElementById('feedback-toast'),
            resultTitle: document.getElementById('results-title'),
            resultCleaned: document.getElementById('result-cleaned'),
            resultTimeBonus: document.getElementById('result-time-bonus'),
            resultEfficiency: document.getElementById('result-efficiency'),
            resultRating: document.getElementById('result-rating'),
            resultPlates: document.getElementById('result-plates'),
            resultBowls: document.getElementById('result-bowls'),
            resultCups: document.getElementById('result-cups'),
            resultPans: document.getElementById('result-pans'),
            resultGlasses: document.getElementById('result-glasses'),
            newBest: document.getElementById('new-best'),
            queueCount: document.querySelector('.queue-count'),
            slotsAvailable: document.querySelector('.slots-available')
        };
        
        // Set up game callbacks
        game.onUpdate = () => this.render();
        game.onFeedback = (msg, type) => this.showFeedback(msg, type);
        
        // Initialize grid cells
        this.initDishwasherGrid();
        this.initDryingSlots();
        
        // Run cycle button
        this.elements.runCycleBtn.addEventListener('click', () => {
            game.confirmAction();
        });
        
        // Storage shelf click handlers
        this.elements.storageShelves.querySelectorAll('.shelf').forEach(shelf => {
            shelf.addEventListener('click', () => {
                game.currentStation = STATIONS.STORAGE;
                game.interact();
            });
        });
        
        // Feedback toast auto-hide
        this.feedbackTimeout = null;
    }
    
    showScreen(name) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[name].classList.add('active');
    }
    
    initDishwasherGrid() {
        this.elements.dishwasherGrid.innerHTML = '';
        
        for (let y = 0; y < this.game.gridHeight; y++) {
            for (let x = 0; x < this.game.gridWidth; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                cell.addEventListener('click', () => {
                    this.game.cursorX = x;
                    this.game.cursorY = y;
                    this.game.currentStation = STATIONS.DISHWASHER;
                    this.game.interact();
                });
                
                this.elements.dishwasherGrid.appendChild(cell);
            }
        }
    }
    
    initDryingSlots() {
        this.elements.dryingSlots.innerHTML = '';
        
        for (let i = 0; i < 4; i++) {
            const slot = document.createElement('div');
            slot.className = 'drying-slot';
            slot.dataset.index = i;
            
            slot.addEventListener('click', () => {
                this.game.currentStation = STATIONS.DRYING;
                this.game.interact();
            });
            
            this.elements.dryingSlots.appendChild(slot);
        }
    }
    
    render() {
        this.renderIntake();
        this.renderDishwasherGrid();
        this.renderDryingRack();
        this.renderStorage();
        this.renderHUD();
        this.renderHeldItem();
        this.renderStationHighlight();
    }
    
    renderIntake() {
        this.elements.intakeQueue.innerHTML = '';
        
        this.game.intake.forEach((dish, index) => {
            const dishEl = document.createElement('div');
            dishEl.className = `dish ${dish.type} ${dish.dirty ? 'dirty' : 'clean'}`;
            dishEl.dataset.tooltip = `${dish.name} - ${dish.canDishwasher ? 'Dishwasher OK' : 'Hand wash only'}`;
            
            // Dish content with icon and name
            const iconSpan = document.createElement('span');
            iconSpan.className = 'dish-icon';
            iconSpan.textContent = dish.emoji;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'dish-name';
            nameSpan.textContent = dish.name;
            
            dishEl.appendChild(iconSpan);
            dishEl.appendChild(nameSpan);
            
            // Tag for hand-wash items
            if (!dish.canDishwasher) {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'dish-tag hand-wash';
                tagSpan.textContent = 'Hand';
                dishEl.appendChild(tagSpan);
            }
            
            dishEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.game.currentStation = STATIONS.INTAKE;
                this.game.interact();
            });
            
            this.elements.intakeQueue.appendChild(dishEl);
        });
        
        // Update queue count
        this.elements.queueCount.textContent = `${this.game.intake.length} dishes waiting`;
        
        // Warning state if too many dishes
        const station = document.getElementById('station-intake');
        station.classList.remove('warning', 'danger');
        if (this.game.intake.length > 9) {
            station.classList.add('danger');
        } else if (this.game.intake.length > 7) {
            station.classList.add('warning');
        }
    }
    
    renderDishwasherGrid() {
        const grid = this.game.getGridWithPreview();
        const cells = this.elements.dishwasherGrid.querySelectorAll('.grid-cell');
        
        let occupiedCount = 0;
        
        cells.forEach((cell, index) => {
            const x = index % this.game.gridWidth;
            const y = Math.floor(index / this.game.gridWidth);
            const content = grid[y][x];
            
            cell.className = 'grid-cell';
            cell.textContent = '';
            
            if (content) {
                if (content.preview) {
                    cell.classList.add('preview');
                    cell.classList.add(content.valid ? 'valid' : 'invalid');
                } else {
                    occupiedCount++;
                    cell.classList.add('occupied');
                    cell.classList.add(content.type);
                    cell.textContent = content.emoji;
                    if (!content.dirty) {
                        cell.classList.add('clean');
                    }
                }
            }
            
            // Cursor highlight
            if (x === this.game.cursorX && y === this.game.cursorY && 
                this.game.currentStation === STATIONS.DISHWASHER) {
                cell.classList.add('cursor');
            }
        });
        
        // Update grid usage indicator
        const totalCells = this.game.gridWidth * this.game.gridHeight;
        const usagePercent = Math.round((occupiedCount / totalCells) * 100);
        this.elements.gridUsageFill.style.width = `${usagePercent}%`;
        this.elements.gridUsageText.textContent = `${usagePercent}%`;
        
        // Update run cycle button
        this.elements.runCycleBtn.disabled = this.game.dishwasherRunning || occupiedCount === 0;
        
        if (this.game.dishwasherRunning) {
            this.elements.runCycleBtn.innerHTML = 'Running... <span class="cycle-progress"></span>';
        } else if (occupiedCount === 0) {
            this.elements.runCycleBtn.innerHTML = 'Load dishes first';
        } else {
            this.elements.runCycleBtn.innerHTML = 'Run Cycle <kbd>Enter</kbd>';
        }
        
        // Update timer bar
        if (this.game.dishwasherRunning) {
            this.elements.cycleTimer.classList.remove('hidden');
            this.elements.timerBar.style.setProperty('--progress', `${this.game.cycleProgress}%`);
        } else {
            this.elements.cycleTimer.classList.add('hidden');
        }
    }
    
    renderDryingRack() {
        const slots = this.elements.dryingSlots.querySelectorAll('.drying-slot');
        let occupiedCount = 0;
        
        slots.forEach((slot, index) => {
            const dish = this.game.dryingRack[index];
            slot.innerHTML = '';
            slot.classList.remove('occupied');
            
            if (dish) {
                occupiedCount++;
                slot.classList.add('occupied');
                const dishEl = document.createElement('div');
                dishEl.className = `dish ${dish.type}`;
                dishEl.textContent = dish.emoji;
                slot.appendChild(dishEl);
            }
        });
        
        // Update slots available text
        this.elements.slotsAvailable.textContent = `${4 - occupiedCount} slots available`;
    }
    
    renderStorage() {
        const shelves = this.elements.storageShelves.querySelectorAll('.shelf');
        
        shelves.forEach(shelf => {
            const type = shelf.dataset.type;
            const count = this.game.storage[type] || 0;
            const countEl = shelf.querySelector('.shelf-count');
            
            const oldCount = parseInt(countEl.textContent) || 0;
            countEl.textContent = count;
            
            // Flash animation when count increases
            if (count > oldCount) {
                shelf.classList.remove('flash');
                void shelf.offsetWidth; // Trigger reflow
                shelf.classList.add('flash');
            }
        });
    }
    
    renderHUD() {
        // Wave display with progress bar
        this.elements.hudWave.textContent = `${this.game.wave}/${this.game.totalWaves}`;
        const waveProgress = ((this.game.wave - 1) / this.game.totalWaves) * 100;
        this.elements.waveBar.style.width = `${waveProgress}%`;
        
        // Time display
        const minutes = Math.floor(this.game.timeRemaining / 60);
        const seconds = this.game.timeRemaining % 60;
        this.elements.hudTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Color code time
        this.elements.hudTime.classList.remove('warning', 'danger');
        if (this.game.timeRemaining < 30) {
            this.elements.hudTime.classList.add('danger');
        } else if (this.game.timeRemaining < 60) {
            this.elements.hudTime.classList.add('warning');
        }
        
        // Clean count
        this.elements.hudClean.textContent = this.game.dishesClean;
    }
    
    renderHeldItem() {
        if (this.game.heldDish) {
            this.elements.heldItem.classList.remove('hidden');
            
            const dish = this.game.heldDish;
            const heldDishEl = this.elements.heldItem.querySelector('.held-dish');
            const heldName = this.elements.heldItem.querySelector('.held-name');
            const heldStatus = this.elements.heldItem.querySelector('.held-status');
            
            heldDishEl.textContent = dish.emoji;
            heldName.textContent = dish.name;
            
            heldStatus.className = 'held-status';
            if (dish.dirty) {
                heldStatus.textContent = 'Dirty - needs washing';
                heldStatus.classList.add('dirty');
            } else {
                heldStatus.textContent = 'Clean - ready to store';
                heldStatus.classList.add('clean');
            }
            
            // Add hand-wash warning
            if (dish.dirty && !dish.canDishwasher) {
                heldStatus.textContent = 'Hand wash only!';
            }
        } else {
            this.elements.heldItem.classList.add('hidden');
        }
    }
    
    renderStationHighlight() {
        // Highlight current station
        document.querySelectorAll('.station').forEach(station => {
            station.classList.remove('active');
        });
        
        const stationMap = {
            [STATIONS.INTAKE]: 'station-intake',
            [STATIONS.DISHWASHER]: 'station-dishwasher',
            [STATIONS.DRYING]: 'station-drying',
            [STATIONS.STORAGE]: 'station-storage'
        };
        
        const currentStationEl = document.getElementById(stationMap[this.game.currentStation]);
        if (currentStationEl) {
            currentStationEl.classList.add('active');
        }
    }
    
    showFeedback(message, type = 'info') {
        const toast = this.elements.feedbackToast;
        
        toast.textContent = message;
        toast.className = 'feedback-toast ' + type;
        
        // Clear previous timeout
        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
        }
        
        // Auto-hide after delay
        this.feedbackTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }
    
    showResults(results) {
        // Title
        if (results.success) {
            this.elements.resultTitle.textContent = results.practiceMode 
                ? 'Practice Complete!' 
                : 'Shift Complete!';
            this.elements.resultTitle.classList.remove('fail');
        } else {
            this.elements.resultTitle.textContent = 'Shift Failed!';
            this.elements.resultTitle.classList.add('fail');
        }
        
        // Main stats
        this.elements.resultCleaned.textContent = results.dishesClean;
        this.elements.resultTimeBonus.textContent = `+${results.timeBonus}`;
        this.elements.resultEfficiency.textContent = `${results.efficiency}%`;
        
        // Breakdown by dish type
        this.elements.resultPlates.textContent = results.storage.plate || 0;
        this.elements.resultBowls.textContent = results.storage.bowl || 0;
        this.elements.resultCups.textContent = results.storage.cup || 0;
        this.elements.resultPans.textContent = results.storage.pan || 0;
        this.elements.resultGlasses.textContent = results.storage.glass || 0;
        
        // Rating
        let rating = '⭐';
        if (results.efficiency >= 90) rating = '⭐⭐⭐';
        else if (results.efficiency >= 70) rating = '⭐⭐';
        
        if (!results.success) {
            rating = '💔';
        }
        
        this.elements.resultRating.textContent = rating;
        
        // New best indicator
        if (results.newBest) {
            this.elements.newBest.classList.remove('hidden');
        } else {
            this.elements.newBest.classList.add('hidden');
        }
        
        this.showScreen('results');
    }
}
