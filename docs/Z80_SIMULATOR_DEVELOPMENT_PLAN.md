# Z80 Microprocessor Simulator - Detailed Development Plan

## Project Overview
A browser-based Z80 microprocessor simulator that emulates the complete Z80 instruction set at the instruction level. The simulator provides visual feedback for all registers, flags, buses, and memory, with interactive controls for debugging and program execution.

---

## Architecture Summary

### Core Components
1. **CPU Emulator** (`cpu.js`) - Full Z80 register set, flag logic, instruction decode/execute
2. **Memory System** (`memory.js`) - 64KB flat address space with loader
3. **Instruction Executor** (`instruction_executor.js`) - Generic execution engine that interprets JSON opcode definitions
4. **Opcode Manager** (`opcode_loader.js`) - Loads and manages JSON opcode databases
5. **JSON Opcode Databases** (`opcodes_*.json`) - Data-driven instruction definitions for all prefixes
6. **User Interface** (`ui.js`) - Visual display of CPU state, registers, flags, buses, memory
7. **Main Controller** (`main.js`) - Simulation loop, speed control, file input orchestration
8. **HTML/CSS** (`index.html`, `styles.css`) - Layout and styling

---

## Phase 1: Project Setup and Scaffolding

### 1.1 Create File Structure (JSON-Based Architecture)
Create all necessary files with basic module structure:

**Core Application Files:**
- `index.html` - Basic HTML5 structure with UI panels
- `styles.css` - Empty stylesheet ready for styling
- `main.js` - ES6 module entry point

**JavaScript Modules:**
- `cpu.js` - CPU class skeleton
- `memory.js` - Memory module with Uint8Array
- `ui.js` - UI rendering functions
- `instruction_executor.js` - Generic execution engine
- `opcode_loader.js` - JSON loader and opcode manager

**JSON Opcode Databases:**
- `opcodes_unprefixed.json` - 252 root instructions
- `opcodes_cb.json` - 256 CB-prefixed instructions
- `opcodes_ed.json` - ~60 ED-prefixed instructions
- `opcodes_ddfd.json` - IX/IY instructions (DD and FD prefixes)

### 1.2 Define Module Interfaces
Establish clear APIs between modules:
- **CPU exports:** `CPU` class with `step()`, `reset()`, state properties
- **Memory exports:** `createMemory()`, `readByte()`, `writeByte()`, `loadMemoryMapFromText()`
- **UI exports:** `initUI()`, `updateRegisters()`, `updateFlags()`, `updateBuses()`, `updateMemory()`
- **InstructionExecutor exports:** `InstructionExecutor` class with `execute(opcodeDef)` method
- **OpcodeManager exports:** `OpcodeManager` class with `loadAll()`, `getInstruction()`, `findByMnemonic()` methods

---

## Phase 2: Memory System Implementation

### 2.1 Core Memory Functions
**File:** `memory.js`

```javascript
export function createMemory() {
  return new Uint8Array(65536);
}

export function readByte(memory, address) {
  return memory[address & 0xFFFF];
}

export function writeByte(memory, address, value) {
  memory[address & 0xFFFF] = value & 0xFF;
}
```

### 2.2 Memory Map Loader
Implement parser for text format:
- Format: `<decimal_address> <hex_byte>`
- Skip blank lines and malformed entries
- Support comments with `#` or `;`
- Return load statistics (bytes loaded, errors)

```javascript
export function loadMemoryMapFromText(memory, text) {
  const lines = text.split('\n');
  let loaded = 0, errors = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    
    const match = trimmed.match(/^(\d+)\s+([0-9A-Fa-f]{2})$/);
    if (match) {
      const addr = parseInt(match[1], 10);
      const byte = parseInt(match[2], 16);
      if (addr >= 0 && addr <= 65535) {
        memory[addr] = byte;
        loaded++;
      } else {
        errors++;
      }
    } else {
      errors++;
    }
  }
  
  return { loaded, errors };
}
```

### 2.3 Memory Testing
Test with sample ROM provided in spec:
```
0 3E
1 00
2 3C
3 18
4 FE
5 76
```

---

## Phase 3: CPU Core Implementation

### 3.1 Register Architecture
**File:** `cpu.js`

Implement all Z80 registers:

```javascript
class CPU {
  constructor(memory) {
    this.memory = memory;
    
    // Main register set
    this.a = 0; this.f = 0;
    this.b = 0; this.c = 0;
    this.d = 0; this.e = 0;
    this.h = 0; this.l = 0;
    
    // Alternate register set
    this.a_ = 0; this.f_ = 0;
    this.b_ = 0; this.c_ = 0;
    this.d_ = 0; this.e_ = 0;
    this.h_ = 0; this.l_ = 0;
    
    // Index registers
    this.ix = 0;
    this.iy = 0;
    
    // Special registers
    this.pc = 0;
    this.sp = 0xFFFF;
    this.i = 0;
    this.r = 0;
    
    // State flags
    this.halted = false;
    this.iff1 = false; // Interrupt enable flag 1
    this.iff2 = false; // Interrupt enable flag 2
    this.interruptMode = 0;
    
    // Bus monitor
    this.currentAddressBus = 0;
    this.currentDataBus = 0;
    
    // Cycle counting
    this.tStates = 0;
  }
  
  // 16-bit register pair getters/setters
  get af() { return (this.a << 8) | this.f; }
  set af(v) { this.a = (v >> 8) & 0xFF; this.f = v & 0xFF; }
  
  get bc() { return (this.b << 8) | this.c; }
  set bc(v) { this.b = (v >> 8) & 0xFF; this.c = v & 0xFF; }
  
  get de() { return (this.d << 8) | this.e; }
  set de(v) { this.d = (v >> 8) & 0xFF; this.e = v & 0xFF; }
  
  get hl() { return (this.h << 8) | this.l; }
  set hl(v) { this.h = (v >> 8) & 0xFF; this.l = v & 0xFF; }
}
```

### 3.2 Flag Management
**Flag Constants:**
```javascript
const FLAG_C  = 0x01;  // Carry
const FLAG_N  = 0x02;  // Add/Subtract
const FLAG_PV = 0x04;  // Parity/Overflow
const FLAG_H  = 0x10;  // Half Carry
const FLAG_Z  = 0x40;  // Zero
const FLAG_S  = 0x80;  // Sign
```

**Flag Methods:**
```javascript
getFlag(mask) {
  return (this.f & mask) !== 0 ? 1 : 0;
}

setFlag(mask, value) {
  if (value) {
    this.f |= mask;
  } else {
    this.f &= ~mask;
  }
}

setFlagsZSP(value) {
  this.setFlag(FLAG_Z, (value & 0xFF) === 0);
  this.setFlag(FLAG_S, (value & 0x80) !== 0);
  this.setFlag(FLAG_PV, this.calculateParity(value));
}

calculateParity(value) {
  let bits = value & 0xFF;
  let count = 0;
  for (let i = 0; i < 8; i++) {
    count += bits & 1;
    bits >>= 1;
  }
  return (count & 1) === 0; // Even parity
}
```

### 3.3 Memory Access with Bus Monitoring
```javascript
readByte(addr) {
  this.currentAddressBus = addr & 0xFFFF;
  this.currentDataBus = this.memory[this.currentAddressBus];
  return this.currentDataBus;
}

writeByte(addr, value) {
  this.currentAddressBus = addr & 0xFFFF;
  this.currentDataBus = value & 0xFF;
  this.memory[this.currentAddressBus] = this.currentDataBus;
}

readWord(addr) {
  const lo = this.readByte(addr);
  const hi = this.readByte((addr + 1) & 0xFFFF);
  return (hi << 8) | lo;
}

writeWord(addr, value) {
  this.writeByte(addr, value & 0xFF);
  this.writeByte((addr + 1) & 0xFFFF, (value >> 8) & 0xFF);
}
```

### 3.4 Instruction Fetch/Decode/Execute
```javascript
fetchByte() {
  const byte = this.readByte(this.pc);
  this.pc = (this.pc + 1) & 0xFFFF;
  this.r = (this.r + 1) & 0x7F; // R register increments on each fetch
  return byte;
}

step() {
  if (this.halted) return;
  
  const opcode = this.fetchByte();
  const instruction = UNPREFIXED_TABLE[opcode];
  
  if (instruction && instruction.execute) {
    instruction.execute(this);
    this.tStates += instruction.cycles;
  } else {
    console.warn(`Unknown opcode: 0x${opcode.toString(16).toUpperCase()}`);
  }
}

reset() {
  this.a = this.f = 0;
  this.b = this.c = 0;
  this.d = this.e = 0;
  this.h = this.l = 0;
  this.a_ = this.f_ = 0;
  this.b_ = this.c_ = 0;
  this.d_ = this.e_ = 0;
  this.h_ = this.l_ = 0;
  this.ix = this.iy = 0;
  this.pc = 0;
  this.sp = 0xFFFF;
  this.i = this.r = 0;
  this.halted = false;
  this.iff1 = this.iff2 = false;
  this.interruptMode = 0;
  this.tStates = 0;
  this.currentAddressBus = 0;
  this.currentDataBus = 0;
}
```

---

## Phase 4: Instruction Set Implementation

### 4.1 JSON-Based Opcode Database Architecture

**Key Innovation:** Store all opcode definitions in JSON files with standardized operation descriptors. Use a generic execution engine that interprets these definitions, eliminating the need to write individual handlers for each instruction.

#### 4.1.1 JSON Opcode Definition Format

**File Structure:**
- `opcodes_unprefixed.json` - 252 root instructions
- `opcodes_cb.json` - 256 bit/shift/rotate instructions
- `opcodes_ed.json` - ~60 extended instructions
- `opcodes_ddfd.json` - IX/IY index register instructions

