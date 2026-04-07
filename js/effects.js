/**
 * Dishwasher Simulator - Visual Effects
 * Particles, screen shake, glow, and juice!
 */

export class EffectsManager {
    constructor() {
        this.particles = [];
        this.shakeIntensity = 0;
        this.shakeDecay = 0.9;
        this.container = null;
        this.animationFrame = null;
    }
    
    init(container) {
        this.container = container || document.getElementById('game-container');
        this.startLoop();
    }
    
    startLoop() {
        const loop = () => {
            this.update();
            this.animationFrame = requestAnimationFrame(loop);
        };
        loop();
    }
    
    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
    
    update() {
        // Update screen shake
        if (this.shakeIntensity > 0.1) {
            const x = (Math.random() - 0.5) * this.shakeIntensity;
            const y = (Math.random() - 0.5) * this.shakeIntensity;
            this.container.style.transform = `translate(${x}px, ${y}px)`;
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.container.style.transform = '';
            this.shakeIntensity = 0;
        }
        
        // Update particles
        this.particles = this.particles.filter(p => {
            p.life -= 0.016; // ~60fps
            if (p.life <= 0) {
                p.element.remove();
                return false;
            }
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0;
            p.vx *= p.friction || 0.98;
            p.vy *= p.friction || 0.98;
            
            const opacity = Math.min(1, p.life * 2);
            const scale = p.scale * (0.5 + p.life * 0.5);
            
            p.element.style.transform = `translate(${p.x}px, ${p.y}px) scale(${scale}) rotate(${p.rotation}deg)`;
            p.element.style.opacity = opacity;
            
            p.rotation += p.rotationSpeed || 0;
            
            return true;
        });
    }
    
    // === SCREEN SHAKE ===
    
    shake(intensity = 5) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }
    
    // === PARTICLES ===
    
    createParticle(x, y, options = {}) {
        const el = document.createElement('div');
        el.className = 'particle';
        el.textContent = options.emoji || '✨';
        el.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 1000;
            font-size: ${options.size || 16}px;
            left: 0;
            top: 0;
            transform: translate(${x}px, ${y}px);
        `;
        
        document.body.appendChild(el);
        
        const particle = {
            element: el,
            x,
            y,
            vx: options.vx || (Math.random() - 0.5) * 4,
            vy: options.vy || -Math.random() * 4 - 2,
            life: options.life || 1,
            scale: options.scale || 1,
            gravity: options.gravity || 0.1,
            friction: options.friction || 0.98,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        };
        
        this.particles.push(particle);
        return particle;
    }
    
    // Burst of particles from a point
    burst(x, y, count = 10, options = {}) {
        const emojis = options.emojis || ['✨', '💫', '⭐'];
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = options.speed || 3 + Math.random() * 3;
            
            this.createParticle(x, y, {
                emoji: emojis[Math.floor(Math.random() * emojis.length)],
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: options.life || 0.8 + Math.random() * 0.4,
                size: options.size || 14 + Math.random() * 8,
                gravity: options.gravity ?? 0.05,
                friction: options.friction || 0.96
            });
        }
    }
    
    // Confetti-style celebration
    confetti(x, y, count = 20) {
        const colors = ['🎉', '🎊', '✨', '💫', '⭐', '🌟'];
        
        for (let i = 0; i < count; i++) {
            this.createParticle(x, y, {
                emoji: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 10,
                vy: -Math.random() * 8 - 4,
                life: 1.5 + Math.random() * 0.5,
                size: 16 + Math.random() * 12,
                gravity: 0.15,
                friction: 0.99
            });
        }
    }
    
    // Sparkles around element (for clean dishes)
    sparkle(element, count = 5) {
        const rect = element.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const x = cx + (Math.random() - 0.5) * rect.width;
                const y = cy + (Math.random() - 0.5) * rect.height;
                
                this.createParticle(x, y, {
                    emoji: '✨',
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 2 - 1,
                    life: 0.5 + Math.random() * 0.3,
                    size: 12 + Math.random() * 8,
                    gravity: 0,
                    friction: 0.95
                });
            }, i * 50);
        }
    }
    
    // Water droplets for dishwasher
    waterDrops(x, y) {
        for (let i = 0; i < 8; i++) {
            this.createParticle(x + (Math.random() - 0.5) * 100, y, {
                emoji: '💧',
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 2 + 1,
                life: 0.6 + Math.random() * 0.3,
                size: 10 + Math.random() * 6,
                gravity: 0.2,
                friction: 0.98
            });
        }
    }
    
    // Bubbles rising
    bubbles(x, y, count = 6) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.createParticle(x + (Math.random() - 0.5) * 40, y, {
                    emoji: '🫧',
                    vx: (Math.random() - 0.5) * 1,
                    vy: -Math.random() * 2 - 1,
                    life: 1 + Math.random() * 0.5,
                    size: 12 + Math.random() * 10,
                    gravity: -0.02, // Float up
                    friction: 0.99
                });
            }, i * 80);
        }
    }
    
    // === CSS ANIMATIONS ===
    
    // Add bounce animation to element
    bounce(element, intensity = 1) {
        element.style.animation = 'none';
        element.offsetHeight; // Force reflow
        element.style.animation = `bounce ${0.4 * intensity}s ease`;
    }
    
    // Add shake animation to element
    shakeElement(element) {
        element.classList.add('shake-anim');
        setTimeout(() => element.classList.remove('shake-anim'), 300);
    }
    
    // Add pulse animation to element
    pulse(element) {
        element.classList.add('pulse-anim');
        setTimeout(() => element.classList.remove('pulse-anim'), 600);
    }
    
    // Add glow effect
    glow(element, color = 'var(--accent-teal)', duration = 1000) {
        element.style.boxShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
        element.style.transition = 'box-shadow 0.3s ease';
        
        setTimeout(() => {
            element.style.boxShadow = '';
        }, duration);
    }
    
    // Pop-in animation
    popIn(element) {
        element.style.animation = 'none';
        element.offsetHeight;
        element.style.animation = 'pop-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }
    
    // Fade in with scale
    fadeInScale(element) {
        element.style.animation = 'none';
        element.offsetHeight;
        element.style.animation = 'fade-in-scale 0.2s ease-out';
    }
}

// Singleton
export const effects = new EffectsManager();
