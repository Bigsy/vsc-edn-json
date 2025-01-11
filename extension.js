const vscode = require('vscode');

function activate(context) {
    let disposable = vscode.commands.registerCommand('string-highlighter.highlightAndLowercase', function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        const document = editor.document;
        const text = document.getText();
        
        // Regular expression to match strings (both single and double quotes)
        const stringRegex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g;
        
        let match;
        let edits = [];
        
        while ((match = stringRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            
            // Convert the string to lowercase, keeping the quotes
            const quote = match[0][0]; // first character (quote type)
            const content = match[0].slice(1, -1).toLowerCase();
            const newText = quote + content + quote;
            
            edits.push(new vscode.TextEdit(range, newText));
            
            // Create decoration type for highlighting
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: 'rgba(255, 255, 0, 0.3)', // Light yellow background
                border: '1px solid yellow'
            });
            
            // Apply decoration
            editor.setDecorations(decorationType, [range]);
            
            // Remove decoration after 2 seconds
            setTimeout(() => {
                decorationType.dispose();
            }, 2000);
        }
        
        // Apply all edits
        if (edits.length > 0) {
            editor.edit(editBuilder => {
                edits.forEach(edit => {
                    editBuilder.replace(edit.range, edit.newText);
                });
            });
            vscode.window.showInformationMessage(`Converted ${edits.length} strings to lowercase`);
        } else {
            vscode.window.showInformationMessage('No strings found in the current document');
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
