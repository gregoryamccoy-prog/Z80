// memory.js - Z80 Memory Management System

/**
 * Create a new 64KB memory space
 * @returns {Uint8Array} 64KB memory array
 */
export function createMemory() {
    return new Uint8Array(65536);
}

/**
 * Read a byte from memory
 * @param {Uint8Array} memory - Memory array
 * @param {number} address - 16-bit address (0x0000-0xFFFF)
 * @returns {number} Byte value (0x00-0xFF)
 */
export function readByte(memory, address) {
    return memory[address & 0xFFFF];
}

/**
 * Write a byte to memory
 * @param {Uint8Array} memory - Memory array
 * @param {number} address - 16-bit address (0x0000-0xFFFF)
 * @param {number} value - Byte value (0x00-0xFF)
 */
export function writeByte(memory, address, value) {
    memory[address & 0xFFFF] = value & 0xFF;
}

/**
 * Read a 16-bit word from memory (little-endian)
 * @param {Uint8Array} memory - Memory array
 * @param {number} address - 16-bit address
 * @returns {number} 16-bit word
 */
export function readWord(memory, address) {
    const low = readByte(memory, address);
    const high = readByte(memory, address + 1);
    return (high << 8) | low;
}

/**
 * Write a 16-bit word to memory (little-endian)
 * @param {Uint8Array} memory - Memory array
 * @param {number} address - 16-bit address
 * @param {number} value - 16-bit word
 */
export function writeWord(memory, address, value) {
    writeByte(memory, address, value & 0xFF);
    writeByte(memory, address + 1, (value >> 8) & 0xFF);
}

/**
 * Load memory from text format
 * Supports two formats:
 * 1. "address value" - decimal address, hex value (e.g., "0 3E")
 * 2. "address: byte1 byte2 ..." - hex address with colon, multiple hex bytes (e.g., "0000: 31 00 FF")
 * 
 * @param {Uint8Array} memory - Memory array to load into
 * @param {string} text - Text content to parse
 * @returns {number} Number of bytes loaded
 */
export function loadMemoryMapFromText(memory, text) {
    let bytesLoaded = 0;
    const lines = text.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines and comments (including semicolon comments)
        if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith(';')) {
            continue;
        }
        
        // Remove inline comments (after semicolon)
        const commentIndex = line.indexOf(';');
        if (commentIndex !== -1) {
            line = line.substring(0, commentIndex).trim();
        }
        
        // Check for "address: byte1 byte2 ..." format
        if (line.includes(':')) {
            const colonIndex = line.indexOf(':');
            const addressStr = line.substring(0, colonIndex).trim();
            const bytesStr = line.substring(colonIndex + 1).trim();
            
            const address = parseInt(addressStr, 16); // Parse as hex
            if (isNaN(address) || address < 0 || address > 0xFFFF) {
                continue;
            }
            
            // Parse all bytes after the colon
            const byteStrs = bytesStr.split(/\s+/).filter(s => s.length > 0);
            for (let i = 0; i < byteStrs.length; i++) {
                const value = parseInt(byteStrs[i], 16);
                if (!isNaN(value) && value >= 0 && value <= 0xFF) {
                    writeByte(memory, (address + i) & 0xFFFF, value);
                    bytesLoaded++;
                }
            }
        } else {
            // Parse "address value" format (backwards compatibility)
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
                const address = parseInt(parts[0], 10);
                const value = parseInt(parts[1], 16);
                
                if (!isNaN(address) && !isNaN(value) && address >= 0 && address <= 0xFFFF) {
                    writeByte(memory, address, value);
                    bytesLoaded++;
                }
            }
        }
    }
    
    return bytesLoaded;
}

/**
 * Load binary data into memory
 * @param {Uint8Array} memory - Memory array
 * @param {Uint8Array} data - Binary data to load
 * @param {number} startAddress - Starting address (default 0)
 * @returns {number} Number of bytes loaded
 */
export function loadBinary(memory, data, startAddress = 0) {
    let bytesLoaded = 0;
    
    for (let i = 0; i < data.length; i++) {
        const address = (startAddress + i) & 0xFFFF;
        writeByte(memory, address, data[i]);
        bytesLoaded++;
        
        // Stop if we've wrapped around
        if (address === 0xFFFF) break;
    }
    
    return bytesLoaded;
}

/**
 * Clear all memory (fill with zeros)
 * @param {Uint8Array} memory - Memory array to clear
 */
export function clearMemory(memory) {
    memory.fill(0);
}

/**
 * Get a slice of memory as a hex dump string
 * @param {Uint8Array} memory - Memory array
 * @param {number} startAddress - Start address
 * @param {number} length - Number of bytes to dump
 * @returns {string} Hex dump string
 */
export function getMemoryDump(memory, startAddress, length) {
    const lines = [];
    const bytesPerLine = 16;
    
    for (let i = 0; i < length; i += bytesPerLine) {
        const address = (startAddress + i) & 0xFFFF;
        const addressStr = address.toString(16).toUpperCase().padStart(4, '0');
        
        const bytes = [];
        for (let j = 0; j < bytesPerLine && (i + j) < length; j++) {
            const byte = readByte(memory, address + j);
            bytes.push(byte.toString(16).toUpperCase().padStart(2, '0'));
        }
        
        lines.push(`${addressStr}: ${bytes.join(' ')}`);
    }
    
    return lines.join('\n');
}
