const vscode = require('vscode');
const { encode, parse, Keyword, Map } = require('jsedn');

// Create output channel for debugging
const outputChannel = vscode.window.createOutputChannel('EDN Converter Debug');

function debug(message, obj = null) {
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
    if (typeof ednObj === 'string' || typeof ednObj === 'number' || typeof ednObj === 'boolean') {
        return ednObj;
    }
    
    // Handle EDN maps
    if (ednObj && ednObj.keys && ednObj.vals) {
        const result = {};
        const keys = ednObj.keys || [];
        const vals = ednObj.vals || [];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i].name.replace(/^:/, '');  // Remove leading colon from keywords
            const val = convertEdnToObj(vals[i]);
            result[key] = val;
        }
        return result;
    }
    
    // Handle EDN vectors/lists
    if (Array.isArray(ednObj)) {
        return ednObj.map(convertEdnToObj);
    }
    
    return ednObj;
}

function keywordizeObject(obj) {
    debug('Processing object:', obj);
    if (Array.isArray(obj)) {
        debug('Processing array');
        return obj.map(keywordizeObject);
    } else if (obj && typeof obj === 'object') {
        debug('Processing object keys');
        const pairs = [];
        for (const [key, value] of Object.entries(obj)) {
            debug(`Processing key: ${key}`);
            pairs.push(new Keyword(`:${key}`));
            const processedValue = keywordizeObject(value);
            debug(`Processed value for ${key}:`, processedValue);
            pairs.push(processedValue);
        }
        const ednMap = new Map(pairs);
        debug('Created EDN map:', ednMap);
        return ednMap;
    }
    debug('Returning primitive value:', obj);
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
    
    if (Array.isArray(obj)) {
        const items = obj.map(item => flattenFormat(item));
        return `[${items.join(' ')}]`;
    }
    
    return encode(obj);
}

// Shared pretty print function for nice formatting
function prettyFormat(obj, indent = 0) {
    const spaces = ' '.repeat(indent);
    
    if (obj instanceof Map) {
        if (obj.keys.length === 0) return '{}';
        
        const pairs = [];
        let maxKeyLength = 0;
        const encodedPairs = [];
        
        // First pass: encode keys and find max length
        for (let i = 0; i < obj.keys.length; i++) {
            const key = encode(obj.keys[i]);
            encodedPairs.push([key, obj.vals[i]]);
            maxKeyLength = Math.max(maxKeyLength, key.length);
        }
        
        // Second pass: format with proper alignment
        for (let i = 0; i < encodedPairs.length; i++) {
            const [key, val] = encodedPairs[i];
            const padding = ' '.repeat(maxKeyLength - key.length);
            const valIndent = indent + maxKeyLength + 1;
            const formattedVal = prettyFormat(val, valIndent);
            
            if (i === 0) {
                pairs.push(`${key}${padding} ${formattedVal}`);
            } else {
                pairs.push(`${spaces}${key}${padding} ${formattedVal}`);
            }
        }
        
        return `{${pairs.join('\n')}}`;
    }
    
    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        const items = obj.map(item => prettyFormat(item, indent + 4));
        const formattedItems = items.map((item, i) => {
            if (i === 0) return item;
            return ' ' + item;
        });
        return `[${formattedItems.join('\n')}]`;
    }
    
    return encode(obj);
}

function activate(context) {
    let jsonToEdnDisposable = vscode.commands.registerCommand('string-highlighter.convertJsonToEdn', function () {
        processText(vscode.window.activeTextEditor, str => {
            try {
                debug('\n--- Starting JSON to EDN conversion ---');
                debug('Input JSON:', str);
                
                const jsonObj = JSON.parse(str);
                debug('Parsed JSON:', jsonObj);
                
                const keywordized = keywordizeObject(jsonObj);
                debug('Keywordized object:', keywordized);
                
                const result = prettyFormat(keywordized);
                debug('Final pretty-printed result:', result);
                
                return result;
            } catch (error) {
                debug('ERROR:', error);
                debug('Error stack:', error.stack);
                vscode.window.showErrorMessage('Invalid JSON: ' + (error.message || error));
                return str;
            }
        });
    });

    let ednToJsonDisposable = vscode.commands.registerCommand('string-highlighter.convertEdnToJson', function () {
        processText(vscode.window.activeTextEditor, str => {
            try {
                debug('\n--- Starting EDN to JSON conversion ---');
                debug('Input EDN:', str);
                
                const ednObj = parse(str);
                debug('Parsed EDN:', ednObj);
                
                const jsObj = convertEdnToObj(ednObj);
                debug('Converted to JS object:', jsObj);
                
                const result = JSON.stringify(jsObj, null, 2);
                debug('Final JSON:', result);
                
                return result;
            } catch (error) {
                debug('ERROR:', error);
                debug('Error stack:', error.stack);
                vscode.window.showErrorMessage('Invalid EDN: ' + (error.message || error));
                return str;
            }
        });
    });

    let prettyPrintDisposable = vscode.commands.registerCommand('string-highlighter.prettyPrint', function () {
        processText(vscode.window.activeTextEditor, str => {
            try {
                debug('\n--- Pretty printing EDN/JSON ---');
                debug('Input:', str);

                // Try parsing as JSON first
                try {
                    const jsonObj = JSON.parse(str);
                    debug('Parsed as JSON');
                    const result = JSON.stringify(jsonObj, null, 2);
                    debug('Pretty printed JSON:', result);
                    return result;
                } catch (jsonError) {
                    // If JSON parsing fails, try EDN
                    try {
                        debug('Trying EDN parse');
                        const ednObj = parse(str);
                        debug('Parsed as EDN');
                        const result = prettyFormat(ednObj);
                        debug('Pretty printed EDN:', result);
                        return result;
                    } catch (ednError) {
                        throw new Error('Invalid input: must be valid JSON or EDN');
                    }
                }
            } catch (error) {
                debug('ERROR:', error);
                debug('Error stack:', error.stack);
                vscode.window.showErrorMessage('Invalid input: ' + (error.message || error));
                return str;
            }
        });
    });

    let flattenDisposable = vscode.commands.registerCommand('string-highlighter.flatten', function () {
        processText(vscode.window.activeTextEditor, str => {
            try {
                debug('\n--- Flattening data ---');
                debug('Input:', str);

                // Try parsing as JSON first
                try {
                    const jsonObj = JSON.parse(str);
                    debug('Parsed as JSON');
                    return JSON.stringify(jsonObj);
                } catch (jsonError) {
                    // If JSON parsing fails, try EDN
                    try {
                        debug('Trying EDN parse');
                        const ednObj = parse(str);
                        debug('Parsed as EDN');
                        return flattenFormat(ednObj);
                    } catch (ednError) {
                        throw new Error('Invalid input: must be valid JSON or EDN');
                    }
                }
            } catch (error) {
                debug('ERROR:', error);
                debug('Error stack:', error.stack);
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
    deactivate
};
