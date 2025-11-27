// instruction_executor.js - Generic Z80 Instruction Executor

import { FLAG_C, FLAG_N, FLAG_PV, FLAG_H, FLAG_Z, FLAG_S } from './cpu.js';

/**
 * InstructionExecutor - Executes instructions based on JSON opcode definitions
 */
export class InstructionExecutor {
    constructor(cpu) {
        this.cpu = cpu;
    }
    
    /**
     * Execute an instruction from its opcode definition
     * @param {object} opcodeDef - Opcode definition from JSON
     */
    execute(opcodeDef) {
        const { operation, flags } = opcodeDef;
        
        switch (operation.type) {
            case 'load':
                this.executeLoad(operation, flags);
                break;
            case 'arithmetic':
                this.executeArithmetic(operation, flags);
                break;
            case 'jump':
                this.executeJump(operation, opcodeDef);
                break;
            case 'stack':
                this.executeStack(operation, flags);
                break;
            case 'logical':
                this.executeLogical(operation, flags);
                break;
            case 'special':
                this.executeSpecial(operation, flags);
                break;
            case 'rotate_shift':
                this.executeRotateShift(operation, flags);
                break;
            case 'bit_test':
                this.executeBitTest(operation, flags);
                break;
            case 'bit_modify':
                this.executeBitModify(operation, flags);
                break;
            case 'block':
                this.executeBlock(operation, flags);
                break;
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }
    
    /**
     * Execute load instructions (LD)
     * @param {object} op - Operation definition
     * @param {object} flagDef - Flag definitions
     */
    executeLoad(op, flagDef) {
        // Special handling for 16-bit loads with (immediate16)
        if (op.destination === '(immediate16)' || op.source === '(immediate16)') {
            const addr = this.cpu.fetchWord();
            
            if (op.destination === '(immediate16)') {
                // Writing to memory
                const value = this.getOperandValue(op.source);
                if (value > 0xFF || ['BC', 'DE', 'HL', 'SP', 'IX', 'IY'].includes(op.source)) {
                    this.cpu.writeWord(addr, value);
                } else {
                    this.cpu.writeByte(addr, value);
                }
            } else {
                // Reading from memory
                const value = (['BC', 'DE', 'HL', 'SP', 'IX', 'IY'].includes(op.destination)) 
                    ? this.cpu.readWord(addr)
                    : this.cpu.readByte(addr);
                this.setOperandValue(op.destination, value);
            }
        } else {
            const value = this.getOperandValue(op.source);
            this.setOperandValue(op.destination, value);
        }
        
        // LD instructions typically don't affect flags (except LD A,I and LD A,R)
    }
    
    /**
     * Execute arithmetic instructions (INC, DEC, ADD, SUB, etc.)
     * @param {object} op - Operation definition
     * @param {object} flagDef - Flag definitions
     */
    executeArithmetic(op, flagDef) {
        const dest = op.destination;
        const currentValue = this.getOperandValue(dest);
        let result;
        let halfCarry = false;
        let overflow = false;
        let carry = false;
        
        switch (op.subtype) {
            case 'inc':
                result = (currentValue + 1) & 0xFF;
                halfCarry = ((currentValue & 0x0F) + 1) > 0x0F;
                overflow = currentValue === 0x7F;
                this.setOperandValue(dest, result);
                this.updateFlags(result, flagDef, halfCarry, overflow, false, false);
                break;
                
            case 'dec':
                result = (currentValue - 1) & 0xFF;
                halfCarry = (currentValue & 0x0F) === 0;
                overflow = currentValue === 0x80;
                this.setOperandValue(dest, result);
                this.updateFlags(result, flagDef, halfCarry, overflow, true, false);
                break;
                
            case 'add': {
                const sourceValue = this.getOperandValue(op.source);
                const sum = currentValue + sourceValue;
                result = sum & 0xFF;
                
                // Half carry: carry from bit 3 to bit 4
                halfCarry = ((currentValue & 0x0F) + (sourceValue & 0x0F)) > 0x0F;
                
                // Overflow: both operands same sign, result different sign
                overflow = ((currentValue ^ result) & (sourceValue ^ result) & 0x80) !== 0;
                
                // Carry: result exceeds 8 bits
                carry = sum > 0xFF;
                
                this.setOperandValue(dest, result);
                this.updateFlags(result, flagDef, halfCarry, overflow, false, carry);
                break;
            }
                
            case 'sub': {
                const sourceValue = this.getOperandValue(op.source);
                const diff = currentValue - sourceValue;
                result = diff & 0xFF;
                
                // Half carry: borrow from bit 4
                halfCarry = (currentValue & 0x0F) < (sourceValue & 0x0F);
                
                // Overflow: operands different sign, result different sign from minuend
                overflow = ((currentValue ^ sourceValue) & (currentValue ^ result) & 0x80) !== 0;
                
                // Carry (borrow): result is negative
                carry = diff < 0;
                
                this.setOperandValue(dest, result);
                this.updateFlags(result, flagDef, halfCarry, overflow, true, carry);
                break;
            }
            
            case 'inc16': {
                // 16-bit increment (INC BC, INC DE, INC HL, INC SP)
                const currentValue = this.getOperandValue(dest);
                const result = (currentValue + 1) & 0xFFFF;
                this.setOperandValue(dest, result);
                // 16-bit INC doesn't affect flags
                break;
            }
            
            case 'dec16': {
                // 16-bit decrement (DEC BC, DEC DE, DEC HL, DEC SP)
                const currentValue = this.getOperandValue(dest);
                const result = (currentValue - 1) & 0xFFFF;
                this.setOperandValue(dest, result);
                // 16-bit DEC doesn't affect flags
                break;
            }
            
            case 'neg': {
                // NEG - Negate A (two's complement)
                result = (0 - currentValue) & 0xFF;
                halfCarry = (0 & 0x0F) < (currentValue & 0x0F);
                overflow = currentValue === 0x80;
                carry = currentValue !== 0;
                this.setOperandValue(dest, result);
                this.updateFlags(result, flagDef, halfCarry, overflow, true, carry);
                break;
            }
            
            case 'adc16': {
                // ADC HL,rr - 16-bit add with carry
                const sourceValue = this.getOperandValue(op.source);
                const carryIn = this.cpu.getFlag(FLAG_C);
                const sum = currentValue + sourceValue + carryIn;
                result = sum & 0xFFFF;
                
                // Half carry: carry from bit 11 to bit 12
                halfCarry = ((currentValue & 0x0FFF) + (sourceValue & 0x0FFF) + carryIn) > 0x0FFF;
                
                // Overflow: both operands same sign, result different sign
                overflow = ((currentValue ^ result) & (sourceValue ^ result) & 0x8000) !== 0;
                
                // Carry: result exceeds 16 bits
                carry = sum > 0xFFFF;
                
                this.setOperandValue(dest, result);
                // For 16-bit operations, we need to check the high byte for S and Z
                const highByte = (result >> 8) & 0xFF;
                this.updateFlags16(result, flagDef, halfCarry, overflow, false, carry);
                break;
            }
            
            case 'sbc16': {
                // SBC HL,rr - 16-bit subtract with carry
                const sourceValue = this.getOperandValue(op.source);
                const carryIn = this.cpu.getFlag(FLAG_C);
                const diff = currentValue - sourceValue - carryIn;
                result = diff & 0xFFFF;
                
                // Half carry: borrow from bit 12
                halfCarry = ((currentValue & 0x0FFF) < ((sourceValue & 0x0FFF) + carryIn));
                
                // Overflow: operands different sign, result different sign from minuend
                overflow = ((currentValue ^ sourceValue) & (currentValue ^ result) & 0x8000) !== 0;
                
                // Carry (borrow): result is negative
                carry = diff < 0;
                
                this.setOperandValue(dest, result);
                this.updateFlags16(result, flagDef, halfCarry, overflow, true, carry);
                break;
            }
                
            default:
                throw new Error(`Unimplemented arithmetic subtype: ${op.subtype}`);
        }
    }
    
    /**
     * Execute jump instructions (JP, JR, CALL, RET, etc.)
     * @param {object} op - Operation definition
     * @param {object} opcodeDef - Full opcode definition
     */
    executeJump(op, opcodeDef) {
        switch (op.subtype) {
            case 'relative': {
                // JR e - Relative jump
                let offset = this.cpu.fetchByte();
                
                // Convert to signed byte
                if (offset & 0x80) {
                    offset = offset - 256;
                }
                
                // Check condition if present
                if (op.condition) {
                    if (this.evaluateCondition(op.condition)) {
                        this.cpu.PC = (this.cpu.PC + offset) & 0xFFFF;
                    }
                } else {
                    // Unconditional jump
                    this.cpu.PC = (this.cpu.PC + offset) & 0xFFFF;
                }
                break;
            }
            
            case 'absolute': {
                // JP nn - Absolute jump
                const address = this.cpu.fetchWord();
                
                // Check condition if present
                if (op.condition) {
                    if (this.evaluateCondition(op.condition)) {
                        this.cpu.PC = address;
                    }
                } else {
                    // Unconditional jump
                    this.cpu.PC = address;
                }
                break;
            }
            
            case 'call': {
                // CALL nn - Call subroutine
                const address = this.cpu.fetchWord();
                
                // Check condition if present
                const shouldCall = op.condition ? this.evaluateCondition(op.condition) : true;
                
                if (shouldCall) {
                    // Push return address (current PC) onto stack
                    this.cpu.SP = (this.cpu.SP - 2) & 0xFFFF;
                    this.cpu.writeWord(this.cpu.SP, this.cpu.PC);
                    // Jump to subroutine
                    this.cpu.PC = address;
                }
                break;
            }
            
            case 'return': {
                // RET - Return from subroutine
                // Check condition if present
                const shouldReturn = op.condition ? this.evaluateCondition(op.condition) : true;
                
                if (shouldReturn) {
                    // Pop return address from stack
                    this.cpu.PC = this.cpu.readWord(this.cpu.SP);
                    this.cpu.SP = (this.cpu.SP + 2) & 0xFFFF;
                }
                break;
            }
                
            default:
                throw new Error(`Unimplemented jump subtype: ${op.subtype}`);
        }
    }
    
    /**
     * Execute stack operations (PUSH, POP)
     * @param {object} op - Operation definition
     * @param {object} flagDef - Flag definitions
     */
    executeStack(op, flagDef) {
        switch (op.subtype) {
            case 'push': {
                // PUSH rr - Push 16-bit register onto stack
                const value = this.getOperandValue(op.source);
                this.cpu.SP = (this.cpu.SP - 2) & 0xFFFF;
                this.cpu.writeWord(this.cpu.SP, value);
                break;
            }
            
            case 'pop': {
                // POP rr - Pop 16-bit register from stack
                const value = this.cpu.readWord(this.cpu.SP);
                this.setOperandValue(op.destination, value);
                this.cpu.SP = (this.cpu.SP + 2) & 0xFFFF;
                
                // POP AF restores flags
                if (op.destination === 'AF') {
                    // The low byte of AF is the flag register
                    // Flags are already set by setOperandValue
                }
                break;
            }
            
            default:
                throw new Error(`Unimplemented stack subtype: ${op.subtype}`);
        }
    }
    
    /**
     * Execute logical operations (AND, OR, XOR, CP)
     * @param {object} op - Operation definition
     * @param {object} flagDef - Flag definitions
     */
    executeLogical(op, flagDef) {
        const dest = op.destination;
        const currentValue = this.getOperandValue(dest);
        const sourceValue = this.getOperandValue(op.source);
        let result;
        
        switch (op.subtype) {
            case 'and':
                result = currentValue & sourceValue;
                this.setOperandValue(dest, result);
                this.updateFlags(result, flagDef, true, this.calculateParity(result), false, false);
                break;
                
            case 'or':
                result = currentValue | sourceValue;
                this.setOperandValue(dest, result);
                this.updateFlags(result, flagDef, false, this.calculateParity(result), false, false);
                break;
                
            case 'xor':
                result = currentValue ^ sourceValue;
                this.setOperandValue(dest, result);
                this.updateFlags(result, flagDef, false, this.calculateParity(result), false, false);
                break;
                
            case 'cp': {
                // Compare (subtract without storing result)
                const diff = currentValue - sourceValue;
                result = diff & 0xFF;
                
                // Half carry: borrow from bit 4
                const halfCarry = (currentValue & 0x0F) < (sourceValue & 0x0F);
                
                // Overflow: operands different sign, result different sign from minuend
                const overflow = ((currentValue ^ sourceValue) & (currentValue ^ result) & 0x80) !== 0;
                
                // Carry (borrow): result is negative
                const carry = diff < 0;
                
                this.updateFlags(result, flagDef, halfCarry, overflow, true, carry);
                break;
            }
                
            default:
                throw new Error(`Unimplemented logical subtype: ${op.subtype}`);
        }
    }
    
    /**
     * Calculate parity of a value (even parity = 1, odd parity = 0)
     * @param {number} value - Value to calculate parity for
     * @returns {boolean} True if even parity
     */
    calculateParity(value) {
        let parity = 0;
        let val = value & 0xFF;
        for (let i = 0; i < 8; i++) {
            parity ^= (val & 1);
            val >>= 1;
        }
        return parity === 0;
    }
    
    /**
     * Execute special instructions (NOP, HALT, DI, EI, etc.)
     * @param {object} op - Operation definition
     * @param {object} flagDef - Flag definitions
     */
    executeSpecial(op, flagDef) {
        switch (op.subtype) {
            case 'nop':
                // Do nothing
                break;
                
            case 'halt':
                this.cpu.halted = true;
                break;
                
            case 'di':
                this.cpu.iff1 = false;
                this.cpu.iff2 = false;
                this.cpu.interruptsEnabled = false;
                break;
                
            case 'ei':
                this.cpu.iff1 = true;
                this.cpu.iff2 = true;
                this.cpu.interruptsEnabled = true;
                break;
                
            case 'scf':
                // Set Carry Flag
                this.cpu.setFlag(FLAG_C, 1);
                this.cpu.setFlag(FLAG_N, 0);
                this.cpu.setFlag(FLAG_H, 0);
                break;
                
            case 'ccf':
                // Complement Carry Flag
                const oldCarry = this.cpu.getFlag(FLAG_C);
                this.cpu.setFlag(FLAG_H, oldCarry); // H is set to previous carry
                this.cpu.setFlag(FLAG_C, !oldCarry);
                this.cpu.setFlag(FLAG_N, 0);
                break;
                
            case 'retn':
            case 'reti':
                // Return from interrupt
                this.cpu.PC = this.cpu.popWord();
                this.cpu.iff1 = this.cpu.iff2;
                break;
                
            case 'im':
                // Set interrupt mode
                this.cpu.interruptMode = op.mode;
                break;
                
            case 'rrd': {
                // RRD - Rotate Right Digit (nibbles between A and (HL))
                const memValue = this.cpu.readByte(this.cpu.HL);
                const aLow = this.cpu.A & 0x0F;
                const memLow = memValue & 0x0F;
                const memHigh = (memValue >> 4) & 0x0F;
                
                // A = (A high nibble)(mem low nibble)
                // (HL) = (A low nibble)(mem high nibble)
                this.cpu.A = (this.cpu.A & 0xF0) | memLow;
                this.cpu.writeByte(this.cpu.HL, (aLow << 4) | memHigh);
                
                // Update flags based on A
                this.cpu.setFlag(FLAG_S, (this.cpu.A & 0x80) !== 0);
                this.cpu.setFlag(FLAG_Z, this.cpu.A === 0);
                this.cpu.setFlag(FLAG_H, 0);
                this.cpu.setFlag(FLAG_PV, this.calculateParity(this.cpu.A));
                this.cpu.setFlag(FLAG_N, 0);
                break;
            }
                
            case 'rld': {
                // RLD - Rotate Left Digit (nibbles between A and (HL))
                const memValue = this.cpu.readByte(this.cpu.HL);
                const aLow = this.cpu.A & 0x0F;
                const memLow = memValue & 0x0F;
                const memHigh = (memValue >> 4) & 0x0F;
                
                // A = (A high nibble)(mem high nibble)
                // (HL) = (mem low nibble)(A low nibble)
                this.cpu.A = (this.cpu.A & 0xF0) | memHigh;
                this.cpu.writeByte(this.cpu.HL, (memLow << 4) | aLow);
                
                // Update flags based on A
                this.cpu.setFlag(FLAG_S, (this.cpu.A & 0x80) !== 0);
                this.cpu.setFlag(FLAG_Z, this.cpu.A === 0);
                this.cpu.setFlag(FLAG_H, 0);
                this.cpu.setFlag(FLAG_PV, this.calculateParity(this.cpu.A));
                this.cpu.setFlag(FLAG_N, 0);
                break;
            }
                
            default:
                throw new Error(`Unimplemented special subtype: ${op.subtype}`);
        }
    }
    
    /**
     * Get the value of an operand
     * @param {string} operand - Operand string from JSON (e.g., "A", "immediate", "(HL)")
     * @returns {number} Operand value
     */
    getOperandValue(operand) {
        switch (operand) {
            case 'A': return this.cpu.A;
            case 'B': return this.cpu.B;
            case 'C': return this.cpu.C;
            case 'D': return this.cpu.D;
            case 'E': return this.cpu.E;
            case 'H': return this.cpu.H;
            case 'L': return this.cpu.L;
            case 'I': return this.cpu.I;
            case 'R': return this.cpu.R;
            
            // 16-bit registers
            case 'BC': return this.cpu.BC;
            case 'DE': return this.cpu.DE;
            case 'HL': return this.cpu.HL;
            case 'SP': return this.cpu.SP;
            case 'IX': return this.cpu.IX;
            case 'IY': return this.cpu.IY;
            case 'AF': return this.cpu.AF;
            
            // Immediate value
            case 'immediate':
                return this.cpu.fetchByte();
            
            case 'immediate16':
                return this.cpu.fetchWord();
            
            // Memory indirect
            case '(HL)':
                return this.cpu.readByte(this.cpu.HL);
            
            case '(BC)':
                return this.cpu.readByte(this.cpu.BC);
            
            case '(DE)':
                return this.cpu.readByte(this.cpu.DE);
            
            case '(SP)':
                return this.cpu.readWord(this.cpu.SP);
            
            case '(immediate16)':
                // Note: Address fetching handled in executeLoad for proper 8/16-bit handling
                throw new Error('(immediate16) should be handled in executeLoad');
            
            default:
                throw new Error(`Unknown operand: ${operand}`);
        }
    }
    
    /**
     * Set the value of an operand
     * @param {string} operand - Operand string from JSON
     * @param {number} value - Value to set
     */
    setOperandValue(operand, value) {
        switch (operand) {
            case 'A': this.cpu.A = value & 0xFF; break;
            case 'B': this.cpu.B = value & 0xFF; break;
            case 'C': this.cpu.C = value & 0xFF; break;
            case 'D': this.cpu.D = value & 0xFF; break;
            case 'E': this.cpu.E = value & 0xFF; break;
            case 'H': this.cpu.H = value & 0xFF; break;
            case 'L': this.cpu.L = value & 0xFF; break;
            case 'I': this.cpu.I = value & 0xFF; break;
            case 'R': this.cpu.R = value & 0xFF; break;
            
            // 16-bit registers
            case 'BC': this.cpu.BC = value & 0xFFFF; break;
            case 'DE': this.cpu.DE = value & 0xFFFF; break;
            case 'HL': this.cpu.HL = value & 0xFFFF; break;
            case 'SP': this.cpu.SP = value & 0xFFFF; break;
            case 'IX': this.cpu.IX = value & 0xFFFF; break;
            case 'IY': this.cpu.IY = value & 0xFFFF; break;
            case 'AF': this.cpu.AF = value & 0xFFFF; break;
            case 'PC': this.cpu.PC = value & 0xFFFF; break;
            
            // Memory indirect
            case '(HL)':
                this.cpu.writeByte(this.cpu.HL, value);
                break;
            
            case '(BC)':
                this.cpu.writeByte(this.cpu.BC, value);
                break;
            
            case '(DE)':
                this.cpu.writeByte(this.cpu.DE, value);
                break;
            
            case '(SP)':
                this.cpu.writeWord(this.cpu.SP, value);
                break;
            
            case '(immediate16)':
                // Note: This should be handled in executeLoad for proper 8/16-bit handling
                throw new Error('(immediate16) should be handled in executeLoad');
            
            default:
                throw new Error(`Cannot set value for operand: ${operand}`);
        }
    }
    
    /**
     * Evaluate a conditional expression
     * @param {string} condition - Condition string (e.g., "NZ", "Z", "C", "NC")
     * @returns {boolean} True if condition is met
     */
    evaluateCondition(condition) {
        switch (condition) {
            case 'NZ': return this.cpu.getFlag(FLAG_Z) === 0;
            case 'Z':  return this.cpu.getFlag(FLAG_Z) === 1;
            case 'NC': return this.cpu.getFlag(FLAG_C) === 0;
            case 'C':  return this.cpu.getFlag(FLAG_C) === 1;
            case 'PO': return this.cpu.getFlag(FLAG_PV) === 0;
            case 'PE': return this.cpu.getFlag(FLAG_PV) === 1;
            case 'P':  return this.cpu.getFlag(FLAG_S) === 0;
            case 'M':  return this.cpu.getFlag(FLAG_S) === 1;
            default:
                throw new Error(`Unknown condition: ${condition}`);
        }
    }
    
    /**
     * Update CPU flags based on operation result
     * @param {number} result - Result value (8-bit)
     * @param {object} flagDef - Flag definition from JSON
     * @param {boolean} halfCarry - Half carry occurred
     * @param {boolean} overflow - Overflow occurred
     * @param {boolean} isSubtract - Is subtract operation
     * @param {boolean} carry - Carry/borrow occurred
     */
    updateFlags(result, flagDef, halfCarry = false, overflow = false, isSubtract = false, carry = false) {
        // Sign flag
        if (flagDef.S === '1') {
            this.cpu.setFlag(FLAG_S, (result & 0x80) !== 0);
        } else if (flagDef.S === '0') {
            this.cpu.setFlag(FLAG_S, 0);
        }
        
        // Zero flag
        if (flagDef.Z === '1') {
            this.cpu.setFlag(FLAG_Z, (result & 0xFF) === 0);
        } else if (flagDef.Z === '0') {
            this.cpu.setFlag(FLAG_Z, 0);
        }
        
        // Half carry flag
        if (flagDef.H === '1') {
            this.cpu.setFlag(FLAG_H, halfCarry);
        } else if (flagDef.H === '0') {
            this.cpu.setFlag(FLAG_H, 0);
        }
        
        // Parity/Overflow flag
        if (flagDef.PV === '1') {
            this.cpu.setFlag(FLAG_PV, overflow);
        } else if (flagDef.PV === '0') {
            this.cpu.setFlag(FLAG_PV, 0);
        } else if (flagDef.PV === 'P') {
            // Calculate parity
            let parity = 0;
            let val = result & 0xFF;
            for (let i = 0; i < 8; i++) {
                parity ^= (val & 1);
                val >>= 1;
            }
            this.cpu.setFlag(FLAG_PV, parity === 0);
        }
        
        // Add/Subtract flag
        if (flagDef.N === '1') {
            this.cpu.setFlag(FLAG_N, 1);
        } else if (flagDef.N === '0') {
            this.cpu.setFlag(FLAG_N, 0);
        } else if (flagDef.N === '*') {
            this.cpu.setFlag(FLAG_N, isSubtract);
        }
        
        // Carry flag
        if (flagDef.C === '1') {
            this.cpu.setFlag(FLAG_C, carry);
        } else if (flagDef.C === '0') {
            this.cpu.setFlag(FLAG_C, 0);
        }
        // If flagDef.C === '-', don't modify carry flag
    }
    
    /**
     * Execute rotate/shift instructions (CB prefix 0x00-0x3F)
     * @param {object} op - Operation definition
     * @param {object} flagDef - Flag definitions
     */
    executeRotateShift(op, flagDef) {
        const value = this.getOperandValue(op.operand);
        let result;
        let carry = false;
        
        switch (op.subtype) {
            case 'rlc': // Rotate Left Circular
                result = ((value << 1) | (value >> 7)) & 0xFF;
                carry = (value & 0x80) !== 0;
                break;
                
            case 'rrc': // Rotate Right Circular
                result = ((value >> 1) | (value << 7)) & 0xFF;
                carry = (value & 0x01) !== 0;
                break;
                
            case 'rl': // Rotate Left through Carry
                carry = (value & 0x80) !== 0;
                result = ((value << 1) | (this.cpu.getFlag(FLAG_C) ? 1 : 0)) & 0xFF;
                break;
                
            case 'rr': // Rotate Right through Carry
                carry = (value & 0x01) !== 0;
                result = ((value >> 1) | (this.cpu.getFlag(FLAG_C) ? 0x80 : 0)) & 0xFF;
                break;
                
            case 'sla': // Shift Left Arithmetic
                carry = (value & 0x80) !== 0;
                result = (value << 1) & 0xFF;
                break;
                
            case 'sra': // Shift Right Arithmetic (preserve sign bit)
                carry = (value & 0x01) !== 0;
                result = ((value >> 1) | (value & 0x80)) & 0xFF;
                break;
                
            case 'sll': // Shift Left Logical (undocumented - set bit 0)
                carry = (value & 0x80) !== 0;
                result = ((value << 1) | 0x01) & 0xFF;
                break;
                
            case 'srl': // Shift Right Logical
                carry = (value & 0x01) !== 0;
                result = (value >> 1) & 0xFF;
                break;
                
            default:
                throw new Error(`Unknown rotate/shift subtype: ${op.subtype}`);
        }
        
        this.setOperandValue(op.operand, result);
        this.updateFlags(result, flagDef, false, this.calculateParity(result), false, carry);
    }
    
    /**
     * Execute bit test instructions (CB prefix 0x40-0x7F)
     * @param {object} op - Operation definition
     * @param {object} flagDef - Flag definitions
     */
    executeBitTest(op, flagDef) {
        const value = this.getOperandValue(op.operand);
        const bitMask = 1 << op.bit;
        const bitValue = (value & bitMask) !== 0;
        
        // Z flag is inverse of bit value (Z=1 if bit is 0)
        this.cpu.setFlag(FLAG_Z, !bitValue);
        
        // H flag is always set for BIT
        this.cpu.setFlag(FLAG_H, 1);
        
        // N flag is always reset for BIT
        this.cpu.setFlag(FLAG_N, 0);
        
        // S flag reflects bit 7 if testing bit 7, otherwise depends on bit
        if (op.bit === 7) {
            this.cpu.setFlag(FLAG_S, bitValue);
        } else {
            this.cpu.setFlag(FLAG_S, (value & 0x80) !== 0);
        }
        
        // PV flag same as Z for BIT instruction
        this.cpu.setFlag(FLAG_PV, !bitValue);
        
        // C flag is not affected
    }
    
    /**
     * Execute bit set/reset instructions (CB prefix 0x80-0xFF)
     * @param {object} op - Operation definition
     * @param {object} flagDef - Flag definitions
     */
    executeBitModify(op, flagDef) {
        const value = this.getOperandValue(op.operand);
        const bitMask = 1 << op.bit;
        let result;
        
        if (op.subtype === 'set') {
            // SET: Set bit to 1
            result = value | bitMask;
        } else if (op.subtype === 'res') {
            // RES: Reset bit to 0
            result = value & ~bitMask;
        } else {
            throw new Error(`Unknown bit modify subtype: ${op.subtype}`);
        }
        
        this.setOperandValue(op.operand, result);
        // SET and RES don't affect any flags
    }
    
    /**
     * Update flags for 16-bit operations
     * @param {number} result - Result value (16-bit)
     * @param {object} flagDef - Flag definition from JSON
     * @param {boolean} halfCarry - Half carry occurred
     * @param {boolean} overflow - Overflow occurred
     * @param {boolean} isSubtract - Is subtract operation
     * @param {boolean} carry - Carry/borrow occurred
     */
    updateFlags16(result, flagDef, halfCarry = false, overflow = false, isSubtract = false, carry = false) {
        // For 16-bit operations, S and Z are based on the 16-bit result
        if (flagDef.S === '1') {
            this.cpu.setFlag(FLAG_S, (result & 0x8000) !== 0);
        }
        
        if (flagDef.Z === '1') {
            this.cpu.setFlag(FLAG_Z, (result & 0xFFFF) === 0);
        }
        
        if (flagDef.H === '1') {
            this.cpu.setFlag(FLAG_H, halfCarry);
        } else if (flagDef.H === '0') {
            this.cpu.setFlag(FLAG_H, 0);
        }
        
        if (flagDef.PV === '1') {
            this.cpu.setFlag(FLAG_PV, overflow);
        } else if (flagDef.PV === '0') {
            this.cpu.setFlag(FLAG_PV, 0);
        }
        
        if (flagDef.N === '1') {
            this.cpu.setFlag(FLAG_N, 1);
        } else if (flagDef.N === '0') {
            this.cpu.setFlag(FLAG_N, 0);
        }
        
        if (flagDef.C === '1') {
            this.cpu.setFlag(FLAG_C, carry);
        } else if (flagDef.C === '0') {
            this.cpu.setFlag(FLAG_C, 0);
        }
    }
    
    /**
     * Execute block transfer/compare instructions (ED prefix)
     * @param {object} op - Operation definition
     * @param {object} flagDef - Flag definitions
     */
    executeBlock(op, flagDef) {
        switch (op.subtype) {
            case 'ldi': {
                // LDI: (DE) ← (HL), DE++, HL++, BC--
                const value = this.cpu.readByte(this.cpu.HL);
                this.cpu.writeByte(this.cpu.DE, value);
                this.cpu.HL = (this.cpu.HL + 1) & 0xFFFF;
                this.cpu.DE = (this.cpu.DE + 1) & 0xFFFF;
                this.cpu.BC = (this.cpu.BC - 1) & 0xFFFF;
                
                this.cpu.setFlag(FLAG_H, 0);
                this.cpu.setFlag(FLAG_PV, this.cpu.BC !== 0);
                this.cpu.setFlag(FLAG_N, 0);
                break;
            }
            
            case 'ldir': {
                // LDIR: Repeat LDI until BC = 0
                do {
                    const value = this.cpu.readByte(this.cpu.HL);
                    this.cpu.writeByte(this.cpu.DE, value);
                    this.cpu.HL = (this.cpu.HL + 1) & 0xFFFF;
                    this.cpu.DE = (this.cpu.DE + 1) & 0xFFFF;
                    this.cpu.BC = (this.cpu.BC - 1) & 0xFFFF;
                } while (this.cpu.BC !== 0);
                
                this.cpu.setFlag(FLAG_H, 0);
                this.cpu.setFlag(FLAG_PV, 0); // BC is 0 after LDIR
                this.cpu.setFlag(FLAG_N, 0);
                break;
            }
            
            case 'ldd': {
                // LDD: (DE) ← (HL), DE--, HL--, BC--
                const value = this.cpu.readByte(this.cpu.HL);
                this.cpu.writeByte(this.cpu.DE, value);
                this.cpu.HL = (this.cpu.HL - 1) & 0xFFFF;
                this.cpu.DE = (this.cpu.DE - 1) & 0xFFFF;
                this.cpu.BC = (this.cpu.BC - 1) & 0xFFFF;
                
                this.cpu.setFlag(FLAG_H, 0);
                this.cpu.setFlag(FLAG_PV, this.cpu.BC !== 0);
                this.cpu.setFlag(FLAG_N, 0);
                break;
            }
            
            case 'lddr': {
                // LDDR: Repeat LDD until BC = 0
                do {
                    const value = this.cpu.readByte(this.cpu.HL);
                    this.cpu.writeByte(this.cpu.DE, value);
                    this.cpu.HL = (this.cpu.HL - 1) & 0xFFFF;
                    this.cpu.DE = (this.cpu.DE - 1) & 0xFFFF;
                    this.cpu.BC = (this.cpu.BC - 1) & 0xFFFF;
                } while (this.cpu.BC !== 0);
                
                this.cpu.setFlag(FLAG_H, 0);
                this.cpu.setFlag(FLAG_PV, 0);
                this.cpu.setFlag(FLAG_N, 0);
                break;
            }
            
            case 'cpi': {
                // CPI: CP (HL), HL++, BC--
                const value = this.cpu.readByte(this.cpu.HL);
                const diff = (this.cpu.A - value) & 0xFF;
                
                this.cpu.HL = (this.cpu.HL + 1) & 0xFFFF;
                this.cpu.BC = (this.cpu.BC - 1) & 0xFFFF;
                
                this.cpu.setFlag(FLAG_S, (diff & 0x80) !== 0);
                this.cpu.setFlag(FLAG_Z, diff === 0);
                this.cpu.setFlag(FLAG_H, (this.cpu.A & 0x0F) < (value & 0x0F));
                this.cpu.setFlag(FLAG_PV, this.cpu.BC !== 0);
                this.cpu.setFlag(FLAG_N, 1);
                break;
            }
            
            case 'cpir': {
                // CPIR: Repeat CPI until BC = 0 or Z = 1
                let diff;
                do {
                    const value = this.cpu.readByte(this.cpu.HL);
                    diff = (this.cpu.A - value) & 0xFF;
                    
                    this.cpu.HL = (this.cpu.HL + 1) & 0xFFFF;
                    this.cpu.BC = (this.cpu.BC - 1) & 0xFFFF;
                    
                    if (diff === 0) break; // Found match
                } while (this.cpu.BC !== 0);
                
                this.cpu.setFlag(FLAG_S, (diff & 0x80) !== 0);
                this.cpu.setFlag(FLAG_Z, diff === 0);
                this.cpu.setFlag(FLAG_PV, this.cpu.BC !== 0);
                this.cpu.setFlag(FLAG_N, 1);
                break;
            }
            
            case 'cpd': {
                // CPD: CP (HL), HL--, BC--
                const value = this.cpu.readByte(this.cpu.HL);
                const diff = (this.cpu.A - value) & 0xFF;
                
                this.cpu.HL = (this.cpu.HL - 1) & 0xFFFF;
                this.cpu.BC = (this.cpu.BC - 1) & 0xFFFF;
                
                this.cpu.setFlag(FLAG_S, (diff & 0x80) !== 0);
                this.cpu.setFlag(FLAG_Z, diff === 0);
                this.cpu.setFlag(FLAG_H, (this.cpu.A & 0x0F) < (value & 0x0F));
                this.cpu.setFlag(FLAG_PV, this.cpu.BC !== 0);
                this.cpu.setFlag(FLAG_N, 1);
                break;
            }
            
            case 'cpdr': {
                // CPDR: Repeat CPD until BC = 0 or Z = 1
                let diff;
                do {
                    const value = this.cpu.readByte(this.cpu.HL);
                    diff = (this.cpu.A - value) & 0xFF;
                    
                    this.cpu.HL = (this.cpu.HL - 1) & 0xFFFF;
                    this.cpu.BC = (this.cpu.BC - 1) & 0xFFFF;
                    
                    if (diff === 0) break; // Found match
                } while (this.cpu.BC !== 0);
                
                this.cpu.setFlag(FLAG_S, (diff & 0x80) !== 0);
                this.cpu.setFlag(FLAG_Z, diff === 0);
                this.cpu.setFlag(FLAG_PV, this.cpu.BC !== 0);
                this.cpu.setFlag(FLAG_N, 1);
                break;
            }
            
            default:
                throw new Error(`Unknown block subtype: ${op.subtype}`);
        }
    }
}
