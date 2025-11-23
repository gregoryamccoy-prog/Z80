// cpu.js - Z80 CPU Core Implementation

import * as Memory from './memory.js';

// Flag bit masks
export const FLAG_C = 0x01;  // Carry
export const FLAG_N = 0x02;  // Add/Subtract
export const FLAG_PV = 0x04; // Parity/Overflow
export const FLAG_H = 0x10;  // Half Carry
export const FLAG_Z = 0x40;  // Zero
export const FLAG_S = 0x80;  // Sign

/**
 * Z80 CPU Class
 */
export class CPU {
    constructor(memory, opcodeManager, instructionExecutor) {
        this.memory = memory;
        this.opcodeManager = opcodeManager;
        this.instructionExecutor = instructionExecutor;
        
        // 8-bit registers
        this.A = 0;  // Accumulator
        this.F = 0;  // Flags
        this.B = 0;
        this.C = 0;
        this.D = 0;
        this.E = 0;
        this.H = 0;
        this.L = 0;
        
        // Alternate register set
        this.A_ = 0;
        this.F_ = 0;
        this.B_ = 0;
        this.C_ = 0;
        this.D_ = 0;
        this.E_ = 0;
        this.H_ = 0;
        this.L_ = 0;
        
        // Index registers
        this.IX = 0;
        this.IY = 0;
        
        // Special registers
        this.I = 0;   // Interrupt vector
        this.R = 0;   // Memory refresh
        this.PC = 0;  // Program counter
        this.SP = 0;  // Stack pointer
        
        // CPU state
        this.halted = false;
        this.interruptsEnabled = false;
        this.iff1 = false;  // Interrupt flip-flop 1
        this.iff2 = false;  // Interrupt flip-flop 2
        this.interruptMode = 0;
        
        // Cycle counter
        this.cycles = 0;
    }
    
    // 16-bit register pair getters/setters
    get AF() { return (this.A << 8) | this.F; }
    set AF(value) {
        this.A = (value >> 8) & 0xFF;
        this.F = value & 0xFF;
    }
    
    get BC() { return (this.B << 8) | this.C; }
    set BC(value) {
        this.B = (value >> 8) & 0xFF;
        this.C = value & 0xFF;
    }
    
    get DE() { return (this.D << 8) | this.E; }
    set DE(value) {
        this.D = (value >> 8) & 0xFF;
        this.E = value & 0xFF;
    }
    
    get HL() { return (this.H << 8) | this.L; }
    set HL(value) {
        this.H = (value >> 8) & 0xFF;
        this.L = value & 0xFF;
    }
    
    // Alternate register pairs
    get AF_() { return (this.A_ << 8) | this.F_; }
    set AF_(value) {
        this.A_ = (value >> 8) & 0xFF;
        this.F_ = value & 0xFF;
    }
    
    get BC_() { return (this.B_ << 8) | this.C_; }
    set BC_(value) {
        this.B_ = (value >> 8) & 0xFF;
        this.C_ = value & 0xFF;
    }
    
    get DE_() { return (this.D_ << 8) | this.E_; }
    set DE_(value) {
        this.D_ = (value >> 8) & 0xFF;
        this.E_ = value & 0xFF;
    }
    
    get HL_() { return (this.H_ << 8) | this.L_; }
    set HL_(value) {
        this.H_ = (value >> 8) & 0xFF;
        this.L_ = value & 0xFF;
    }
    
    /**
     * Get flag bit value
     * @param {number} mask - Flag bit mask
     * @returns {number} 1 or 0
     */
    getFlag(mask) {
        return (this.F & mask) !== 0 ? 1 : 0;
    }
    
    /**
     * Set flag bit value
     * @param {number} mask - Flag bit mask
     * @param {number} value - 1 or 0
     */
    setFlag(mask, value) {
        if (value) {
            this.F |= mask;
        } else {
            this.F &= ~mask;
        }
    }
    
    /**
     * Read byte from memory (with bus monitoring capability)
     * @param {number} address - 16-bit address
     * @returns {number} Byte value
     */
    readByte(address) {
        return Memory.readByte(this.memory, address);
    }
    
    /**
     * Write byte to memory (with bus monitoring capability)
     * @param {number} address - 16-bit address
     * @param {number} value - Byte value
     */
    writeByte(address, value) {
        Memory.writeByte(this.memory, address, value);
    }
    