**JSON Schema:**
```json
{
  "0x3E": {
    "opcode": "0x3E",
    "mnemonic": "LD A,n",
    "bytes": 2,
    "cycles": 7,
    "operands": ["A", "n"],
    "operation": {
      "type": "load",
      "destination": "A",
      "source": "immediate",
      "size": 8
    },
    "flags": {
      "S": "-",
      "Z": "-",
      "H": "-",
      "PV": "-",
      "N": "-",
      "C": "-"
    },
    "description": "Load 8-bit immediate value into register A"
  },
  "0x3C": {
    "opcode": "0x3C",
    "mnemonic": "INC A",
    "bytes": 1,
    "cycles": 4,
    "operands": ["A"],
    "operation": {
      "type": "arithmetic",
      "operator": "inc",
      "target": "A",
      "size": 8
    },
    "flags": {
      "S": "result",
      "Z": "result",
      "H": "half_carry",
      "PV": "overflow",
      "N": "0",
      "C": "-"
    },
    "description": "Increment register A by 1"
  },
  "0x80": {
    "opcode": "0x80",
    "mnemonic": "ADD A,B",
    "bytes": 1,
    "cycles": 4,
    "operands": ["A", "B"],
    "operation": {
      "type": "arithmetic",
      "operator": "add",
      "destination": "A",
      "source": "B",
      "size": 8
    },
    "flags": {
      "S": "result",
      "Z": "result",
      "H": "half_carry",
      "PV": "overflow",
      "N": "0",
      "C": "carry"
    },
    "description": "Add register B to A"
  }
}
```

#### 4.1.2 Operation Type Categories

**Standardized Operation Types:**

1. **`load`** - Data transfer operations
   - `LD r,r'`, `LD r,n`, `LD r,(HL)`, etc.
   - Source/destination can be: register, immediate, memory, stack

2. **`arithmetic`** - Math operations
   - Operators: `add`, `adc`, `sub`, `sbc`, `inc`, `dec`
   - Auto-computes flags based on operation type

3. **`logical`** - Bitwise operations
   - Operators: `and`, `or`, `xor`, `cp` (compare)
   - Auto-computes flags

4. **`rotate_shift`** - Bit manipulation
   - Operators: `rlc`, `rrc`, `rl`, `rr`, `sla`, `sra`, `srl`
   - Affects carry flag

5. **`bit`** - Bit test/set/reset (CB prefix)
   - Operators: `bit`, `set`, `res`
   - `bit` parameter specifies bit number (0-7)

6. **`jump`** - Control flow
   - `jp`, `jr`, `call`, `ret`, `rst`
   - Conditional and unconditional variants

7. **`stack`** - Stack operations
   - `push`, `pop`

8. **`block`** - Block operations (ED prefix)
   - `ldi`, `ldir`, `ldd`, `lddr`, `cpi`, `cpir`, etc.

9. **`exchange`** - Register swapping
   - `ex`, `exx`

10. **`special`** - Unique instructions
    - `daa`, `cpl`, `scf`, `ccf`, `halt`, `nop`, `di`, `ei`, `neg`, `rld`, `rrd`

#### 4.1.3 Generic Execution Engine

**File:** `instruction_executor.js`

```javascript
export class InstructionExecutor {
  constructor(cpu) {
    this.cpu = cpu;
  }
  
  execute(opcodeDef) {
    const op = opcodeDef.operation;
    
    switch(op.type) {
      case 'load':
        this.executeLoad(op, opcodeDef.flags);
        break;
      case 'arithmetic':
        this.executeArithmetic(op, opcodeDef.flags);
        break;
      case 'logical':
        this.executeLogical(op, opcodeDef.flags);
        break;
      case 'rotate_shift':
        this.executeRotateShift(op, opcodeDef.flags);
        break;
      case 'bit':
        this.executeBit(op, opcodeDef.flags);
        break;
      case 'jump':
        this.executeJump(op, opcodeDef);
        break;
      case 'stack':
        this.executeStack(op);
        break;
      case 'block':
        this.executeBlock(op, opcodeDef.flags);
        break;
      case 'exchange':
        this.executeExchange(op);
        break;
      case 'special':
        this.executeSpecial(op, opcodeDef.flags);
        break;
      default:
        console.warn(`Unknown operation type: ${op.type}`);
    }
  }
  
  executeLoad(op, flagDef) {
    const value = this.getOperandValue(op.source);
    this.setOperandValue(op.destination, value);
    // Most loads don't affect flags
  }
  
  executeArithmetic(op, flagDef) {
    const target = this.getOperandValue(op.target || op.destination);
    const source = op.source ? this.getOperandValue(op.source) : 0;
    let result, halfCarry, overflow, carry;
    
    switch(op.operator) {
      case 'add':
        result = target + source;
        halfCarry = ((target & 0x0F) + (source & 0x0F)) > 0x0F;
        overflow = ((target ^ result) & (source ^ result) & 0x80) !== 0;
        carry = result > 0xFF;
        break;
      case 'adc':
        const carryIn = this.cpu.getFlag(FLAG_C);
        result = target + source + carryIn;
        halfCarry = ((target & 0x0F) + (source & 0x0F) + carryIn) > 0x0F;
        overflow = ((target ^ result) & (source ^ result) & 0x80) !== 0;
        carry = result > 0xFF;
        break;
      case 'sub':
        result = target - source;
        halfCarry = (target & 0x0F) < (source & 0x0F);
        overflow = ((target ^ source) & (target ^ result) & 0x80) !== 0;
        carry = target < source;
        break;
      case 'inc':
        result = target + 1;
        halfCarry = (target & 0x0F) === 0x0F;
        overflow = target === 0x7F;
        carry = null; // INC doesn't affect carry
        break;
      case 'dec':
        result = target - 1;
        halfCarry = (target & 0x0F) === 0;
        overflow = target === 0x80;
        carry = null; // DEC doesn't affect carry
        break;
    }
    
    result &= 0xFF;
    this.setOperandValue(op.destination || op.target, result);
    this.updateFlags(result, flagDef, halfCarry, overflow, carry);
  }
  
  getOperandValue(operand) {
    if (typeof operand === 'string') {
      if (operand === 'immediate' || operand === 'n') {
        return this.cpu.fetchByte();
      } else if (operand === 'immediate16' || operand === 'nn') {
        return this.cpu.fetchWord();
      } else if (operand.match(/^\(.*\)$/)) {
        // Memory access like (HL), (BC), (nn)
        const addr = this.resolveAddress(operand);
        return this.cpu.readByte(addr);
      } else {
        // Register access
        return this.cpu[operand.toLowerCase()];
      }
    }
    return operand; // Literal value
  }
  
  setOperandValue(operand, value) {
    if (operand.match(/^\(.*\)$/)) {
      const addr = this.resolveAddress(operand);
      this.cpu.writeByte(addr, value);
    } else {
      this.cpu[operand.toLowerCase()] = value & (operand.length > 1 ? 0xFFFF : 0xFF);
    }
  }
  
  updateFlags(result, flagDef, halfCarry, overflow, carry) {
    if (flagDef.S === 'result') {
      this.cpu.setFlag(FLAG_S, (result & 0x80) !== 0);
    } else if (flagDef.S === '0') {
      this.cpu.setFlag(FLAG_S, false);
    }
    
    if (flagDef.Z === 'result') {
      this.cpu.setFlag(FLAG_Z, (result & 0xFF) === 0);
    } else if (flagDef.Z === '0') {
      this.cpu.setFlag(FLAG_Z, false);
    }
    
    if (flagDef.H === 'half_carry' && halfCarry !== null) {
      this.cpu.setFlag(FLAG_H, halfCarry);
    } else if (flagDef.H === '0') {
      this.cpu.setFlag(FLAG_H, false);
    }
    
    if (flagDef.PV === 'overflow' && overflow !== null) {
      this.cpu.setFlag(FLAG_PV, overflow);
    } else if (flagDef.PV === 'parity') {
      this.cpu.setFlag(FLAG_PV, this.cpu.calculateParity(result));
    } else if (flagDef.PV === '0') {
      this.cpu.setFlag(FLAG_PV, false);
    }
    
    if (flagDef.N === '0') {
      this.cpu.setFlag(FLAG_N, false);
    } else if (flagDef.N === '1') {
      this.cpu.setFlag(FLAG_N, true);
    }
    
    if (flagDef.C === 'carry' && carry !== null) {
      this.cpu.setFlag(FLAG_C, carry);
    } else if (flagDef.C === '0') {
      this.cpu.setFlag(FLAG_C, false);
    }
    // '-' means unchanged, don't modify
  }
  
  // Additional execution methods...
}
```

#### 4.1.4 JSON Opcode Loader

**File:** `opcode_loader.js`

```javascript
export class OpcodeManager {
  constructor() {
    this.unprefixed = null;
    this.cb = null;
    this.ed = null;
    this.dd = null;
    this.fd = null;
  }
  
  async loadAll() {
    const [unprefixed, cb, ed, ddfd] = await Promise.all([
      fetch('opcodes_unprefixed.json').then(r => r.json()),
      fetch('opcodes_cb.json').then(r => r.json()),
      fetch('opcodes_ed.json').then(r => r.json()),
      fetch('opcodes_ddfd.json').then(r => r.json())
    ]);
    
    this.unprefixed = this.buildLookupTable(unprefixed);
    this.cb = this.buildLookupTable(cb);
    this.ed = this.buildLookupTable(ed);
    this.dd = this.buildLookupTable(ddfd.dd);
    this.fd = this.buildLookupTable(ddfd.fd);
  }
  
  buildLookupTable(jsonObj) {
    const table = new Array(256);
    for (const [key, value] of Object.entries(jsonObj)) {
      const opcode = parseInt(key, 16);
      table[opcode] = value;
    }
    return table;
  }
  
  getInstruction(prefix, opcode) {
    switch(prefix) {
      case null:
        return this.unprefixed[opcode];
      case 0xCB:
        return this.cb[opcode];
      case 0xED:
        return this.ed[opcode];
      case 0xDD:
        return this.dd[opcode];
      case 0xFD:
        return this.fd[opcode];
      default:
        return null;
    }
  }
  
  // Reverse lookup: find opcode by mnemonic
  findByMnemonic(mnemonic, prefix = null) {
    const table = prefix === null ? this.unprefixed :
                  prefix === 0xCB ? this.cb :
                  prefix === 0xED ? this.ed :
                  prefix === 0xDD ? this.dd :
                  this.fd;
    
    return table.find(inst => inst && inst.mnemonic === mnemonic);
  }
}
```

