import * as vscode from 'vscode';
import { SvgFoldingProvider } from './svg-folding.provider';
import { getSetting, settings } from './configuration';
import { updateSvgFoldDecorations } from './update-svg-fold-decorations';

export function activate(context: vscode.ExtensionContext) {
  // Register SVG folding provider for supported languages
  const selector = getSetting(settings.supportedLanguages, []).map((language) => ({ language, scheme: 'file' }));
  const foldingProvider = vscode.languages.registerFoldingRangeProvider(selector, new SvgFoldingProvider());
  context.subscriptions.push(foldingProvider);

  // Custom SVG fold decoration logic
  const decorationType = vscode.window.createTextEditorDecorationType({
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
    textDecoration: 'none; display: none;',
  });
  context.subscriptions.push(decorationType);

  // Listen for visible range changes (fold/unfold)
  const onVisibleRangesChanged = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
    updateSvgFoldDecorations(decorationType, event.textEditor);
  });

  // Also update when active editor changes
  const onActiveEditorChange = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) updateSvgFoldDecorations(decorationType, editor);
  });

  const onConfigurationChange = vscode.workspace.onDidChangeConfiguration((event) => {
    // if (event.affectsConfiguration(settings.identifier)) {
    //   decorator.loadConfig();
    // }
  });

  // // Initial update
  // if (vscode.window.activeTextEditor) {
  //   updateSvgFoldDecorations(decorationType, vscode.window.activeTextEditor);
  // }

  context.subscriptions.push(onVisibleRangesChanged, onActiveEditorChange, onConfigurationChange);
}

// This method is called when your extension is deactivated
export function deactivate({ subscriptions }: vscode.ExtensionContext) {
  subscriptions.forEach((subscription) => subscription.dispose());
}