    /**
     * Read word from memory (little-endian)
     * @param {number} address - 16-bit address
     * @returns {number} 16-bit word
     */
    readWord(address) {
        return Memory.readWord(this.memory, address);
    }
    
    /**
     * Write word to memory (little-endian)
     * @param {number} address - 16-bit address
     * @param {number} value - 16-bit word
     */
    writeWord(address, value) {
        Memory.writeWord(this.memory, address, value);
    }
    
    /**
     * Fetch byte at PC and increment PC
     * @returns {number} Byte value
     */
    fetchByte() {
        const value = this.readByte(this.PC);
        this.PC = (this.PC + 1) & 0xFFFF;
        return value;
    }
    
    /**
     * Fetch word at PC and increment PC by 2
     * @returns {number} 16-bit word
     */
    fetchWord() {
        const low = this.fetchByte();
        const high = this.fetchByte();
        return (high << 8) | low;
    }
    
    /**
     * Push word onto stack
     * @param {number} value - 16-bit value to push
     */
    pushWord(value) {
        this.SP = (this.SP - 2) & 0xFFFF;
        this.writeWord(this.SP, value);
    }
    
    /**
     * Pop word from stack
     * @returns {number} 16-bit value
     */
    popWord() {
        const value = this.readWord(this.SP);
        this.SP = (this.SP + 2) & 0xFFFF;
        return value;
    }
    
    /**
     * Execute one instruction
     * @returns {number} Cycles used
     */
    step() {
        if (this.halted) {
            return 4; // HALT consumes cycles waiting for interrupt
        }
        
        // Fetch opcode
        const opcode = this.fetchByte();
        
        // Increment refresh register (lower 7 bits)
        this.R = (this.R & 0x80) | ((this.R + 1) & 0x7F);
        
        // Look up instruction
        const opcodeDef = this.opcodeManager.getInstruction(null, opcode);
        
        if (!opcodeDef) {
            console.error(`Unknown opcode: 0x${opcode.toString(16).toUpperCase().padStart(2, '0')} at PC=${(this.PC - 1).toString(16).toUpperCase().padStart(4, '0')}`);
            this.halted = true;
            return 4;
        }
        
        // Execute instruction
        try {
            this.instructionExecutor.execute(opcodeDef);
            this.cycles += opcodeDef.cycles || 4;
            return opcodeDef.cycles || 4;
        } catch (error) {
            console.error(`Error executing ${opcodeDef.mnemonic}:`, error);
            this.halted = true;
            return 4;
        }
    }
    
    /**
     * Reset CPU to initial state
     */
    reset() {
        this.A = 0xFF;
        this.F = 0xFF;
        this.B = 0xFF;
        this.C = 0xFF;
        this.D = 0xFF;
        this.E = 0xFF;
        this.H = 0xFF;
        this.L = 0xFF;
        
        this.A_ = 0xFF;
        this.F_ = 0xFF;
        this.B_ = 0xFF;
        this.C_ = 0xFF;
        this.D_ = 0xFF;
        this.E_ = 0xFF;
        this.H_ = 0xFF;
        this.L_ = 0xFF;
        
        this.IX = 0xFFFF;
        this.IY = 0xFFFF;
        this.I = 0;
        this.R = 0;
        this.PC = 0;
        this.SP = 0xFFFF;
        
        this.halted = false;
        this.interruptsEnabled = false;
        this.iff1 = false;
        this.iff2 = false;
        this.interruptMode = 0;
        
        this.cycles = 0;
    }
    
    /**
     * Get current CPU state as object
     * @returns {object} CPU state
     */
    getState() {
        return {
            A: this.A,
            F: this.F,
            B: this.B,
            C: this.C,
            D: this.D,
            E: this.E,
            H: this.H,
            L: this.L,
            AF: this.AF,
            BC: this.BC,
            DE: this.DE,
            HL: this.HL,
            IX: this.IX,
            IY: this.IY,
            PC: this.PC,
            SP: this.SP,
            I: this.I,
            R: this.R,
            flags: {
                S: this.getFlag(FLAG_S),
                Z: this.getFlag(FLAG_Z),
                H: this.getFlag(FLAG_H),
                PV: this.getFlag(FLAG_PV),
                N: this.getFlag(FLAG_N),
                C: this.getFlag(FLAG_C)
            },
            halted: this.halted,
            cycles: this.cycles
        };
    }
}