#### 4.1.5 Updated CPU Step Function

```javascript
step() {
  if (this.halted) return;
  
  const opcode = this.fetchByte();
  let instruction;
  
  // Handle prefixes
  if (opcode === 0xCB) {
    const nextOpcode = this.fetchByte();
    instruction = this.opcodeManager.getInstruction(0xCB, nextOpcode);
  } else if (opcode === 0xED) {
    const nextOpcode = this.fetchByte();
    instruction = this.opcodeManager.getInstruction(0xED, nextOpcode);
  } else if (opcode === 0xDD) {
    const nextOpcode = this.fetchByte();
    instruction = this.opcodeManager.getInstruction(0xDD, nextOpcode);
  } else if (opcode === 0xFD) {
    const nextOpcode = this.fetchByte();
    instruction = this.opcodeManager.getInstruction(0xFD, nextOpcode);
  } else {
    instruction = this.opcodeManager.getInstruction(null, opcode);
  }
  
  if (instruction) {
    this.executor.execute(instruction);
    this.tStates += instruction.cycles;
  } else {
    console.warn(`Unknown opcode: 0x${opcode.toString(16).toUpperCase()}`);
  }
}
```

### 4.2 JSON Database Population Strategy

#### Priority 1: Core Instructions (Minimal Working Set)
**Target:** Get sample ROM running (LD, INC, JR, HALT)

Create `opcodes_unprefixed.json` with these 5 entries first:

```json
{
  "0x00": {
    "opcode": "0x00",
    "mnemonic": "NOP",
    "bytes": 1,
    "cycles": 4,
    "operands": [],
    "operation": {
      "type": "special",
      "operator": "nop"
    },
    "flags": {
      "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-"
    },
    "description": "No operation"
  },
  "0x3E": {
    "opcode": "0x3E",
    "mnemonic": "LD A,n",
    "bytes": 2,
    "cycles": 7,
    "operands": ["A", "n"],
    "operation": {
      "type": "load",
      "destination": "A",
      "source": "immediate",
      "size": 8
    },
    "flags": {
      "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-"
    },
    "description": "Load 8-bit immediate value into register A"
  },
  "0x3C": {
    "opcode": "0x3C",
    "mnemonic": "INC A",
    "bytes": 1,
    "cycles": 4,
    "operands": ["A"],
    "operation": {
      "type": "arithmetic",
      "operator": "inc",
      "target": "A",
      "size": 8
    },
    "flags": {
      "S": "result",
      "Z": "result",
      "H": "half_carry",
      "PV": "overflow",
      "N": "0",
      "C": "-"
    },
    "description": "Increment register A by 1"
  },
  "0x18": {
    "opcode": "0x18",
    "mnemonic": "JR e",
    "bytes": 2,
    "cycles": 12,
    "operands": ["e"],
    "operation": {
      "type": "jump",
      "target": "relative",
      "condition": null,
      "offset_source": "immediate"
    },
    "flags": {
      "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-"
    },
    "description": "Relative jump (unconditional)"
  },
  "0x76": {
    "opcode": "0x76",
    "mnemonic": "HALT",
    "bytes": 1,
    "cycles": 4,
    "operands": [],
    "operation": {
      "type": "special",
      "operator": "halt"
    },
    "flags": {
      "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-"
    },
    "description": "Halt CPU until interrupt"
  }
}
```

#### Priority 2: Pattern-Based JSON Generation

**Key Advantage:** Many Z80 instructions follow patterns, allowing programmatic generation of JSON entries.

**Example: 8-bit Load Instructions (0x40-0x7F)**

All `LD r,r'` instructions (register-to-register transfers) can be generated with a script:

```javascript
// generate_ld_instructions.js
const registers = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];
const opcodes = {};

for (let dst = 0; dst < 8; dst++) {
  for (let src = 0; src < 8; src++) {
    const opcode = 0x40 + (dst * 8) + src;
    
    if (opcode === 0x76) {
      // HALT instruction - already defined
      continue;
    }
    
    const destReg = registers[dst];
    const srcReg = registers[src];
    const hexOpcode = `0x${opcode.toString(16).toUpperCase()}`;
    
    opcodes[hexOpcode] = {
      opcode: hexOpcode,
      mnemonic: `LD ${destReg},${srcReg}`,
      bytes: 1,
      cycles: destReg === '(HL)' || srcReg === '(HL)' ? 7 : 4,
      operands: [destReg, srcReg],
      operation: {
        type: "load",
        destination: destReg,
        source: srcReg,
        size: 8
      },
      flags: {
        S: "-", Z: "-", H: "-", PV: "-", N: "-", C: "-"
      },
      description: `Load ${srcReg} into ${destReg}`
    };
  }
}

console.log(JSON.stringify(opcodes, null, 2));
```

This generates 63 JSON entries (64 minus HALT) in seconds!

#### Priority 3: 8-bit Arithmetic/Logic (0x80-0xBF)
- **ADD, ADC, SUB, SBC, AND, XOR, OR, CP** with all registers
- Flag computation for each operation
- Half-carry, overflow, sign, zero flags

#### Priority 4: Immediate Operations
- **0x06, 0x0E, 0x16, 0x1E, 0x26, 0x2E, 0x36**: LD r,n
- **0xC6, 0xCE, 0xD6, 0xDE, 0xE6, 0xEE, 0xF6, 0xFE**: ALU A,n

#### Priority 5: 16-bit Operations
- **0x01, 0x11, 0x21, 0x31**: LD rp,nn
- **0x03, 0x13, 0x23, 0x33**: INC rp
- **0x0B, 0x1B, 0x2B, 0x3B**: DEC rp
- **0x09, 0x19, 0x29, 0x39**: ADD HL,rp

#### Priority 6: Stack Operations
- **0xC5, 0xD5, 0xE5, 0xF5**: PUSH rp
- **0xC1, 0xD1, 0xE1, 0xF1**: POP rp
- **0xC9**: RET
- **0xCD**: CALL nn

#### Priority 7: Jump/Call/Return with Conditions
- **0xC0, 0xC8, 0xD0, 0xD8, 0xE0, 0xE8, 0xF0, 0xF8**: RET cc
- **0xC2, 0xCA, 0xD2, 0xDA, 0xE2, 0xEA, 0xF2, 0xFA**: JP cc,nn
- **0xC4, 0xCC, 0xD4, 0xDC, 0xE4, 0xEC, 0xF4, 0xFC**: CALL cc,nn
- **0x20, 0x28, 0x30, 0x38**: JR cc,e

#### Priority 8: Rotate/Shift in Main Table
- **0x07**: RLCA
- **0x0F**: RRCA
- **0x17**: RLA
- **0x1F**: RRA

#### Priority 9: Miscellaneous
- **0x08**: EX AF,AF'
- **0xD9**: EXX
- **0xEB**: EX DE,HL
- **0xE3**: EX (SP),HL
- **0x27**: DAA
- **0x2F**: CPL
- **0x37**: SCF
- **0x3F**: CCF
- **0xF3**: DI
- **0xFB**: EI

### 4.3 CB-Prefixed Instructions (Bit Operations)
**File:** `opcodes_cb.js`

All 256 CB instructions (rotate, shift, bit test/set/reset):

```javascript
// 0xCB dispatcher in unprefixed table
UNPREFIXED_TABLE[0xCB] = {
  mnemonic: "CB_PREFIX",
  bytes: 2,
  cycles: 0, // Variable
  execute(cpu) {
    const opcode = cpu.fetchByte();
    const instruction = CB_TABLE[opcode];
    if (instruction && instruction.execute) {
      instruction.execute(cpu);
      cpu.tStates += instruction.cycles;
    }
  }
};
```

**CB Instruction Categories:**
1. **0x00-0x07**: RLC r
2. **0x08-0x0F**: RRC r
3. **0x10-0x17**: RL r
4. **0x18-0x1F**: RR r
5. **0x20-0x27**: SLA r
6. **0x28-0x2F**: SRA r
7. **0x30-0x37**: SLL r (undocumented)
8. **0x38-0x3F**: SRL r
9. **0x40-0x7F**: BIT b,r
10. **0x80-0xBF**: RES b,r
11. **0xC0-0xFF**: SET b,r

### 4.4 ED-Prefixed Instructions
**File:** `opcodes_ed.js`

ED prefix handles I/O, block operations, and extended 16-bit ops:

**Key ED Instructions:**
1. **Block transfers**: LDI, LDIR, LDD, LDDR
2. **Block compare**: CPI, CPIR, CPD, CPDR
3. **Block I/O**: INI, INIR, IND, INDR, OUTI, OTIR, OUTD, OTDR
4. **16-bit ops**: ADC HL,rp / SBC HL,rp
5. **Extended loads**: LD (nn),rp / LD rp,(nn)
6. **Special**: NEG, RETN, RETI, RLD, RRD, IM n
7. **Register loads**: LD I,A / LD A,I / LD R,A / LD A,R

### 4.5 DD/FD-Prefixed Instructions (IX/IY)
**File:** `opcodes_ddfd.js`

