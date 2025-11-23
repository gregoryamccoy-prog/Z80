// ui.js - UI Management and Display Updates

/**
 * Initialize UI and return references to DOM elements
 * @returns {object} UI element references
 */
export function initUI() {
    return {
        // Status
        cpuStatus: document.getElementById('cpu-status'),
        clockSpeed: document.getElementById('clock-speed'),
        fileStatus: document.getElementById('file-status'),
        speedValue: document.getElementById('speed-value'),
        
        // Controls
        btnRun: document.getElementById('btn-run'),
        btnPause: document.getElementById('btn-pause'),
        btnStep: document.getElementById('btn-step'),
        btnReset: document.getElementById('btn-reset'),
        fileInput: document.getElementById('file-input'),
        speedSlider: document.getElementById('speed-slider'),
        
        // 8-bit registers
        regA: document.getElementById('reg-a'),
        regF: document.getElementById('reg-f'),
        regB: document.getElementById('reg-b'),
        regC: document.getElementById('reg-c'),
        regD: document.getElementById('reg-d'),
        regE: document.getElementById('reg-e'),
        regH: document.getElementById('reg-h'),
        regL: document.getElementById('reg-l'),
        
        // 16-bit registers
        regPC: document.getElementById('reg-pc'),
        regSP: document.getElementById('reg-sp'),
        
        // Flags
        flagS: document.getElementById('flag-s'),
        flagZ: document.getElementById('flag-z'),
        flagH: document.getElementById('flag-h'),
        flagPV: document.getElementById('flag-pv'),
        flagN: document.getElementById('flag-n'),
        flagC: document.getElementById('flag-c'),
        
        // Memory view
        memoryView: document.getElementById('memory-view'),
        memoryAddress: document.getElementById('memory-address'),
        btnGotoMemory: document.getElementById('btn-goto-memory'),
        btnGotoPC: document.getElementById('btn-goto-pc')
    };
}

/**
 * Update all UI elements with current CPU state
 * @param {object} ui - UI element references
 * @param {object} cpu - CPU instance
 * @param {boolean} running - Is CPU running
 * @param {number} actualHz - Actual execution speed in Hz
 * @param {object} opcodeManager - Opcode manager instance (optional)
 */
export function updateUI(ui, cpu, running, actualHz = 0, opcodeManager = null) {
    const state = cpu.getState();
    
    // Update status
    if (cpu.halted) {
        ui.cpuStatus.textContent = 'HALTED';
        ui.cpuStatus.className = 'status-indicator halted';
    } else if (running) {
        ui.cpuStatus.textContent = 'RUNNING';
        ui.cpuStatus.className = 'status-indicator running';
    } else {
        ui.cpuStatus.textContent = 'PAUSED';
        ui.cpuStatus.className = 'status-indicator paused';
    }
    
    // Update clock speed
    if (actualHz > 0) {
        if (actualHz >= 1000000) {
            ui.clockSpeed.textContent = `${(actualHz / 1000000).toFixed(2)} MHz`;
        } else if (actualHz >= 1000) {
            ui.clockSpeed.textContent = `${(actualHz / 1000).toFixed(2)} kHz`;
        } else {
            ui.clockSpeed.textContent = `${actualHz.toFixed(0)} Hz`;
        }
    } else {
        ui.clockSpeed.textContent = '0 Hz';
    }
    
    // Update 8-bit registers
    ui.regA.textContent = toHex8(state.A);
    ui.regF.textContent = toHex8(state.F);
    ui.regB.textContent = toHex8(state.B);
    ui.regC.textContent = toHex8(state.C);
    ui.regD.textContent = toHex8(state.D);
    ui.regE.textContent = toHex8(state.E);
    ui.regH.textContent = toHex8(state.H);
    ui.regL.textContent = toHex8(state.L);
    
    // Update 16-bit registers
    ui.regPC.textContent = toHex16(state.PC);
    ui.regSP.textContent = toHex16(state.SP);
    
    // Update flags
    updateFlag(ui.flagS, state.flags.S);
    updateFlag(ui.flagZ, state.flags.Z);
    updateFlag(ui.flagH, state.flags.H);
    updateFlag(ui.flagPV, state.flags.PV);
    updateFlag(ui.flagN, state.flags.N);
    updateFlag(ui.flagC, state.flags.C);
    
    // Update memory view
    updateMemoryView(ui.memoryView, cpu, state.PC, opcodeManager);
}

