/**
 * Dishwasher Simulator - Modal System
 * Handles Tetris modal for dishwasher interaction
 */

export class ModalManager {
    constructor(game, ui) {
        this.game = game;
        this.ui = ui;
        this.isOpen = false;
        this.activeModal = null;
        
        // Callbacks
        this.onOpen = null;
        this.onClose = null;
        
        this.setupKeyboardHandler();
    }
    
    setupKeyboardHandler() {
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            
            // Escape closes modal
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
                return;
            }
            
            // Modal-specific controls
            if (this.activeModal === 'dishwasher') {
                this.handleDishwasherInput(e);
            }
        });
    }
    
    handleDishwasherInput(e) {
        const key = e.key.toLowerCase();
        
        switch (key) {
            // Grid navigation
            case 'w':
            case 'arrowup':
                e.preventDefault();
                this.game.moveCursor(0, -1);
                break;
            case 's':
            case 'arrowdown':
                e.preventDefault();
                this.game.moveCursor(0, 1);
                break;
            case 'a':
            case 'arrowleft':
                e.preventDefault();
                this.game.moveCursor(-1, 0);
                break;
            case 'd':
            case 'arrowright':
                e.preventDefault();
                this.game.moveCursor(1, 0);
                break;
                
            // Place/pickup
            case ' ':
                e.preventDefault();
                this.game.interactDishwasher();
                break;
                
            // Rotate
            case 'r':
            case 'shift':
                e.preventDefault();
                this.game.rotateDish();
                break;
                
            // Run cycle
            case 'enter':
                e.preventDefault();
                if (!this.game.dishwasherRunning) {
                    this.game.runDishwasherCycle();
                }
                break;
        }
    }
    
    /**
     * Open dishwasher modal
     */
    openDishwasher() {
        if (this.game.dishwasherRunning) {
            this.game.onFeedback?.("Can't open during cycle!", 'warning');
            return false;
        }
        
        this.activeModal = 'dishwasher';
        this.isOpen = true;
        
        const modal = document.getElementById('dishwasher-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('active');
        }
        
        // Sync cursor to game state
        this.game.currentStation = 'dishwasher';
        
        this.onOpen?.(this.activeModal);
        this.game.onUpdate?.();
        
        return true;
    }
    
    /**
     * Close current modal
     */
    close() {
        if (!this.isOpen) return;
        
        const modal = document.getElementById('dishwasher-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        }
        
        const previousModal = this.activeModal;
        this.activeModal = null;
        this.isOpen = false;
        
        this.onClose?.(previousModal);
    }
    
    /**
     * Toggle dishwasher modal
     */
    toggleDishwasher() {
        if (this.isOpen && this.activeModal === 'dishwasher') {
            this.close();
        } else {
            this.openDishwasher();
        }
    }
    
    /**
     * Check if modal is blocking input
     */
    isBlocking() {
        return this.isOpen;
    }
    
    /**
     * Get current modal state
     */
    getState() {
        return {
            isOpen: this.isOpen,
            activeModal: this.activeModal
        };
    }
}

export default ModalManager;