DD prefix → IX operations
FD prefix → IY operations

**Approach:**
1. Most IX/IY instructions mirror HL instructions
2. Use displacement byte for (IX+d) / (IY+d) addressing
3. Implement helper to handle IX/IY register selection

```javascript
// Generic IX/IY handler
function createIndexHandler(useIX) {
  return {
    execute(cpu) {
      const opcode = cpu.fetchByte();
      
      // Handle displacement for indexed memory access
      let displacement = 0;
      if (needsDisplacement(opcode)) {
        displacement = cpu.fetchByte();
        displacement = displacement > 127 ? displacement - 256 : displacement;
      }
      
      // Execute with IX or IY
      const savedHL = cpu.hl;
      if (useIX) {
        cpu.hl = cpu.ix;
      } else {
        cpu.hl = cpu.iy;
      }
      
      // Apply displacement if needed
      // Execute equivalent HL instruction
      
      // Restore
      if (useIX) {
        cpu.ix = cpu.hl;
      } else {
        cpu.iy = cpu.hl;
      }
      cpu.hl = savedHL;
    }
  };
}
```

---

## Phase 5: User Interface Implementation

### 5.1 HTML Layout Structure
**File:** `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Z80 Simulator</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <header>
      <h1>Z80 Microprocessor Simulator</h1>
    </header>
    
    <div class="main-container">
      <!-- Left Panel: Registers and Flags -->
      <div class="left-panel">
        <section class="panel registers-panel">
          <h2>Registers</h2>
          <div id="registers-display"></div>
        </section>
        
        <section class="panel flags-panel">
          <h2>Flags</h2>
          <div id="flags-display"></div>
        </section>
        
        <section class="panel buses-panel">
          <h2>Bus Monitor</h2>
          <div id="bus-display"></div>
        </section>
      </div>
      
      <!-- Center Panel: Memory Viewer -->
      <div class="center-panel">
        <section class="panel memory-panel">
          <h2>Memory</h2>
          <div id="memory-display"></div>
        </section>
      </div>
      
      <!-- Right Panel: Controls -->
      <div class="right-panel">
        <section class="panel controls-panel">
          <h2>Controls</h2>
          <div id="controls">
            <button id="runPauseBtn">Run (Space)</button>
            <button id="stepBtn">Step (S)</button>
            <button id="resetBtn">Reset</button>
            <div class="speed-control">
              <label>Speed:</label>
              <button id="slowDownBtn">- (Slower)</button>
              <span id="speedDisplay">1x</span>
              <button id="speedUpBtn">+ (Faster)</button>
            </div>
            <div class="file-input">
              <label for="memoryFile">Load Program:</label>
              <input type="file" id="memoryFile" accept=".txt,.asm,.z80">
            </div>
          </div>
        </section>
        
        <section class="panel status-panel">
          <h2>Status</h2>
          <div id="status-display">
            <p>State: <span id="cpuState">Stopped</span></p>
            <p>T-States: <span id="tStates">0</span></p>
            <p>Instructions: <span id="instCount">0</span></p>
          </div>
        </section>
      </div>
    </div>
  </div>
  
  <script type="module" src="main.js"></script>
</body>
</html>
```

### 5.2 CSS Styling
**File:** `styles.css`

Design requirements:
- Monospace fonts for all hex/binary displays
- LED-style indicators for flags (red/green)
- Grid/flexbox layout for responsive design
- Highlight active memory address
- Clear visual separation between panels

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #1e1e1e;
  color: #d4d4d4;
}

#app {
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #252526;
  border-radius: 8px;
}

.main-container {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 20px;
}

.panel {
  background: #252526;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.panel h2 {
  margin-bottom: 15px;
  color: #4ec9b0;
  font-size: 18px;
  border-bottom: 1px solid #3e3e42;
  padding-bottom: 8px;
}

/* Monospace displays */
.register-line, .flag-indicator, .bus-line, .memory-line {
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.8;
}

.register-line {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.register-name {
  color: #9cdcfe;
  font-weight: bold;
}

.register-value {
  color: #ce9178;
}

/* Flag LED indicators */
.flag-indicator {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.flag-name {
  width: 80px;
  color: #9cdcfe;
}

.flag-led {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-left: 10px;
  border: 2px solid #3e3e42;
  transition: all 0.2s;
}

.flag-led.on {
  background: #4ec9b0;
  box-shadow: 0 0 10px #4ec9b0;
}

.flag-led.off {
  background: #2d2d30;
}

/* Bus display */
.bus-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #3e3e42;
}

/* Memory viewer */
#memory-display {
  max-height: 600px;
  overflow-y: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
}

.memory-line {
  padding: 2px 0;
}

.memory-line.active {
  background: #094771;
  font-weight: bold;
}

/* Controls */
button {
  background: #0e639c;
  color: white;
  border: none;
  padding: 10px 20px;
  margin: 5px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

button:hover {
  background: #1177bb;
}

button:active {
  background: #0d5a8f;
}

.speed-control {
  margin: 15px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

#speedDisplay {
  min-width: 50px;
  text-align: center;
  color: #4ec9b0;
  font-weight: bold;
}

.file-input {
  margin-top: 20px;
}

.file-input label {
  display: block;
  margin-bottom: 8px;
  color: #9cdcfe;
}

input[type="file"] {
  width: 100%;
  padding: 8px;
  background: #3e3e42;
  color: #d4d4d4;
  border: 1px solid #555;
  border-radius: 4px;
}
```

### 5.3 UI Update Functions
**File:** `ui.js`

```javascript
export function initUI() {
  return {
    registersDiv: document.getElementById('registers-display'),
    flagsDiv: document.getElementById('flags-display'),
    busDiv: document.getElementById('bus-display'),
    memoryDiv: document.getElementById('memory-display'),
    stateSpan: document.getElementById('cpuState'),
    tStatesSpan: document.getElementById('tStates'),
    instCountSpan: document.getElementById('instCount')
  };
}

export function updateRegisters(ui, cpu) {
  const regs = [
    ['A', cpu.a], ['F', cpu.f], ['AF', cpu.af],
    ['B', cpu.b], ['C', cpu.c], ['BC', cpu.bc],
    ['D', cpu.d], ['E', cpu.e], ['DE', cpu.de],
    ['H', cpu.h], ['L', cpu.l], ['HL', cpu.hl],
    ['IX', cpu.ix], ['IY', cpu.iy],
    ['SP', cpu.sp], ['PC', cpu.pc],
    ['I', cpu.i], ['R', cpu.r]
  ];
  
  let html = '';
  for (const [name, value] of regs) {
    const hex = value.toString(16).toUpperCase().padStart(name.length > 1 ? 4 : 2, '0');
    const bits = name.length > 1 ? 16 : 8;
    const binary = value.toString(2).padStart(bits, '0');
    html += `<div class="register-line">
      <span class="register-name">${name}:</span>
      <span class="register-value">${hex}h (${binary}b)</span>
    </div>`;
  }
  
  ui.registersDiv.innerHTML = html;
}

export function updateFlags(ui, cpu) {
  const flags = [
    ['S (Sign)', 0x80],
    ['Z (Zero)', 0x40],
    ['H (Half Carry)', 0x10],
    ['P/V (Parity/Overflow)', 0x04],
    ['N (Add/Subtract)', 0x02],
    ['C (Carry)', 0x01]
  ];
  
  let html = '';
  for (const [name, mask] of flags) {
    const isSet = (cpu.f & mask) !== 0;
    html += `<div class="flag-indicator">
      <span class="flag-name">${name}</span>
      <div class="flag-led ${isSet ? 'on' : 'off'}"></div>
      <span style="margin-left: 10px;">${isSet ? '1' : '0'}</span>
    </div>`;
  }
  
  ui.flagsDiv.innerHTML = html;
}

export function updateBuses(ui, cpu) {
  const addr = cpu.currentAddressBus;
  const data = cpu.currentDataBus;
  
  ui.busDiv.innerHTML = `
    <div class="bus-line">
      <span>Address Bus:</span>
      <span>${addr.toString(16).toUpperCase().padStart(4, '0')}h (${addr.toString(2).padStart(16, '0')}b)</span>
    </div>
    <div class="bus-line">
      <span>Data Bus:</span>
      <span>${data.toString(16).toUpperCase().padStart(2, '0')}h (${data.toString(2).padStart(8, '0')}b)</span>
    </div>
  `;
}

export function updateMemory(ui, cpu, memory, startAddr = 0, lines = 32) {
  let html = '';
  for (let i = 0; i < lines; i++) {
    const addr = (startAddr + i * 16) & 0xFFFF;
    let line = `<div class="memory-line ${addr === cpu.pc ? 'active' : ''}">`;
    line += `${addr.toString(16).toUpperCase().padStart(4, '0')}: `;
    
    for (let j = 0; j < 16; j++) {
      const byte = memory[(addr + j) & 0xFFFF];
      line += byte.toString(16).toUpperCase().padStart(2, '0') + ' ';
    }
    
    line += '</div>';
    html += line;
  }
  
  ui.memoryDiv.innerHTML = html;
}

export function updateStatus(ui, cpu, running, instCount) {
  ui.stateSpan.textContent = cpu.halted ? 'Halted' : (running ? 'Running' : 'Paused');
  ui.tStatesSpan.textContent = cpu.tStates.toString();
  ui.instCountSpan.textContent = instCount.toString();
}

export function render(ui, cpu, memory, running, instCount) {
  updateRegisters(ui, cpu);
  updateFlags(ui, cpu);
  updateBuses(ui, cpu);
  updateMemory(ui, cpu, memory);
  updateStatus(ui, cpu, running, instCount);
}
```

---

## Phase 6: Main Controller and Simulation Loop

### 6.1 Main Controller
**File:** `main.js`

```javascript
import { CPU } from './cpu.js';
import { createMemory, loadMemoryMapFromText } from './memory.js';
import { initUI, render } from './ui.js';

let cpu;
let memory;
let ui;
let running = false;
let instructionCount = 0;
let speed = 1; // Speed multiplier
let stepsPerFrame = 100;

function init() {
  memory = createMemory();
  cpu = new CPU(memory);
  ui = initUI();
  
  setupControls();
  setupKeyboard();
  setupFileInput();
  
  render(ui, cpu, memory, running, instructionCount);
  
  startMainLoop();
}

function startMainLoop() {
  function loop() {
    if (running && !cpu.halted) {
      const steps = stepsPerFrame * speed;
      for (let i = 0; i < steps; i++) {
        cpu.step();
        instructionCount++;
        if (cpu.halted) break;
      }
    }
    
    render(ui, cpu, memory, running, instructionCount);
    requestAnimationFrame(loop);
  }
  
  requestAnimationFrame(loop);
}

function setupControls() {
  document.getElementById('runPauseBtn').addEventListener('click', toggleRunPause);
  document.getElementById('stepBtn').addEventListener('click', step);
  document.getElementById('resetBtn').addEventListener('click', reset);
  document.getElementById('speedUpBtn').addEventListener('click', increaseSpeed);
  document.getElementById('slowDownBtn').addEventListener('click', decreaseSpeed);
}

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    switch(e.key) {
      case ' ':
        e.preventDefault();
        toggleRunPause();
        break;
      case 's':
      case 'S':
        step();
        break;
      case '+':
      case '=':
        increaseSpeed();
        break;
      case '-':
      case '_':
        decreaseSpeed();
        break;
    }
  });
}

