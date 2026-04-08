/**
 * Dishwasher Simulator - Touch Controls Module
 * Provides virtual D-Pad and action buttons for mobile devices
 */

export class TouchControls {
    constructor(callbacks = {}) {
        this.callbacks = {
            onDirectionStart: callbacks.onDirectionStart || (() => {}),
            onDirectionEnd: callbacks.onDirectionEnd || (() => {}),
            onInteract: callbacks.onInteract || (() => {}),
            onRotate: callbacks.onRotate || (() => {})
        };
        
        // Track active touches
        this.activeTouches = new Map();
        this.activeDirection = null;
        
        // Movement repeat for holding direction
        this.moveRepeatInterval = null;
        this.moveRepeatDelay = 150; // ms between repeated moves when holding
        
        // DOM elements (will be set in init)
        this.dpad = null;
        this.interactBtn = null;
        this.rotateBtn = null;
        this.overlay = null;
        
        // Detect touch device
        this.isTouchDevice = this.detectTouchDevice();
    }
    
    /**
     * Detect if device supports touch
     */
    detectTouchDevice() {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    }
    
    /**
     * Initialize touch controls
     */
    init() {
        this.createOverlay();
        
        if (this.isTouchDevice) {
            this.show();
        }
        
        // Also show on mobile viewport even if not touch
        this.checkViewportSize();
        window.addEventListener('resize', () => this.checkViewportSize());
        
        return this;
    }
    
