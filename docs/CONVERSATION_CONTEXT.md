# Z80 Simulator Project - Conversation Context

**Date:** November 16, 2025  
**Project:** Z80 JavaScript Instruction-Level Simulator

---

## Conversation Summary

### Initial Request
User requested examination of the Z80 simulator specification document and development of a detailed plan for constructing the simulator. The specification called for a browser-based Z80 microprocessor simulator with:
- Full Z80 instruction set emulation
- Visual display of registers, flags, buses, and memory
- Interactive controls (run, pause, step, speed control)
- Memory loading from text files
- Instruction-level (not gate-level) simulation

### Key Reference Materials
- Project specification document: `Z80 JavaScript Instruction-Level Simulator — Full`
- Wikipedia Z80 instruction set reference: https://en.wikipedia.org/wiki/Z80_instruction_set

### Initial Plan Created
Created comprehensive development plan (`Z80_SIMULATOR_DEVELOPMENT_PLAN.md`) with:
- 9 development phases
- Traditional architecture using JavaScript opcode handler functions
- Estimated 69-79 hours of development time
- Complete implementation details for all components

---

## Critical Architecture Change (User Suggestion)

### User's Innovation
User proposed storing opcodes in JSON files containing:
- Mnemonic
- Opcode hex value
- Flags affected
- Registers used
- Logic of the operation

**Rationale:** Use mnemonic/opcode lookup based on next memory instruction to reduce code complexity and development time.

### Implementation
The plan was completely revised to incorporate JSON-based architecture:

#### New File Structure
**JSON Opcode Databases:**
- `opcodes_unprefixed.json` - 252 root instructions
- `opcodes_cb.json` - 256 CB-prefixed bit/shift/rotate instructions
- `opcodes_ed.json` - ~60 ED-prefixed extended instructions
- `opcodes_ddfd.json` - IX/IY index register instructions

**New JavaScript Modules:**
- `instruction_executor.js` - Generic execution engine that interprets JSON definitions
- `opcode_loader.js` - Loads JSON files and provides lookup functionality

