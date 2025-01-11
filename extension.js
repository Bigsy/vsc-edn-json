const vscode = require('vscode');

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

function activate(context) {
    let lowercaseDisposable = vscode.commands.registerCommand('string-highlighter.convertToLowercase', function () {
        processText(vscode.window.activeTextEditor, str => str.toLowerCase());
    });

    let uppercaseDisposable = vscode.commands.registerCommand('string-highlighter.convertToUppercase', function () {
        processText(vscode.window.activeTextEditor, str => str.toUpperCase());
    });

    context.subscriptions.push(lowercaseDisposable, uppercaseDisposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
