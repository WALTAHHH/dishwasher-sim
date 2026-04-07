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
            heldItem: document.getElementById('held-item'),
            cursor: document.getElementById('cursor'),
            resultCleaned: document.getElementById('result-cleaned'),
            resultEfficiency: document.getElementById('result-efficiency'),
            resultRating: document.getElementById('result-rating')
        };
        
        // Set up game callbacks
        game.onUpdate = () => this.render();
        game.onGameOver = (results) => this.showResults(results);
        
        // Initialize grid cells
        this.initDishwasherGrid();
        this.initDryingSlots();
        
        // Run cycle button
        this.elements.runCycleBtn.addEventListener('click', () => {
            game.confirmAction();
        });
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
            dishEl.className = `dish ${dish.type}`;
            dishEl.textContent = dish.emoji;
            dishEl.title = dish.name;
            
            dishEl.addEventListener('click', () => {
                this.game.currentStation = STATIONS.INTAKE;
                this.game.interact();
            });
            
            this.elements.intakeQueue.appendChild(dishEl);
        });
        
        // Warning state if too many dishes
        const station = document.getElementById('station-intake');
        station.classList.toggle('warning', this.game.intake.length > 7);
        station.classList.toggle('danger', this.game.intake.length > 9);
    }
    
    renderDishwasherGrid() {
        const grid = this.game.getGridWithPreview();
        const cells = this.elements.dishwasherGrid.querySelectorAll('.grid-cell');
        
        cells.forEach((cell, index) => {
            const x = index % this.game.gridWidth;
            const y = Math.floor(index / this.game.gridWidth);
            const content = grid[y][x];
            
            cell.className = 'grid-cell';
            cell.textContent = '';
            
            if (content) {
                if (content.preview) {
                    cell.classList.add('preview');
                    if (!content.valid) {
                        cell.classList.add('invalid');
                    }
                } else {
                    cell.classList.add('occupied');
                    cell.textContent = content.emoji;
                    if (!content.dirty) {
                        cell.classList.add('clean');
                    }
                }
            }
            
            // Cursor highlight
            if (x === this.game.cursorX && y === this.game.cursorY && 
                this.game.currentStation === STATIONS.DISHWASHER) {
                cell.style.outline = '2px solid var(--accent-blue)';
            } else {
                cell.style.outline = 'none';
            }
        });
        
        // Update run cycle button
        this.elements.runCycleBtn.disabled = this.game.dishwasherRunning;
        this.elements.runCycleBtn.textContent = this.game.dishwasherRunning ? 
            'Running...' : 'Run Cycle (Enter)';
        
        // Update timer bar
        if (this.game.dishwasherRunning) {
            this.elements.cycleTimer.classList.remove('hidden');
            this.elements.timerBar.style.width = `${this.game.cycleProgress}%`;
        } else {
            this.elements.cycleTimer.classList.add('hidden');
        }
    }
    
    renderDryingRack() {
        const slots = this.elements.dryingSlots.querySelectorAll('.drying-slot');
        
        slots.forEach((slot, index) => {
            const dish = this.game.dryingRack[index];
            slot.innerHTML = '';
            
            if (dish) {
                const dishEl = document.createElement('div');
                dishEl.className = `dish ${dish.type}`;
                dishEl.textContent = dish.emoji;
                slot.appendChild(dishEl);
            }
        });
    }
    
    renderStorage() {
        const shelves = this.elements.storageShelves.querySelectorAll('.shelf');
        
        shelves.forEach(shelf => {
            const type = shelf.dataset.type;
            const count = this.game.storage[type] || 0;
            const dish = DISHES[type];
            
            shelf.innerHTML = `${dish?.emoji || '📦'} ${shelf.textContent.split(' ')[0]} <span class="count">(${count})</span>`;
        });
    }
    
    renderHUD() {
        this.elements.hudWave.textContent = `${this.game.wave}/${this.game.totalWaves}`;
        
        const minutes = Math.floor(this.game.timeRemaining / 60);
        const seconds = this.game.timeRemaining % 60;
        this.elements.hudTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Color code time
        if (this.game.timeRemaining < 30) {
            this.elements.hudTime.style.color = 'var(--danger)';
        } else if (this.game.timeRemaining < 60) {
            this.elements.hudTime.style.color = 'var(--warning)';
        } else {
            this.elements.hudTime.style.color = '';
        }
        
        this.elements.hudClean.textContent = this.game.dishesClean;
    }
    
    renderHeldItem() {
        if (this.game.heldDish) {
            this.elements.heldItem.classList.remove('hidden');
            this.elements.heldItem.innerHTML = `
                <div class="dish ${this.game.heldDish.type}" style="font-size: 2rem; padding: 0.5rem;">
                    ${this.game.heldDish.emoji}
                </div>
            `;
        } else {
            this.elements.heldItem.classList.add('hidden');
        }
    }
    
    renderStationHighlight() {
        // Highlight current station
        document.querySelectorAll('.station').forEach(station => {
            station.style.boxShadow = 'none';
        });
        
        const stationMap = {
            [STATIONS.INTAKE]: 'station-intake',
            [STATIONS.DISHWASHER]: 'station-dishwasher',
            [STATIONS.DRYING]: 'station-drying',
            [STATIONS.STORAGE]: 'station-storage'
        };
        
        const currentStationEl = document.getElementById(stationMap[this.game.currentStation]);
        if (currentStationEl) {
            currentStationEl.style.boxShadow = '0 0 0 2px var(--accent-blue)';
        }
    }
    
    showResults(results) {
        this.elements.resultCleaned.textContent = results.dishesClean;
        this.elements.resultEfficiency.textContent = `${results.efficiency}%`;
        
        let rating = '⭐';
        if (results.efficiency >= 90) rating = '⭐⭐⭐';
        else if (results.efficiency >= 70) rating = '⭐⭐';
        
        if (!results.success) {
            rating = '💔';
        }
        
        this.elements.resultRating.textContent = rating;
        
        this.showScreen('results');
    }
}
