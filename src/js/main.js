// main.js - Main application entry point

import * as Memory from './memory.js';
import { CPU } from './cpu.js';
import { OpcodeManager } from './opcode_loader.js';
import { InstructionExecutor } from './instruction_executor.js';
import * as UI from './ui.js';

// Global state
let memory = null;
let cpu = null;
let opcodeManager = null;
let instructionExecutor = null;
let ui = null;

let running = false;
let targetSpeed = 100; // Target Hz
let lastUpdateTime = 0;
let cyclesThisSecond = 0;
let actualHz = 0;
let lastPC = 0; // Track last PC to detect changes
let lastRunningState = false; // Track running state changes
let lastActualHz = 0; // Track Hz changes

/**
 * Initialize the simulator
 */
async function init() {
    console.log('Initializing Z80 Simulator...');
    
    // Initialize UI
    ui = UI.initUI();
    console.log('UI initialized');
    
    // Create memory
    memory = Memory.createMemory();
    console.log('Memory created (64KB)');
    
    // Load opcodes
    opcodeManager = new OpcodeManager();
    await opcodeManager.loadAll();
    console.log('Opcodes loaded:', opcodeManager.getStats());
    
    // Create instruction executor
    instructionExecutor = new InstructionExecutor(null); // Will set CPU reference later
    
    // Create CPU
    cpu = new CPU(memory, opcodeManager, instructionExecutor);
    instructionExecutor.cpu = cpu; // Set CPU reference
    cpu.reset();
    console.log('CPU initialized');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initial UI update
    UI.updateUI(ui, cpu, running, actualHz, opcodeManager);
    UI.updateControlButtons(ui, running, cpu.halted);
    
    // Start render loop
    startRenderLoop();
    
    console.log('Z80 Simulator ready!');
}

/**
 * Set up event listeners for controls
 */
function setupEventListeners() {
    // Run button
    ui.btnRun.addEventListener('click', () => {
        if (!running && !cpu.halted) {
            running = true;
            lastUpdateTime = performance.now();
            cyclesThisSecond = 0;
            UI.updateControlButtons(ui, running, cpu.halted);
            console.log('Started execution');
        }
    });
    
    // Pause button
    ui.btnPause.addEventListener('click', () => {
        if (running) {
            running = false;
            UI.updateControlButtons(ui, running, cpu.halted);
            console.log('Paused execution');
        }
    });
    
    // Step button
    ui.btnStep.addEventListener('click', () => {
        if (!running && !cpu.halted) {
            const cycles = cpu.step();
            console.log(`Step: PC=${cpu.PC.toString(16).padStart(4, '0')} A=${cpu.A.toString(16).padStart(2, '0')} (${cycles} cycles)`);
            UI.updateUI(ui, cpu, running, actualHz, opcodeManager);
            UI.updateControlButtons(ui, running, cpu.halted);
        }
    });
    
    // Reset button
    ui.btnReset.addEventListener('click', () => {
        running = false;
        cpu.reset();
        cyclesThisSecond = 0;
        actualHz = 0;
        console.log('CPU reset');
        UI.updateUI(ui, cpu, running, actualHz, opcodeManager);
        UI.updateControlButtons(ui, running, cpu.halted);
    });
    
    // File input
    ui.fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const bytesLoaded = Memory.loadMemoryMapFromText(memory, text);
            UI.showFileStatus(ui, `Loaded ${bytesLoaded} bytes from ${file.name}`);
            console.log(`Loaded ${bytesLoaded} bytes from ${file.name}`);
            
            // Reset CPU to start from beginning
            cpu.reset();
            running = false;
            UI.updateUI(ui, cpu, running, actualHz, opcodeManager);
            UI.updateControlButtons(ui, running, cpu.halted);
        } catch (error) {
            console.error('Error loading file:', error);
            UI.showFileStatus(ui, `Error loading file: ${error.message}`, true);
        }
    });
    
    // Speed slider
    ui.speedSlider.addEventListener('input', (event) => {
        targetSpeed = parseInt(event.target.value);
        UI.updateSpeedDisplay(ui, targetSpeed);
    });
    
    // Initialize speed display
    UI.updateSpeedDisplay(ui, targetSpeed);
    
    // Memory navigation
    ui.btnGotoMemory.addEventListener('click', () => {
        const addressStr = ui.memoryAddress.value.trim();
        const address = parseInt(addressStr, 16);
        if (!isNaN(address) && address >= 0 && address <= 0xFFFF) {
            UI.updateMemoryViewAt(ui, cpu, address, opcodeManager);
        } else {
            UI.showFileStatus(ui, 'Invalid address format (use hex 0000-FFFF)', true);
        }
    });
    
    ui.btnGotoPC.addEventListener('click', () => {
        UI.updateUI(ui, cpu, running, actualHz, opcodeManager);
    });
    
    ui.memoryAddress.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            ui.btnGotoMemory.click();
        }
    });
}

/**
 * Start the render loop
 */
function startRenderLoop() {
    let lastFrameTime = performance.now();
    let cycleAccumulator = 0;
    
    function renderLoop(currentTime) {
        const deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;
        
        // Execute instructions if running
        if (running && !cpu.halted) {
            // Calculate how many cycles to execute based on elapsed time
            // Convert deltaTime (ms) to seconds, multiply by targetSpeed (Hz)
            const cyclesToExecute = (deltaTime / 1000) * targetSpeed;
            cycleAccumulator += cyclesToExecute;
            
            // Execute at least one instruction if accumulator >= 1
            while (cycleAccumulator >= 1 && !cpu.halted) {
                cpu.step();
                cyclesThisSecond++;
                cycleAccumulator -= 1;
            }
            
            // Check if CPU halted
            if (cpu.halted) {
                running = false;
                console.log('CPU halted');
            }
        }
        
        // Update Hz counter every second
        let hzChanged = false;
        if (currentTime - lastUpdateTime >= 1000) {
            actualHz = cyclesThisSecond;
            cyclesThisSecond = 0;
            lastUpdateTime = currentTime;
            hzChanged = actualHz !== lastActualHz;
            lastActualHz = actualHz;
        }
        
        // Only update UI if something changed
        const pcChanged = cpu.PC !== lastPC;
        const runningStateChanged = running !== lastRunningState;
        const needsFullUpdate = pcChanged || runningStateChanged || hzChanged;
        
        if (needsFullUpdate) {
            UI.updateUI(ui, cpu, running, actualHz, opcodeManager);
            UI.updateControlButtons(ui, running, cpu.halted);
            lastPC = cpu.PC;
            lastRunningState = running;
        } else if (running) {
            // When running, update registers only (not memory view)
            UI.updateRegistersOnly(ui, cpu, running, actualHz);
        }
        
        // Continue loop
        requestAnimationFrame(renderLoop);
    }
    
    requestAnimationFrame(renderLoop);
}

/**
 * Handle errors
 */
window.addEventListener('error', (event) => {
    console.error('Error:', event.error);
    if (ui) {
        UI.showFileStatus(ui, `Error: ${event.error.message}`, true);
    }
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (ui) {
        UI.showFileStatus(ui, `Error: ${event.reason}`, true);
    }
});

// Start the application
init().catch(error => {
    console.error('Failed to initialize:', error);
    alert(`Failed to initialize simulator: ${error.message}`);
});
