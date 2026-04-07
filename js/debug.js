/**
 * Dishwasher Simulator - Debug & Designer Tools
 * Toggle with backtick (`) or Ctrl+D
 */

import { DISHES, STATIONS } from './game.js';

// Default tuning parameters
const DEFAULT_TUNING = {
    spawnInterval: 2000,
    waveDishCounts: [8, 11, 14],
    cycleDuration: 5000,
    gridWidth: 8,
    gridHeight: 6,
    shiftDuration: 180,
    intakeOverflowLimit: 10
};

export class DebugTools {
    constructor(game, ui) {
        this.game = game;
        this.ui = ui;
        this.visible = false;
        this.dashboardVisible = false;
        this.infiniteTime = false;
        this.autoSpawn = true;
        this.gameSpeed = 1;
        this.tuning = { ...DEFAULT_TUNING };
        
        // Load saved settings
        this.loadSettings();
        
        // Create UI
        this.createDebugPanel();
        this.createDashboard();
        
        // Wire up keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === '`' || (e.ctrlKey && e.key === 'd')) {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === '~' || (e.ctrlKey && e.shiftKey && e.key === 'D')) {
                e.preventDefault();
                this.toggleDashboard();
            }
        });
        
        // Patch game methods for debug features
        this.patchGame();
        
        // Update state inspector periodically
        setInterval(() => this.updateStateInspector(), 250);
        
        console.log('🔧 Debug tools loaded - Press ` or Ctrl+D to toggle');
    }
    
    toggle() {
        this.visible = !this.visible;
        this.panel.style.display = this.visible ? 'block' : 'none';
        if (this.visible) this.updatePanel();
    }
    
    toggleDashboard() {
        this.dashboardVisible = !this.dashboardVisible;
        this.dashboard.style.display = this.dashboardVisible ? 'block' : 'none';
        if (this.dashboardVisible) this.updateDashboard();
    }
    
    createDebugPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.innerHTML = `
            <div class="debug-header">
                <h3>🔧 Debug Menu</h3>
                <button class="debug-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            
            <div class="debug-section">
                <h4>Game Controls</h4>
                <div class="debug-row">
                    <button id="dbg-pause">⏸️ Pause</button>
                    <button id="dbg-resume">▶️ Resume</button>
                </div>
                <div class="debug-row">
                    <button id="dbg-wave2">Skip to Wave 2</button>
                    <button id="dbg-wave3">Skip to Wave 3</button>
                </div>
                <div class="debug-row">
                    <button id="dbg-win">🏆 Instant Win</button>
                    <button id="dbg-fail">💀 Instant Fail</button>
                </div>
                <div class="debug-row">
                    <button id="dbg-reset">🔄 Reset Shift</button>
                </div>
            </div>
            
            <div class="debug-section">
                <h4>Spawning Controls</h4>
                <div class="debug-row">
                    <label>Spawn Type:</label>
                    <select id="dbg-dish-type">
                        <option value="plate">🍽️ Plate</option>
                        <option value="bowl">🥣 Bowl</option>
                        <option value="cup">☕ Cup</option>
                        <option value="pan">🍳 Pan</option>
                        <option value="glass">🍷 Glass</option>
                    </select>
                    <button id="dbg-spawn">Spawn</button>
                </div>
                <div class="debug-row">
                    <button id="dbg-clear-intake">Clear Intake</button>
                </div>
                <div class="debug-row">
                    <label>Spawn Rate:</label>
                    <input type="range" id="dbg-spawn-rate" min="500" max="5000" value="2000">
                    <span id="dbg-spawn-rate-val">2000ms</span>
                </div>
                <div class="debug-row">
                    <label>Auto-Spawn:</label>
                    <input type="checkbox" id="dbg-auto-spawn" checked>
                </div>
            </div>
            
            <div class="debug-section">
                <h4>Time Controls</h4>
                <div class="debug-row">
                    <button id="dbg-speed-half">0.5x</button>
                    <button id="dbg-speed-1">1x</button>
                    <button id="dbg-speed-2">2x</button>
                    <button id="dbg-speed-4">4x</button>
                </div>
                <div class="debug-row">
                    <button id="dbg-add-time">+30s</button>
                    <button id="dbg-sub-time">-30s</button>
                </div>
                <div class="debug-row">
                    <label>Infinite Time:</label>
                    <input type="checkbox" id="dbg-infinite-time">
                </div>
            </div>
            
            <div class="debug-section">
                <h4>Dishwasher Controls</h4>
                <div class="debug-row">
                    <button id="dbg-instant-cycle">⚡ Instant Cycle</button>
                </div>
                <div class="debug-row">
                    <button id="dbg-clear-grid">Clear Grid</button>
                    <button id="dbg-fill-grid">Fill Random</button>
                </div>
            </div>
            
            <div class="debug-section">
                <h4>Quick Actions</h4>
                <div class="debug-row">
                    <button id="dbg-dashboard">📊 Designer Dashboard</button>
                </div>
            </div>
        `;
        
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 320px;
            max-height: 90vh;
            overflow-y: auto;
            background: rgba(20, 20, 30, 0.95);
            border: 2px solid #4a9eff;
            border-radius: 8px;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            color: #fff;
            z-index: 10000;
            display: none;
        `;
        
        document.body.appendChild(this.panel);
        this.wireDebugButtons();
        this.addDebugStyles();
    }
    
    createDashboard() {
        this.dashboard = document.createElement('div');
        this.dashboard.id = 'debug-dashboard';
        this.dashboard.innerHTML = `
            <div class="debug-header">
                <h3>📊 Designer Dashboard</h3>
                <button class="debug-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            
            <div class="debug-section">
                <h4>Tuning Parameters</h4>
                <div class="debug-row">
                    <label>Spawn Interval (ms):</label>
                    <input type="number" id="tune-spawn-interval" value="2000" min="100" max="10000">
                </div>
                <div class="debug-row">
                    <label>Wave 1 Dishes:</label>
                    <input type="number" id="tune-wave1" value="8" min="1" max="50">
                </div>
                <div class="debug-row">
                    <label>Wave 2 Dishes:</label>
                    <input type="number" id="tune-wave2" value="11" min="1" max="50">
                </div>
                <div class="debug-row">
                    <label>Wave 3 Dishes:</label>
                    <input type="number" id="tune-wave3" value="14" min="1" max="50">
                </div>
                <div class="debug-row">
                    <label>Cycle Duration (ms):</label>
                    <input type="number" id="tune-cycle-duration" value="5000" min="500" max="30000">
                </div>
                <div class="debug-row">
                    <label>Shift Duration (s):</label>
                    <input type="number" id="tune-shift-duration" value="180" min="30" max="600">
                </div>
                <div class="debug-row">
                    <label>Intake Overflow:</label>
                    <input type="number" id="tune-overflow" value="10" min="5" max="30">
                </div>
            </div>
            
            <div class="debug-section">
                <h4>State Inspector</h4>
                <div class="state-inspector">
                    <div class="debug-row">
                        <span>Game Running:</span>
                        <span id="state-running">-</span>
                    </div>
                    <div class="debug-row">
                        <span>Current Wave:</span>
                        <span id="state-wave">-</span>
                    </div>
                    <div class="debug-row">
                        <span>Time Remaining:</span>
                        <span id="state-time">-</span>
                    </div>
                    <div class="debug-row">
                        <span>Intake Count:</span>
                        <span id="state-intake">-</span>
                    </div>
                    <div class="debug-row">
                        <span>Grid Occupancy:</span>
                        <span id="state-grid">-</span>
                    </div>
                    <div class="debug-row">
                        <span>Dishes Cleaned:</span>
                        <span id="state-cleaned">-</span>
                    </div>
                    <div class="debug-row">
                        <span>Held Dish:</span>
                        <span id="state-held">-</span>
                    </div>
                    <div class="debug-row">
                        <span>Current Station:</span>
                        <span id="state-station">-</span>
                    </div>
                    <div class="debug-row">
                        <span>Dishwasher:</span>
                        <span id="state-dishwasher">-</span>
                    </div>
                </div>
                <button id="dbg-show-json">Show Full State JSON</button>
                <pre id="state-json" style="display:none; max-height: 200px; overflow: auto; background: #111; padding: 5px; font-size: 10px;"></pre>
            </div>
            
            <div class="debug-section">
                <h4>Presets</h4>
                <div class="debug-row">
                    <button id="preset-easy">Easy Mode</button>
                    <button id="preset-hard">Hard Mode</button>
                    <button id="preset-default">Default</button>
                </div>
            </div>
            
            <div class="debug-section">
                <h4>Save/Load</h4>
                <div class="debug-row">
                    <button id="dbg-export">Export JSON</button>
                    <button id="dbg-import">Import JSON</button>
                </div>
                <div class="debug-row">
                    <button id="dbg-save-local">Save to Browser</button>
                    <button id="dbg-load-local">Load from Browser</button>
                </div>
                <input type="file" id="dbg-import-file" style="display:none" accept=".json">
            </div>
        `;
        
        this.dashboard.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 350px;
            max-height: 90vh;
            overflow-y: auto;
            background: rgba(20, 30, 20, 0.95);
            border: 2px solid #4aff4a;
            border-radius: 8px;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            color: #fff;
            z-index: 10000;
            display: none;
        `;
        
        document.body.appendChild(this.dashboard);
        this.wireDashboardButtons();
    }
    
    addDebugStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #debug-panel .debug-header,
            #debug-dashboard .debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #555;
                padding-bottom: 8px;
                margin-bottom: 10px;
            }
            
            #debug-panel h3,
            #debug-dashboard h3 {
                margin: 0;
                color: #4a9eff;
            }
            
            #debug-dashboard h3 {
                color: #4aff4a;
            }
            
            #debug-panel .debug-close,
            #debug-dashboard .debug-close {
                background: none;
                border: none;
                color: #fff;
                font-size: 20px;
                cursor: pointer;
            }
            
            #debug-panel .debug-section,
            #debug-dashboard .debug-section {
                margin-bottom: 15px;
                padding: 8px;
                background: rgba(255,255,255,0.05);
                border-radius: 4px;
            }
            
            #debug-panel h4,
            #debug-dashboard h4 {
                margin: 0 0 8px 0;
                font-size: 11px;
                color: #888;
                text-transform: uppercase;
            }
            
            #debug-panel .debug-row,
            #debug-dashboard .debug-row {
                display: flex;
                gap: 5px;
                margin-bottom: 5px;
                align-items: center;
            }
            
            #debug-panel button,
            #debug-dashboard button {
                background: #333;
                border: 1px solid #555;
                color: #fff;
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-family: monospace;
                font-size: 11px;
            }
            
            #debug-panel button:hover,
            #debug-dashboard button:hover {
                background: #444;
                border-color: #4a9eff;
            }
            
            #debug-panel input[type="range"] {
                flex: 1;
            }
            
            #debug-panel select,
            #debug-dashboard input[type="number"] {
                background: #222;
                border: 1px solid #555;
                color: #fff;
                padding: 3px;
                border-radius: 3px;
                font-family: monospace;
            }
            
            #debug-dashboard input[type="number"] {
                width: 80px;
            }
            
            #debug-panel label,
            #debug-dashboard label {
                flex: 1;
                color: #aaa;
            }
            
            .state-inspector .debug-row {
                justify-content: space-between;
            }
            
            .state-inspector .debug-row span:last-child {
                color: #4aff4a;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }
    
    wireDebugButtons() {
        // Game Controls
        this.panel.querySelector('#dbg-pause').onclick = () => this.pauseGame();
        this.panel.querySelector('#dbg-resume').onclick = () => this.resumeGame();
        this.panel.querySelector('#dbg-wave2').onclick = () => this.skipToWave(2);
        this.panel.querySelector('#dbg-wave3').onclick = () => this.skipToWave(3);
        this.panel.querySelector('#dbg-win').onclick = () => this.instantWin();
        this.panel.querySelector('#dbg-fail').onclick = () => this.instantFail();
        this.panel.querySelector('#dbg-reset').onclick = () => this.resetShift();
        
        // Spawning Controls
        this.panel.querySelector('#dbg-spawn').onclick = () => this.spawnSpecificDish();
        this.panel.querySelector('#dbg-clear-intake').onclick = () => this.clearIntake();
        
        const spawnRateSlider = this.panel.querySelector('#dbg-spawn-rate');
        const spawnRateVal = this.panel.querySelector('#dbg-spawn-rate-val');
        spawnRateSlider.oninput = () => {
            const val = spawnRateSlider.value;
            spawnRateVal.textContent = `${val}ms`;
            this.tuning.spawnInterval = parseInt(val);
        };
        
        this.panel.querySelector('#dbg-auto-spawn').onchange = (e) => {
            this.autoSpawn = e.target.checked;
        };
        
        // Time Controls
        this.panel.querySelector('#dbg-speed-half').onclick = () => this.setGameSpeed(0.5);
        this.panel.querySelector('#dbg-speed-1').onclick = () => this.setGameSpeed(1);
        this.panel.querySelector('#dbg-speed-2').onclick = () => this.setGameSpeed(2);
        this.panel.querySelector('#dbg-speed-4').onclick = () => this.setGameSpeed(4);
        this.panel.querySelector('#dbg-add-time').onclick = () => this.addTime(30);
        this.panel.querySelector('#dbg-sub-time').onclick = () => this.addTime(-30);
        this.panel.querySelector('#dbg-infinite-time').onchange = (e) => {
            this.infiniteTime = e.target.checked;
        };
        
        // Dishwasher Controls
        this.panel.querySelector('#dbg-instant-cycle').onclick = () => this.instantCycle();
        this.panel.querySelector('#dbg-clear-grid').onclick = () => this.clearGrid();
        this.panel.querySelector('#dbg-fill-grid').onclick = () => this.fillGridRandom();
        
        // Dashboard toggle
        this.panel.querySelector('#dbg-dashboard').onclick = () => this.toggleDashboard();
    }
    
    wireDashboardButtons() {
        // Tuning inputs
        const tuneInputs = {
            'tune-spawn-interval': 'spawnInterval',
            'tune-wave1': (v) => this.tuning.waveDishCounts[0] = v,
            'tune-wave2': (v) => this.tuning.waveDishCounts[1] = v,
            'tune-wave3': (v) => this.tuning.waveDishCounts[2] = v,
            'tune-cycle-duration': 'cycleDuration',
            'tune-shift-duration': 'shiftDuration',
            'tune-overflow': 'intakeOverflowLimit'
        };
        
        Object.entries(tuneInputs).forEach(([id, prop]) => {
            const input = this.dashboard.querySelector(`#${id}`);
            input.onchange = () => {
                const val = parseInt(input.value);
                if (typeof prop === 'function') {
                    prop(val);
                } else {
                    this.tuning[prop] = val;
                }
                this.applyTuning();
            };
        });
        
        // Show JSON toggle
        this.dashboard.querySelector('#dbg-show-json').onclick = () => {
            const jsonPre = this.dashboard.querySelector('#state-json');
            jsonPre.style.display = jsonPre.style.display === 'none' ? 'block' : 'none';
            this.updateStateInspector();
        };
        
        // Presets
        this.dashboard.querySelector('#preset-easy').onclick = () => this.loadPreset('easy');
        this.dashboard.querySelector('#preset-hard').onclick = () => this.loadPreset('hard');
        this.dashboard.querySelector('#preset-default').onclick = () => this.loadPreset('default');
        
        // Save/Load
        this.dashboard.querySelector('#dbg-export').onclick = () => this.exportTuning();
        this.dashboard.querySelector('#dbg-import').onclick = () => {
            this.dashboard.querySelector('#dbg-import-file').click();
        };
        this.dashboard.querySelector('#dbg-import-file').onchange = (e) => this.importTuning(e);
        this.dashboard.querySelector('#dbg-save-local').onclick = () => this.saveSettings();
        this.dashboard.querySelector('#dbg-load-local').onclick = () => {
            this.loadSettings();
            this.updateDashboard();
        };
    }
    
    patchGame() {
        const self = this;
        const originalStartWave = this.game.startWave.bind(this.game);
        
        // Patch spawn timer to use tuning
        this.game.startWave = function() {
            const dishesToSpawn = self.tuning.waveDishCounts[this.wave - 1] || (5 + this.wave * 3);
            let spawned = 0;
            
            clearInterval(this.spawnTimer);
            
            const spawnTick = () => {
                if (!self.autoSpawn) return;
                if (spawned >= dishesToSpawn) {
                    clearInterval(this.spawnTimer);
                    return;
                }
                
                this.spawnDish();
                spawned++;
                
                if (this.intake.length > self.tuning.intakeOverflowLimit) {
                    this.endShift(false);
                }
                
                this.onUpdate?.();
            };
            
            this.spawnTimer = setInterval(spawnTick, self.tuning.spawnInterval / self.gameSpeed);
        };
        
        // Patch time tick for infinite time
        const originalTick = () => {
            if (self.infiniteTime) return;
            this.game.timeRemaining -= 1 * self.gameSpeed;
            this.game.onUpdate?.();
            
            if (this.game.timeRemaining <= 0) {
                this.game.endShift(false);
            }
        };
        
        // Patch cycle duration
        const originalRunCycle = this.game.runDishwasherCycle.bind(this.game);
        this.game.runDishwasherCycle = function() {
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
            
            const cycleDuration = self.tuning.cycleDuration / self.gameSpeed;
            const updateInterval = 100;
            
            const cycleTimer = setInterval(() => {
                this.cycleProgress += (updateInterval / cycleDuration) * 100;
                this.onUpdate?.();
                
                if (this.cycleProgress >= 100) {
                    clearInterval(cycleTimer);
                    this.completeCycle();
                }
            }, updateInterval);
        };
    }
    
    // Debug Actions
    pauseGame() {
        this._savedRunning = this.game.isRunning;
        this.game.isRunning = false;
        clearInterval(this.game.spawnTimer);
        clearInterval(this.game.gameTimer);
        console.log('⏸️ Game paused');
    }
    
    resumeGame() {
        if (!this.game.isRunning) {
            this.game.isRunning = true;
            this.game.startWave();
            this.game.gameTimer = setInterval(() => {
                if (this.infiniteTime) return;
                this.game.timeRemaining--;
                this.game.onUpdate?.();
                if (this.game.timeRemaining <= 0) {
                    this.game.endShift(false);
                }
            }, 1000 / this.gameSpeed);
            console.log('▶️ Game resumed');
        }
    }
    
    skipToWave(wave) {
        this.game.wave = wave;
        clearInterval(this.game.spawnTimer);
        this.game.intake = [];
        this.game.startWave();
        this.game.onUpdate?.();
        console.log(`⏭️ Skipped to wave ${wave}`);
    }
    
    instantWin() {
        this.game.endShift(true);
        console.log('🏆 Instant win triggered');
    }
    
    instantFail() {
        this.game.endShift(false);
        console.log('💀 Instant fail triggered');
    }
    
    resetShift() {
        this.ui.showScreen('game');
        this.game.startShift();
        console.log('🔄 Shift reset');
    }
    
    spawnSpecificDish() {
        const type = this.panel.querySelector('#dbg-dish-type').value;
        this.game.intake.push({
            id: Date.now() + Math.random(),
            type: type,
            ...DISHES[type],
            rotation: 0,
            dirty: true
        });
        this.game.onUpdate?.();
        console.log(`🍽️ Spawned ${type}`);
    }
    
    clearIntake() {
        this.game.intake = [];
        this.game.onUpdate?.();
        console.log('🧹 Intake cleared');
    }
    
    setGameSpeed(speed) {
        this.gameSpeed = speed;
        // Restart timers with new speed
        if (this.game.isRunning) {
            this.pauseGame();
            this.resumeGame();
        }
        console.log(`⏱️ Game speed: ${speed}x`);
    }
    
    addTime(seconds) {
        this.game.timeRemaining = Math.max(0, this.game.timeRemaining + seconds);
        this.game.onUpdate?.();
        console.log(`⏱️ Time ${seconds > 0 ? '+' : ''}${seconds}s`);
    }
    
    instantCycle() {
        if (this.game.dishwasherRunning) {
            this.game.completeCycle();
        } else {
            // Force complete any dishes in grid
            for (let y = 0; y < this.game.gridHeight; y++) {
                for (let x = 0; x < this.game.gridWidth; x++) {
                    if (this.game.grid[y][x]) {
                        this.game.grid[y][x].dirty = false;
                    }
                }
            }
            this.game.onUpdate?.();
        }
        console.log('⚡ Instant cycle complete');
    }
    
    clearGrid() {
        this.game.grid = this.game.createEmptyGrid();
        this.game.onUpdate?.();
        console.log('🧹 Grid cleared');
    }
    
    fillGridRandom() {
        const types = ['plate', 'bowl', 'cup'];
        for (let i = 0; i < 10; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const dish = {
                id: Date.now() + Math.random(),
                type: type,
                ...DISHES[type],
                rotation: Math.floor(Math.random() * 4),
                dirty: true
            };
            
            // Try random positions
            for (let attempt = 0; attempt < 20; attempt++) {
                const x = Math.floor(Math.random() * this.game.gridWidth);
                const y = Math.floor(Math.random() * this.game.gridHeight);
                if (this.game.canPlaceDish(dish, x, y)) {
                    this.game.placeDish(dish, x, y);
                    break;
                }
            }
        }
        this.game.onUpdate?.();
        console.log('🎲 Grid filled with random dishes');
    }
    
    // Dashboard methods
    updateDashboard() {
        this.dashboard.querySelector('#tune-spawn-interval').value = this.tuning.spawnInterval;
        this.dashboard.querySelector('#tune-wave1').value = this.tuning.waveDishCounts[0];
        this.dashboard.querySelector('#tune-wave2').value = this.tuning.waveDishCounts[1];
        this.dashboard.querySelector('#tune-wave3').value = this.tuning.waveDishCounts[2];
        this.dashboard.querySelector('#tune-cycle-duration').value = this.tuning.cycleDuration;
        this.dashboard.querySelector('#tune-shift-duration').value = this.tuning.shiftDuration;
        this.dashboard.querySelector('#tune-overflow').value = this.tuning.intakeOverflowLimit;
    }
    
    updateStateInspector() {
        if (!this.dashboardVisible) return;
        
        const g = this.game;
        
        this.dashboard.querySelector('#state-running').textContent = g.isRunning ? '✅ Yes' : '❌ No';
        this.dashboard.querySelector('#state-wave').textContent = `${g.wave}/${g.totalWaves}`;
        this.dashboard.querySelector('#state-time').textContent = `${g.timeRemaining}s`;
        this.dashboard.querySelector('#state-intake').textContent = g.intake.length;
        
        // Grid occupancy
        let occupied = 0;
        for (let y = 0; y < g.gridHeight; y++) {
            for (let x = 0; x < g.gridWidth; x++) {
                if (g.grid[y][x]) occupied++;
            }
        }
        const total = g.gridWidth * g.gridHeight;
        this.dashboard.querySelector('#state-grid').textContent = `${occupied}/${total} (${Math.round(occupied/total*100)}%)`;
        
        this.dashboard.querySelector('#state-cleaned').textContent = g.dishesClean;
        this.dashboard.querySelector('#state-held').textContent = g.heldDish ? `${g.heldDish.emoji} ${g.heldDish.name}` : 'None';
        this.dashboard.querySelector('#state-station').textContent = g.currentStation;
        this.dashboard.querySelector('#state-dishwasher').textContent = g.dishwasherRunning ? `Running ${Math.round(g.cycleProgress)}%` : 'Idle';
        
        // Full JSON
        const jsonPre = this.dashboard.querySelector('#state-json');
        if (jsonPre.style.display !== 'none') {
            const state = {
                isRunning: g.isRunning,
                wave: g.wave,
                timeRemaining: g.timeRemaining,
                dishesClean: g.dishesClean,
                currentStation: g.currentStation,
                heldDish: g.heldDish?.type || null,
                intakeCount: g.intake.length,
                intakeTypes: g.intake.map(d => d.type),
                gridOccupancy: `${occupied}/${total}`,
                dryingRack: g.dryingRack.map(d => d?.type || null),
                storage: g.storage,
                dishwasherRunning: g.dishwasherRunning,
                cycleProgress: g.cycleProgress
            };
            jsonPre.textContent = JSON.stringify(state, null, 2);
        }
    }
    
    updatePanel() {
        this.panel.querySelector('#dbg-spawn-rate').value = this.tuning.spawnInterval;
        this.panel.querySelector('#dbg-spawn-rate-val').textContent = `${this.tuning.spawnInterval}ms`;
        this.panel.querySelector('#dbg-auto-spawn').checked = this.autoSpawn;
        this.panel.querySelector('#dbg-infinite-time').checked = this.infiniteTime;
    }
    
    applyTuning() {
        // Tuning is read live by patched methods
        console.log('📊 Tuning applied:', this.tuning);
    }
    
    loadPreset(name) {
        const presets = {
            easy: {
                spawnInterval: 3000,
                waveDishCounts: [5, 7, 9],
                cycleDuration: 3000,
                shiftDuration: 240,
                intakeOverflowLimit: 15
            },
            hard: {
                spawnInterval: 1000,
                waveDishCounts: [12, 16, 20],
                cycleDuration: 7000,
                shiftDuration: 120,
                intakeOverflowLimit: 8
            },
            default: { ...DEFAULT_TUNING }
        };
        
        this.tuning = { ...presets[name] };
        this.updateDashboard();
        console.log(`📋 Loaded preset: ${name}`);
    }
    
    exportTuning() {
        const json = JSON.stringify(this.tuning, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dishwasher-tuning.json';
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('📤 Tuning exported');
    }
    
    importTuning(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                this.tuning = { ...DEFAULT_TUNING, ...imported };
                this.updateDashboard();
                console.log('📥 Tuning imported:', this.tuning);
            } catch (err) {
                console.error('Failed to import tuning:', err);
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    }
    
    saveSettings() {
        const settings = {
            tuning: this.tuning,
            autoSpawn: this.autoSpawn,
            infiniteTime: this.infiniteTime,
            gameSpeed: this.gameSpeed
        };
        localStorage.setItem('dishwasher-debug', JSON.stringify(settings));
        console.log('💾 Settings saved to browser');
    }
    
    loadSettings() {
        const saved = localStorage.getItem('dishwasher-debug');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.tuning = { ...DEFAULT_TUNING, ...settings.tuning };
                this.autoSpawn = settings.autoSpawn ?? true;
                this.infiniteTime = settings.infiniteTime ?? false;
                this.gameSpeed = settings.gameSpeed ?? 1;
                console.log('📂 Settings loaded from browser');
            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        }
    }
}
