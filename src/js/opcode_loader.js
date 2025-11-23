// opcode_loader.js - Loads and manages Z80 opcode definitions from JSON

/**
 * OpcodeManager - Manages opcode lookup tables
 */
export class OpcodeManager {
    constructor() {
        this.unprefixed = new Array(256);
        this.cb = new Array(256);
        this.ed = new Array(256);
        this.dd = new Array(256);
        this.fd = new Array(256);
        this.ddcb = new Array(256);
        this.fdcb = new Array(256);
        this.loaded = false;
    }
    
    /**
     * Load all opcode definition files
     * @returns {Promise<void>}
     */
    async loadAll() {
        try {
            // Load unprefixed opcodes (required for MVP)
            const unprefixedResponse = await fetch('data/opcodes_unprefixed.json');
            if (!unprefixedResponse.ok) {
                throw new Error(`Failed to load data/opcodes_unprefixed.json: ${unprefixedResponse.status}`);
            }
            const unprefixedData = await unprefixedResponse.json();
            this.buildLookupTable(this.unprefixed, unprefixedData);
            
            // Try to load other opcode files (optional for MVP)
            try {
                const cbResponse = await fetch('data/opcodes_cb.json');
                if (cbResponse.ok) {
                    const cbData = await cbResponse.json();
                    this.buildLookupTable(this.cb, cbData);
                }
            } catch (e) {
                console.log('data/opcodes_cb.json not found (optional for MVP)');
            }
            
            try {
                const edResponse = await fetch('data/opcodes_ed.json');
                if (edResponse.ok) {
                    const edData = await edResponse.json();
                    this.buildLookupTable(this.ed, edData);
                }
            } catch (e) {
                console.log('data/opcodes_ed.json not found (optional for MVP)');
            }
            
            try {
                const ddfdResponse = await fetch('data/opcodes_ddfd.json');
                if (ddfdResponse.ok) {
                    const ddfdData = await ddfdResponse.json();
                    this.buildLookupTable(this.dd, ddfdData);
                    this.buildLookupTable(this.fd, ddfdData);
                }
            } catch (e) {
                console.log('data/opcodes_ddfd.json not found (optional for MVP)');
            }
            
            this.loaded = true;
            console.log('Opcode tables loaded successfully');
        } catch (error) {
            console.error('Error loading opcode tables:', error);
            throw error;
        }
    }
    
    /**
     * Build lookup table from JSON object
     * @param {Array} table - Lookup table array
     * @param {object} jsonData - JSON opcode definitions
     */
    buildLookupTable(table, jsonData) {
        for (const [opcodeStr, definition] of Object.entries(jsonData)) {
            const opcodeValue = parseInt(opcodeStr, 16);
            if (!isNaN(opcodeValue) && opcodeValue >= 0 && opcodeValue <= 0xFF) {
                table[opcodeValue] = definition;
            }
        }
    }
    
    /**
     * Get instruction definition for an opcode
     * @param {string|null} prefix - Prefix byte ('CB', 'ED', 'DD', 'FD', 'DDCB', 'FDCB', or null)
     * @param {number} opcode - Opcode byte (0x00-0xFF)
     * @returns {object|null} Opcode definition or null if not found
     */
    getInstruction(prefix, opcode) {
        if (!this.loaded) {
            throw new Error('Opcode tables not loaded. Call loadAll() first.');
        }
        
        let table;
        switch (prefix) {
            case null:
            case 'unprefixed':
                table = this.unprefixed;
                break;
            case 'CB':
                table = this.cb;
                break;
            case 'ED':
                table = this.ed;
                break;
            case 'DD':
                table = this.dd;
                break;
            case 'FD':
                table = this.fd;
                break;
            case 'DDCB':
                table = this.ddcb;
                break;
            case 'FDCB':
                table = this.fdcb;
                break;
            default:
                return null;
        }
        
        return table[opcode] || null;
    }
    
    /**
     * Check if an opcode is defined
     * @param {string|null} prefix - Prefix byte
     * @param {number} opcode - Opcode byte
     * @returns {boolean} True if opcode is defined
     */
    hasInstruction(prefix, opcode) {
        return this.getInstruction(prefix, opcode) !== null;
    }
    
    /**
     * Get all defined opcodes for a prefix
     * @param {string|null} prefix - Prefix byte
     * @returns {Array} Array of {opcode, definition} objects
     */
    getAllInstructions(prefix = null) {
        let table;
        switch (prefix) {
            case null:
            case 'unprefixed':
                table = this.unprefixed;
                break;
            case 'CB':
                table = this.cb;
                break;
            case 'ED':
                table = this.ed;
                break;
            case 'DD':
                table = this.dd;
                break;
            case 'FD':
                table = this.fd;
                break;
            case 'DDCB':
                table = this.ddcb;
                break;
            case 'FDCB':
                table = this.fdcb;
                break;
            default:
                return [];
        }
        
        const instructions = [];
        for (let i = 0; i < 256; i++) {
            if (table[i]) {
                instructions.push({
                    opcode: i,
                    definition: table[i]
                });
            }
        }
        return instructions;
    }
    
    /**
     * Get statistics about loaded opcodes
     * @returns {object} Statistics object
     */
    getStats() {
        const countDefined = (table) => table.filter(x => x !== undefined).length;
        
        return {
            unprefixed: countDefined(this.unprefixed),
            cb: countDefined(this.cb),
            ed: countDefined(this.ed),
            dd: countDefined(this.dd),
            fd: countDefined(this.fd),
            ddcb: countDefined(this.ddcb),
            fdcb: countDefined(this.fdcb),
            total: countDefined(this.unprefixed) + 
                   countDefined(this.cb) + 
                   countDefined(this.ed) + 
                   countDefined(this.dd) + 
                   countDefined(this.fd) +
                   countDefined(this.ddcb) +
                   countDefined(this.fdcb)
        };
    }
}
