// Debug script to trace memory_ops_test execution
import * as Memory from './src/js/memory.js';
import { CPU } from './src/js/cpu.js';
import { OpcodeManager } from './src/js/opcode_loader.js';
import { InstructionExecutor } from './src/js/instruction_executor.js';
import { readFileSync } from 'fs';

async function runDebug() {
    console.log('=== Z80 Memory Ops Test Debug ===\n');
    
    // Load opcodes
    const opcodeManager = new OpcodeManager();
    await opcodeManager.loadAll();
    console.log('Opcodes loaded:', JSON.stringify(opcodeManager.getStats()));
    
    // Create memory and CPU
    const memory = Memory.createMemory();
    const instructionExecutor = new InstructionExecutor(null);
    const cpu = new CPU(memory, opcodeManager, instructionExecutor);
    instructionExecutor.cpu = cpu;
    
    // Load test ROM
    const text = readFileSync('./test/memory_ops_test.txt', 'utf-8');
    const result = Memory.loadMemoryMapFromText(memory, text);
    console.log(`ROM loaded: ${result.loaded} bytes\n`);
    
    cpu.reset();
    
    // Checkpoints where we want detailed logging
    const checkpoints = [
        0x0015, 0x001D, 0x002B, 0x0039, 0x0048, 
        0x0054, 0x005B, 0x0068, 0x006E, 0x007B, 
        0x0085, 0x008F, 0x0096
    ];
    
    // Step through execution
    let stepCount = 0;
    const maxSteps = 1000;
    let lastPC = -1;
    
    while (!cpu.halted && stepCount < maxSteps) {
        const pc = cpu.PC;
        
        // Detect jump to error handler
        if (pc === 0x00A0 && lastPC !== 0x00A0) {
            console.log(`\n!!! JUMPED TO ERROR HANDLER (0x00A0) !!!`);
            console.log(`Previous PC: 0x${lastPC.toString(16).padStart(4, '0').toUpperCase()}`);
            console.log(`A=${cpu.A.toString(16).padStart(2, '0').toUpperCase()} `+
                       `F=${cpu.F.toString(16).padStart(2, '0').toUpperCase()} ` +
                       `HL=${cpu.HL.toString(16).padStart(4, '0').toUpperCase()}`);
            console.log(`Z=${(cpu.F & 0x40) ? 1 : 0} N=${(cpu.F & 0x02) ? 1 : 0} C=${(cpu.F & 0x01) ? 1 : 0}\n`);
            break;
        }
        
        // Log checkpoints
        if (checkpoints.includes(pc)) {
            const hl = cpu.HL;
            const memHL = hl <= 0xFFFF ? memory[hl] : 0;
            console.log(`[0x${pc.toString(16).padStart(4, '0').toUpperCase()}] ` +
                       `A=${cpu.A.toString(16).padStart(2, '0').toUpperCase()} ` +
                       `F=${cpu.F.toString(16).padStart(2, '0').toUpperCase()} ` +
                       `HL=${hl.toString(16).padStart(4, '0').toUpperCase()} ` +
                       `[HL]=${memHL.toString(16).padStart(2, '0').toUpperCase()} ` +
                       `Z=${(cpu.F & 0x40) ? 1 : 0}`);
        }
        
        lastPC = pc;
        cpu.step();
        stepCount++;
    }
    
    console.log(`\n=== Test Complete (${stepCount} steps) ===`);
    console.log(`Final A: 0x${cpu.A.toString(16).padStart(2, '0').toUpperCase()}`);
    
    if (cpu.A === 0x42) {
        console.log('✓ SUCCESS!\n');
    } else if (cpu.A === 0xFF) {
        console.log('✗ FAILED - Error code 0xFF\n');
    }
    
    // Memory dump
    console.log('Memory values:');
    console.log(`[0x0050] = 0x${memory[0x0050].toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`[0x0051] = 0x${memory[0x0051].toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`[0x0052] = 0x${memory[0x0052].toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`[0x0060] = 0x${memory[0x0060].toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`[0x0070] = 0x${memory[0x0070].toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`[0x0080] = 0x${memory[0x0080].toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`[0x8000] = 0x${memory[0x8000].toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`[0x8010] = 0x${memory[0x8010].toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`[0x8020] = 0x${memory[0x8020].toString(16).padStart(2, '0').toUpperCase()}`);
}

runDebug().catch(console.error);
