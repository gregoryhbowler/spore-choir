import { SporeChoirEngine } from './engine.js';
import { PatternSequencer } from './pattern-sequencer.js';
import { Bjorklund, SeededRandom, SPORE_COLORS, midiToNoteName } from './utils.js';

// UI Controller
export class SporeChoirUI {
    constructor() {
        this.engine = new SporeChoirEngine();
        this.sequencer = null;
        this.patternSequencer = new PatternSequencer(this.engine, this);
        this.seqPosition = 0;
        this.seqPattern = [];
        this.isPlaying = false;
        this.bindControls();
        this.initPatternCells();
        this.generateSpores();
    }
    
    async init() {
        await this.engine.init();
    }
    
    generateSpores() {
        const steps = parseInt(document.getElementById('seqSteps').value);
        const fill = parseFloat(document.getElementById('seqFill').value);
        const shift = parseFloat(document.getElementById('seqShift').value);
        
        const pulses = Math.max(1, Math.ceil(fill * steps));
        const shiftAmount = Math.floor(shift * (steps - 1));
        
        this.seqPattern = Bjorklund.bjorklund(steps, pulses, shiftAmount);
        
        const grid = document.getElementById('sporeGrid');
        grid.innerHTML = '';
        
        this.seqPattern.forEach((active, i) => {
            if (active) {
                const spore = this.createSpore(this.engine.params.seed + i);
                spore.dataset.index = i;
                grid.appendChild(spore);
            }
        });
    }
    
    createSpore(seed) {
        const spore = document.createElement('div');
        spore.className = 'spore';
        
        const rng = new SeededRandom(seed);
        
        for (let i = 0; i < 12; i++) {
            const pixel = document.createElement('div');
            pixel.className = 'spore-pixel';
            
            const color = SPORE_COLORS[rng.int(0, SPORE_COLORS.length - 1)];
            const opacity = rng.range(0.3, 1);
            
            pixel.style.backgroundColor = color;
            pixel.style.opacity = opacity;
            
            spore.appendChild(pixel);
        }
        
        return spore;
    }
    
    updateSporeDisplay(pattern, position) {
        const spores = document.querySelectorAll('.spore');
        let activeSporeIndex = 0;
        
        for (let i = 0; i <= position; i++) {
            if (pattern[i] === 1) {
                if (i === position) {
                    break;
                }
                activeSporeIndex++;
            }
        }
        
        spores.forEach((spore, idx) => {
            spore.classList.toggle('playing', idx === activeSporeIndex);
        });
    }
    
    clearSporeDisplay() {
        document.querySelectorAll('.spore').forEach(spore => {
            spore.classList.remove('playing');
        });
    }
    
