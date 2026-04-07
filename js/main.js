/**
 * Dishwasher Simulator - Main Entry Point
 * "Clean dishes. Clear mind."
 */

import { Game } from './game.js';
import { UI } from './ui.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    const ui = new UI(game);
    
    // Wire up title screen
    document.getElementById('btn-start').addEventListener('click', () => {
        ui.showScreen('game');
        game.startShift();
    });
    
    document.getElementById('btn-retry').addEventListener('click', () => {
        ui.showScreen('game');
        game.startShift();
    });
    
    document.getElementById('btn-menu').addEventListener('click', () => {
        ui.showScreen('title');
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
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
        }
    });
    
    // Start title screen
    ui.showScreen('title');
    
    console.log('🧽 Dishwasher Simulator loaded');
});
