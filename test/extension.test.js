const { Map, Keyword } = require('jsedn');
const { 
    convertEdnToObj,
    keywordizeObject,
    flattenFormat,
    formatEdn,
    _transformFunctions: {
        jsonToEdn,
        ednToJson,
        prettyPrintJson,
        // Pretty printing for EDN is handled by formatEdn
        flattenJson,
        flattenEdn
    }
} = require('../extension');

// Mock vscode module
jest.mock('vscode');

describe('Core Functions', () => {
    describe('convertEdnToObj', () => {
        test('converts primitive types', () => {
            expect(convertEdnToObj('test')).toBe('test');
            expect(convertEdnToObj(42)).toBe(42);
            expect(convertEdnToObj(true)).toBe(true);
        });

        test('converts simple EDN map', () => {
            const ednMap = new Map([
                new Keyword(':name'),
                'test',
                new Keyword(':value'),
                42
            ]);
            expect(convertEdnToObj(ednMap)).toEqual({
                name: 'test',
                value: 42
            });
        });

        test('converts nested EDN map', () => {
            const nestedMap = new Map([
                new Keyword(':user'),
                new Map([
                    new Keyword(':id'),
                    1,
                    new Keyword(':settings'),
                    new Map([
                        new Keyword(':theme'),
                        'dark'
                    ])
                ])
            ]);
            expect(convertEdnToObj(nestedMap)).toEqual({
                user: {
                    id: 1,
                    settings: {
                        theme: 'dark'
                    }
                }
            });
        });

        test('converts EDN arrays', () => {
            const ednArray = [1, 'test', new Map([new Keyword(':key'), 'value'])];
            expect(convertEdnToObj(ednArray)).toEqual([1, 'test', { key: 'value' }]);
        });
    });

    describe('keywordizeObject', () => {
        test('converts simple object to EDN map', () => {
            const obj = { name: 'test', value: 42 };
            const result = keywordizeObject(obj);
            expect(result instanceof Map).toBe(true);
            expect(result.keys.length).toBe(2);
            expect(result.keys[0].name).toBe(':name');
            expect(result.vals[0]).toBe('test');
            expect(result.keys[1].name).toBe(':value');
            expect(result.vals[1]).toBe(42);
        });

        test('converts nested object to nested EDN map', () => {
            const obj = {
                user: {
                    id: 1,
                    settings: { theme: 'dark' }
                }
            };
            const result = keywordizeObject(obj);
            expect(result instanceof Map).toBe(true);
            expect(result.keys[0].name).toBe(':user');
            expect(result.vals[0] instanceof Map).toBe(true);
        });

        test('converts arrays in objects', () => {
            const obj = { items: [1, 2, { name: 'test' }] };
            const result = keywordizeObject(obj);
            expect(result.keys[0].name).toBe(':items');
            expect(Array.isArray(result.vals[0])).toBe(true);
            expect(result.vals[0][2] instanceof Map).toBe(true);
        });
    });

    describe('Format Functions', () => {
        describe('flattenFormat', () => {
            test('flattens empty EDN map', () => {
                const ednMap = new Map([]);
                expect(flattenFormat(ednMap)).toBe('{}');
            });

            test('flattens simple EDN map', () => {
                const ednMap = new Map([
                    new Keyword(':name'),
                    'test',
                    new Keyword(':value'),
                    42
                ]);
                expect(flattenFormat(ednMap)).toBe('{:name "test" :value 42}');
            });

            test('flattens nested EDN map', () => {
                const nestedMap = new Map([
                    new Keyword(':user'),
                    new Map([
                        new Keyword(':id'),
                        1,
                        new Keyword(':settings'),
                        new Map([
                            new Keyword(':theme'),
                            'dark'
                        ])
                    ])
                ]);
                expect(flattenFormat(nestedMap)).toBe('{:user {:id 1 :settings {:theme "dark"}}}');
            });

            test('flattens EDN array', () => {
                const array = [1, 'test', new Map([new Keyword(':key'), 'value'])];
                expect(flattenFormat(array)).toBe('[1 "test" {:key "value"}]');
            });
        });

        describe('formatEdn', () => {
            test('formats empty EDN map', () => {
                const ednMap = new Map([]);
                expect(formatEdn(ednMap)).toBe('{}');
            });

            test('formats simple EDN map', () => {
                const ednMap = new Map([
                    new Keyword(':name'),
                    'test',
                    new Keyword(':value'),
                    42
                ]);
                expect(formatEdn(ednMap)).toBe('{:name "test" :value 42}');
            });

            test('formats nested EDN map', () => {
                const nestedMap = new Map([
                    new Keyword(':user'),
                    new Map([
                        new Keyword(':id'),
                        1,
                        new Keyword(':settings'),
                        new Map([
                            new Keyword(':theme'),
                            'dark'
                        ])
                    ])
                ]);
                expect(formatEdn(nestedMap)).toBe('{:user {:id 1 :settings {:theme "dark"}}}');
            });

            test('formats EDN array', () => {
                const array = [1, 'test', new Map([new Keyword(':key'), 'value'])];
                expect(formatEdn(array)).toBe('[1 "test" {:key "value"}]');
            });
        });
    });

    describe('Transform Functions', () => {
        const simpleJson = '{"name":"test","value":42}';
        const simpleEdn = '{:name "test" :value 42}';
        const complexJson = '{"user":{"id":1,"settings":{"theme":"dark"}}}';
        const complexEdn = '{:user {:id 1 :settings {:theme "dark"}}}';

        describe('JSON to EDN', () => {
            test('converts simple JSON to EDN', () => {
                const result = jsonToEdn(simpleJson);
                expect(result).toMatch(/:name\s+"test"/);
                expect(result).toMatch(/:value\s+42/);
            });

            test('converts complex JSON to EDN', () => {
                const result = jsonToEdn(complexJson);
                expect(result).toMatch(/:user\s+{/);
                expect(result).toMatch(/:theme\s+"dark"/);
            });

            test('handles invalid JSON', () => {
                expect(() => jsonToEdn('invalid')).toThrow();
            });
        });

        describe('EDN to JSON', () => {
            test('converts simple EDN to JSON', () => {
                const result = ednToJson(simpleEdn);
                const parsed = JSON.parse(result);
                expect(parsed).toEqual({
                    name: 'test',
                    value: 42
                });
            });

            test('converts complex EDN to JSON', () => {
                const result = ednToJson(complexEdn);
                const parsed = JSON.parse(result);
                expect(parsed).toEqual({
                    user: {
                        id: 1,
                        settings: {
                            theme: 'dark'
                        }
                    }
                });
            });
        });

        describe('Pretty Print', () => {
            test('pretty prints JSON', () => {
                const result = prettyPrintJson(complexJson);
                expect(result).toContain('\n');
                expect(result).toContain('  ');
            });
        });

        describe('Flatten', () => {
            test('flattens JSON', () => {
                const result = flattenJson(complexJson);
                expect(result).not.toContain('\n');
                expect(result).not.toContain('  ');
            });

            test('flattens EDN', () => {
                const result = flattenEdn(complexEdn);
                expect(result).not.toContain('\n');
                expect(result).not.toContain('  ');
            });
        });

        describe('Round Trip Conversion', () => {
            test('converts complex menu JSON to EDN and back', () => {
                const menuJson = `{
    "menu": {
        "id": "file",
        "value": "File",
        "popup": {
            "menuitem": [
                {
                    "value": "New",
                    "onclick": "CreateNewDoc()"
                },
                {
                    "value": "Open",
                    "onclick": "OpenDoc()"
                },
                {
                    "value": "Close",
                    "onclick": "CloseDoc()"
                }
            ]
        }
    }
}`;
                const edn = jsonToEdn(menuJson);
                const roundTripJson = ednToJson(edn);
                
                // Compare the objects rather than strings to ignore formatting differences
                expect(JSON.parse(roundTripJson)).toEqual(JSON.parse(menuJson));
            });
        });
    });
});
