# Z80 Simulator - MVP Quick Start Guide

**Goal:** Get a working Z80 simulator running the sample ROM in 15-20 hours

---

## Phase 0: Minimal MVP Checklist

### 0.1 Basic HTML Structure (1 hour)
- [ ] Create `index.html` with basic layout
- [ ] Create `styles.css` with minimal styling
- [ ] Add control buttons (Run, Pause, Step, Reset)
- [ ] Add file input for memory loading
- [ ] Add register display area
- [ ] Add status display

### 0.2 Memory System (1 hour)
- [ ] Create `memory.js`
- [ ] Implement `createMemory()` - returns Uint8Array(65536)
- [ ] Implement `readByte(memory, address)`
- [ ] Implement `writeByte(memory, address, value)`
- [ ] Implement `loadMemoryMapFromText(memory, text)`
- [ ] Test memory loading with sample data

### 0.3 CPU Core (3 hours)
- [ ] Create `cpu.js`
- [ ] Define flag constants (FLAG_C, FLAG_N, FLAG_PV, FLAG_H, FLAG_Z, FLAG_S)
- [ ] Implement CPU class with all registers
- [ ] Implement 16-bit register pairs as getters/setters
- [ ] Implement `getFlag(mask)` and `setFlag(mask, value)`
- [ ] Implement `readByte(addr)` and `writeByte(addr, value)` with bus monitoring
- [ ] Implement `fetchByte()` and `fetchWord()`
- [ ] Implement `step()` method (calls opcodeManager and executor)
- [ ] Implement `reset()` method
- [ ] Test register operations

### 0.4 Minimal Executor (3 hours)
- [ ] Create `instruction_executor.js`
- [ ] Implement `InstructionExecutor` class
- [ ] Implement `execute(opcodeDef)` - switches on operation type
- [ ] Implement `executeLoad(op, flagDef)` - handles LD instructions
- [ ] Implement `executeArithmetic(op, flagDef)` - handles INC only (for MVP)
- [ ] Implement `executeJump(op, opcodeDef)` - handles JR only (for MVP)
- [ ] Implement `executeSpecial(op, flagDef)` - handles NOP and HALT
- [ ] Implement `getOperandValue(operand)` - resolves operands
- [ ] Implement `setOperandValue(operand, value)` - sets operands
- [ ] Implement `updateFlags(result, flagDef, ...)` - updates CPU flags
- [ ] Test with dummy opcode definitions

### 0.5 Opcode Loader (2 hours)
- [ ] Create `opcode_loader.js`
- [ ] Implement `OpcodeManager` class
- [ ] Implement `loadAll()` - async loads JSON files
- [ ] Implement `buildLookupTable(jsonObj)` - converts to array
- [ ] Implement `getInstruction(prefix, opcode)` - returns opcode def
- [ ] Test JSON loading with sample data

### 0.6 5-Opcode JSON (1 hour)
- [ ] Create `opcodes_unprefixed.json`
- [ ] Add NOP (0x00)
- [ ] Add LD A,n (0x3E)
- [ ] Add INC A (0x3C)
- [ ] Add JR e (0x18)
- [ ] Add HALT (0x76)
- [ ] Validate JSON syntax

### 0.7 Basic UI (2 hours)
- [ ] Create `ui.js`
- [ ] Implement `initUI()` - returns DOM element references
- [ ] Implement `updateUI(ui, cpu, running)` - updates display
- [ ] Display A, F, B, C, D, E, H, L registers in hex
- [ ] Display PC and SP in hex
- [ ] Display CPU status (Running/Paused/Halted)
- [ ] Test UI updates

### 0.8 Main Loop (1 hour)
- [ ] Create `main.js`
- [ ] Import all modules
- [ ] Implement `init()` - creates components, loads opcodes
- [ ] Implement `startRenderLoop()` - requestAnimationFrame loop
- [ ] Implement control handlers (run, pause, step, reset)
- [ ] Implement file loading handler
- [ ] Wire up event listeners
- [ ] Test all controls

