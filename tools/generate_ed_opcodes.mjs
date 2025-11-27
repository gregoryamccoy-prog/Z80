// generate_ed_opcodes.mjs - Generate ED-prefixed opcodes
import { writeFileSync } from 'fs';

const opcodes = {};

// 16-bit register pairs for various operations
const regPairs = [
    { code: 0x0, name: 'BC' },
    { code: 0x1, name: 'DE' },
    { code: 0x2, name: 'HL' },
    { code: 0x3, name: 'SP' }
];

// NEG - Negate accumulator (multiple opcodes, same operation)
const negOpcodes = [0x44, 0x4C, 0x54, 0x5C, 0x64, 0x6C, 0x74, 0x7C];
for (const opcode of negOpcodes) {
    const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
    opcodes[opcodeHex] = {
        opcode: opcodeHex,
        mnemonic: 'NEG',
        bytes: 2,
        cycles: 8,
        operation: {
            type: 'arithmetic',
            subtype: 'neg',
            destination: 'A'
        },
        flags: {
            S: '1',
            Z: '1',
            H: '1',
            PV: '1',
            N: '1',
            C: '1'
        },
        description: 'Negate A (two\'s complement)'
    };
}

// RETN - Return from non-maskable interrupt
const retnOpcodes = [0x45, 0x55, 0x65, 0x75];
for (const opcode of retnOpcodes) {
    const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
    opcodes[opcodeHex] = {
        opcode: opcodeHex,
        mnemonic: 'RETN',
        bytes: 2,
        cycles: 14,
        operation: {
            type: 'special',
            subtype: 'retn'
        },
        flags: {
            S: '-',
            Z: '-',
            H: '-',
            PV: '-',
            N: '-',
            C: '-'
        },
        description: 'Return from non-maskable interrupt'
    };
}

// RETI - Return from maskable interrupt
const retiOpcodes = [0x4D, 0x5D, 0x6D, 0x7D];
for (const opcode of retiOpcodes) {
    const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
    opcodes[opcodeHex] = {
        opcode: opcodeHex,
        mnemonic: 'RETI',
        bytes: 2,
        cycles: 14,
        operation: {
            type: 'special',
            subtype: 'reti'
        },
        flags: {
            S: '-',
            Z: '-',
            H: '-',
            PV: '-',
            N: '-',
            C: '-'
        },
        description: 'Return from maskable interrupt'
    };
}

// Interrupt modes: IM 0, IM 1, IM 2
opcodes['0x46'] = {
    opcode: '0x46',
    mnemonic: 'IM 0',
    bytes: 2,
    cycles: 8,
    operation: { type: 'special', subtype: 'im', mode: 0 },
    flags: { S: '-', Z: '-', H: '-', PV: '-', N: '-', C: '-' },
    description: 'Set interrupt mode 0'
};

opcodes['0x56'] = {
    opcode: '0x56',
    mnemonic: 'IM 1',
    bytes: 2,
    cycles: 8,
    operation: { type: 'special', subtype: 'im', mode: 1 },
    flags: { S: '-', Z: '-', H: '-', PV: '-', N: '-', C: '-' },
    description: 'Set interrupt mode 1'
};

opcodes['0x5E'] = {
    opcode: '0x5E',
    mnemonic: 'IM 2',
    bytes: 2,
    cycles: 8,
    operation: { type: 'special', subtype: 'im', mode: 2 },
    flags: { S: '-', Z: '-', H: '-', PV: '-', N: '-', C: '-' },
    description: 'Set interrupt mode 2'
};

// LD I,A and LD A,I
opcodes['0x47'] = {
    opcode: '0x47',
    mnemonic: 'LD I,A',
    bytes: 2,
    cycles: 9,
    operation: { type: 'load', destination: 'I', source: 'A' },
    flags: { S: '-', Z: '-', H: '-', PV: '-', N: '-', C: '-' },
    description: 'Load interrupt vector register I from A'
};