#### JSON Schema Format
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
  }
}
```

#### Operation Types Defined
1. `load` - Data transfer operations
2. `arithmetic` - Math operations (add, adc, sub, sbc, inc, dec)
3. `logical` - Bitwise operations (and, or, xor, cp)
4. `rotate_shift` - Bit manipulation (rlc, rrc, rl, rr, sla, sra, srl)
5. `bit` - Bit test/set/reset
6. `jump` - Control flow (jp, jr, call, ret, rst)
7. `stack` - Stack operations (push, pop)
8. `block` - Block operations (ldi, ldir, ldd, lddr, etc.)
9. `exchange` - Register swapping (ex, exx)
10. `special` - Unique instructions (daa, cpl, scf, ccf, halt, nop, etc.)

---

## Key Benefits of JSON Architecture

### Time Savings
- **Original estimate:** 69-79 hours
- **JSON-based estimate:** 54-64 hours
- **Savings:** ~15 hours (21% reduction)

### Code Reduction
- Traditional: ~580 individual JavaScript handler functions
- JSON: 1 generic execution engine + 580 JSON entries
- Result: ~90% less code to write and debug

### Development Efficiency
1. **Pattern-based generation** - Similar instructions can be generated with scripts
   - Example: All 64 LD r,r' instructions generated in 30 seconds
2. **Easier maintenance** - Fix once in engine, all instructions benefit
3. **Better debugging** - Can log entire instruction definition during execution
4. **Extensibility** - Users can add custom instructions by editing JSON
5. **Educational value** - JSON is human-readable, great for learning

---

## Current Project State

### Files Created
1. **Z80_SIMULATOR_DEVELOPMENT_PLAN.md** - Complete development plan with:
   - Detailed architecture description
   - 9 implementation phases
   - Complete code examples
   - JSON schema definitions
   - Generic execution engine implementation
   - Pattern-based generation scripts
   - Testing strategy
   - 54-64 hour timeline

### Next Steps (When Resuming)

#### Immediate Actions
1. Create project file structure (HTML, CSS, JS, JSON files)
2. Implement memory system (`memory.js`)
3. Implement CPU core (`cpu.js`)
4. Create `InstructionExecutor` class
5. Create `OpcodeManager` class
6. Create minimal JSON with 5 opcodes for testing

#### Testing Milestone
Use sample ROM to verify basic functionality:
```
0 3E    ; LD A,0
1 00
2 3C    ; INC A
3 18    ; JR -2
4 FE
5 76    ; HALT
```
Expected behavior: Register A increments continuously (0→1→2→...→FF→0)

#### Development Order
1. Get minimal 5-opcode system working
2. Generate remaining unprefixed opcodes using pattern scripts
3. Generate CB-prefixed opcodes
4. Generate ED-prefixed opcodes
5. Generate DD/FD-prefixed opcodes
6. Build complete UI
7. Test with various programs
8. Add advanced features (optional)

---

## Important Design Decisions

### Execution Flow
```javascript
// CPU step with JSON lookup
step() {
  if (this.halted) return;
  
  const opcode = this.fetchByte();
  let instruction;
  
  // Handle prefixes (CB, ED, DD, FD)
  if (opcode === 0xCB) {
    const nextOpcode = this.fetchByte();
    instruction = this.opcodeManager.getInstruction(0xCB, nextOpcode);
  } else if (opcode === 0xED) {
    // ... similar for ED, DD, FD
  } else {
    instruction = this.opcodeManager.getInstruction(null, opcode);
  }
  
  if (instruction) {
    this.executor.execute(instruction);
    this.tStates += instruction.cycles;
  }
}
```

### Generic Execution
The `InstructionExecutor` class interprets JSON operation definitions and executes them:
- Handles all operation types (load, arithmetic, logical, etc.)
- Automatically computes flags based on operation type
- Resolves operands (registers, immediate values, memory addresses)
- Updates CPU state accordingly

### Flag Computation
Flags are defined in JSON with values like:
- `-` = unchanged
- `0` or `1` = set to specific value
- `result` = based on result value
- `half_carry` = computed from operation
- `overflow` = computed for arithmetic
- `parity` = computed for logical ops
- `carry` = computed from operation

---

## Tools and Utilities to Create

### Pattern Generation Scripts
- `generate_ld_instructions.js` - Generate all LD r,r' instructions
- `generate_alu_instructions.js` - Generate all arithmetic/logical ops
- `generate_bit_instructions.js` - Generate all BIT/SET/RES instructions
- `generate_rotate_instructions.js` - Generate all rotate/shift instructions

### Validation Tools
- `validate_opcodes.js` - Validate JSON schema
- `coverage_report.js` - Report on implementation coverage
- `compare_to_reference.js` - Compare against official Z80 docs

### Testing Tools
- Sample ROM files for different instruction categories
- Automated test suite based on JSON definitions
- Flag computation verification

---

## Key Reference Information

### Z80 Instruction Set Totals
- **252** unprefixed (root) opcodes
- **256** CB-prefixed opcodes (bit operations)
- **~60** ED-prefixed opcodes (extended/block operations)
- **DD/FD** prefixes modify existing opcodes for IX/IY
- **Total: ~580** unique instruction combinations

### Flag Register Bits
- Bit 7: **S** (Sign)
- Bit 6: **Z** (Zero)
- Bit 4: **H** (Half Carry)
- Bit 2: **P/V** (Parity/Overflow)
- Bit 1: **N** (Add/Subtract)
- Bit 0: **C** (Carry)

### CPU Registers
**8-bit main:** A, F, B, C, D, E, H, L  
**8-bit alternate:** A', F', B', C', D', E', H', L'  
**16-bit pairs:** AF, BC, DE, HL (derived from 8-bit)  
**Index:** IX, IY (16-bit)  
**Special:** PC, SP, I, R  
**State:** halted, iff1, iff2, interruptMode

---

## Questions to Consider When Resuming

1. **Should we create a Python script to parse the Wikipedia tables and auto-generate JSON?**
   - Could save significant time populating the databases

2. **Should we implement undocumented Z80 instructions?**
   - Adds completeness but not required for basic functionality

3. **What level of cycle-accuracy is needed?**
   - Some instructions have variable cycles (e.g., conditional jumps)
   - Block repeat instructions have complex timing

4. **Should we add a disassembler view?**
   - Could show mnemonics alongside hex in memory viewer
   - Easy to implement with JSON lookup

5. **Should we support multiple speed modes?**
   - Real Z80 speed (~3.5 MHz)
   - Fast mode (as fast as browser allows)
   - Step-by-step with configurable delay

---

## Resources and References

### Official Documentation
- Zilog Z80 CPU User Manual
- Z80 CPU Technical Manual

### Online Resources
- Wikipedia Z80 Instruction Set (used as primary reference)
- Z80 Heaven (http://z80-heaven.wikidot.com/)
- ClrHome Z80 Reference
- Undocumented Z80 Documented

### Sample Programs for Testing
- Simple counter (included in spec)
- Fibonacci sequence
- Bubble sort
- Screen fill routines
- Block memory operations

---

## Status Summary

**Phase:** Planning Complete - Updated v2.0  
**Next Phase:** Phase 0 - Minimal MVP Implementation  
**Estimated Time to MVP:** 15-20 hours (minimal working simulator)  
**Estimated Time to Complete:** 57-67 hours (full instruction set + UI)

**Current Blockers:** None - ready to begin Phase 0  
**Current Decisions Needed:** None - MVP-first architecture finalized

**Plan Updates (Nov 22, 2025):**
- Fixed all naming inconsistencies (opcodes_*.js → opcodes_*.json)
- Added Phase 0: Minimal MVP (15-20 hours)
- Added Operand Resolution Strategy section
- Added Condition Code Mapping section
- Added Special Instruction Handling section
- Added CB+IX/IY encoding clarification
- Updated timeline to MVP-first approach

---

## How to Resume

1. Review `Z80_SIMULATOR_DEVELOPMENT_PLAN.md` for complete implementation details
2. Follow the Quick Start Checklist in Appendix B
3. Start with Phase 1: Create file structure
4. Implement in order: Memory → CPU → Executor → Loader → Minimal JSON
5. Test with sample ROM before expanding to full instruction set
6. Use generation scripts from Appendix A to populate JSON databases

**Key Files:**
- Development plan: `Z80_SIMULATOR_DEVELOPMENT_PLAN.md`
- This context: `CONVERSATION_CONTEXT.md`
- Spec document: `Z80 JavaScript Instruction-Level Simulator — Full`

---

## Final Notes

The JSON-based architecture represents a significant improvement over traditional approaches:
- Faster development
- Easier maintenance
- Better debugging
- More extensible
- Educational value

The user's suggestion to use JSON was transformative and has been fully incorporated into the development plan. This approach should save approximately 15 hours of development time while producing cleaner, more maintainable code.

**Ready to proceed with implementation when user returns to the project.**
