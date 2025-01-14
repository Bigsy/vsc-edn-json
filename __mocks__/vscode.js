module.exports = {
    window: {
        createOutputChannel: () => ({
            appendLine: () => {}
        }),
        showInformationMessage: () => {},
        showErrorMessage: () => {},
        createTextEditorDecorationType: () => ({
            dispose: () => {}
        })
    },
    commands: {
        registerCommand: () => {}
    }
};