function setupFileInput() {
  document.getElementById('memoryFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = loadMemoryMapFromText(memory, reader.result);
        console.log(`Loaded ${result.loaded} bytes, ${result.errors} errors`);
        reset();
      };
      reader.readAsText(file);
    }
  });
}

function toggleRunPause() {
  running = !running;
  document.getElementById('runPauseBtn').textContent = running ? 'Pause (Space)' : 'Run (Space)';
}

function step() {
  if (!cpu.halted) {
    cpu.step();
    instructionCount++;
    render(ui, cpu, memory, running, instructionCount);
  }
}

function reset() {
  cpu.reset();
  instructionCount = 0;
  running = false;
  document.getElementById('runPauseBtn').textContent = 'Run (Space)';
  render(ui, cpu, memory, running, instructionCount);
}

function increaseSpeed() {
  speed = Math.min(speed * 2, 64);
  document.getElementById('speedDisplay').textContent = `${speed}x`;
}

function decreaseSpeed() {
  speed = Math.max(speed / 2, 0.125);
  document.getElementById('speedDisplay').textContent = `${speed}x`;
}

// Start the application
init();
```

---

## Phase 7: Testing Strategy

### 7.1 Unit Testing Approach
Create test ROM files for each instruction category:

**Test 1: Basic Execution (Sample ROM)**
```
0 3E    ; LD A,0
1 00
2 3C    ; INC A
3 18    ; JR -2
4 FE
5 76    ; HALT
```
Expected: A increments 0→1→2→...→FF→0

**Test 2: 8-bit Loads**
```
LD B,05h
LD C,0Ah
LD A,B
LD D,A
```

**Test 3: Arithmetic with Flags**
```
LD A,FFh
INC A        ; Should set Z flag, clear S
LD A,7Fh
INC A        ; Should set S, set P/V (overflow)
```

**Test 4: 16-bit Operations**
```
LD HL,1234h
INC HL
LD BC,5678h
ADD HL,BC
```

**Test 5: Stack Operations**
```
LD SP,FFFFh
LD HL,ABCDh
PUSH HL
POP BC       ; BC should equal ABCD
```

### 7.2 Instruction Coverage Checklist
Create a spreadsheet tracking:
- Opcode hex value
- Mnemonic
- Implementation status
- Test status
- Flag behavior verified

Target: 100% of documented Z80 instructions

---

## Phase 8: Advanced Features

### 8.1 Enhanced Memory Viewer
- Scrollable memory with search
- Disassembly view (show mnemonics)
- Breakpoint support
- Memory write highlighting

### 8.2 Execution History
- Instruction trace log
- Register history graph
- Step backward capability

### 8.3 Peripheral Simulation
- Simple I/O port simulation
- Character display device
- Keyboard input

### 8.4 Performance Optimization
- Lookup table optimizations
- Avoid unnecessary DOM updates
- Web Worker for CPU execution

---

## Phase 9: Documentation

### 9.1 User Documentation
- How to load programs
- Keyboard shortcuts
- Understanding the display
- Sample programs included

### 9.2 Developer Documentation
- Architecture overview
- Adding new instructions
- Opcode table format
- Extension guide

### 9.3 Instruction Reference
- Complete Z80 instruction list
- Flag effects table
- Timing information
- Code examples

---

## Minimal MVP Roadmap (Fast Track to Working Demo)

This section outlines the **absolute minimum** needed to get a working Z80 simulator running the sample ROM.

### MVP Goals
✅ Load memory from text file  
✅ Execute 5 basic instructions (NOP, LD A,n, INC A, JR e, HALT)  
✅ Display registers in browser  
✅ Run/pause/step controls  
✅ Sample ROM executes correctly (A increments continuously)

### MVP Timeline: 15-20 hours

---

## Development Timeline Estimate (JSON-Based Architecture)

| Phase | Task | Estimated Time | Dependencies |
|-------|------|----------------|--------------|
| **0** | **Minimal MVP (see below for details)** | **15-20 hours** | **None** |
| 0.1-0.9 | HTML, Memory, CPU, Executor, Loader, JSON, UI, Main, Test | 15-20 | None |
| **MVP COMPLETE** | **Working simulator with 5 opcodes** | | |
| 1 | Expand core instruction set | 13 hours | Phase 0 |
| 2 | CB-prefixed instructions | 6 hours | Phase 1 |
| 3 | ED-prefixed instructions | 6 hours | Phase 1 |
| 4 | DD/FD instructions (IX/IY) | 5 hours | Phase 1 |
| 5 | Enhanced UI (full features) | 6 hours | Phase 4 |
| 6 | Testing & validation | 9 hours | Phase 5 |
| 7 | Generation tools | 5 hours | Phase 6 |
| 8 | Advanced features (optional) | 8 hours | Phase 7 |
| **Total** | | **57-67 hours** | |

**Key Points:**
- **MVP in 15-20 hours** - Get a working simulator quickly
- **Full implementation in 57-67 hours** - ~10 hours saved vs. traditional approach
- Single generic execution engine vs. 580+ individual handlers
- JSON database is easier to populate (copy/paste from reference docs)
- Easier debugging (can modify instruction behavior in JSON without code changes)
- Pattern-based generation possible (e.g., all LD r,r' instructions follow same pattern)

---

## Key Benefits of JSON-Based Architecture

### 1. **Dramatic Code Reduction**
- Traditional approach: ~580 individual JavaScript handler functions
- JSON approach: 1 generic execution engine + 580 JSON entries
- Result: ~90% less code to write and debug

### 2. **Easier Maintenance**
- Instruction behavior is data, not code
- Fix a bug in arithmetic operations? Update one function, all 8 arithmetic instructions benefit
- Add cycle-accurate timing? Just update the JSON cycles field

### 3. **Rapid Development**
- Pattern-based generation scripts can create hundreds of similar instructions
- Copy instruction definitions from Wikipedia/reference docs directly into JSON
- No context-switching between documentation and code

### 4. **Runtime Flexibility**
- Change instruction behavior without recompiling
- Users can add custom instructions by editing JSON
- Easy A/B testing of different implementations

### 5. **Better Debugging**
- Console.log the entire instruction definition during execution
- See exactly what operation should happen vs. what did happen
- Instruction trace is human-readable (shows mnemonic, not just hex)

### 6. **Educational Value**
- Students can read JSON to understand instruction behavior
- No need to understand JavaScript to see what instructions do
- Great for learning Z80 assembly

### 7. **Testing & Validation**
- Automated validation of JSON schema
- Compare against official Z80 documentation programmatically
- Generate test cases directly from JSON definitions

### 8. **Extensibility**
- Easy to add Z80 variants (Z180, eZ80) by extending JSON
- Undocumented instructions just need JSON entries
- Custom opcodes for homebrew systems

### Example: Implementing 64 Load Instructions

**Traditional Approach:**
```javascript
// Must write 64 separate functions like this:
UNPREFIXED_TABLE[0x40] = {
  mnemonic: "LD B,B",
  bytes: 1, cycles: 4,
  execute(cpu) { cpu.b = cpu.b; }
};
UNPREFIXED_TABLE[0x41] = {
  mnemonic: "LD B,C",
  bytes: 1, cycles: 4,
  execute(cpu) { cpu.b = cpu.c; }
};
// ... 62 more similar functions
```
**Time:** ~2-3 hours, error-prone

**JSON Approach:**
```javascript
// Run one 10-line generation script
// Result: 64 JSON entries in 30 seconds
```

**Difference:** ~2.5 hours saved, zero copy-paste errors

---

## Operand Resolution Strategy

This section defines how JSON operand strings map to actual CPU values during execution:

| JSON String | Resolution |
|-------------|------------|
| `"A"`, `"B"`, `"C"`, `"D"`, `"E"`, `"H"`, `"L"` | `cpu.a`, `cpu.b`, `cpu.c`, `cpu.d`, `cpu.e`, `cpu.h`, `cpu.l` |
| `"AF"`, `"BC"`, `"DE"`, `"HL"` | `cpu.af`, `cpu.bc`, `cpu.de`, `cpu.hl` (16-bit pairs) |
| `"IX"`, `"IY"` | `cpu.ix`, `cpu.iy` |
| `"SP"` | `cpu.sp` |
| `"(HL)"` | `cpu.readByte(cpu.hl)` |
| `"(BC)"` | `cpu.readByte(cpu.bc)` |
| `"(DE)"` | `cpu.readByte(cpu.de)` |
| `"(IX+d)"` | `cpu.readByte(cpu.ix + displacement)` (displacement is signed) |
| `"(IY+d)"` | `cpu.readByte(cpu.iy + displacement)` (displacement is signed) |
| `"n"` or `"immediate"` | `cpu.fetchByte()` (8-bit immediate) |
| `"nn"` or `"immediate16"` | `cpu.fetchWord()` (16-bit immediate) |
| `"(nn)"` | `cpu.readByte(cpu.fetchWord())` (memory indirect) |
| `"e"` | Signed offset for relative jumps |

**For writes:** Use `cpu.writeByte(address, value)` or `cpu.writeWord(address, value)` instead of `readByte/readWord`.

**Implementation in executor:**
```javascript
getOperandValue(operand) {
  if (typeof operand === 'string') {
    if (operand === 'immediate' || operand === 'n') {
      return this.cpu.fetchByte();
    } else if (operand === 'immediate16' || operand === 'nn') {
      return this.cpu.fetchWord();
    } else if (operand.match(/^\(.*\)$/)) {
      // Memory access like (HL), (BC), (nn)
      const addr = this.resolveAddress(operand);
      return this.cpu.readByte(addr);
    } else {
      // Register access
      return this.cpu[operand.toLowerCase()];
    }
  }
  return operand; // Literal value
}
```

---

## Condition Code Mapping

Conditions in JSON map to CPU flag checks. Used by conditional jumps, calls, and returns.

| JSON Condition | Flag Check | Description |
|----------------|------------|-------------|
| `null` | `true` | Unconditional (always execute) |
| `"NZ"` | `!cpu.getFlag(FLAG_Z)` | Not Zero |
| `"Z"` | `cpu.getFlag(FLAG_Z)` | Zero |
| `"NC"` | `!cpu.getFlag(FLAG_C)` | No Carry |
| `"C"` | `cpu.getFlag(FLAG_C)` | Carry |
| `"PO"` | `!cpu.getFlag(FLAG_PV)` | Parity Odd |
| `"PE"` | `cpu.getFlag(FLAG_PV)` | Parity Even |
| `"P"` | `!cpu.getFlag(FLAG_S)` | Plus (positive) |
| `"M"` | `cpu.getFlag(FLAG_S)` | Minus (negative) |

**Implementation in executor:**
```javascript
evaluateCondition(condition) {
  if (!condition) return true; // Unconditional
  
  switch(condition) {
    case 'NZ': return !this.cpu.getFlag(FLAG_Z);
    case 'Z':  return this.cpu.getFlag(FLAG_Z);
    case 'NC': return !this.cpu.getFlag(FLAG_C);
    case 'C':  return this.cpu.getFlag(FLAG_C);
    case 'PO': return !this.cpu.getFlag(FLAG_PV);
    case 'PE': return this.cpu.getFlag(FLAG_PV);
    case 'P':  return !this.cpu.getFlag(FLAG_S);
    case 'M':  return this.cpu.getFlag(FLAG_S);
    default:   return true;
  }
}
```

**Usage in jump execution:**
```javascript
executeJump(op, opcodeDef) {
  if (this.evaluateCondition(op.condition)) {
    // Execute jump
    if (op.target === 'relative') {
      const offset = this.cpu.fetchByte();
      const signedOffset = offset > 127 ? offset - 256 : offset;
      this.cpu.pc = (this.cpu.pc + signedOffset) & 0xFFFF;
    } else if (op.target === 'absolute') {
      this.cpu.pc = this.cpu.fetchWord();
    }
  } else {
    // Condition false, skip operands
    if (op.target === 'relative') {
      this.cpu.fetchByte(); // Skip offset
    } else if (op.target === 'absolute') {
      this.cpu.fetchWord(); // Skip address
    }
  }
}
```

---

## Special Instruction Handling

Some Z80 instructions have complex logic that requires special handling beyond the generic executor patterns.

### 1. DAA (Decimal Adjust Accumulator) - 0x27

DAA adjusts the accumulator for BCD (Binary Coded Decimal) arithmetic. Logic depends on N flag and previous operation.

```javascript
executeSpecial_DAA() {
  let a = this.cpu.a;
  let correction = 0;
  
  if (!this.cpu.getFlag(FLAG_N)) {
    // After addition
    if ((a & 0x0F) > 9 || this.cpu.getFlag(FLAG_H)) {
      correction += 0x06;
    }
    if (a > 0x99 || this.cpu.getFlag(FLAG_C)) {
      correction += 0x60;
      this.cpu.setFlag(FLAG_C, true);
    }
  } else {
    // After subtraction
    if (this.cpu.getFlag(FLAG_H)) {
      correction -= 0x06;
    }
    if (this.cpu.getFlag(FLAG_C)) {
      correction -= 0x60;
    }
  }
  
  a = (a + correction) & 0xFF;
  this.cpu.a = a;
  
  this.cpu.setFlag(FLAG_S, (a & 0x80) !== 0);
  this.cpu.setFlag(FLAG_Z, a === 0);
  this.cpu.setFlag(FLAG_H, false);
  this.cpu.setFlag(FLAG_PV, this.cpu.calculateParity(a));
}
```

### 2. Block Repeat Instructions (LDIR, CPIR, INIR, OTIR)

Block instructions with repeat continue until BC=0. Must re-execute the same instruction.

```javascript
executeBlock_LDIR() {
  // LDI: (DE) ← (HL); DE++; HL++; BC--
  const value = this.cpu.readByte(this.cpu.hl);
  this.cpu.writeByte(this.cpu.de, value);
  
  this.cpu.hl = (this.cpu.hl + 1) & 0xFFFF;
  this.cpu.de = (this.cpu.de + 1) & 0xFFFF;
  this.cpu.bc = (this.cpu.bc - 1) & 0xFFFF;
  
  // Set P/V flag if BC ≠ 0
  this.cpu.setFlag(FLAG_PV, this.cpu.bc !== 0);
  this.cpu.setFlag(FLAG_H, false);
  this.cpu.setFlag(FLAG_N, false);
  
  // If BC ≠ 0, repeat: back up PC to ED prefix
  if (this.cpu.bc !== 0) {
    this.cpu.pc = (this.cpu.pc - 2) & 0xFFFF;
    // Add extra cycles for repeat
    this.cpu.tStates += 5;
  }
}
```

### 3. RLD/RRD (Rotate Left/Right Digit) - ED 6F / ED 67

Rotates nibbles between A and (HL).

```javascript
// RLD: Rotate left digit
// A[3:0] ← (HL)[7:4]; (HL)[7:4] ← (HL)[3:0]; (HL)[3:0] ← A[3:0]
executeSpecial_RLD() {
  const hl_val = this.cpu.readByte(this.cpu.hl);
  const new_hl = ((hl_val << 4) | (this.cpu.a & 0x0F)) & 0xFF;
  this.cpu.a = (this.cpu.a & 0xF0) | (hl_val >> 4);
  this.cpu.writeByte(this.cpu.hl, new_hl);
  
  this.cpu.setFlag(FLAG_S, (this.cpu.a & 0x80) !== 0);
  this.cpu.setFlag(FLAG_Z, this.cpu.a === 0);
  this.cpu.setFlag(FLAG_H, false);
  this.cpu.setFlag(FLAG_PV, this.cpu.calculateParity(this.cpu.a));
  this.cpu.setFlag(FLAG_N, false);
}