opcodes['0x57'] = {
    opcode: '0x57',
    mnemonic: 'LD A,I',
    bytes: 2,
    cycles: 9,
    operation: { type: 'load', destination: 'A', source: 'I' },
    flags: { S: '1', Z: '1', H: '0', PV: 'IFF', N: '0', C: '-' },
    description: 'Load A from interrupt vector register I'
};

// LD R,A and LD A,R
opcodes['0x4F'] = {
    opcode: '0x4F',
    mnemonic: 'LD R,A',
    bytes: 2,
    cycles: 9,
    operation: { type: 'load', destination: 'R', source: 'A' },
    flags: { S: '-', Z: '-', H: '-', PV: '-', N: '-', C: '-' },
    description: 'Load refresh register R from A'
};

opcodes['0x5F'] = {
    opcode: '0x5F',
    mnemonic: 'LD A,R',
    bytes: 2,
    cycles: 9,
    operation: { type: 'load', destination: 'A', source: 'R' },
    flags: { S: '1', Z: '1', H: '0', PV: 'IFF', N: '0', C: '-' },
    description: 'Load A from refresh register R'
};

// ADC HL,rr - Add with carry to HL
for (const reg of regPairs) {
    const opcode = 0x4A + (reg.code << 4);
    const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
    opcodes[opcodeHex] = {
        opcode: opcodeHex,
        mnemonic: `ADC HL,${reg.name}`,
        bytes: 2,
        cycles: 15,
        operation: {
            type: 'arithmetic',
            subtype: 'adc16',
            destination: 'HL',
            source: reg.name
        },
        flags: {
            S: '1',
            Z: '1',
            H: '1',
            PV: '1',
            N: '0',
            C: '1'
        },
        description: `Add ${reg.name} with carry to HL`
    };
}

// SBC HL,rr - Subtract with carry from HL
for (const reg of regPairs) {
    const opcode = 0x42 + (reg.code << 4);
    const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
    opcodes[opcodeHex] = {
        opcode: opcodeHex,
        mnemonic: `SBC HL,${reg.name}`,
        bytes: 2,
        cycles: 15,
        operation: {
            type: 'arithmetic',
            subtype: 'sbc16',
            destination: 'HL',
            source: reg.name
        },
        flags: {
            S: '1',
            Z: '1',
            H: '1',
            PV: '1',
            N: '1',
            C: '1'
        },
        description: `Subtract ${reg.name} with carry from HL`
    };
}

// LD (nn),rr - Store 16-bit register to memory
for (const reg of regPairs) {
    const opcode = 0x43 + (reg.code << 4);
    const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
    opcodes[opcodeHex] = {
        opcode: opcodeHex,
        mnemonic: `LD (nn),${reg.name}`,
        bytes: 4,
        cycles: 20,
        operation: {
            type: 'load',
            destination: '(immediate16)',
            source: reg.name
        },
        flags: {
            S: '-',
            Z: '-',
            H: '-',
            PV: '-',
            N: '-',
            C: '-'
        },
        description: `Store ${reg.name} to memory at address nn`
    };
}

