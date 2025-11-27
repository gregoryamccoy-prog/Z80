# Z80 Simulator - Session State
**Last Updated:** November 26, 2025

## Current Status

### Phase 3: CB-Prefixed Bit Operations - ✅ COMPLETE

**Total Opcodes Implemented:** 461
- Phase 1 Extended: 175 opcodes (LD, arithmetic, jumps, calls, stack, logical)
- Phase 2: 22 memory indirect opcodes
- 16-bit INC/DEC: 8 opcodes (0x03,0x13,0x23,0x33,0x0B,0x1B,0x2B,0x3B)
- **Phase 3: 256 CB-prefixed opcodes (rotate/shift, bit test, bit modify)**

### Phase 2: Memory Indirect Operations - ✅ COMPLETE

### Recent Work (Nov 22, 2025)

1. **Fixed ROM Loading Bug**
   - Parser now handles "0000: 31 00 FF ; comment" format
   - Parses multiple bytes per line with semicolon comments
   - File: `src/js/memory.js` - `loadMemoryMapFromText()`

2. **Added Phase 2 Memory Operations (22 opcodes)**
   - LD (HL),r: 0x70-0x75,0x77
   - LD r,(HL): 0x46,0x4E,0x56,0x5E,0x66,0x6E,0x7E
   - LD (BC/DE),A: 0x02,0x12
   - LD A,(BC/DE): 0x0A,0x1A
   - LD (nn),A: 0x32
   - LD A,(nn): 0x3A
   - INC/DEC (HL): 0x34,0x35
   - LD (HL),n: 0x36
   - ADD A,(HL): 0x86
   - SUB (HL): 0x96
   - AND/OR/XOR/CP (HL): 0xA6,0xAE,0xB6,0xBE

3. **Added Missing 16-bit INC/DEC (8 opcodes)**
   - INC BC/DE/HL/SP: 0x03,0x13,0x23,0x33
   - DEC BC/DE/HL/SP: 0x0B,0x1B,0x2B,0x3B
   - File: `src/js/instruction_executor.js` - added `inc16`/`dec16` cases

4. **Added Memory Navigation UI**
   - HTML controls: address input field + "Go" and "Go to PC" buttons
   - CSS styling: `.memory-controls` in `src/css/styles.css`
   - JavaScript: event listeners in `src/js/main.js`
   - New function: `updateMemoryViewAt()` in `src/js/ui.js`
   - Allows viewing any memory address, not just PC vicinity

5. **Fixed Test ROM Bug**
   - **Problem**: `memory_ops_test.txt` was writing to addresses containing program code (0x0090-0x009A)
   - **Cause**: ROM and RAM share same address space, test overwrote its own instructions
   - **Solution**: Moved test data area to 0x8000+ (safe RAM away from code)
   - Updated addresses: 0x8000, 0x8010, 0x8020 for INC/DEC, arithmetic, and logical tests

## Test Results

### Working Tests ✅
- `comprehensive_test.txt` - Phase 1 operations validated
- `simple_memory_test.txt` - Basic (HL) operations work
- Memory locations 0x0050-0x0052 correctly written (AA, BB, CC)

### In Progress ⏳
- `memory_ops_test.txt` - Now uses safe memory addresses (0x8000+)
- Need to retest after ROM/RAM separation fix

### Expected Results (memory_ops_test.txt)
If successful, register A should be `0x42`:
- `0x0050` = 0xAA (LD (HL),A test)
- `0x0051` = 0xBB (LD (HL),B test)
- `0x0052` = 0xCC (LD (HL),C test)
- `0x0060` = 0x55 (BC indirect test)
- `0x0070` = 0x33 (DE indirect test)
- `0x0080` = 0x77 (absolute addressing test)
- `0x8000` = 0x10 (INC/DEC (HL) test)
- `0x8010` = 0x0F (ADD/SUB (HL) test)
- `0x8020` = 0xC3 (AND/OR/XOR/CP test)

### Phase 3 Completion (Nov 26, 2025)

1. **Created CB Opcode Generator**
   - File: `tools/generate_cb_opcodes.mjs`
   - Generates all 256 CB opcodes programmatically
   - Pattern-based: rotate/shift (0x00-0x3F), BIT (0x40-0x7F), RES (0x80-0xBF), SET (0xC0-0xFF)
   - Output: `data/opcodes_cb.json` (5249 lines)

2. **Implemented CB Instruction Execution**
   - Added `executeRotateShift()` - handles RLC, RRC, RL, RR, SLA, SRA, SLL, SRL
   - Added `executeBitTest()` - handles BIT instruction (tests bits 0-7)
   - Added `executeBitModify()` - handles SET/RES instructions
   - File: `src/js/instruction_executor.js`

