/**
 * Dishwasher Simulator - Main Entry Point
 * "Clean dishes. Clear mind."
 * 
 * Now with satisfying sounds and visual juice! 🧃
 */

import { Game, STATIONS } from './game.js';
import { UI } from './ui.js';
import { audio } from './audio.js';
import { effects } from './effects.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    const ui = new UI(game);
    
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
        
        // Game controls
        switch(e.key.toLowerCase()) {
            // Station hotkeys (1-4)
            case '1':
                game.setStation(STATIONS.INTAKE);
                break;
            case '2':
                game.setStation(STATIONS.DISHWASHER);
                break;
            case '3':
                game.setStation(STATIONS.DRYING);
                break;
            case '4':
                game.setStation(STATIONS.STORAGE);
                break;
                
            // Movement (WASD/Arrows)
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
                game.interact();
                break;
            case 'r':
            case 'shift':
                game.rotateDish();
                break;
            case 'tab':
                e.preventDefault();
                game.cycleStation();
                break;
            case 'enter':
                e.preventDefault();
                game.confirmAction();
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
        ui.showResults(results);
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
    console.log('🎮 Controls: WASD/Arrows=move, Space=grab, R/Shift=rotate, Tab=switch station');
    console.log('🔢 Quick switch: 1=Intake, 2=Dishwasher, 3=Drying, 4=Storage');
    console.log('❓ Press ? for help');
    console.log('🔊 Press M to toggle sound');
});