    /**
     * Check viewport and show/hide controls accordingly
     */
    checkViewportSize() {
        const isMobileViewport = window.innerWidth <= 768 || window.innerHeight <= 500;
        
        if (isMobileViewport || this.isTouchDevice) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    /**
     * Create the touch control overlay
     */
    createOverlay() {
        // Check if already exists
        if (document.getElementById('touch-controls')) {
            this.overlay = document.getElementById('touch-controls');
            this.bindElements();
            this.setupEventListeners();
            return;
        }
        
        // Create overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'touch-controls';
        this.overlay.className = 'touch-controls hidden';
        
        // Create D-Pad
        const dpadHtml = `
            <div class="touch-dpad" id="touch-dpad">
                <button class="dpad-btn dpad-up" data-direction="up">
                    <span class="dpad-arrow">▲</span>
                </button>
                <button class="dpad-btn dpad-left" data-direction="left">
                    <span class="dpad-arrow">◀</span>
                </button>
                <div class="dpad-center"></div>
                <button class="dpad-btn dpad-right" data-direction="right">
                    <span class="dpad-arrow">▶</span>
                </button>
                <button class="dpad-btn dpad-down" data-direction="down">
                    <span class="dpad-arrow">▼</span>
                </button>
            </div>
        `;
        
        // Create action buttons
        const actionsHtml = `
            <div class="touch-actions">
                <button class="action-btn action-rotate" id="touch-rotate">
                    <span class="action-icon">↻</span>
                    <span class="action-label">R</span>
                </button>
                <button class="action-btn action-interact" id="touch-interact">
                    <span class="action-icon">✋</span>
                    <span class="action-label">Action</span>
                </button>
            </div>
        `;
        
        this.overlay.innerHTML = dpadHtml + actionsHtml;
        document.body.appendChild(this.overlay);
        
        this.bindElements();
        this.setupEventListeners();
    }
    
    /**
     * Bind DOM element references
     */
    bindElements() {
        this.dpad = document.getElementById('touch-dpad');
        this.interactBtn = document.getElementById('touch-interact');
        this.rotateBtn = document.getElementById('touch-rotate');
    }
    
    /**
     * Setup touch event listeners
     */
    setupEventListeners() {
        if (!this.dpad) return;
        
        // D-Pad buttons
        const dpadBtns = this.dpad.querySelectorAll('.dpad-btn');
        dpadBtns.forEach(btn => {
            const direction = btn.dataset.direction;
            
            // Touch events
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleDirectionStart(direction, e.touches[0].identifier);
                btn.classList.add('pressed');
            }, { passive: false });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleDirectionEnd(direction);
                btn.classList.remove('pressed');
            }, { passive: false });
            
            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.handleDirectionEnd(direction);
                btn.classList.remove('pressed');
            }, { passive: false });
            
            // Mouse events for testing on desktop
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.handleDirectionStart(direction, 'mouse');
                btn.classList.add('pressed');
            });
            
            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.handleDirectionEnd(direction);
                btn.classList.remove('pressed');
            });
            
            btn.addEventListener('mouseleave', (e) => {
                if (btn.classList.contains('pressed')) {
                    this.handleDirectionEnd(direction);
                    btn.classList.remove('pressed');
                }
            });
        });
        
        // Interact button
        if (this.interactBtn) {
            this.interactBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.interactBtn.classList.add('pressed');
                this.callbacks.onInteract();
            }, { passive: false });
            
            this.interactBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.interactBtn.classList.remove('pressed');
            }, { passive: false });
            
            // Mouse fallback
            this.interactBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.interactBtn.classList.add('pressed');
                this.callbacks.onInteract();
            });
            
            this.interactBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.interactBtn.classList.remove('pressed');
            });
        }
        
        // Rotate button
        if (this.rotateBtn) {
            this.rotateBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.rotateBtn.classList.add('pressed');
                this.callbacks.onRotate();
            }, { passive: false });
            
            this.rotateBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.rotateBtn.classList.remove('pressed');
            }, { passive: false });
            
            // Mouse fallback
            this.rotateBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.rotateBtn.classList.add('pressed');
                this.callbacks.onRotate();
            });
            
            this.rotateBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.rotateBtn.classList.remove('pressed');
            });
        }
        
        // Prevent default touch behaviors on the overlay
        this.overlay.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }
    
    /**
     * Handle direction button press
     */
    handleDirectionStart(direction, touchId) {
        this.activeTouches.set(touchId, direction);
        
        if (this.activeDirection !== direction) {
            // Release previous direction
            if (this.activeDirection) {
                this.callbacks.onDirectionEnd(this.activeDirection);
            }
            
            this.activeDirection = direction;
            this.callbacks.onDirectionStart(direction);
            
            // Setup repeat for holding
            this.startMoveRepeat(direction);
        }
    }
    
    /**
     * Handle direction button release
     */
    handleDirectionEnd(direction) {
        // Find and remove the touch for this direction
        for (const [touchId, dir] of this.activeTouches) {
            if (dir === direction) {
                this.activeTouches.delete(touchId);
                break;
            }
        }
        
        // Check if this was the active direction
        if (this.activeDirection === direction) {
            this.stopMoveRepeat();
            this.callbacks.onDirectionEnd(direction);
            this.activeDirection = null;
            
            // If there's another direction still being held, switch to it
            if (this.activeTouches.size > 0) {
                const [, nextDir] = this.activeTouches.entries().next().value;
                this.handleDirectionStart(nextDir, 'switch');
            }
        }
    }
    
    /**
     * Start repeating movement while holding direction
     */
    startMoveRepeat(direction) {
        this.stopMoveRepeat();
        
        this.moveRepeatInterval = setInterval(() => {
            if (this.activeDirection === direction) {
                // Re-trigger the direction for continuous movement
                this.callbacks.onDirectionStart(direction);
            } else {
                this.stopMoveRepeat();
            }
        }, this.moveRepeatDelay);
    }
    
    /**
     * Stop movement repeat
     */
    stopMoveRepeat() {
        if (this.moveRepeatInterval) {
            clearInterval(this.moveRepeatInterval);
            this.moveRepeatInterval = null;
        }
    }
    
    /**
     * Show touch controls
     */
    show() {
        if (this.overlay) {
            this.overlay.classList.remove('hidden');
            document.body.classList.add('touch-mode');
        }
    }
    
    /**
     * Hide touch controls
     */
    hide() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            document.body.classList.remove('touch-mode');
        }
    }
    
    /**
     * Toggle visibility
     */
    toggle() {
        if (this.overlay) {
            this.overlay.classList.toggle('hidden');
            document.body.classList.toggle('touch-mode');
        }
    }
    
    /**
     * Check if controls are visible
     */
    isVisible() {
        return this.overlay && !this.overlay.classList.contains('hidden');
    }
    
    /**
     * Force show (for testing on desktop)
     */
    forceShow() {
        this.show();
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopMoveRepeat();
        this.activeTouches.clear();
        
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }
}

// Export singleton for easy access
export const touchControls = new TouchControls();
