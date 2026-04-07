/**
 * Dishwasher Simulator - Main Entry Point
 * "Clean dishes. Clear mind."
 * 
 * Now with satisfying sounds and visual juice! 🧃
 * Avatar-based movement with interaction zones!
 */

import { Game, STATIONS } from './game.js';
import { UI } from './ui.js';
import { audio } from './audio.js';
import { effects } from './effects.js';
import { ZoneManager } from './zones.js';
import { ModalManager } from './modal.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    const ui = new UI(game);
    const zoneManager = new ZoneManager(game);
    const modalManager = new ModalManager(game, ui);
    
    // Expose for avatar movement agent integration
    window.dishwasherGame = {
        game,
        ui,
        zoneManager,
        modalManager,
        // Called by avatar movement when player position changes
        updatePlayerPosition: (x, y) => zoneManager.updatePlayerPosition(x, y),
        // Called when player presses interact (Space) while in a zone
        interact: () => handleZoneInteraction(),
        // Check if modal is open (blocks movement)
        isModalOpen: () => modalManager.isBlocking()
    };
    
    // Zone prompt UI
    const zonePrompt = document.getElementById('zone-prompt');
    const zoneIcon = zonePrompt?.querySelector('.zone-icon');
    const zoneText = zonePrompt?.querySelector('.zone-text');
    
    // Carrying indicator
    const carryingIndicator = document.getElementById('carrying-indicator');
    
    // Modal elements
    const modalGrid = document.getElementById('modal-grid');
    const modalRunCycleBtn = document.getElementById('btn-modal-run-cycle');
    const modalCloseBtn = document.getElementById('btn-modal-close');
    const modalHeldPreview = document.getElementById('modal-held-preview');
    
    // Initialize modal grid cells
    if (modalGrid) {
        for (let y = 0; y < game.gridHeight; y++) {
            for (let x = 0; x < game.gridWidth; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', () => {
                    if (modalManager.isBlocking()) {
                        game.cursorX = x;
                        game.cursorY = y;
                        game.interactDishwasher();
                    }
                });
                modalGrid.appendChild(cell);
            }
        }
    }
    
    // Modal run cycle button
    modalRunCycleBtn?.addEventListener('click', () => {
        if (!game.dishwasherRunning) {
            audio.playUIClick();
            game.runDishwasherCycle();
        }
    });
    
    // Modal close button
    modalCloseBtn?.addEventListener('click', () => {
        audio.playUIClick();
        modalManager.close();
    });
    
    // Click backdrop to close modal
    document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
        modalManager.close();
    });
    
    // Zone enter/exit callbacks
    zoneManager.onZoneEnter = (zoneId, zone) => {
        updateZonePrompt(zone);
        audio.playUIClick();
    };
    
    zoneManager.onZoneExit = () => {
        hideZonePrompt();
    };
    
    // Update zone prompt
    function updateZonePrompt(zone = null) {
        if (!zone && zoneManager.currentZone) {
            zone = zoneManager.zones[zoneManager.currentZone];
        }
        
        if (!zone || !zonePrompt) {
            hideZonePrompt();
            return;
        }
        
        const prompt = zoneManager.getPrompt();
        if (zoneIcon) zoneIcon.textContent = zone.emoji;
        if (zoneText) zoneText.innerHTML = prompt;
        zonePrompt.classList.remove('hidden');
    }
    
    function hideZonePrompt() {
        zonePrompt?.classList.add('hidden');
    }
    
    // Handle zone interaction (called when Space is pressed)
    function handleZoneInteraction() {
        if (!game.isRunning) return;
        
        const currentZone = zoneManager.currentZone;
        if (!currentZone) return;
        
        // Dishwasher opens modal instead of direct interaction
        if (currentZone === STATIONS.DISHWASHER) {
            if (modalManager.openDishwasher()) {
                hideZonePrompt();
            }
            return;
        }
        
        // Other stations use direct interaction
        game.interact();
        updateZonePrompt(); // Refresh prompt after interaction
    }
    
    // Modal close callback
    modalManager.onClose = () => {
        // Refresh zone prompt when closing modal
        if (zoneManager.currentZone) {
            updateZonePrompt(zoneManager.zones[zoneManager.currentZone]);
        }
    };
    
    // Render modal dishwasher grid
    function renderModalGrid() {
        if (!modalGrid) return;
        
        const grid = game.getGridWithPreview();
        const cells = modalGrid.querySelectorAll('.grid-cell');
        let occupiedCount = 0;
        
        cells.forEach((cell, index) => {
            const x = index % game.gridWidth;
            const y = Math.floor(index / game.gridWidth);
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
            if (x === game.cursorX && y === game.cursorY) {
                cell.classList.add('cursor');
            }
        });
        
        // Update grid usage
        const totalCells = game.gridWidth * game.gridHeight;
        const usagePercent = Math.round((occupiedCount / totalCells) * 100);
        const usageFill = document.getElementById('modal-grid-usage-fill');
        const usageText = document.getElementById('modal-grid-usage-text');
        if (usageFill) usageFill.style.width = `${usagePercent}%`;
        if (usageText) usageText.textContent = `${usagePercent}%`;
        
        // Update run cycle button
        if (modalRunCycleBtn) {
            modalRunCycleBtn.disabled = game.dishwasherRunning || occupiedCount === 0;
            if (game.dishwasherRunning) {
                modalRunCycleBtn.innerHTML = 'Running...';
            } else if (occupiedCount === 0) {
                modalRunCycleBtn.innerHTML = 'Load dishes first';
            } else {
                modalRunCycleBtn.innerHTML = 'Run Cycle <kbd>Enter</kbd>';
            }
        }
        
        // Update cycle timer
        const cycleTimer = document.getElementById('modal-cycle-timer');
        const timerBar = document.getElementById('modal-timer-bar');
        if (game.dishwasherRunning) {
            cycleTimer?.classList.remove('hidden');
            if (timerBar) timerBar.style.width = `${game.cycleProgress}%`;
            modalGrid.classList.add('running');
        } else {
            cycleTimer?.classList.add('hidden');
            modalGrid.classList.remove('running');
        }
        
        // Update held dish preview
        if (modalHeldPreview) {
            if (game.heldDish) {
                modalHeldPreview.classList.remove('hidden');
                const display = modalHeldPreview.querySelector('.held-dish-display');
                const name = modalHeldPreview.querySelector('.held-name');
                if (display) display.textContent = game.heldDish.emoji;
                if (name) name.textContent = game.heldDish.name;
            } else {
                modalHeldPreview.classList.add('hidden');
            }
        }
    }
    
    // Best run tracking
    let bestRun = parseInt(localStorage.getItem('dishwasher-best-run') || '0');
    updateBestRunDisplay();
    
    // Tutorial state
    let tutorialStep = 1;
    const totalTutorialSteps = 6;
    
    // Wire up title screen buttons
    document.getElementById('btn-start').addEventListener('click', () => {
        audio.init();
        audio.playUIClick();
        ui.showScreen('game');
        game.startShift(false);
    });
    
    document.getElementById('btn-tutorial')?.addEventListener('click', () => {
        audio.init();
        audio.playUIClick();
        showTutorial();
    });
    
    document.getElementById('btn-retry').addEventListener('click', () => {
        audio.playUIClick();
        ui.showScreen('game');
        game.startShift(game.practiceMode);
    });
    
    document.getElementById('btn-menu').addEventListener('click', () => {
        audio.playUIClick();
        ui.showScreen('title');
    });
    
    // Tutorial navigation
    document.getElementById('btn-tutorial-next')?.addEventListener('click', () => {
        audio.playUIClick();
        if (tutorialStep < totalTutorialSteps) {
            setTutorialStep(tutorialStep + 1);
        }
    });
    
    document.getElementById('btn-tutorial-prev')?.addEventListener('click', () => {
        audio.playUIClick();
        if (tutorialStep > 1) {
            setTutorialStep(tutorialStep - 1);
        }
    });
    
    document.getElementById('btn-tutorial-close')?.addEventListener('click', () => {
        audio.playUIClick();
        hideTutorial();
    });
    
    document.getElementById('btn-tutorial-start')?.addEventListener('click', () => {
        audio.playUIClick();
        hideTutorial();
        ui.showScreen('game');
        game.startShift(true); // Practice mode
    });
    
    document.getElementById('btn-tutorial-skip')?.addEventListener('click', () => {
        audio.playUIClick();
        hideTutorial();
        ui.showScreen('game');
        game.startShift(false); // Normal mode
    });
    
    // Help modal
    document.getElementById('btn-help-close')?.addEventListener('click', () => {
        audio.playUIClick();
        document.getElementById('help-modal').classList.add('hidden');
    });
    
    // Tutorial dots
    document.querySelectorAll('.tutorial-dots .dot').forEach(dot => {
        dot.addEventListener('click', () => {
            audio.playUIClick();
            const step = parseInt(dot.dataset.step);
            setTutorialStep(step);
        });
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Initialize audio on any key (browser policy)
        audio.init();
        
        // Handle modals/overlays first
        const helpModal = document.getElementById('help-modal');
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        
        // Dishwasher modal is handled by ModalManager
        if (modalManager.isBlocking()) {
            // Escape closes modal
            if (e.key === 'Escape') {
                e.preventDefault();
                audio.playUIClick();
                modalManager.close();
            }
            // ModalManager handles other keys
            return;
        }
        
        if (helpModal && !helpModal.classList.contains('hidden')) {
            if (e.key === 'Escape' || e.key === '?') {
                audio.playUIClick();
                helpModal.classList.add('hidden');
            }
            return;
        }
        
        if (tutorialOverlay && !tutorialOverlay.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                audio.playUIClick();
                hideTutorial();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                if (tutorialStep < totalTutorialSteps) {
                    audio.playUIClick();
                    setTutorialStep(tutorialStep + 1);
                }
            } else if (e.key === 'ArrowLeft') {
                if (tutorialStep > 1) {
                    audio.playUIClick();
                    setTutorialStep(tutorialStep - 1);
                }
            }
            return;
        }
        
        // Title screen shortcuts
        if (!game.isRunning) {
            const titleScreen = document.getElementById('title-screen');
            if (titleScreen && titleScreen.classList.contains('active')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    audio.playUIClick();
                    ui.showScreen('game');
                    game.startShift(false);
                }
            }
            return;
        }
        
        // Game controls (when not in modal)
        // Note: Movement (WASD) will be handled by avatar agent
        // Here we keep station switching for non-avatar mode
        switch(e.key.toLowerCase()) {
            // Station hotkeys (1-4) - legacy mode / debug
            case '1':
                game.setStation(STATIONS.INTAKE);
                zoneManager.currentZone = STATIONS.INTAKE;
                updateZonePrompt(zoneManager.zones[STATIONS.INTAKE]);
                break;
            case '2':
                // Dishwasher now opens modal
                zoneManager.currentZone = STATIONS.DISHWASHER;
                game.setStation(STATIONS.DISHWASHER);
                handleZoneInteraction();
                break;
            case '3':
                game.setStation(STATIONS.DRYING);
                zoneManager.currentZone = STATIONS.DRYING;
                updateZonePrompt(zoneManager.zones[STATIONS.DRYING]);
                break;
            case '4':
                game.setStation(STATIONS.STORAGE);
                zoneManager.currentZone = STATIONS.STORAGE;
                updateZonePrompt(zoneManager.zones[STATIONS.STORAGE]);
                break;
                
            // Grid cursor movement (for when not in modal)
            case 'w':
            case 'arrowup':
                game.moveCursor(0, -1);
                break;
            case 's':
            case 'arrowdown':
                game.moveCursor(0, 1);
                break;
            case 'a':
            case 'arrowleft':
                game.moveCursor(-1, 0);
                break;
            case 'd':
            case 'arrowright':
                game.moveCursor(1, 0);
                break;
                
            // Actions
            case ' ':
                e.preventDefault();
                // Use zone interaction if we have a current zone
                if (zoneManager.currentZone) {
                    handleZoneInteraction();
                } else {
                    game.interact();
                }
                break;
            case 'r':
            case 'shift':
                game.rotateDish();
                break;
            case 'tab':
                e.preventDefault();
                game.cycleStation();
                // Update zone to match
                zoneManager.currentZone = game.currentStation;
                updateZonePrompt(zoneManager.zones[game.currentStation]);
                break;
            case 'enter':
                e.preventDefault();
                // If at dishwasher station, open modal
                if (game.currentStation === STATIONS.DISHWASHER) {
                    modalManager.openDishwasher();
                } else {
                    game.confirmAction();
                }
                break;
                
            // Help toggle
            case '?':
            case '/':
                if (helpModal) {
                    audio.playUIClick();
                    helpModal.classList.toggle('hidden');
                }
                break;
            case 'escape':
                if (helpModal) {
                    helpModal.classList.add('hidden');
                }
                break;
                
            // Audio toggle
            case 'm':
                const muted = !audio.toggle();
                console.log(muted ? '🔇 Audio muted' : '🔊 Audio on');
                break;
        }
    });
    
    // Click to select station
    document.querySelectorAll('.station').forEach(station => {
        station.addEventListener('click', (e) => {
            if (!game.isRunning) return;
            audio.init();
            const stationName = station.dataset.station;
            if (stationName) {
                game.setStation(stationName);
                zoneManager.currentZone = stationName;
                
                // Open modal for dishwasher
                if (stationName === STATIONS.DISHWASHER) {
                    handleZoneInteraction();
                } else {
                    updateZonePrompt(zoneManager.zones[stationName]);
                }
            }
        });
    });
    
    // Handle game over with best run tracking
    game.onGameOver = (results) => {
        if (results.dishesClean > bestRun && !game.practiceMode) {
            bestRun = results.dishesClean;
            localStorage.setItem('dishwasher-best-run', bestRun.toString());
            results.newBest = true;
            updateBestRunDisplay();
        }
        modalManager.close(); // Close modal on game over
        ui.showResults(results);
    };
    
    // Enhanced game update callback
    const originalRender = ui.render.bind(ui);
    game.onUpdate = () => {
        // Call original UI render
        originalRender();
        
        // Update carrying indicator
        if (carryingIndicator) {
            if (game.heldDish) {
                carryingIndicator.classList.remove('hidden');
                const emoji = carryingIndicator.querySelector('.dish-emoji');
                const name = carryingIndicator.querySelector('.dish-name');
                const status = carryingIndicator.querySelector('.dish-status');
                
                if (emoji) emoji.textContent = game.heldDish.emoji;
                if (name) name.textContent = game.heldDish.name;
                if (status) {
                    status.textContent = game.heldDish.dirty ? 'Dirty' : 'Clean';
                    status.className = 'dish-status ' + (game.heldDish.dirty ? 'dirty' : 'clean');
                }
            } else {
                carryingIndicator.classList.add('hidden');
            }
        }
        
        // Update modal grid if open
        if (modalManager.isBlocking()) {
            renderModalGrid();
        }
        
        // Update zone prompt (in case held dish changed)
        if (zoneManager.currentZone && !modalManager.isBlocking()) {
            updateZonePrompt();
        }
    };
    
    // Also init audio on first click anywhere
    document.addEventListener('click', () => {
        audio.init();
    }, { once: true });
    
    // Helper functions
    function updateBestRunDisplay() {
        const display = document.getElementById('best-run-display');
        const score = document.getElementById('best-run-score');
        if (display && score && bestRun > 0) {
            display.classList.remove('hidden');
            score.textContent = bestRun;
        }
    }
    
    function showTutorial() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            setTutorialStep(1);
        }
    }
    
    function hideTutorial() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
    
    function setTutorialStep(step) {
        tutorialStep = step;
        
        // Hide all steps, show current
        document.querySelectorAll('.tutorial-step').forEach(el => {
            el.classList.add('hidden');
        });
        const currentStep = document.querySelector(`.tutorial-step[data-step="${step}"]`);
        if (currentStep) {
            currentStep.classList.remove('hidden');
        }
        
        // Update dots
        document.querySelectorAll('.tutorial-dots .dot').forEach(dot => {
            dot.classList.toggle('active', parseInt(dot.dataset.step) === step);
        });
        
        // Update nav buttons
        const prevBtn = document.getElementById('btn-tutorial-prev');
        const nextBtn = document.getElementById('btn-tutorial-next');
        if (prevBtn) prevBtn.disabled = step === 1;
        if (nextBtn) nextBtn.style.display = step === totalTutorialSteps ? 'none' : 'block';
    }
    
    // Start title screen
    ui.showScreen('title');
    
    console.log('🧽 Dishwasher Simulator loaded');
    console.log('🏃 Avatar Mode: Walk to stations, press Space to interact');
    console.log('🫧 Dishwasher opens as modal for Tetris packing');
    console.log('🎮 Legacy: 1-4=stations, WASD=move, Space=grab, R=rotate');
    console.log('❓ Press ? for help | M=mute');
    console.log('📍 API: window.dishwasherGame for avatar integration');
});
