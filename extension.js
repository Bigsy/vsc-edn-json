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
                
                const result = encode(keywordized);
                debug('Final result:', result);
                
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

    let prettyPrintEdnDisposable = vscode.commands.registerCommand('string-highlighter.prettyPrintEdn', function () {
        processText(vscode.window.activeTextEditor, str => {
            try {
                debug('\n--- Pretty printing EDN ---');
                debug('Input EDN:', str);
                
                const ednObj = parse(str);
                debug('Parsed EDN:', ednObj);

                // Custom pretty print function
                function prettyFormat(obj, indent = 0) {
                    const spaces = ' '.repeat(indent);
                    
                    if (obj instanceof Map) {
                        const pairs = [];
                        for (let i = 0; i < obj.keys.length; i++) {
                            const key = encode(obj.keys[i]);
                            const val = prettyFormat(obj.vals[i], indent + 4);
                            pairs.push(`${key} ${val}`);
                        }
                        if (pairs.length === 0) return '{}';
                        const formattedPairs = pairs.map((p, i) => {
                            if (i === 0) return p; // First pair on same line as opening brace
                            return ' ' + p; // One space indent for subsequent pairs
                        });
                        return `{${formattedPairs.join('\n')}}`;
                    }
                    
                    if (Array.isArray(obj)) {
                        if (obj.length === 0) return '[]';
                        const items = obj.map(item => prettyFormat(item, indent + 4));
                        const formattedItems = items.map((item, i) => {
                            if (i === 0) return item; // First item on same line as opening bracket
                            return ' ' + item; // One space indent for subsequent items
                        });
                        return `[${formattedItems.join('\n')}]`;
                    }
                    
                    const encoded = encode(obj);
                    return `${encoded}`;
                }
                
                const result = prettyFormat(ednObj);
                debug('Pretty printed EDN:', result);
                
                return result;
            } catch (error) {
                debug('ERROR:', error);
                debug('Error stack:', error.stack);
                vscode.window.showErrorMessage('Invalid EDN: ' + (error.message || error));
                return str;
            }
        });
    });

    context.subscriptions.push(
        jsonToEdnDisposable,
        ednToJsonDisposable,
        prettyPrintEdnDisposable
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