/**
 * Update only registers (faster, doesn't regenerate memory view)
 * @param {object} ui - UI element references
 * @param {object} cpu - CPU instance
 * @param {boolean} running - Is CPU running
 * @param {number} actualHz - Actual execution speed in Hz
 */
export function updateRegistersOnly(ui, cpu, running, actualHz = 0) {
    const state = cpu.getState();
    
    // Update status
    if (cpu.halted) {
        ui.cpuStatus.textContent = 'HALTED';
        ui.cpuStatus.className = 'status-indicator halted';
    } else if (running) {
        ui.cpuStatus.textContent = 'RUNNING';
        ui.cpuStatus.className = 'status-indicator running';
    } else {
        ui.cpuStatus.textContent = 'PAUSED';
        ui.cpuStatus.className = 'status-indicator paused';
    }
    
    // Update clock speed
    if (actualHz > 0) {
        if (actualHz >= 1000000) {
            ui.clockSpeed.textContent = `${(actualHz / 1000000).toFixed(2)} MHz`;
        } else if (actualHz >= 1000) {
            ui.clockSpeed.textContent = `${(actualHz / 1000).toFixed(2)} kHz`;
        } else {
            ui.clockSpeed.textContent = `${actualHz.toFixed(0)} Hz`;
        }
    } else {
        ui.clockSpeed.textContent = '0 Hz';
    }
    
    // Update 8-bit registers
    ui.regA.textContent = toHex8(state.A);
    ui.regF.textContent = toHex8(state.F);
    ui.regB.textContent = toHex8(state.B);
    ui.regC.textContent = toHex8(state.C);
    ui.regD.textContent = toHex8(state.D);
    ui.regE.textContent = toHex8(state.E);
    ui.regH.textContent = toHex8(state.H);
    ui.regL.textContent = toHex8(state.L);
    
    // Update 16-bit registers
    ui.regPC.textContent = toHex16(state.PC);
    ui.regSP.textContent = toHex16(state.SP);
    
    // Update flags
    updateFlag(ui.flagS, state.flags.S);
    updateFlag(ui.flagZ, state.flags.Z);
    updateFlag(ui.flagH, state.flags.H);
    updateFlag(ui.flagPV, state.flags.PV);
    updateFlag(ui.flagN, state.flags.N);
    updateFlag(ui.flagC, state.flags.C);
    
    // Don't update memory view - preserves hover state
}

/**
 * Update a single flag LED
 * @param {HTMLElement} element - Flag element
 * @param {number} value - Flag value (0 or 1)
 */
function updateFlag(element, value) {
    element.textContent = value.toString();
    if (value) {
        element.classList.add('active');
    } else {
        element.classList.remove('active');
    }
}

/**
 * Update memory view showing bytes and disassembly around PC
 * @param {HTMLElement} container - Memory view container
 * @param {object} cpu - CPU instance
 * @param {number} pc - Program counter
 * @param {object} opcodeManager - Opcode manager for disassembly
 */
function updateMemoryView(container, cpu, pc, opcodeManager) {
    const startAddr = Math.max(0, pc - 16);
    updateMemoryViewCustom(container, cpu, startAddr, opcodeManager, pc);
}

/**
 * Convert number to 2-digit hex string
 * @param {number} value - Value to convert
 * @returns {string} Hex string
 */
