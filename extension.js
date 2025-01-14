const vscode = require('vscode');
const { encode, parse, Keyword, Map, Vector, List } = require('jsedn');

// Create output channel for debugging
const outputChannel = vscode.window.createOutputChannel('EDN Converter Debug');

function _debug(message, obj = null) {
    if (obj) {
        outputChannel.appendLine(`${message}: ${JSON.stringify(obj, null, 2)}`);
    } else {
        outputChannel.appendLine(message);
    }
}

function processText(editor, transformFn) {
    if (!editor) {
        vscode.window.showInformationMessage('No editor is active');
        return;
    }

    const selections = editor.selections;
    
    if (selections.length === 0 || selections.every(sel => sel.isEmpty)) {
        vscode.window.showInformationMessage('Please select some text first');
        return;
    }

    editor.edit(editBuilder => {
        selections.forEach(selection => {
            const text = editor.document.getText(selection);
            const newText = transformFn(text);
            
            // Create decoration type for highlighting
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: 'rgba(255, 255, 0, 0.3)', // Light yellow background
                border: '1px solid yellow'
            });
            
            // Apply decoration
            editor.setDecorations(decorationType, [selection]);
            
            // Remove decoration after 2 seconds
            setTimeout(() => {
                decorationType.dispose();
            }, 2000);

            editBuilder.replace(selection, newText);
        });
    });

    const selectionCount = selections.length;
    vscode.window.showInformationMessage(
        `Converted ${selectionCount} ${selectionCount === 1 ? 'selection' : 'selections'}`
    );
}

function convertEdnToObj(ednObj) {
    // Handle primitives
    if (typeof ednObj === 'string' || typeof ednObj === 'number' || typeof ednObj === 'boolean') {
        return ednObj;
    }

    // Handle EDN maps
    if (ednObj instanceof Map) {
        const result = {};
        const keys = ednObj.keys || [];
        const vals = ednObj.vals || [];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i].name.replace(/^:/, '');
            result[key] = convertEdnToObj(vals[i]);
        }
        return result;
    }

    // Handle vectors/lists
    if (ednObj instanceof Vector || ednObj instanceof List) {
        return ednObj.val.map(convertEdnToObj);
    }

    // Handle arrays
    if (Array.isArray(ednObj)) {
        return ednObj.map(convertEdnToObj);
    }

    return ednObj;
}

function keywordizeObject(obj) {
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(keywordizeObject);
    }

    // Handle objects
    if (obj && typeof obj === 'object') {
        const pairs = [];
        for (const [key, value] of Object.entries(obj)) {
            pairs.push(new Keyword(`:${key}`));
            pairs.push(keywordizeObject(value));
        }
        return new Map(pairs);
    }

    // Handle primitives
    return obj;
}

function flattenFormat(obj) {
    if (obj instanceof Map) {
        const pairs = [];
        for (let i = 0; i < obj.keys.length; i++) {
            const key = encode(obj.keys[i]);
            const val = flattenFormat(obj.vals[i]);
            pairs.push(`${key} ${val}`);
        }
        return `{${pairs.join(' ')}}`;
    }
    
    if (obj instanceof Vector || obj instanceof List || Array.isArray(obj)) {
        const items = obj.map(item => flattenFormat(item));
        return `[${items.join(' ')}]`;
    }
    
    return encode(obj);
}

function formatEdn(obj) {
    if (obj instanceof Map) {
        if (obj.keys.length === 0) return '{}';
        
        const pairs = [];
        for (let i = 0; i < obj.keys.length; i++) {
            const key = encode(obj.keys[i]);
            const val = formatEdn(obj.vals[i]);
            pairs.push(`${key} ${val}`);
        }
        return `{${pairs.join(' ')}}`;
    }
    
    if (obj instanceof Vector || obj instanceof List || Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        const items = obj.map(item => formatEdn(item));
        return `[${items.join(' ')}]`;
    }
    
    return encode(obj);
}

function activate(context) {
    let jsonToEdnDisposable = vscode.commands.registerCommand('string-highlighter.convertJsonToEdn', function () {
        processText(vscode.window.activeTextEditor, str => {
            try {
                const jsonObj = JSON.parse(str);
                const keywordized = keywordizeObject(jsonObj);
                const result = formatEdn(keywordized);
                return result;
            } catch (error) {
                vscode.window.showErrorMessage('Invalid JSON: ' + (error.message || error));
                return str;
            }
        });
    });

    let ednToJsonDisposable = vscode.commands.registerCommand('string-highlighter.convertEdnToJson', function () {
        processText(vscode.window.activeTextEditor, str => {
            try {
                const ednObj = parse(str);
                const jsObj = convertEdnToObj(ednObj);
                return JSON.stringify(jsObj, null, 2);
            } catch (error) {
                vscode.window.showErrorMessage('Invalid EDN: ' + (error.message || error));
                return str;
            }
        });
    });

    let prettyPrintDisposable = vscode.commands.registerCommand('string-highlighter.prettyPrint', function () {
        processText(vscode.window.activeTextEditor, str => {
            try {
                // Try parsing as JSON first
                try {
                    const jsonObj = JSON.parse(str);
                    return JSON.stringify(jsonObj, null, 2);
                } catch (jsonError) {
                    // If JSON parsing fails, try EDN
                    try {
                        const ednObj = parse(str);
                        return formatEdn(ednObj);
                    } catch (ednError) {
                        throw new Error('Invalid input: must be valid JSON or EDN');
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage('Invalid input: ' + (error.message || error));
                return str;
            }
        });
    });

    let flattenDisposable = vscode.commands.registerCommand('string-highlighter.flatten', function () {
        processText(vscode.window.activeTextEditor, str => {
            try {
                // Try parsing as JSON first
                try {
                    const jsonObj = JSON.parse(str);
                    return JSON.stringify(jsonObj);
                } catch (jsonError) {
                    // If JSON parsing fails, try EDN
                    try {
                        const ednObj = parse(str);
                        return flattenFormat(ednObj);
                    } catch (ednError) {
                        throw new Error('Invalid input: must be valid JSON or EDN');
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
                return str;
            }
        });
    });

    context.subscriptions.push(
        jsonToEdnDisposable,
        ednToJsonDisposable,
        prettyPrintDisposable,
        flattenDisposable
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
    // Export core functions for testing
    convertEdnToObj,
    keywordizeObject,
    flattenFormat,
    formatEdn,
    // Helper for testing transform functions
    _transformFunctions: {
        jsonToEdn: str => {
            const jsonObj = JSON.parse(str);
            const keywordized = keywordizeObject(jsonObj);
            return formatEdn(keywordized);
        },
        ednToJson: str => {
            const ednObj = parse(str);
            const jsObj = convertEdnToObj(ednObj);
            return JSON.stringify(jsObj, null, 2);
        },
        prettyPrintJson: str => {
            const jsonObj = JSON.parse(str);
            return JSON.stringify(jsonObj, null, 2);
        },
        prettyPrintEdn: str => {
            const ednObj = parse(str);
            return formatEdn(ednObj);
        },
        flattenJson: str => {
            const jsonObj = JSON.parse(str);
            return JSON.stringify(jsonObj);
        },
        flattenEdn: str => {
            const ednObj = parse(str);
            return flattenFormat(ednObj);
        }
    }
};
