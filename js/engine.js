import { SeededRandom } from './utils.js';

// Spore Choir Audio Engine
export class SporeChoirEngine {
    constructor() {
        this.numVoices = 4;
        this.voices = [];
        this.masterGain = null;
        this.envelopeGain = null;
        this.isInitialized = false;
        
        this.params = {
            amp: -20,
            note: 52,
            seed: 3079,
            x0: 0.5,
            x1: 0.5,
            lazy: 0.1,
            grit: 0.8,
            attack: 0.02,
            decay: 0.15,
            trigOnSeed: true,
            seqSteps: 8,
            seqFreq: 120,
            seqFill: 1.0,
            seqShift: 0.0,
            aware: false,
            scale: 'major'
        };
        
        this.scales = {
            'major': [0, 2, 4, 5, 7, 9, 11, 12],
            'minor': [0, 2, 3, 5, 7, 8, 10, 12],
            'dorian': [0, 2, 3, 5, 7, 9, 10, 12],
            'phrygian': [0, 1, 3, 5, 7, 8, 10, 12],
            'lydian': [0, 2, 4, 6, 7, 9, 11, 12],
            'mixolydian': [0, 2, 4, 5, 7, 9, 10, 12],
            'locrian': [0, 1, 3, 5, 6, 8, 10, 12],
            'harmonicMinor': [0, 2, 3, 5, 7, 8, 11, 12],
            'melodicMinor': [0, 2, 3, 5, 7, 9, 11, 12],
            'pentatonicMajor': [0, 2, 4, 7, 9, 12],
            'pentatonicMinor': [0, 3, 5, 7, 10, 12],
            'blues': [0, 3, 5, 6, 7, 10, 12],
            'wholeTone': [0, 2, 4, 6, 8, 10, 12],
            'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        };
        
        this.seedParams = {
            fRels: [],
            weights: [],
            ampWeights: [],
            idxWeights: []
        };
    }
    
    async init() {
        if (this.isInitialized) return;
        
        await Tone.start();
        
        this.envelopeGain = new Tone.Gain(1);
        this.masterGain = new Tone.Gain(0.3);
        this.envelopeGain.connect(this.masterGain);
        this.masterGain.toDestination();
        
        for (let i = 0; i < this.numVoices; i++) {
            this.voices.push(this.createVoice());
        }
        
        this.generateSeedParams();
        this.isInitialized = true;
    }
    
    createVoice() {
        const oscChains = [];
        
        for (let i = 0; i < 4; i++) {
            const oscTypes = ['sine', 'triangle', 'sawtooth', 'square'];
            const osc = new Tone.Oscillator(440, oscTypes[i]);
            const gain = new Tone.Gain(0);
            
            const lpf = new Tone.Filter(1000, 'lowpass');
            const rlpf = new Tone.Filter(1000, 'lowpass', -24);
            const filterCrossfade = new Tone.CrossFade(0);
            
            osc.connect(gain);
            gain.connect(lpf);
            gain.connect(rlpf);
            lpf.connect(filterCrossfade.a);
            rlpf.connect(filterCrossfade.b);
            filterCrossfade.connect(this.envelopeGain);
            
            oscChains.push({
                osc: osc,
                gain: gain,
                lpf: lpf,
                rlpf: rlpf,
                filterCrossfade: filterCrossfade
            });
        }
        
        return { chains: oscChains };
    }
    
    generateSeedParams() {
        const rng = new SeededRandom(this.params.seed);
        
        this.seedParams.fRels = [];
        
        if (this.params.aware) {
            const scale = this.scales[this.params.scale] || this.scales.major;
            const usedDegrees = new Set();
            
            for (let i = 0; i < this.numVoices; i++) {
                let degreeIndex;
                let attempts = 0;
                
                // Try to get a unique degree, but allow duplicates after 10 attempts
                do {
                    degreeIndex = rng.int(0, scale.length - 1);
                    attempts++;
                } while (usedDegrees.has(degreeIndex) && attempts < 10);
                
                usedDegrees.add(degreeIndex);
                const semitones = scale[degreeIndex];
                const ratio = Math.pow(2, semitones / 12);
                this.seedParams.fRels.push(ratio);
            }
        } else {
            for (let i = 0; i < this.numVoices; i++) {
                const num = rng.int(1, 5);
                const den = rng.int(1, 5);
                this.seedParams.fRels.push(num / den);
            }
        }
        
        this.seedParams.weights = [];
        for (let i = 0; i < 4; i++) {
            this.seedParams.weights.push([
                rng.range(-1, 1),
                rng.range(-1, 1)
            ]);
        }
        
        this.seedParams.ampWeights = [];
        for (let i = 0; i < this.numVoices; i++) {
            this.seedParams.ampWeights.push([
                rng.range(-1, 1),
                rng.range(-1, 1)
            ]);
        }
        
        this.seedParams.idxWeights = [];
        for (let i = 0; i < this.numVoices; i++) {
            this.seedParams.idxWeights.push([
                rng.range(-1, 1),
                rng.range(-1, 1)
            ]);
        }
    }
    
    linearCombination(weights, x) {
        let sum = 0;
        for (let i = 0; i < weights.length; i++) {
            sum += weights[i] * x[i];
        }
        return sum;
    }
    
    linlin(val, inMin, inMax, outMin, outMax) {
        return ((val - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
    }
    
    linexp(val, inMin, inMax, outMin, outMax) {
        const normalized = (val - inMin) / (inMax - inMin);
        return outMin * Math.pow(outMax / outMin, normalized);
    }
    
    updateFromParams() {
        if (!this.isInitialized) return;
        
        const x = [this.params.x0, this.params.x1];
        
        const detune = this.linlin(
            this.linearCombination(this.seedParams.weights[0], x),
            -1, 1, 0, 10
        );
        
        const lpMix = this.linlin(
            this.linearCombination(this.seedParams.weights[1], x),
            -1, 1, 0, 1
        );
        
        const lpFreq = this.linexp(
            this.linearCombination(this.seedParams.weights[2], x),
            -1, 1, 200, 18000
        );
        
        const baseFreq = Tone.Frequency(this.params.note, 'midi').toFrequency();
        const lazyTime = this.params.lazy * 0.05;
        
        this.voices.forEach((voice, voiceIdx) => {
            const voiceFreq = this.seedParams.fRels[voiceIdx] * baseFreq;
            
            const voiceAmp = this.linlin(
                this.linearCombination(this.seedParams.ampWeights[voiceIdx], x),
                -1, 1, 0.3, 1.2
            );
            
            const voiceIdx_param = this.linlin(
                this.linearCombination(this.seedParams.idxWeights[voiceIdx], x),
                -1, 1, 0, 3.99
            );
            
            voice.chains.forEach((chain, chainIdx) => {
                const detuneAmount = (Math.random() * 2 - 1) * detune * 0.3;
                const finalFreq = voiceFreq + detuneAmount;
                chain.osc.frequency.rampTo(finalFreq, lazyTime * 0.2);
                
                const oscIdx = Math.floor(voiceIdx_param);
                const oscMix = voiceIdx_param - oscIdx;
                
                let gainValue = 0;
                if (chainIdx === oscIdx) {
                    gainValue = (1 - oscMix) * voiceAmp * 0.3;
                } else if (chainIdx === (oscIdx + 1) % 4) {
                    gainValue = oscMix * voiceAmp * 0.3;
                }
                
                chain.gain.gain.rampTo(gainValue, lazyTime);
                
                chain.lpf.frequency.rampTo(lpFreq, lazyTime);
                chain.rlpf.frequency.rampTo(lpFreq / 7, lazyTime);
                
                const qValue = this.linexp(this.params.grit, 0, 1, 0.7, 25);
                chain.rlpf.Q.rampTo(qValue, lazyTime);
                
                const gritMix = this.params.grit * 0.4;
                const filterMixValue = lpMix * gritMix;
                chain.filterCrossfade.fade.rampTo(filterMixValue, lazyTime);
            });
        });
        
        const ampDb = Math.max(this.params.amp, -90);
        const ampLin = ampDb === -90 ? 0 : Math.pow(10, ampDb / 20);
        this.masterGain.gain.rampTo(ampLin * 0.5, 0.1);
    }
    
    trigger() {
        if (!this.isInitialized) return;
        
        this.voices.forEach(voice => {
            voice.chains.forEach(chain => {
                if (chain.osc.state !== 'started') {
                    chain.osc.start();
                }
            });
        });
        
        this.updateFromParams();
        
        const now = Tone.now();
        const attack = Math.max(0.001, this.params.attack);
        const decay = Math.max(0.02, this.params.decay);
        
        this.envelopeGain.gain.cancelScheduledValues(now);
        this.envelopeGain.gain.setValueAtTime(0.001, now);
        this.envelopeGain.gain.exponentialRampToValueAtTime(1, now + attack);
        this.envelopeGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
        this.envelopeGain.gain.linearRampToValueAtTime(0, now + attack + decay + 0.005);
    }
    
    setParam(name, value) {
        if (name === 'seed') {
            const oldSeed = this.params.seed;
            this.params[name] = value;
            if (oldSeed !== value) {
                this.generateSeedParams();
                this.updateFromParams();
                if (this.params.trigOnSeed) {
                    this.trigger();
                }
            }
        } else if (name === 'aware' || name === 'scale') {
            this.params[name] = value;
            this.generateSeedParams();
            this.updateFromParams();
        } else {
            this.params[name] = value;
            if (name !== 'attack' && name !== 'decay' && name !== 'trigOnSeed' && 
                name !== 'seqSteps' && name !== 'seqFreq' && name !== 'seqFill' && name !== 'seqShift') {
                this.updateFromParams();
            }
        }
    }
    
    getState() {
        return { ...this.params };
    }
    
    setState(state) {
        Object.keys(state).forEach(key => {
            this.setParam(key, state[key]);
        });
    }
    
    stop() {
        if (!this.isInitialized) return;
        this.voices.forEach(voice => {
            voice.chains.forEach(chain => {
                chain.osc.stop();
            });
        });
    }
}