function toHex8(value) {
    return value.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Convert number to 4-digit hex string
 * @param {number} value - Value to convert
 * @returns {string} Hex string
 */
function toHex16(value) {
    return value.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Update memory view starting at a specific address
 * @param {object} ui - UI element references
 * @param {object} cpu - CPU instance
 * @param {number} startAddr - Starting address to display
 * @param {object} opcodeManager - Opcode manager instance
 */
export function updateMemoryViewAt(ui, cpu, startAddr, opcodeManager) {
    updateMemoryViewCustom(ui.memoryView, cpu, startAddr, opcodeManager, cpu.PC);
}

/**
 * Update memory view with custom start address
 * @param {HTMLElement} container - Container element
 * @param {object} cpu - CPU instance
 * @param {number} startAddr - Starting address
 * @param {object} opcodeManager - Opcode manager
 * @param {number} pc - Current PC for highlighting
 */
function updateMemoryViewCustom(container, cpu, startAddr, opcodeManager, pc) {
    const lines = [];
    const endAddr = Math.min(0xFFFF, startAddr + 64);
    
    let addr = startAddr;
    while (addr <= endAddr) {
        const opcode = cpu.readByte(addr);
        const isCurrent = addr === pc;
        
        // Get instruction info
        let mnemonic = '???';
        let bytes = [opcode];
        let instrLength = 1;
        
        if (opcodeManager && opcodeManager.loaded) {
            const opcodeDef = opcodeManager.getInstruction(null, opcode);
            if (opcodeDef) {
                mnemonic = opcodeDef.mnemonic;
                instrLength = opcodeDef.bytes;
                
                // Read additional bytes
                for (let i = 1; i < instrLength && (addr + i) <= endAddr; i++) {
                    bytes.push(cpu.readByte(addr + i));
                }
                
                // Replace 'n' and 'e' with actual values
                if (instrLength === 2 && bytes.length === 2) {
                    mnemonic = mnemonic.replace('n', toHex8(bytes[1]));
                    mnemonic = mnemonic.replace('e', toHex8(bytes[1]));
                } else if (instrLength === 3 && bytes.length === 3) {
                    const word = (bytes[2] << 8) | bytes[1];
                    mnemonic = mnemonic.replace('nn', toHex16(word));
                }
            }
        }
        
        // Format bytes as hex
        const bytesStr = bytes.map(b => toHex8(b)).join(' ').padEnd(11, ' ');
        
        lines.push(`<div class="memory-line${isCurrent ? ' current-line' : ''}">
            <span class="memory-address">${toHex16(addr)}</span>
            <span class="memory-bytes">${bytesStr}</span>
            <span class="memory-mnemonic">${mnemonic}</span>
        </div>`);
        
        addr += instrLength;
    }
    
    container.innerHTML = lines.join('');
}

/**
 * Show a message in the file status area
 * @param {object} ui - UI element references
 * @param {string} message - Message to display
 * @param {boolean} isError - Is this an error message
 */
export function showFileStatus(ui, message, isError = false) {
    ui.fileStatus.textContent = message;
    ui.fileStatus.style.color = isError ? '#f48771' : '#4ec9b0';
    
    // Clear after 3 seconds
    setTimeout(() => {
        ui.fileStatus.textContent = '';
    }, 3000);
}

/**
 * Enable/disable control buttons based on state
 * @param {object} ui - UI element references
 * @param {boolean} running - Is CPU running
 * @param {boolean} halted - Is CPU halted
 */
export function updateControlButtons(ui, running, halted) {
    ui.btnRun.disabled = running || halted;
    ui.btnPause.disabled = !running;
    ui.btnStep.disabled = running || halted;
    ui.btnReset.disabled = false;
}

/**
 * Update speed display
 * @param {object} ui - UI element references
 * @param {number} speed - Speed in Hz
 */
export function updateSpeedDisplay(ui, speed) {
    if (speed >= 1000) {
        ui.speedValue.textContent = `${(speed / 1000).toFixed(1)} kHz`;
    } else {
        ui.speedValue.textContent = `${speed} Hz`;
    }
}
