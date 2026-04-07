/**
 * Kitchen Renderer
 * Canvas-based rendering for the avatar movement system
 */

import { KITCHEN_CONFIG, STATION_ZONES, OBSTACLES, FLOOR_PATTERN } from './kitchen.js';
import { CHARACTER_CONFIG } from './character.js';
import { NPC_CONFIG } from './npcs.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = KITCHEN_CONFIG.width;
        this.canvas.height = KITCHEN_CONFIG.height;
        
        // Cache floor pattern
        this.floorPattern = this.createFloorPattern();
        
        // Scaling for crisp rendering
        this.scale = 1;
    }
    
    /**
     * Create checkered floor pattern
     */
    createFloorPattern() {
        const { tileSize, primaryColor, secondaryColor, groutColor } = FLOOR_PATTERN;
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = tileSize * 2;
        patternCanvas.height = tileSize * 2;
        const pctx = patternCanvas.getContext('2d');
        
        // Draw 2x2 checkered pattern
        for (let y = 0; y < 2; y++) {
            for (let x = 0; x < 2; x++) {
                const isLight = (x + y) % 2 === 0;
                pctx.fillStyle = isLight ? primaryColor : secondaryColor;
                pctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
                
                // Grout lines
                pctx.strokeStyle = groutColor;
                pctx.lineWidth = 1;
                pctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
        
        return this.ctx.createPattern(patternCanvas, 'repeat');
    }
    
    /**
     * Clear and prepare for new frame
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Draw the kitchen floor
     */
    drawFloor() {
        const ctx = this.ctx;
        ctx.fillStyle = this.floorPattern;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Draw obstacles (counters, walls)
     */
    drawObstacles() {
        const ctx = this.ctx;
        
        for (const obs of OBSTACLES) {
            // Counter/wall base
            ctx.fillStyle = '#3a3a4e';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            
            // Top highlight
            ctx.fillStyle = '#4a4a5e';
            ctx.fillRect(obs.x, obs.y, obs.width, 4);
            
            // Border
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        }
    }
    
    /**
     * Draw station zones
     */
    drawStations(activeStation = null) {
        const ctx = this.ctx;
        
        for (const [name, zone] of Object.entries(STATION_ZONES)) {
            const isActive = name === activeStation;
            
            // Station background
            ctx.fillStyle = isActive ? zone.color : `${zone.color}66`;
            ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
            
            // Station border
            ctx.strokeStyle = isActive ? '#fff' : zone.color;
            ctx.lineWidth = isActive ? 3 : 2;
            ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
            
            // Interaction radius indicator (pulsing when active)
            if (isActive) {
                ctx.beginPath();
                const centerX = zone.x + zone.width / 2;
                const centerY = zone.y + zone.height / 2;
                const pulse = Math.sin(Date.now() / 200) * 5;
                ctx.arc(centerX, centerY, KITCHEN_CONFIG.interactionRadius + pulse, 0, Math.PI * 2);
                ctx.strokeStyle = `${zone.color}44`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Station icon
            const centerX = zone.x + zone.width / 2;
            const centerY = zone.y + zone.height / 2;
            ctx.font = isActive ? '48px sans-serif' : '36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zone.emoji, centerX, centerY);
            
            // Label
            ctx.font = isActive ? 'bold 14px sans-serif' : '12px sans-serif';
            ctx.fillStyle = isActive ? '#fff' : '#aaa';
            ctx.fillText(zone.label, centerX, zone.y + zone.height + 16);
        }
    }
    
    /**
     * Draw the character/avatar (the dishwasher - person washing dishes!)
     */
    drawCharacter(character) {
        const ctx = this.ctx;
        const { x, y, facingRight, heldItem, isStunned } = character;
        const bob = character.getBobOffset();
        
        // Shadow
        ctx.beginPath();
        ctx.ellipse(x, y + CHARACTER_CONFIG.height / 2, 16, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
        
        // Stun effect - red tint when bumped
        const bodyColor = isStunned ? '#ff6b6b' : CHARACTER_CONFIG.bodyColor;
        
        // Character body (circle background) - blue apron
        ctx.beginPath();
        ctx.arc(x, y - bob, CHARACTER_CONFIG.width / 2 + 4, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();
        ctx.strokeStyle = isStunned ? '#ff0000' : '#fff';
        ctx.lineWidth = isStunned ? 3 : 2;
        ctx.stroke();
        
        // Draw apron detail (small rectangle below)
        ctx.fillStyle = '#4a7bb0';
        ctx.fillRect(x - 8, y - bob + 5, 16, 12);
        
        // Character emoji (sponge for dishwasher identity)
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Flip if facing left
        if (!facingRight) {
            ctx.save();
            ctx.translate(x, y - bob - 4);
            ctx.scale(-1, 1);
            ctx.fillText(CHARACTER_CONFIG.emoji, 0, 0);
            ctx.restore();
        } else {
            ctx.fillText(CHARACTER_CONFIG.emoji, x, y - bob - 4);
        }
        
        // Stun stars
        if (isStunned) {
            const starTime = Date.now() / 100;
            ctx.font = '12px sans-serif';
            for (let i = 0; i < 3; i++) {
                const angle = (starTime + i * 2.1) % (Math.PI * 2);
                const starX = x + Math.cos(angle) * 20;
                const starY = y - bob - 20 + Math.sin(angle * 2) * 5;
                ctx.fillText('💫', starX, starY);
            }
        }
        
        // Held item (if any)
        if (heldItem) {
            const itemX = x + (facingRight ? 22 : -22);
            const itemY = y - bob - 20;
            
            // Item glow
            ctx.beginPath();
            ctx.arc(itemX, itemY, 18, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(74, 159, 255, 0.3)';
            ctx.fill();
            
            // Item emoji
            ctx.font = '24px sans-serif';
            ctx.fillText(heldItem.emoji, itemX, itemY);
        }
    }
    
    /**
     * Draw all NPCs (chefs, waiters)
     */
    drawNPCs(npcs) {
        const ctx = this.ctx;
        
        for (const npc of npcs) {
            const config = NPC_CONFIG[npc.type];
            const bob = npc.getBobOffset();
            
            // Shadow
            ctx.beginPath();
            ctx.ellipse(npc.x, npc.y + config.height / 2, 14, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fill();
            
            // Body background
            ctx.beginPath();
            ctx.arc(npc.x, npc.y - bob, config.width / 2 + 2, 0, Math.PI * 2);
            ctx.fillStyle = config.bodyColor;
            ctx.fill();
            ctx.strokeStyle = npc.type === 'chef' ? '#ccc' : '#444';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Type-specific details
            if (npc.type === 'chef') {
                // Chef hat (toque) - small white rectangle on top
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(npc.x - 6, npc.y - bob - config.height / 2 - 8, 12, 8);
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 1;
                ctx.strokeRect(npc.x - 6, npc.y - bob - config.height / 2 - 8, 12, 8);
            } else {
                // Waiter bow tie
                ctx.fillStyle = '#c0392b';
                ctx.beginPath();
                ctx.moveTo(npc.x - 5, npc.y - bob + 8);
                ctx.lineTo(npc.x, npc.y - bob + 5);
                ctx.lineTo(npc.x + 5, npc.y - bob + 8);
                ctx.lineTo(npc.x, npc.y - bob + 11);
                ctx.closePath();
                ctx.fill();
            }
            
            // NPC emoji
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (!npc.facingRight) {
                ctx.save();
                ctx.translate(npc.x, npc.y - bob - 2);
                ctx.scale(-1, 1);
                ctx.fillText(config.emoji, 0, 0);
                ctx.restore();
            } else {
                ctx.fillText(config.emoji, npc.x, npc.y - bob - 2);
            }
            
            // Waiter carrying dish indicator
            if (npc.carryingDish && npc.type === 'waiter') {
                const trayX = npc.x + (npc.facingRight ? 18 : -18);
                const trayY = npc.y - bob - 15;
                ctx.font = '16px sans-serif';
                ctx.fillText('🍽️', trayX, trayY);
            }
        }
    }
    
    /**
     * Draw HUD overlay
     */
    drawHUD(gameState) {
        const ctx = this.ctx;
        const padding = 10;
        
        // Station indicator
        if (gameState.nearStation) {
            const zone = STATION_ZONES[gameState.nearStation];
            
            // "Press Space to interact" prompt
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(`Press SPACE to interact with ${zone.label}`, this.canvas.width / 2, this.canvas.height - 30);
        }
        
        // Held item indicator (top-left)
        if (gameState.heldItem) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(padding, padding, 150, 40);
            ctx.strokeStyle = '#4a9fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(padding, padding, 150, 40);
            
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Holding:', padding + 10, padding + 18);
            
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText(`${gameState.heldItem.emoji} ${gameState.heldItem.name}`, padding + 10, padding + 34);
        }
        
        // Controls hint (bottom-left)
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#666';
        ctx.fillText('WASD: Move | Space: Interact | R: Rotate', padding, this.canvas.height - padding);
    }
    
    /**
     * Draw a complete frame
     */
    render(kitchen, character, gameState = {}) {
        this.clear();
        this.drawFloor();
        this.drawStations(character.getCurrentStation());
        this.drawObstacles();
        
        // Draw NPCs (if provided)
        if (gameState.npcs) {
            this.drawNPCs(gameState.npcs);
        }
        
        // Draw player on top of NPCs
        this.drawCharacter(character);
        
        this.drawHUD({
            nearStation: character.getCurrentStation(),
            heldItem: character.heldItem,
            ...gameState
        });
    }
    
    /**
     * Debug: draw collision grid
     */
    drawDebugCollision(kitchen) {
        const ctx = this.ctx;
        const tileSize = KITCHEN_CONFIG.tileSize;
        
        for (let y = 0; y < kitchen.collisionGrid.length; y++) {
            for (let x = 0; x < kitchen.collisionGrid[y].length; x++) {
                const walkable = kitchen.collisionGrid[y][x];
                ctx.fillStyle = walkable ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.3)';
                ctx.fillRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
            }
        }
    }
}
