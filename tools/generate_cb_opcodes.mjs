// generate_cb_opcodes.mjs - Generate all 256 CB-prefixed opcodes
import { writeFileSync } from 'fs';

const opcodes = {};

// Register names in order for the 8-register pattern
const registers = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];

// Generate rotate/shift instructions (0x00-0x3F)
const rotateShiftOps = [
    { base: 0x00, name: 'RLC', desc: 'Rotate Left Circular' },
    { base: 0x08, name: 'RRC', desc: 'Rotate Right Circular' },
    { base: 0x10, name: 'RL', desc: 'Rotate Left through Carry' },
    { base: 0x18, name: 'RR', desc: 'Rotate Right through Carry' },
    { base: 0x20, name: 'SLA', desc: 'Shift Left Arithmetic' },
    { base: 0x28, name: 'SRA', desc: 'Shift Right Arithmetic' },
    { base: 0x30, name: 'SLL', desc: 'Shift Left Logical (undocumented)' },
    { base: 0x38, name: 'SRL', desc: 'Shift Right Logical' }
];

for (const op of rotateShiftOps) {
    for (let i = 0; i < 8; i++) {
        const opcode = op.base + i;
        const reg = registers[i];
        const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
        
        opcodes[opcodeHex] = {
            opcode: opcodeHex,
            mnemonic: `${op.name} ${reg}`,
            bytes: 2,
            cycles: reg === '(HL)' ? 15 : 8,
            operation: {
                type: 'rotate_shift',
                subtype: op.name.toLowerCase(),
                operand: reg
            },
            flags: {
                S: '1',
                Z: '1',
                H: '0',
                PV: 'P',
                N: '0',
                C: '1'
            },
            description: `${op.desc} on ${reg}`
        };
    }
}

// Generate BIT instructions (0x40-0x7F)
for (let bit = 0; bit < 8; bit++) {
    for (let reg = 0; reg < 8; reg++) {
        const opcode = 0x40 + (bit * 8) + reg;
        const regName = registers[reg];
        const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
        
        opcodes[opcodeHex] = {
            opcode: opcodeHex,
            mnemonic: `BIT ${bit},${regName}`,
            bytes: 2,
            cycles: regName === '(HL)' ? 12 : 8,
            operation: {
                type: 'bit_test',
                bit: bit,
                operand: regName
            },
            flags: {
                S: '1',
                Z: '1',
                H: '1',
                PV: '1',
                N: '0',
                C: '-'
            },
            description: `Test bit ${bit} of ${regName}`
        };
    }
}

// Generate RES instructions (0x80-0xBF)
for (let bit = 0; bit < 8; bit++) {
    for (let reg = 0; reg < 8; reg++) {
        const opcode = 0x80 + (bit * 8) + reg;
        const regName = registers[reg];
        const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
        
        opcodes[opcodeHex] = {
            opcode: opcodeHex,
            mnemonic: `RES ${bit},${regName}`,
            bytes: 2,
            cycles: regName === '(HL)' ? 15 : 8,
            operation: {
                type: 'bit_modify',
                subtype: 'res',
                bit: bit,
                operand: regName
            },
            flags: {
                S: '-',
                Z: '-',
                H: '-',
                PV: '-',
                N: '-',
                C: '-'
            },
            description: `Reset bit ${bit} of ${regName}`
        };
    }
}

// Generate SET instructions (0xC0-0xFF)
for (let bit = 0; bit < 8; bit++) {
    for (let reg = 0; reg < 8; reg++) {
        const opcode = 0xC0 + (bit * 8) + reg;
        const regName = registers[reg];
        const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
        
        opcodes[opcodeHex] = {
            opcode: opcodeHex,
            mnemonic: `SET ${bit},${regName}`,
            bytes: 2,
            cycles: regName === '(HL)' ? 15 : 8,
            operation: {
                type: 'bit_modify',
                subtype: 'set',
                bit: bit,
                operand: regName
            },
            flags: {
                S: '-',
                Z: '-',
                H: '-',
                PV: '-',
                N: '-',
                C: '-'
            },
            description: `Set bit ${bit} of ${regName}`
        };
    }
}

// Write to file
const json = JSON.stringify(opcodes, null, 2);
writeFileSync('./data/opcodes_cb.json', json);

console.log(`Generated ${Object.keys(opcodes).length} CB-prefixed opcodes`);
console.log('File written to: data/opcodes_cb.json');
