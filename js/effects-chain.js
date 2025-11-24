// Effects Chain Manager for Tuna Effects
export class EffectsChain {
    constructor() {
        this.tuna = null;
        this.effects = []; // Array of {type, instance, params, bypass, id}
        this.input = null;
        this.output = null;
        this.nextId = 0;
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        this.tuna = new Tuna(Tone.context);
        this.input = new Tone.Gain(1);
        this.output = new Tone.Gain(1);
        this.reconnect();
        this.isInitialized = true;
    }
    
    getEffectDefinitions() {
        return {
            overdrive: {
                name: 'Overdrive',
                params: {
                    outputGain: { min: -42, max: 0, default: -6, step: 0.1, label: 'output gain' },
                    drive: { min: 0, max: 1, default: 0.5, step: 0.01, label: 'drive' },
                    curveAmount: { min: 0, max: 1, default: 0.5, step: 0.01, label: 'curve' },
                    algorithmIndex: { min: 0, max: 5, default: 0, step: 1, label: 'algorithm' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            filter: {
                name: 'Filter',
                params: {
                    frequency: { min: 20, max: 22050, default: 800, step: 1, label: 'frequency' },
                    Q: { min: 0.001, max: 100, default: 1, step: 0.01, label: 'Q' },
                    gain: { min: -40, max: 40, default: 0, step: 0.1, label: 'gain' },
                    filterType: { 
                        type: 'select', 
                        options: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'],
                        default: 'lowpass',
                        label: 'type'
                    },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            cabinet: {
                name: 'Cabinet',
                params: {
                    makeupGain: { min: 0, max: 20, default: 0, step: 0.1, label: 'makeup gain' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            delay: {
                name: 'Delay',
                params: {
                    feedback: { min: 0, max: 0.95, default: 0.3, step: 0.01, label: 'feedback' },
                    delayTime: { min: 1, max: 10000, default: 200, step: 1, label: 'time (ms)' },
                    wetLevel: { min: 0, max: 1, default: 0.3, step: 0.01, label: 'wet' },
                    dryLevel: { min: 0, max: 1, default: 1, step: 0.01, label: 'dry' },
                    cutoff: { min: 20, max: 22050, default: 2000, step: 1, label: 'cutoff' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            convolver: {
                name: 'Convolver',
                params: {
                    highCut: { min: 20, max: 22050, default: 22050, step: 1, label: 'high cut' },
                    lowCut: { min: 20, max: 22050, default: 20, step: 1, label: 'low cut' },
                    dryLevel: { min: 0, max: 1, default: 1, step: 0.01, label: 'dry' },
                    wetLevel: { min: 0, max: 1, default: 0.5, step: 0.01, label: 'wet' },
                    level: { min: 0, max: 1, default: 1, step: 0.01, label: 'level' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            compressor: {
                name: 'Compressor',
                params: {
                    threshold: { min: -100, max: 0, default: -20, step: 0.1, label: 'threshold' },
                    makeupGain: { min: 0, max: 40, default: 0, step: 0.1, label: 'makeup gain' },
                    attack: { min: 0, max: 1000, default: 1, step: 0.1, label: 'attack (ms)' },
                    release: { min: 0, max: 3000, default: 250, step: 1, label: 'release (ms)' },
                    ratio: { min: 1, max: 20, default: 4, step: 0.1, label: 'ratio' },
                    knee: { min: 0, max: 40, default: 5, step: 0.1, label: 'knee' },
                    automakeup: { type: 'boolean', default: false, label: 'auto makeup' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            wahwah: {
                name: 'Wah-Wah',
                params: {
                    automode: { type: 'boolean', default: true, label: 'auto' },
                    baseFrequency: { min: 50, max: 1500, default: 100, step: 1, label: 'base freq' },
                    excursionOctaves: { min: 1, max: 6, default: 3, step: 0.1, label: 'excursion' },
                    sweep: { min: 0, max: 1, default: 0.5, step: 0.01, label: 'sweep' },
                    resonance: { min: 1, max: 100, default: 10, step: 0.1, label: 'resonance' },
                    sensitivity: { min: -1, max: 1, default: 0.5, step: 0.01, label: 'sensitivity' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            tremolo: {
                name: 'Tremolo',
                params: {
                    intensity: { min: 0, max: 1, default: 0.3, step: 0.01, label: 'intensity' },
                    rate: { min: 0.001, max: 20, default: 4, step: 0.01, label: 'rate' },
                    stereoPhase: { min: 0, max: 180, default: 0, step: 1, label: 'stereo phase' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            phaser: {
                name: 'Phaser',
                params: {
                    rate: { min: 0.001, max: 20, default: 1.2, step: 0.01, label: 'rate' },
                    depth: { min: 0, max: 1, default: 0.3, step: 0.01, label: 'depth' },
                    feedback: { min: 0, max: 1, default: 0.2, step: 0.01, label: 'feedback' },
                    stereoPhase: { min: 0, max: 180, default: 30, step: 1, label: 'stereo phase' },
                    baseModulationFrequency: { min: 500, max: 1500, default: 700, step: 1, label: 'base freq' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            chorus: {
                name: 'Chorus',
                params: {
                    rate: { min: 0.001, max: 20, default: 1.5, step: 0.01, label: 'rate' },
                    feedback: { min: 0, max: 0.95, default: 0.2, step: 0.01, label: 'feedback' },
                    depth: { min: 0, max: 1, default: 0.7, step: 0.01, label: 'depth' },
                    delay: { min: 0.0001, max: 1, default: 0.0045, step: 0.0001, label: 'delay' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            bitcrusher: {
                name: 'Bitcrusher',
                params: {
                    bits: { min: 1, max: 16, default: 8, step: 1, label: 'bits' },
                    normfreq: { min: 0, max: 1, default: 0.1, step: 0.01, label: 'freq' },
                    bufferSize: { min: 256, max: 16384, default: 4096, step: 256, label: 'buffer' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            moog: {
                name: 'Moog Filter',
                params: {
                    cutoff: { min: 0, max: 1, default: 0.065, step: 0.001, label: 'cutoff' },
                    resonance: { min: 0, max: 4, default: 3.5, step: 0.01, label: 'resonance' },
                    bufferSize: { min: 256, max: 16384, default: 4096, step: 256, label: 'buffer' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            },
            pingpongdelay: {
                name: 'Ping-Pong Delay',
                params: {
                    wetLevel: { min: 0, max: 1, default: 0.3, step: 0.01, label: 'wet' },
                    feedback: { min: 0, max: 0.95, default: 0.3, step: 0.01, label: 'feedback' },
                    delayTimeLeft: { min: 1, max: 10000, default: 200, step: 1, label: 'time L (ms)' },
                    delayTimeRight: { min: 1, max: 10000, default: 400, step: 1, label: 'time R (ms)' },
                    bypass: { type: 'boolean', default: false, label: 'bypass' }
                }
            }
        };
    }
    
    createEffect(type) {
        const defs = this.getEffectDefinitions();
        const def = defs[type];
        if (!def) return null;
        
        // Build config object from defaults
        const config = {};
        Object.keys(def.params).forEach(key => {
            const param = def.params[key];
            if (param.type === 'boolean') {
                config[key] = param.default;
            } else if (param.type === 'select') {
                config[key] = param.default;
            } else {
                config[key] = param.default;
            }
        });
        
        // Special case for convolver - needs impulse response
        if (type === 'convolver') {
            config.impulse = this.generateImpulseResponse();
        }
        
        // Create the Tuna effect
        const className = type.charAt(0).toUpperCase() + type.slice(1);
        const instance = new this.tuna[className](config);
        
        return {
            id: this.nextId++,
            type: type,
            instance: instance,
            params: { ...config },
            bypass: false
        };
    }
    
    generateImpulseResponse() {
        const length = Tone.context.sampleRate * 2;
        const impulse = Tone.context.createBuffer(2, length, Tone.context.sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
            const decay = Math.exp(-i / (Tone.context.sampleRate * 0.5));
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        
        return impulse;
    }
    
    addEffect(type, position = -1) {
        const effect = this.createEffect(type);
        if (!effect) return null;
        
        if (position === -1 || position >= this.effects.length) {
            this.effects.push(effect);
        } else {
            this.effects.splice(position, 0, effect);
        }
        
        this.reconnect();
        return effect;
    }
    
    removeEffect(id) {
        const index = this.effects.findIndex(e => e.id === id);
        if (index !== -1) {
            this.effects.splice(index, 1);
            this.reconnect();
            return true;
        }
        return false;
    }
    
    moveEffect(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.effects.length) return false;
        if (toIndex < 0 || toIndex >= this.effects.length) return false;
        
        const effect = this.effects.splice(fromIndex, 1)[0];
        this.effects.splice(toIndex, 0, effect);
        this.reconnect();
        return true;
    }
    
    setEffectParam(id, paramName, value) {
        const effect = this.effects.find(e => e.id === id);
        if (!effect) return false;
        
        effect.params[paramName] = value;
        
        // Update the actual Tuna effect parameter
        if (effect.instance[paramName] !== undefined) {
            effect.instance[paramName] = value;
        }
        
        return true;
    }
    
    toggleBypass(id) {
        const effect = this.effects.find(e => e.id === id);
        if (!effect) return false;
        
        effect.bypass = !effect.bypass;
        effect.instance.bypass = effect.bypass;
        return effect.bypass;
    }
    
    reconnect() {
        if (!this.input || !this.output) return;
        
        // Disconnect everything
        this.input.disconnect();
        this.effects.forEach(e => {
            if (e.instance.disconnect) {
                e.instance.disconnect();
            }
        });
        
        // Rebuild chain
        let current = this.input;
        
        this.effects.forEach(effect => {
            current.connect(effect.instance.input || effect.instance);
            current = effect.instance.output || effect.instance;
        });
        
        current.connect(this.output);
    }
    
    clear() {
        this.effects = [];
        this.reconnect();
    }
    
    getState() {
        return this.effects.map(e => ({
            type: e.type,
            params: { ...e.params },
            bypass: e.bypass
        }));
    }
    
    setState(state) {
        this.clear();
        
        state.forEach(effectState => {
            const effect = this.addEffect(effectState.type);
            if (effect) {
                Object.keys(effectState.params).forEach(key => {
                    this.setEffectParam(effect.id, key, effectState.params[key]);
                });
                if (effectState.bypass) {
                    this.toggleBypass(effect.id);
                }
            }
        });
    }
}