### 0.9 Test with Sample ROM (1 hour)
- [ ] Create `test/sample_rom.txt` with test data:
```
0 3E
1 00
2 3C
3 18
4 FE
5 76
```
- [ ] Load ROM in browser
- [ ] Test Step: A should become 00, PC should be 2
- [ ] Test Step: A should become 01, PC should be 3
- [ ] Test Step: PC should jump back to 2
- [ ] Test Run: A should increment continuously
- [ ] Verify wrap-around: A goes FF → 00
- [ ] Test Pause: execution should stop
- [ ] Test Reset: A and PC should return to 0

---

## MVP Success Criteria

✅ Memory loads from text file  
✅ NOP executes (does nothing)  
✅ LD A,n executes (A gets immediate value)  
✅ INC A executes (A increments, flags update)  
✅ JR e executes (PC jumps relatively)  
✅ HALT executes (CPU stops)  
✅ Sample ROM runs: A increments 00→01→02...→FF→00  
✅ PC cycles: 0→1→2→3→4→2→3→4→2...  
✅ UI updates in real-time  
✅ Step/Run/Pause/Reset controls work  
✅ No console errors  

---

## File Structure After MVP

```
Z80/
├── index.html
├── styles.css
├── main.js
├── cpu.js
├── memory.js
├── instruction_executor.js
├── opcode_loader.js
├── ui.js
├── opcodes_unprefixed.json
└── test/
    └── sample_rom.txt
```

---

## Quick Debug Tips

### If A doesn't increment:
- Check INC A opcode (0x3C) is in JSON
- Check arithmetic executor sets result correctly
- Check flags are being updated

### If PC doesn't jump:
- Check JR e opcode (0x18) is in JSON
- Check offset is being read and signed correctly
- Check PC = (PC + offset) & 0xFFFF

### If memory doesn't load:
- Check file format is correct (decimal address, hex byte)
- Check loadMemoryMapFromText parses correctly
- Console.log the loaded bytes count

### If UI doesn't update:
- Check requestAnimationFrame loop is running
- Check updateUI is being called each frame
- Check DOM element IDs match

### If nothing happens:
- Check opcodeManager.loadAll() completes before execution
- Check CPU step() is being called
- Check console for errors

---

## After MVP is Working

Once the MVP runs successfully:

1. **Celebrate!** 🎉 You have a working Z80 simulator!
2. **Commit to git:** Save your working MVP
3. **Proceed to Phase 1:** Expand instruction set
4. **Add more opcodes:** Start with LD r,r' instructions
5. **Test incrementally:** Add a few opcodes, test, repeat

---

## Common Mistakes to Avoid

❌ Trying to implement all instructions at once  
✅ Get 5 opcodes working first

❌ Complex UI before CPU works  
✅ Basic text display is fine for MVP

❌ Hand-writing all JSON entries  
✅ Pattern generation comes in Phase 7

❌ Forgetting to load JSON before executing  
✅ Use async/await in init()

❌ Not testing after each step  
✅ Test each phase before moving on

---

## Estimated Time Breakdown

| Task | Time | Cumulative |
|------|------|------------|
| HTML/CSS | 1h | 1h |
| Memory | 1h | 2h |
| CPU Core | 3h | 5h |
| Executor | 3h | 8h |
| Loader | 2h | 10h |
| JSON | 1h | 11h |
| UI | 2h | 13h |
| Main Loop | 1h | 14h |
| Testing | 1h | 15h |
| **Total** | **15h** | |

Add 3-5 hours buffer for debugging and learning = **18-20 hours realistic**

---

## Next Steps After MVP

**Phase 1: Expand Core Instructions (13 hours)**
- Add all LD r,r' instructions (64 opcodes)
- Add arithmetic: ADD, ADC, SUB, SBC
- Add logical: AND, OR, XOR, CP
- Add stack: PUSH, POP
- Add jumps: JP, CALL, RET with conditions

**Phase 2: CB-Prefixed (6 hours)**
- Add rotate/shift instructions
- Add BIT/SET/RES instructions

**Phase 3: ED-Prefixed (6 hours)**
- Add block operations
- Add 16-bit arithmetic

**Phase 4: DD/FD (5 hours)**
- Add IX/IY support

**Phase 5: Enhanced UI (6 hours)**
- Full register display
- Flag LEDs
- Memory viewer
- Bus monitor

---

**Ready to start? Begin with 0.1: Create index.html!**
