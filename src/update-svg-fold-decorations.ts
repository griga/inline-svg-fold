import * as vscode from 'vscode';
import { getSetting, settings } from './configuration';
import { svgToDataUri } from './svg-to-data-uri';

// vscode.window.activeTextEditor
export async function updateSvgFoldDecorations(
  decorationType: vscode.TextEditorDecorationType,
  editor: vscode.TextEditor
) {
  if (!editor) return;
  const doc = editor.document;
  const supportedLanguages = getSetting<string[]>(settings.supportedLanguages, []);

  if (!supportedLanguages.includes(doc.languageId)) return;
  const text = doc.getText();
  const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
  let match: RegExpExecArray | null;
  const decorations: vscode.DecorationOptions[] = [];
  const foldingRanges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
    'vscode.executeFoldingRangeProvider',
    doc.uri
  );
  if (!foldingRanges) return;
  while ((match = svgRegex.exec(text)) !== null) {
    const svg = match[0];
    const headPos = doc.positionAt(match.index);
    const tailPos = doc.positionAt(match.index + match[0].length);

    // Find the corresponding folding range
    const foldingRange = foldingRanges.find(
      (range) =>
        range.start === headPos.line && range.end === tailPos.line && range.kind === vscode.FoldingRangeKind.Region
    );
    if (!foldingRange) continue;
    // If the start line is visible but the next line is not, it's folded
    const nextLine = headPos.line + 1;
    const visible = editor.visibleRanges.some((vr) => vr.contains(new vscode.Position(nextLine, 0)));
    if (!visible) {
      // Generate data URI for SVG
      const dataUri = svgToDataUri(svg);
      decorations.push({
        range: new vscode.Range(headPos.line, headPos.character, headPos.line, doc.lineAt(headPos.line).text.length),
        renderOptions: {
          before: {
            contentText: `<svg`,
            backgroundColor: 'transparent',
          },
          after: {
            contentIconPath: vscode.Uri.parse(dataUri),
            backgroundColor: 'transparent',
            margin: '0 0 0 4px',
          },
        },
      });
    }
  }
  editor.setDecorations(decorationType, decorations);
}