    initPatternCells() {
        const container = document.getElementById('patternCells');
        container.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            const cell = document.createElement('div');
            cell.className = 'pattern-cell';
            if (i === 0) cell.classList.add('selected');
            cell.dataset.index = i;
            
            const number = document.createElement('div');
            number.className = 'cell-number';
            number.textContent = (i + 1).toString().padStart(2, '0');
            
            const repeat = document.createElement('div');
            repeat.className = 'cell-repeat';
            const input = document.createElement('input');
            input.type = 'number';
            input.min = 1;
            input.max = 64;
            input.value = 1;
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                this.patternSequencer.setRepeat(i, value);
                e.target.value = this.patternSequencer.cells[i].repeat;
            });
            repeat.appendChild(input);
            
            cell.appendChild(number);
            cell.appendChild(repeat);
            
            cell.addEventListener('click', () => {
                this.selectCell(i);
            });
            
            container.appendChild(cell);
        }
    }
    
    selectCell(index) {
        document.querySelectorAll('.pattern-cell').forEach(cell => {
            cell.classList.remove('selected');
        });
        const cell = document.querySelector(`.pattern-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('selected');
            this.patternSequencer.selectedCell = index;
        }
        
        document.getElementById('patternPaste').disabled = !this.patternSequencer.clipboard;
    }
    
    updatePatternDisplay(playingCell = -1) {
        document.querySelectorAll('.pattern-cell').forEach((cell, index) => {
            const isFilled = this.patternSequencer.cells[index].state !== null;
            cell.classList.toggle('filled', isFilled);
            cell.classList.toggle('playing', index === playingCell);
        });
    }
    
    updateNoteDisplay(midiNote) {
        const display = document.getElementById('noteVal');
        const isAware = document.getElementById('aware').checked;
        
        if (isAware) {
            display.textContent = midiToNoteName(midiNote);
        } else {
            display.textContent = midiNote;
        }
    }
    
    updateUIFromState(state) {
        Object.keys(state).forEach(key => {
            const slider = document.getElementById(key);
            const display = document.getElementById(key + 'Val');
            
            if (slider && display) {
                slider.value = state[key];
                
                if (key === 'note') {
                    this.updateNoteDisplay(state[key]);
                } else {
                    const decimals = ['seqSteps', 'seqFreq'].includes(key) ? 0 : 2;
                    display.textContent = parseFloat(state[key]).toFixed(decimals);
                }
            }
            
            if (key === 'seed') {
                document.getElementById('seed').value = state[key];
                document.getElementById('seedDisplay').textContent = `seed: ${state[key]}`;
            }
            
            if (key === 'trigOnSeed') {
                document.getElementById('trigOnSeed').checked = state[key];
            }
            
            if (key === 'aware') {
                document.getElementById('aware').checked = state[key];
                const scaleControl = document.getElementById('scaleControl');
                scaleControl.style.display = state[key] ? 'block' : 'none';
                // Update note display when aware mode changes
                this.updateNoteDisplay(state.note);
            }
            
            if (key === 'scale') {
                document.getElementById('scale').value = state[key];
            }
        });
        
        this.generateSpores();
    }
    
    bindControls() {
        // Seed controls
        document.getElementById('seed').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.engine.setParam('seed', value);
            document.getElementById('seedDisplay').textContent = `seed: ${value}`;
            this.generateSpores();
        });
        
        document.getElementById('seedInc').addEventListener('click', () => {
            const input = document.getElementById('seed');
            let value = parseInt(input.value) + 1;
            if (value > 16383) value = 0;
            input.value = value;
            this.engine.setParam('seed', value);
            document.getElementById('seedDisplay').textContent = `seed: ${value}`;
            this.generateSpores();
        });
        
        document.getElementById('seedDec').addEventListener('click', () => {
            const input = document.getElementById('seed');
            let value = parseInt(input.value) - 1;
            if (value < 0) value = 16383;
            input.value = value;
            this.engine.setParam('seed', value);
            document.getElementById('seedDisplay').textContent = `seed: ${value}`;
            this.generateSpores();
        });
        
        document.getElementById('randomSeed').addEventListener('click', () => {
            const value = Math.floor(Math.random() * 16384);
            document.getElementById('seed').value = value;
            this.engine.setParam('seed', value);
            document.getElementById('seedDisplay').textContent = `seed: ${value}`;
            this.generateSpores();
        });
        
        // Parameter controls
        const params = ['amp', 'note', 'attack', 'decay', 'x0', 'x1', 'lazy', 'grit'];
        params.forEach(param => {
            const slider = document.getElementById(param);
            const display = document.getElementById(param + 'Val');
            
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.engine.setParam(param, value);
                
                if (param === 'note') {
                    this.updateNoteDisplay(value);
                } else {
                    display.textContent = value.toFixed(2);
                }
            });
        });
        
        // Sequencer controls
        const seqParams = ['seqSteps', 'seqFreq', 'seqFill', 'seqShift'];
        seqParams.forEach(param => {
            const slider = document.getElementById(param);
            const display = document.getElementById(param + 'Val');
            
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.engine.setParam(param, value);
                display.textContent = value.toFixed(param === 'seqFreq' || param === 'seqSteps' ? 0 : 1);
                this.generateSpores();
            });
        });
        
        document.getElementById('trigOnSeed').addEventListener('change', (e) => {
            this.engine.setParam('trigOnSeed', e.target.checked);
        });
        
        // Aware mode and scale
        document.getElementById('aware').addEventListener('change', (e) => {
            const isAware = e.target.checked;
            this.engine.setParam('aware', isAware);
            const scaleControl = document.getElementById('scaleControl');
            scaleControl.style.display = isAware ? 'block' : 'none';
            // Update note display when aware mode changes
            const currentNote = parseInt(document.getElementById('note').value);
            this.updateNoteDisplay(currentNote);
        });
        
        document.getElementById('scale').addEventListener('change', (e) => {
            this.engine.setParam('scale', e.target.value);
        });
        
        // Trigger button
        document.getElementById('triggerBtn').addEventListener('click', async () => {
            await this.init();
            this.engine.trigger();
        });
        
        // Sequencer start/stop
        document.getElementById('startBtn').addEventListener('click', async () => {
            await this.init();
            if (this.patternSequencer.isPlaying) {
                this.patternSequencer.stop();
                document.getElementById('patternPlay').classList.remove('active');
            }
            this.startSequencer();
        });
        
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopSequencer();
        });
        
        // Pattern sequencer controls
        document.getElementById('patternSave').addEventListener('click', () => {
            this.patternSequencer.saveToCell(this.patternSequencer.selectedCell);
            this.updatePatternDisplay();
        });
        
        document.getElementById('patternCopy').addEventListener('click', () => {
            this.patternSequencer.copyCell(this.patternSequencer.selectedCell);
            document.getElementById('patternPaste').disabled = false;
        });
        
        document.getElementById('patternPaste').addEventListener('click', () => {
            this.patternSequencer.pasteCell(this.patternSequencer.selectedCell);
            this.updatePatternDisplay();
            const cell = document.querySelector(`.pattern-cell[data-index="${this.patternSequencer.selectedCell}"]`);
            const input = cell.querySelector('input');
            input.value = this.patternSequencer.cells[this.patternSequencer.selectedCell].repeat;
        });
        
        document.getElementById('patternClear').addEventListener('click', () => {
            this.patternSequencer.clearCell(this.patternSequencer.selectedCell);
            this.updatePatternDisplay();
            const cell = document.querySelector(`.pattern-cell[data-index="${this.patternSequencer.selectedCell}"]`);
            const input = cell.querySelector('input');
            input.value = 1;
        });
        
        document.getElementById('patternClearAll').addEventListener('click', () => {
            if (confirm('clear all pattern cells?')) {
                this.patternSequencer.clearAll();
                this.updatePatternDisplay();
                document.querySelectorAll('.pattern-cell input').forEach(input => {
                    input.value = 1;
                });
            }
        });
        
        document.getElementById('patternPlay').addEventListener('click', async () => {
            await this.init();
            if (this.isPlaying) {
                this.stopSequencer();
            }
            this.patternSequencer.play();
            document.getElementById('patternPlay').classList.add('active');
        });
        
        document.getElementById('patternStop').addEventListener('click', () => {
            this.patternSequencer.stop();
            document.getElementById('patternPlay').classList.remove('active');
        });
        
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.patternSequencer.setMode(btn.dataset.mode);
            });
        });
    }
    
    startSequencer() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        document.getElementById('startBtn').classList.add('active');
        
        const bpm = parseFloat(document.getElementById('seqFreq').value);
        const interval = (60 / bpm / 4) * 1000;
        
        this.sequencer = setInterval(() => {
            this.stepSequencer();
        }, interval);
        
        this.stepSequencer();
    }
    
    stopSequencer() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        document.getElementById('startBtn').classList.remove('active');
        
        if (this.sequencer) {
            clearInterval(this.sequencer);
            this.sequencer = null;
        }
        
        this.clearSporeDisplay();
    }
    
    stepSequencer() {
        const steps = this.seqPattern.length;
        
        this.updateSporeDisplay(this.seqPattern, this.seqPosition);
        
        if (this.seqPattern[this.seqPosition] === 1) {
            const baseSeed = parseInt(document.getElementById('seed').value);
            const newSeed = baseSeed + this.seqPosition;
            
            this.engine.params.seed = newSeed;
            this.engine.generateSeedParams();
            this.engine.updateFromParams();
            this.engine.trigger();
            
            document.getElementById('seedDisplay').textContent = `seed: ${newSeed}`;
        }
        
        this.seqPosition = (this.seqPosition + 1) % steps;
    }
}
