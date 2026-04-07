/**
 * Dishwasher Simulator - Main Entry Point
 * "Clean dishes. Clear mind."
 * 
 * Now with satisfying sounds and visual juice! 🧃
 */

import { Game } from './game.js';
import { UI } from './ui.js';
import { audio } from './audio.js';
import { effects } from './effects.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    const ui = new UI(game);
    
    // Wire up title screen buttons
    document.getElementById('btn-start').addEventListener('click', () => {
        audio.init(); // Initialize audio on user interaction
        audio.playUIClick();
        ui.showScreen('game');
        game.startShift();
    });
    
    document.getElementById('btn-retry').addEventListener('click', () => {
        audio.playUIClick();
        ui.showScreen('game');
        game.startShift();
    });
    
    document.getElementById('btn-menu').addEventListener('click', () => {
        audio.playUIClick();
        ui.showScreen('title');
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Initialize audio on any key (browser policy)
        audio.init();
        
        if (!game.isRunning) return;
        
        switch(e.key.toLowerCase()) {
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
            case ' ':
                e.preventDefault();
                game.interact();
                break;
            case 'shift':
                game.rotateDish();
                break;
            case 'tab':
                e.preventDefault();
                game.cycleStation();
                break;
            case 'enter':
                game.confirmAction();
                break;
            case '1':
                game.setStation('intake');
                break;
            case '2':
                game.setStation('dishwasher');
                break;
            case '3':
                game.setStation('drying');
                break;
            case '4':
                game.setStation('storage');
                break;
            case 'm':
                // Toggle mute
                const muted = !audio.toggle();
                console.log(muted ? '🔇 Audio muted' : '🔊 Audio on');
                break;
        }
    });
    
    // Also init audio on first click anywhere
    document.addEventListener('click', () => {
        audio.init();
    }, { once: true });
    
    // Start title screen
    ui.showScreen('title');
    
    console.log('🧽 Dishwasher Simulator loaded');
    console.log('🎮 Controls: WASD/Arrows=move, Space=grab, Shift=rotate, Tab=switch station');
    console.log('🔢 Quick switch: 1=Intake, 2=Dishwasher, 3=Drying, 4=Storage');
    console.log('🔊 Press M to toggle sound');
});