// RRD: Rotate right digit
// A[3:0] ← (HL)[3:0]; (HL)[3:0] ← (HL)[7:4]; (HL)[7:4] ← A[3:0]
executeSpecial_RRD() {
  const hl_val = this.cpu.readByte(this.cpu.hl);
  const new_hl = ((hl_val >> 4) | ((this.cpu.a & 0x0F) << 4)) & 0xFF;
  this.cpu.a = (this.cpu.a & 0xF0) | (hl_val & 0x0F);
  this.cpu.writeByte(this.cpu.hl, new_hl);
  
  this.cpu.setFlag(FLAG_S, (this.cpu.a & 0x80) !== 0);
  this.cpu.setFlag(FLAG_Z, this.cpu.a === 0);
  this.cpu.setFlag(FLAG_H, false);
  this.cpu.setFlag(FLAG_PV, this.cpu.calculateParity(this.cpu.a));
  this.cpu.setFlag(FLAG_N, false);
}
```

### 4. CB + IX/IY Encoding Order

**CRITICAL:** CB-prefixed instructions with IX/IY have a unique encoding order.

**Normal IX/IY instruction:** `DD opcode [displacement]`  
**CB + IX/IY instruction:** `DD CB displacement opcode`

The displacement comes **before** the CB opcode, not after!

**Example:**
- `RLC (IX+5)` = `DD CB 05 06` (NOT `DD CB 06 05`)
- `BIT 0,(IY-3)` = `FD CB FD 46`

**Implementation:**
```javascript
step() {
  const opcode = this.fetchByte();
  
  if (opcode === 0xDD || opcode === 0xFD) {
    const indexReg = opcode; // Store which index register
    const nextOpcode = this.fetchByte();
    
    if (nextOpcode === 0xCB) {
      // Special case: displacement comes BEFORE CB opcode
      const displacement = this.fetchByte();
      const cbOpcode = this.fetchByte();
      
      // Execute CB instruction with indexed addressing
      const instruction = this.opcodeManager.getInstruction(0xCB, cbOpcode);
      if (instruction) {
        // Temporarily set HL to IX/IY + displacement
        const savedHL = this.cpu.hl;
        const signedDisp = displacement > 127 ? displacement - 256 : displacement;
        const effectiveAddr = (indexReg === 0xDD ? this.cpu.ix : this.cpu.iy) + signedDisp;
        this.cpu.hl = effectiveAddr & 0xFFFF;
        
        this.executor.execute(instruction);
        
        // Restore HL
        this.cpu.hl = savedHL;
      }
    } else {
      // Normal IX/IY instruction
      // Handle as usual
    }
  }
  // ... rest of step logic
}
```

---

## Critical Implementation Notes

### Instruction Set Completeness
According to Wikipedia and Zilog documentation:
- **252 root opcodes** (unprefixed)
- **256 CB-prefixed opcodes** (bit operations)
- **~60 ED-prefixed opcodes** (extended/block operations)
- **DD/FD prefixes** modify existing opcodes for IX/IY

Total unique instructions: ~580 opcodes across all tables

### Flag Computation Guidelines

**Sign Flag (S):** Set if bit 7 of result is 1

**Zero Flag (Z):** Set if result is 0x00

**Half-Carry (H):** Set if carry from bit 3 to bit 4
- For ADD: `((a & 0x0F) + (b & 0x0F)) > 0x0F`
- For SUB: `((a & 0x0F) - (b & 0x0F)) < 0`

**Parity/Overflow (P/V):** Context-dependent
- Arithmetic: Overflow detection (signed)
- Logic: Parity (even = 1)
- Block ops: BC != 0

**Add/Subtract (N):** Set if last operation was subtraction

**Carry Flag (C):** Set if carry out/borrow

### Register Refresh (R)
The R register increments on every instruction fetch (M1 cycle). Mask to 7 bits:
```javascript
this.r = (this.r + 1) & 0x7F;
```

### Interrupt Handling
For basic simulator:
- Implement `iff1`, `iff2` flags
- DI/EI instructions control `iff1` and `iff2`
- IM 0/1/2 sets interrupt mode
- Actual interrupt simulation is optional

### Undocumented Instructions
Several undocumented opcodes exist (e.g., SLL, IX/IY half-register access). These can be implemented for completeness but are not required for basic operation.

---

## References and Resources

1. **Z80 CPU User Manual** - Zilog official documentation
2. **Wikipedia Z80 Instruction Set** - Complete opcode tables with encoding
3. **Z80 Heaven** (http://z80-heaven.wikidot.com/) - Programming guides
4. **ClrHome Z80 Reference** - Flag behavior details
5. **Z80 Undocumented Instructions** - Complete undocumented opcode list

---

## Success Criteria

The simulator is complete when:

✅ Sample ROM executes correctly (A increments continuously)
✅ All 252 root instructions implemented
✅ All CB-prefixed instructions implemented  
✅ All ED-prefixed instructions implemented
✅ DD/FD (IX/IY) instructions implemented
✅ All flags computed correctly
✅ Memory loads from text files
✅ UI displays registers, flags, buses, memory
✅ Run/pause/step/reset controls work
✅ Speed control functional
✅ Keyboard shortcuts operational
✅ No console errors during execution

---

## Sample JSON Opcode Definitions

Below are complete examples showing the range of instruction types:

```json
{
  "0x00": {
    "opcode": "0x00",
    "mnemonic": "NOP",
    "bytes": 1,
    "cycles": 4,
    "operation": { "type": "special", "operator": "nop" },
    "flags": { "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-" }
  },
  
  "0x06": {
    "opcode": "0x06",
    "mnemonic": "LD B,n",
    "bytes": 2,
    "cycles": 7,
    "operation": {
      "type": "load",
      "destination": "B",
      "source": "immediate"
    },
    "flags": { "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-" }
  },
  
  "0x80": {
    "opcode": "0x80",
    "mnemonic": "ADD A,B",
    "bytes": 1,
    "cycles": 4,
    "operation": {
      "type": "arithmetic",
      "operator": "add",
      "destination": "A",
      "source": "B"
    },
    "flags": { "S": "result", "Z": "result", "H": "half_carry", "PV": "overflow", "N": "0", "C": "carry" }
  },
  
  "0xA0": {
    "opcode": "0xA0",
    "mnemonic": "AND B",
    "bytes": 1,
    "cycles": 4,
    "operation": {
      "type": "logical",
      "operator": "and",
      "target": "A",
      "source": "B"
    },
    "flags": { "S": "result", "Z": "result", "H": "1", "PV": "parity", "N": "0", "C": "0" }
  },
  
  "0xC1": {
    "opcode": "0xC1",
    "mnemonic": "POP BC",
    "bytes": 1,
    "cycles": 10,
    "operation": {
      "type": "stack",
      "operator": "pop",
      "register": "BC"
    },
    "flags": { "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-" }
  },
  
  "0xC3": {
    "opcode": "0xC3",
    "mnemonic": "JP nn",
    "bytes": 3,
    "cycles": 10,
    "operation": {
      "type": "jump",
      "target": "absolute",
      "condition": null,
      "address_source": "immediate16"
    },
    "flags": { "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-" }
  },
  
  "0xC5": {
    "opcode": "0xC5",
    "mnemonic": "PUSH BC",
    "bytes": 1,
    "cycles": 11,
    "operation": {
      "type": "stack",
      "operator": "push",
      "register": "BC"
    },
    "flags": { "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-" }
  },
  
  "0x20": {
    "opcode": "0x20",
    "mnemonic": "JR NZ,e",
    "bytes": 2,
    "cycles": [7, 12],
    "operation": {
      "type": "jump",
      "target": "relative",
      "condition": "NZ",
      "offset_source": "immediate"
    },
    "flags": { "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-" },
    "cycles_note": "7 if not taken, 12 if taken"
  }
}
```

### CB-Prefixed Example (opcodes_cb.json)
```json
{
  "0x00": {
    "opcode": "0x00",
    "mnemonic": "RLC B",
    "bytes": 2,
    "cycles": 8,
    "operation": {
      "type": "rotate_shift",
      "operator": "rlc",
      "target": "B"
    },
    "flags": { "S": "result", "Z": "result", "H": "0", "PV": "parity", "N": "0", "C": "bit7" }
  },
  
  "0x40": {
    "opcode": "0x40",
    "mnemonic": "BIT 0,B",
    "bytes": 2,
    "cycles": 8,
    "operation": {
      "type": "bit",
      "operator": "bit",
      "bit": 0,
      "target": "B"
    },
    "flags": { "S": "*", "Z": "test", "H": "1", "PV": "*", "N": "0", "C": "-" }
  },
  
  "0x80": {
    "opcode": "0x80",
    "mnemonic": "RES 0,B",
    "bytes": 2,
    "cycles": 8,
    "operation": {
      "type": "bit",
      "operator": "res",
      "bit": 0,
      "target": "B"
    },
    "flags": { "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-" }
  },
  
  "0xC0": {
    "opcode": "0xC0",
    "mnemonic": "SET 0,B",
    "bytes": 2,
    "cycles": 8,
    "operation": {
      "type": "bit",
      "operator": "set",
      "bit": 0,
      "target": "B"
    },
    "flags": { "S": "-", "Z": "-", "H": "-", "PV": "-", "N": "-", "C": "-" }
  }
}
```

### ED-Prefixed Example (opcodes_ed.json)
```json
{
  "0x42": {
    "opcode": "0x42",
    "mnemonic": "SBC HL,BC",
    "bytes": 2,
    "cycles": 15,
    "operation": {
      "type": "arithmetic",
      "operator": "sbc",
      "destination": "HL",
      "source": "BC",
      "size": 16
    },
    "flags": { "S": "result", "Z": "result", "H": "half_carry", "PV": "overflow", "N": "1", "C": "carry" }
  },
  
  "0xA0": {
    "opcode": "0xA0",
    "mnemonic": "LDI",
    "bytes": 2,
    "cycles": 16,
    "operation": {
      "type": "block",
      "operator": "ldi",
      "direction": "increment",
      "repeat": false
    },
    "flags": { "S": "-", "Z": "-", "H": "0", "PV": "bc_nonzero", "N": "0", "C": "-" }
  },
  
  "0xB0": {
    "opcode": "0xB0",
    "mnemonic": "LDIR",
    "bytes": 2,
    "cycles": [16, 21],
    "operation": {
      "type": "block",
      "operator": "ldi",
      "direction": "increment",
      "repeat": true
    },
    "flags": { "S": "-", "Z": "-", "H": "0", "PV": "0", "N": "0", "C": "-" },
    "cycles_note": "16 if BC=0, 21 if BC>0 (repeats)"
  }
}
```

---

## Maintenance and Extension Plan

### Future Enhancements
1. **Debugger features**: Breakpoints, watchpoints, conditional execution
2. **Assembler integration**: Write assembly directly in browser
3. **Device emulation**: Screen, keyboard, serial port
4. **Save/load state**: Snapshot and restore CPU state
5. **Performance profiling**: Instruction histogram, hotspot analysis
6. **Multiple CPU speeds**: Accurate T-state timing at different clock speeds
7. **Interrupt simulation**: Maskable and non-maskable interrupts

### Code Quality
- ESLint configuration for consistency
- Unit tests for critical functions
- Performance benchmarks
- Browser compatibility testing

---

## Conclusion

This plan provides a complete roadmap for implementing a full-featured Z80 simulator. The phased approach ensures steady progress from a minimal working prototype to a complete implementation. By following this plan systematically, the coding agent can build a robust, accurate, and user-friendly Z80 simulator that serves both educational and development purposes.

The key to success is:
1. Start with core functionality (memory, CPU, minimal instruction set)
2. Test early and often with known-good programs
3. Incrementally add instruction support
4. Maintain clean separation between CPU, memory, and UI
5. Use data-driven opcode tables for maintainability

---

## Appendix A: JSON Generation Utilities

To accelerate development, create helper scripts to generate JSON entries programmatically:

### A.1 Pattern-Based Instruction Generator

```javascript
// tools/generate_instructions.js