// LD rr,(nn) - Load 16-bit register from memory
for (const reg of regPairs) {
    const opcode = 0x4B + (reg.code << 4);
    const opcodeHex = `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
    opcodes[opcodeHex] = {
        opcode: opcodeHex,
        mnemonic: `LD ${reg.name},(nn)`,
        bytes: 4,
        cycles: 20,
        operation: {
            type: 'load',
            destination: reg.name,
            source: '(immediate16)'
        },
        flags: {
            S: '-',
            Z: '-',
            H: '-',
            PV: '-',
            N: '-',
            C: '-'
        },
        description: `Load ${reg.name} from memory at address nn`
    };
}

// RRD - Rotate Right Digit (nibbles between A and (HL))
opcodes['0x67'] = {
    opcode: '0x67',
    mnemonic: 'RRD',
    bytes: 2,
    cycles: 18,
    operation: {
        type: 'special',
        subtype: 'rrd'
    },
    flags: {
        S: '1',
        Z: '1',
        H: '0',
        PV: 'P',
        N: '0',
        C: '-'
    },
    description: 'Rotate right digit (nibbles) between A and (HL)'
};

// RLD - Rotate Left Digit (nibbles between A and (HL))
opcodes['0x6F'] = {
    opcode: '0x6F',
    mnemonic: 'RLD',
    bytes: 2,
    cycles: 18,
    operation: {
        type: 'special',
        subtype: 'rld'
    },
    flags: {
        S: '1',
        Z: '1',
        H: '0',
        PV: 'P',
        N: '0',
        C: '-'
    },
    description: 'Rotate left digit (nibbles) between A and (HL)'
};

// Block transfer instructions
opcodes['0xA0'] = {
    opcode: '0xA0',
    mnemonic: 'LDI',
    bytes: 2,
    cycles: 16,
    operation: { type: 'block', subtype: 'ldi' },
    flags: { S: '-', Z: '-', H: '0', PV: '1', N: '0', C: '-' },
    description: 'Load and Increment: (DE)←(HL), DE++, HL++, BC--'
};

opcodes['0xB0'] = {
    opcode: '0xB0',
    mnemonic: 'LDIR',
    bytes: 2,
    cycles: 21, // 16 if BC≠0 after, 21 if BC=0
    operation: { type: 'block', subtype: 'ldir' },
    flags: { S: '-', Z: '-', H: '0', PV: '0', N: '0', C: '-' },
    description: 'Load, Increment and Repeat: LDI until BC=0'
};

opcodes['0xA8'] = {
    opcode: '0xA8',
    mnemonic: 'LDD',
    bytes: 2,
    cycles: 16,
    operation: { type: 'block', subtype: 'ldd' },
    flags: { S: '-', Z: '-', H: '0', PV: '1', N: '0', C: '-' },
    description: 'Load and Decrement: (DE)←(HL), DE--, HL--, BC--'
};

opcodes['0xB8'] = {
    opcode: '0xB8',
    mnemonic: 'LDDR',
    bytes: 2,
    cycles: 21,
    operation: { type: 'block', subtype: 'lddr' },
    flags: { S: '-', Z: '-', H: '0', PV: '0', N: '0', C: '-' },
    description: 'Load, Decrement and Repeat: LDD until BC=0'
};

// Block compare instructions
opcodes['0xA1'] = {
    opcode: '0xA1',
    mnemonic: 'CPI',
    bytes: 2,
    cycles: 16,
    operation: { type: 'block', subtype: 'cpi' },
    flags: { S: '1', Z: '1', H: '1', PV: '1', N: '1', C: '-' },
    description: 'Compare and Increment: CP (HL), HL++, BC--'
};

opcodes['0xB1'] = {
    opcode: '0xB1',
    mnemonic: 'CPIR',
    bytes: 2,
    cycles: 21,
    operation: { type: 'block', subtype: 'cpir' },
    flags: { S: '1', Z: '1', H: '1', PV: '1', N: '1', C: '-' },
    description: 'Compare, Increment and Repeat: CPI until BC=0 or Z=1'
};

opcodes['0xA9'] = {
    opcode: '0xA9',
    mnemonic: 'CPD',
    bytes: 2,
    cycles: 16,
    operation: { type: 'block', subtype: 'cpd' },
    flags: { S: '1', Z: '1', H: '1', PV: '1', N: '1', C: '-' },
    description: 'Compare and Decrement: CP (HL), HL--, BC--'
};

opcodes['0xB9'] = {
    opcode: '0xB9',
    mnemonic: 'CPDR',
    bytes: 2,
    cycles: 21,
    operation: { type: 'block', subtype: 'cpdr' },
    flags: { S: '1', Z: '1', H: '1', PV: '1', N: '1', C: '-' },
    description: 'Compare, Decrement and Repeat: CPD until BC=0 or Z=1'
};

// Write to file
const json = JSON.stringify(opcodes, null, 2);
writeFileSync('./data/opcodes_ed.json', json);

console.log(`Generated ${Object.keys(opcodes).length} ED-prefixed opcodes`);
console.log('File written to: data/opcodes_ed.json');
