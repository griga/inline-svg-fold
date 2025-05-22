import * as vscode from 'vscode';
import { commands, getSetting, identifier, settings } from './configuration';
import { SvgFoldManager } from './svg-fold.manager';

export function activate(context: vscode.ExtensionContext) {
  // Custom SVG fold decoration
  const decorationType = vscode.window.createTextEditorDecorationType({
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
    textDecoration: 'none; display: none;',
  });
  context.subscriptions.push(decorationType);

  // Instantiate the manager
  const svgFoldManager = new SvgFoldManager(decorationType);

  // Register SVG folding provider for supported languages
  const selector = getSetting(settings.supportedLanguages).map((language) => ({ language, scheme: 'file' }));
  const foldingProvider = vscode.languages.registerFoldingRangeProvider(selector, svgFoldManager);
  context.subscriptions.push(foldingProvider);

  // Register foldAllSvg command
  const foldAllSvgCmd = vscode.commands.registerCommand(commands.foldAllSvg, async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    await svgFoldManager.foldAllSvg(editor);
  });
  context.subscriptions.push(foldAllSvgCmd);

  // Register unfoldAllSvg command
  const unfoldAllSvgCmd = vscode.commands.registerCommand(commands.unfoldAllSvg, async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    await svgFoldManager.unfoldAllSvg(editor);
  });
  context.subscriptions.push(unfoldAllSvgCmd);

  // Listen for visible range changes (fold/unfold)
  const onVisibleRangesChanged = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
    svgFoldManager.update(event.textEditor);
  });
  context.subscriptions.push(onVisibleRangesChanged);

  // Also update when active editor changes
  const onActiveEditorChange = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) svgFoldManager.update(editor);
  });
  context.subscriptions.push(onActiveEditorChange);

  // Listen for configuration changes
  const onConfigurationChange = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(identifier) && vscode.window.activeTextEditor)
      svgFoldManager.update(vscode.window.activeTextEditor);
  });
  context.subscriptions.push(onConfigurationChange);

  // Listen for theme changes
  let lastThemeKind = vscode.window.activeColorTheme.kind;
  const onThemeChange = vscode.window.onDidChangeActiveColorTheme((theme) => {
    // Only update if theme kind changed (dark to light or light to dark)
    if (lastThemeKind === theme.kind || !vscode.window.activeTextEditor) return;
    svgFoldManager.update(vscode.window.activeTextEditor, { force: true }); // Force update on theme kind change
    lastThemeKind = theme.kind;
  });
  context.subscriptions.push(onThemeChange);

  // Initial render
  if (vscode.window.activeTextEditor) {
    svgFoldManager.update(vscode.window.activeTextEditor);
  }
}

// This method is called when your extension is deactivated
export function deactivate({ subscriptions }: vscode.ExtensionContext) {
  subscriptions.forEach((subscription) => subscription.dispose());
}