// Generate all 8-bit register-to-register loads (LD r,r')
function generateLoadInstructions() {
  const regs = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];
  const opcodes = {};
  
  for (let dst = 0; dst < 8; dst++) {
    for (let src = 0; src < 8; src++) {
      const opcode = 0x40 + (dst * 8) + src;
      if (opcode === 0x76) continue; // Skip HALT
      
      const d = regs[dst], s = regs[src];
      opcodes[`0x${opcode.toString(16).toUpperCase()}`] = {
        opcode: `0x${opcode.toString(16).toUpperCase()}`,
        mnemonic: `LD ${d},${s}`,
        bytes: 1,
        cycles: (d === '(HL)' || s === '(HL)') ? 7 : 4,
        operation: {
          type: "load",
          destination: d,
          source: s
        },
        flags: { S: "-", Z: "-", H: "-", PV: "-", N: "-", C: "-" }
      };
    }
  }
  return opcodes;
}

// Generate all arithmetic operations (ADD, ADC, SUB, SBC, AND, XOR, OR, CP)
function generateAluInstructions() {
  const ops = [
    { base: 0x80, mnemonic: 'ADD A', type: 'arithmetic', operator: 'add', n: '0' },
    { base: 0x88, mnemonic: 'ADC A', type: 'arithmetic', operator: 'adc', n: '0' },
    { base: 0x90, mnemonic: 'SUB', type: 'arithmetic', operator: 'sub', n: '1' },
    { base: 0x98, mnemonic: 'SBC A', type: 'arithmetic', operator: 'sbc', n: '1' },
    { base: 0xA0, mnemonic: 'AND', type: 'logical', operator: 'and', n: '0' },
    { base: 0xA8, mnemonic: 'XOR', type: 'logical', operator: 'xor', n: '0' },
    { base: 0xB0, mnemonic: 'OR', type: 'logical', operator: 'or', n: '0' },
    { base: 0xB8, mnemonic: 'CP', type: 'arithmetic', operator: 'cp', n: '1' }
  ];
  
  const regs = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];
  const opcodes = {};
  
  for (const op of ops) {
    for (let i = 0; i < 8; i++) {
      const opcode = op.base + i;
      const reg = regs[i];
      const cycles = reg === '(HL)' ? 7 : 4;
      
      opcodes[`0x${opcode.toString(16).toUpperCase()}`] = {
        opcode: `0x${opcode.toString(16).toUpperCase()}`,
        mnemonic: `${op.mnemonic},${reg}`,
        bytes: 1,
        cycles: cycles,
        operation: {
          type: op.type,
          operator: op.operator,
          destination: "A",
          source: reg
        },
        flags: {
          S: "result",
          Z: "result",
          H: op.type === 'logical' ? (op.operator === 'and' ? '1' : '0') : 'half_carry',
          PV: op.type === 'logical' ? 'parity' : 'overflow',
          N: op.n,
          C: op.type === 'logical' ? '0' : 'carry'
        }
      };
    }
  }
  return opcodes;
}