3. **Updated CPU for CB Prefix**
   - Modified `step()` to detect 0xCB opcode
   - Fetches second byte and dispatches to CB opcode table
   - File: `src/js/cpu.js`

4. **Created Comprehensive Test Suite**
   - `test/cb_debug.txt` - Basic RLC/RRC tests (✅ passes)
   - `test/cb_final.txt` - 15 comprehensive CB tests (✅ passes)
   - `test/cb_progressive.txt` - Progressive testing with markers
   - All tests return A = 0x42 on success

## Next Steps

### Phase 4: ED-Prefixed Extended Operations
Not yet started. Will include:
- Create `data/opcodes_ed.json`
- Block operations: LDIR, LDDR, CPIR, CPDR
- 16-bit arithmetic: ADC HL,rr, SBC HL,rr
- Special I/O and interrupt operations

### Phase 4: ED-Prefixed Extended Operations
- Block operations: LDIR, LDDR, CPIR, CPDR
- 16-bit arithmetic: ADC HL,rr, SBC HL,rr
- Special I/O and interrupt operations

### Phase 5: DD/FD-Prefixed Index Register Operations
- IX and IY register operations
- Indexed addressing modes

## File Structure

```
Z80/
├── src/
│   ├── js/
│   │   ├── main.js              - Entry point, event handlers
│   │   ├── cpu.js               - Z80 CPU emulation
│   │   ├── memory.js            - Memory management, ROM loading
│   │   ├── opcode_manager.js    - Opcode lookup
│   │   ├── instruction_executor.js - Generic instruction execution
│   │   └── ui.js                - UI updates, memory view
│   └── css/
│       └── styles.css           - All styling
├── data/
│   └── opcodes_unprefixed.json  - 205+ opcode definitions
├── test/
│   ├── comprehensive_test.txt   - Phase 1 integration test
│   ├── memory_ops_test.txt      - Phase 2 comprehensive test (FIXED)
│   └── simple_memory_test.txt   - Basic (HL) operation test
└── index.html                   - Main page

Test ROMs: 9 files total
```

## Key Implementation Details

### Memory System
- Unified 64KB address space (0x0000-0xFFFF)
- No ROM/RAM separation - writes modify entire space
- **Important**: Keep program code below 0x0100, use 0x8000+ for test data

### Opcode Architecture
- JSON definitions with generic `type` field
- Types: `load`, `arithmetic`, `jump`, `stack`, `logical`, `special`
- Subtypes for arithmetic: `inc`, `dec`, `add`, `sub`, `inc16`, `dec16`
- Executor uses switch statements on type/subtype

### Memory Navigation UI
- Address input accepts hex (0000-FFFF)
- "Go" button: view any address
- "Go to PC" button: return to program counter
- Displays 64 bytes centered on target address
- Disassembles instructions at target location

### Error Handling
- CPU catches unknown opcodes and execution errors
- Halts CPU with `console.error` containing PC and opcode
- Returns 4 cycles on error (prevents infinite loops)

## Debugging Notes

### Issue: Test Returned 0xFF Instead of 0x42
**Symptom**: memory_ops_test failed, returned error code 0xFF

**Root Cause**: Test was writing to addresses 0x0090, 0x0095, 0x009A which contained program code. Writing data overwrote instructions (e.g., `C2` from `JP NZ` instruction at 0x0090).

**Solution**: Moved test data writes to 0x8000+ address range, well beyond program code area (ends at 0x00A4).

**Lesson**: Always separate code and data areas in test ROMs. Code should occupy low memory (0x0000-0x00FF), data should use high memory (0x8000+).

### Using Memory Navigation
1. Load ROM and run test
2. Type target address in hex (e.g., `8000`) in address input field
3. Click "Go" to view that memory region
4. Check if expected values were written
5. Click "Go to PC" to return to program execution view

## Performance

- Execution speed: ~4 MHz (configurable)
- UI updates: 60 Hz (register updates only during execution)
- Memory view: Manual navigation, updated on demand
- ROM loading: Instant for typical test files

## Browser Compatibility

Tested on modern browsers supporting:
- ES6 modules
- Fetch API
- localStorage
- CSS Grid

## Known Limitations

1. No CB-prefixed opcodes yet (bit operations)
2. No ED-prefixed opcodes yet (block operations)
3. No DD/FD-prefixed opcodes yet (index registers)
4. No interrupt handling
5. No I/O port simulation
6. Memory is unified space (no ROM/RAM protection)

## Resources

- Z80 CPU Manual: Complete instruction set reference
- Test ROMs: Self-validating programs that return 0x42 on success, 0xFF on failure
- Memory viewer: Navigate to any address to inspect memory contents

---

**Ready for Phase 3**: CB-prefixed bit operations (256 opcodes)
