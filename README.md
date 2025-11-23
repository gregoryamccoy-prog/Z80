# Z80 Microprocessor Simulator

Browser-based instruction-level Z80 simulator with JSON-based opcode architecture.

## Project Structure

```
Z80/
├── index.html              # Main entry point
├── README.md               # This file
├── src/
│   ├── js/                 # JavaScript modules
│   │   ├── main.js         # Application entry point
│   │   ├── cpu.js          # CPU core implementation
│   │   ├── memory.js       # Memory management
│   │   ├── instruction_executor.js  # Generic instruction executor
│   │   ├── opcode_loader.js         # JSON opcode loader
│   │   └── ui.js           # UI management
│   └── css/
│       └── styles.css      # Application styles
├── data/
│   └── opcodes_unprefixed.json  # Opcode definitions
├── test/
│   ├── sample_rom.txt      # MVP test ROM
│   ├── add_test.txt        # Addition test
│   └── simple_loop.txt     # Simple counter
└── docs/
    ├── Z80_SIMULATOR_DEVELOPMENT_PLAN.md
    ├── CONVERSATION_CONTEXT.md
    ├── MVP_QUICK_START.md
    └── Z80 JavaScript Instruction-Level Simulator — Full

```

## Quick Start

1. Start a local web server:
   ```bash
   python3 -m http.server 8080
   ```

2. Open http://localhost:8080 in your browser

3. Click "Load Memory" and select a test ROM from `test/` folder

4. Use Run/Pause/Step/Reset controls to execute instructions

## Features

- JSON-based opcode architecture (minimal code, maximum flexibility)
- Real-time register and flag display
- Memory view with disassembly
- Adjustable execution speed (1-1000 Hz)
- Step-by-step debugging

## Implementation Status

**Phase 0 - MVP:** ✅ Complete
- 5 core opcodes (NOP, LD A,n, INC A, JR e, HALT)
- Basic UI and controls

**Phase 1 - Core Instructions:** ✅ Complete  
- ✅ 62 LD instructions (LD r,r' family + LD r,n)
- ✅ 14 INC/DEC instructions (all 8-bit registers)
- ✅ 16 ADD/SUB instructions (register and immediate)
- **Total: 97 opcodes implemented**

## Test ROMs

- `test/sample_rom.txt` - MVP counter test
- `test/add_test.txt` - Addition test
- `test/simple_loop.txt` - Minimal loop
- `test/phase1_test.txt` - Phase 1 feature test (LD, ADD, SUB, INC, DEC)
- `test/register_transfer_test.txt` - Register-to-register transfers

## Next Steps

**Phase 2:** CB-prefixed instructions (rotate/shift, BIT/SET/RES)
**Phase 3:** ED-prefixed instructions (block operations, 16-bit arithmetic)
**Phase 4:** DD/FD instructions (IX/IY support)

See `docs/Z80_SIMULATOR_DEVELOPMENT_PLAN.md` for complete roadmap.