// Generate CB bit operations (BIT, SET, RES)
function generateBitInstructions() {
  const ops = [
    { base: 0x40, mnemonic: 'BIT', operator: 'bit', writeBack: false },
    { base: 0x80, mnemonic: 'RES', operator: 'res', writeBack: true },
    { base: 0xC0, mnemonic: 'SET', operator: 'set', writeBack: true }
  ];
  
  const regs = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];
  const opcodes = {};
  
  for (const op of ops) {
    for (let bit = 0; bit < 8; bit++) {
      for (let reg = 0; reg < 8; reg++) {
        const opcode = op.base + (bit * 8) + reg;
        const target = regs[reg];
        const cycles = target === '(HL)' ? 15 : 8;
        
        opcodes[`0x${opcode.toString(16).toUpperCase()}`] = {
          opcode: `0x${opcode.toString(16).toUpperCase()}`,
          mnemonic: `${op.mnemonic} ${bit},${target}`,
          bytes: 2,
          cycles: cycles,
          operation: {
            type: "bit",
            operator: op.operator,
            bit: bit,
            target: target
          },
          flags: op.operator === 'bit' ? 
            { S: "*", Z: "test", H: "1", PV: "*", N: "0", C: "-" } :
            { S: "-", Z: "-", H: "-", PV: "-", N: "-", C: "-" }
        };
      }
    }
  }
  return opcodes;
}

// Combine all and output
const allOpcodes = {
  ...generateLoadInstructions(),
  ...generateAluInstructions()
};

console.log(JSON.stringify(allOpcodes, null, 2));
```

### A.2 JSON Schema Validator

```javascript
// tools/validate_opcodes.js

function validateOpcodeSchema(opcodeObj) {
  const errors = [];
  
  for (const [key, inst] of Object.entries(opcodeObj)) {
    // Check required fields
    if (!inst.opcode) errors.push(`${key}: missing opcode`);
    if (!inst.mnemonic) errors.push(`${key}: missing mnemonic`);
    if (!inst.bytes) errors.push(`${key}: missing bytes`);
    if (!inst.cycles) errors.push(`${key}: missing cycles`);
    if (!inst.operation) errors.push(`${key}: missing operation`);
    if (!inst.flags) errors.push(`${key}: missing flags`);
    
    // Validate opcode format
    if (key !== inst.opcode) {
      errors.push(`${key}: key doesn't match opcode field`);
    }
    
    // Validate operation type
    const validTypes = ['load', 'arithmetic', 'logical', 'rotate_shift', 
                        'bit', 'jump', 'stack', 'block', 'exchange', 'special'];
    if (inst.operation && !validTypes.includes(inst.operation.type)) {
      errors.push(`${key}: invalid operation type '${inst.operation.type}'`);
    }
    
    // Validate flags
    const validFlagValues = ['-', '0', '1', 'result', 'half_carry', 'overflow', 
                             'parity', 'carry', 'bit7', 'test', 'bc_nonzero', '*'];
    const flagNames = ['S', 'Z', 'H', 'PV', 'N', 'C'];
    for (const flag of flagNames) {
      if (inst.flags && !validFlagValues.includes(inst.flags[flag])) {
        errors.push(`${key}: invalid flag value for ${flag}: '${inst.flags[flag]}'`);
      }
    }
  }
  
  return errors;
}

// Usage
const opcodes = require('./opcodes_unprefixed.json');
const errors = validateOpcodeSchema(opcodes);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
  process.exit(1);
} else {
  console.log('All opcodes valid!');
}
```

### A.3 Coverage Report Generator

```javascript
// tools/coverage_report.js

function generateCoverageReport(opcodeJson) {
  const implemented = Object.keys(opcodeJson).length;
  const total = 256;
  const percentage = (implemented / total * 100).toFixed(1);
  
  console.log(`\n=== Opcode Coverage Report ===`);
  console.log(`Implemented: ${implemented}/${total} (${percentage}%)`);
  
  // Find gaps
  const gaps = [];
  for (let i = 0; i < 256; i++) {
    const hex = `0x${i.toString(16).toUpperCase().padStart(2, '0')}`;
    if (!opcodeJson[hex]) {
      gaps.push(hex);
    }
  }
  
  if (gaps.length > 0) {
    console.log(`\nMissing opcodes: ${gaps.join(', ')}`);
  }
  
  // Category breakdown
  const categories = {};
  for (const inst of Object.values(opcodeJson)) {
    const type = inst.operation?.type || 'unknown';
    categories[type] = (categories[type] || 0) + 1;
  }
  
  console.log('\nBy category:');
  for (const [type, count] of Object.entries(categories).sort()) {
    console.log(`  ${type}: ${count}`);
  }
}
```

### A.4 Wikipedia Table Parser

```javascript
// tools/parse_wikipedia.js
// Parse Z80 instruction tables from Wikipedia format

function parseWikipediaTable(tableText) {
  // This would parse the Wikipedia markdown tables and generate JSON
  // Left as an exercise - can use regex to extract:
  // - Opcode bits
  // - Mnemonic
  // - Operation description
  // Then generate corresponding JSON structure
}
```

---

## Appendix B: Quick Start Checklist

Use this checklist to implement the simulator in order:

- [ ] **Phase 1:** Create all files (HTML, CSS, JS modules, JSON files)
- [ ] **Phase 2:** Implement memory system with loader
- [ ] **Phase 3:** Implement CPU class with registers and flags
- [ ] **Phase 4.1:** Create `InstructionExecutor` class with generic execution methods
- [ ] **Phase 4.2:** Create `OpcodeManager` class to load and lookup JSON
- [ ] **Phase 4.3:** Create minimal JSON with 5 opcodes (NOP, LD A,n, INC A, JR e, HALT)
- [ ] **Test:** Load and run sample ROM - verify A increments
- [ ] **Phase 4.4:** Generate remaining unprefixed opcodes using scripts
- [ ] **Phase 4.5:** Generate CB-prefixed opcodes
- [ ] **Phase 4.6:** Generate ED-prefixed opcodes
- [ ] **Phase 4.7:** Generate DD/FD-prefixed opcodes
- [ ] **Phase 5:** Build UI with all panels
- [ ] **Phase 6:** Wire up controls and main loop
- [ ] **Phase 7:** Test with various ROMs and fix bugs
- [ ] **Phase 8:** Add advanced features (optional)
- [ ] **Phase 9:** Write documentation

---

End of Development Plan.

**Version:** 2.0 (JSON-Based Architecture)  
**Last Updated:** November 16, 2025  
**Estimated Development Time:** 54-64 hours (15 hours saved vs. traditional approach)
