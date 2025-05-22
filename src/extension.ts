import * as vscode from 'vscode';
import { SvgFoldingProvider } from './svg-folding.provider';
import { getSetting, settings } from './configuration';
import { updateSvgFoldDecorations } from './update-svg-fold-decorations';

export function activate(context: vscode.ExtensionContext) {
  // Register SVG folding provider for supported languages
  const selector = getSetting(settings.supportedLanguages, []).map((language) => ({ language, scheme: 'file' }));
  const foldingProvider = vscode.languages.registerFoldingRangeProvider(selector, new SvgFoldingProvider());
  context.subscriptions.push(foldingProvider);

  // Custom SVG fold decoration
  const decorationType = vscode.window.createTextEditorDecorationType({
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
    textDecoration: 'none; display: none;',
  });
  context.subscriptions.push(decorationType);

  // Listen for visible range changes (fold/unfold)
  const onVisibleRangesChanged = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
    updateSvgFoldDecorations(decorationType, event.textEditor);
  });
  context.subscriptions.push(onVisibleRangesChanged);

  // Also update when active editor changes
  const onActiveEditorChange = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) updateSvgFoldDecorations(decorationType, editor);
  });
  context.subscriptions.push(onActiveEditorChange);

  // Listen for configuration changes
  const onConfigurationChange = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(settings.identifier) && vscode.window.activeTextEditor)
      updateSvgFoldDecorations(decorationType, vscode.window.activeTextEditor);
  });
  context.subscriptions.push(onConfigurationChange);

  // Initial render
  if (vscode.window.activeTextEditor) {
    updateSvgFoldDecorations(decorationType, vscode.window.activeTextEditor);
  }
}

// This method is called when your extension is deactivated
export function deactivate({ subscriptions }: vscode.ExtensionContext) {
  subscriptions.forEach((subscription) => subscription.dispose());
}
