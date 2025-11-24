import { Bjorklund } from './utils.js';

// Pattern Sequencer
export class PatternSequencer {
    constructor(engine, ui) {
        this.engine = engine;
        this.ui = ui;
        this.cells = new Array(16).fill(null).map(() => ({
            state: null,
            repeat: 1
        }));
        this.clipboard = null;
        this.selectedCell = 0;
        this.isPlaying = false;
        this.currentCell = 0;
        this.currentRepeat = 0;
        this.seqPosition = 0;
        this.seqPattern = [];
        this.timer = null;
        this.mode = 'forward';
        this.direction = 1;
    }
    
    saveToCell(index) {
        const state = this.engine.getState();
        this.cells[index].state = state;
    }
    
    loadFromCell(index) {
        if (this.cells[index].state) {
            this.engine.setState(this.cells[index].state);
            this.ui.updateUIFromState(this.cells[index].state);
            this.generatePattern();
        }
    }
    
    generatePattern() {
        const state = this.cells[this.currentCell].state;
        if (!state) return;
        
        const steps = state.seqSteps;
        const fill = state.seqFill;
        const shift = state.seqShift;
        
        const pulses = Math.max(1, Math.ceil(fill * steps));
        const shiftAmount = Math.floor(shift * (steps - 1));
        
        this.seqPattern = Bjorklund.bjorklund(steps, pulses, shiftAmount);
    }
    
    copyCell(index) {
        if (this.cells[index].state) {
            this.clipboard = {
                state: { ...this.cells[index].state },
                repeat: this.cells[index].repeat
            };
        }
    }
    
    pasteCell(index) {
        if (this.clipboard) {
            this.cells[index].state = { ...this.clipboard.state };
            this.cells[index].repeat = this.clipboard.repeat;
        }
    }
    
    clearCell(index) {
        this.cells[index].state = null;
        this.cells[index].repeat = 1;
    }
    
    clearAll() {
        this.cells.forEach(cell => {
            cell.state = null;
            cell.repeat = 1;
        });
    }
    
    setRepeat(index, repeat) {
        this.cells[index].repeat = Math.max(1, Math.min(64, repeat));
    }
    
    getNextCell() {
        let next = this.currentCell;
        
        switch (this.mode) {
            case 'forward':
                do {
                    next = (next + 1) % 16;
                } while (!this.cells[next].state && next !== this.currentCell);
                break;
                
            case 'backward':
                do {
                    next = (next - 1 + 16) % 16;
                } while (!this.cells[next].state && next !== this.currentCell);
                break;
                
            case 'pingpong':
                do {
                    next = next + this.direction;
                    if (next >= 16 || next < 0) {
                        this.direction *= -1;
                        next = this.currentCell + this.direction;
                    }
                    if (next < 0) next = 0;
                    if (next >= 16) next = 15;
                } while (!this.cells[next].state && next !== this.currentCell);
                break;
                
            case 'random':
                const filled = this.cells
                    .map((cell, idx) => cell.state ? idx : -1)
                    .filter(idx => idx !== -1);
                if (filled.length > 0) {
                    next = filled[Math.floor(Math.random() * filled.length)];
                }
                break;
        }
        
        return next;
    }
    
    play() {
        if (this.isPlaying) return;
        
        let startCell = this.cells.findIndex(cell => cell.state !== null);
        if (startCell === -1) return;
        
        this.currentCell = startCell;
        this.currentRepeat = 0;
        this.seqPosition = 0;
        this.isPlaying = true;
        this.direction = 1;
        
        this.loadFromCell(this.currentCell);
        this.ui.updatePatternDisplay(this.currentCell);
        
        this.step();
    }
    
    step() {
        if (!this.isPlaying) return;
        
        const state = this.cells[this.currentCell].state;
        if (!state) return;
        
        // Update spore visualization
        this.ui.updateSporeDisplay(this.seqPattern, this.seqPosition);
        
        if (this.seqPattern[this.seqPosition] === 1) {
            const baseSeed = state.seed;
            const newSeed = baseSeed + this.seqPosition;
            
            this.engine.params.seed = newSeed;
            this.engine.generateSeedParams();
            this.engine.updateFromParams();
            this.engine.trigger();
            
            document.getElementById('seedDisplay').textContent = `seed: ${newSeed}`;
        }
        
        this.seqPosition++;
        
        if (this.seqPosition >= this.seqPattern.length) {
            this.seqPosition = 0;
            this.currentRepeat++;
            
            if (this.currentRepeat >= this.cells[this.currentCell].repeat) {
                this.currentRepeat = 0;
                this.currentCell = this.getNextCell();
                this.loadFromCell(this.currentCell);
                this.ui.updatePatternDisplay(this.currentCell);
            }
        }
        
        const bpm = state.seqFreq;
        const interval = (60 / bpm / 4) * 1000;
        this.timer = setTimeout(() => this.step(), interval);
    }
    
    stop() {
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.ui.updatePatternDisplay(-1);
        this.ui.clearSporeDisplay();
    }
    
    setMode(mode) {
        this.mode = mode;
        this.direction = 1;
    }
}
