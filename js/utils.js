// Seeded Random Number Generator
export class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    
    random() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    
    range(min, max) {
        return min + this.random() * (max - min);
    }
    
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }
}

// Bjorklund Algorithm for Euclidean Rhythms
export class Bjorklund {
    static bjorklund(steps, pulses, shift = 0) {
        if (pulses > steps) pulses = steps;
        if (pulses === 0) return new Array(steps).fill(0);
        if (pulses === steps) return new Array(steps).fill(1);
        
        let pattern = [];
        let counts = [];
        let remainders = [];
        let divisor = steps - pulses;
        remainders.push(pulses);
        let level = 0;
        
        while (true) {
            counts.push(Math.floor(divisor / remainders[level]));
            remainders.push(divisor % remainders[level]);
            divisor = remainders[level];
            level++;
            if (remainders[level] <= 1) break;
        }
        counts.push(divisor);
        
        function build(myLevel) {
            if (myLevel === -1) {
                pattern.push(0);
            } else if (myLevel === -2) {
                pattern.push(1);
            } else {
                for (let i = 0; i < counts[myLevel]; i++) {
                    build(myLevel - 1);
                }
                if (remainders[myLevel] !== 0) {
                    build(myLevel - 2);
                }
            }
        }
        
        build(level);
        
        let firstOne = pattern.indexOf(1);
        if (firstOne > 0) {
            pattern = this.rotate(pattern, pattern.length - firstOne);
        }
        
        pattern = this.rotate(pattern, Math.floor(shift));
        
        return pattern;
    }
    
    static rotate(array, shift) {
        let out = new Array(array.length);
        for (let i = 0; i < array.length; i++) {
            let idx = (i + shift) % array.length;
            out[idx] = array[i];
        }
        return out;
    }
}

// MIDI note number to note name conversion
export function midiToNoteName(midiNumber) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteName = noteNames[midiNumber % 12];
    return `${noteName}${octave}`;
}

// Color palette for spores
export const SPORE_COLORS = [
    '#e8d5e8', '#d4e4f7', '#e8f4e8',
    '#ffd5e5', '#d5f0ff', '#fff5d5',
    '#e5d5ff', '#d5ffe5', '#ffe5d5',
    '#f0d5d5', '#d5f0f0', '#f0f0d5'
];
