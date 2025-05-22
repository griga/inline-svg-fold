import * as vscode from 'vscode';
import { getSetting, settings } from './configuration';
import { svgToDataUri } from './svg-to-data-uri';
import { debounce, throttler } from './utils/execution.function';

let decorationsPushCounter = 0;
let updateSvgFoldDecorationsCounter = 0;
// vscode.window.activeTextEditor

// Cache for folding ranges and SVG matches per document version
const svgFoldCache = new WeakMap<
  vscode.TextDocument,
  {
    version: number;
    svgMatches: { svg: string; headPos: vscode.Position; tailPos: vscode.Position }[];
    foldingRanges: vscode.FoldingRange[];
  }
>();

// Track last known fold state to avoid redundant decoration updates
const lastFoldedState = new WeakMap<vscode.TextEditor, Set<number>>();

// Cache for last decorations per document version
const lastDecorationsCache = new WeakMap<
  vscode.TextDocument,
  {
    version: number;
    decorations: vscode.DecorationOptions[];
  }
>();

export async function updateSvgFoldDecorations(
  decorationType: vscode.TextEditorDecorationType,
  editor: vscode.TextEditor
) {
  if (!editor) return;
  const supportedLanguages = getSetting<string[]>(settings.supportedLanguages, []);
  if (!supportedLanguages.includes(editor.document.languageId)) return;

  updateSvgFoldDecorationsCounter++;

  const doc = editor.document;
  const docVersion = doc.version;
  let cache = svgFoldCache.get(doc);

  // Try to instantly re-apply last known decorations if available and version matches
  const lastDeco = lastDecorationsCache.get(doc);
  let usedCache = false;
  if (lastDeco && lastDeco.version === docVersion) {
    editor.setDecorations(decorationType, lastDeco.decorations);
    usedCache = true;
  }

  // Yield to UI to allow instant paint of cached decorations before async update
  await Promise.resolve();

  if (!cache || cache.version !== docVersion) {
    // Recompute SVG matches and folding ranges
    const text = doc.getText();
    const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
    let match: RegExpExecArray | null;
    const svgMatches: { svg: string; headPos: vscode.Position; tailPos: vscode.Position }[] = [];
    while ((match = svgRegex.exec(text)) !== null) {
      const svg = match[0];
      const headPos = doc.positionAt(match.index);
      const tailPos = doc.positionAt(match.index + match[0].length);
      svgMatches.push({ svg, headPos, tailPos });
    }
    const foldingRanges =
      (await vscode.commands.executeCommand<vscode.FoldingRange[]>('vscode.executeFoldingRangeProvider', doc.uri)) ||
      [];
    cache = { version: docVersion, svgMatches, foldingRanges };
    svgFoldCache.set(doc, cache);
  }

  const colorTheme = vscode.window.activeColorTheme;
  const isLightTheme = colorTheme.kind === vscode.ColorThemeKind.Light;
  const renderedSVGColor = isLightTheme
    ? getSetting<string>(settings.renderedSVGColorLight, '#222222dd')
    : getSetting<string>(settings.renderedSVGColorDark, '#ccccccaa');

  // Track which SVGs are currently folded
  const currentlyFolded = new Set<number>();
  const decorations: vscode.DecorationOptions[] = [];
  for (const { svg, headPos, tailPos } of cache.svgMatches) {
    // Find the corresponding folding range
    const foldingRange = cache.foldingRanges.find(
      (range) =>
        range.start === headPos.line && range.end === tailPos.line && range.kind === vscode.FoldingRangeKind.Region
    );
    if (!foldingRange) continue;
    // If the start line is visible but the next line is not, it's folded
    const nextLine = headPos.line + 1;
    const visible = editor.visibleRanges.some((vr) => vr.contains(new vscode.Position(nextLine, 0)));
    if (!visible) {
      currentlyFolded.add(headPos.line);

      // Generate data URI for SVG
      const dataUri = svgToDataUri(svg, renderedSVGColor);
      decorations.push({
        range: new vscode.Range(headPos.line, headPos.character, headPos.line, doc.lineAt(headPos.line).text.length),
        renderOptions: {
          before: {
            contentText: `<svg`,
            backgroundColor: 'transparent',
          },
          after: {
            color: new vscode.ThemeColor('editor.foreground'),
            contentIconPath: vscode.Uri.parse(dataUri),
            backgroundColor: 'transparent',
            margin: '0 2px',
          },
        },
      });
    }
  }

  // Only update decorations if the fold state has changed
  const prevFolded = lastFoldedState.get(editor);
  let shouldUpdate = true;
  if (prevFolded && prevFolded.size === currentlyFolded.size) {
    shouldUpdate = false;
    for (const line of currentlyFolded) {
      if (!prevFolded.has(line)) {
        shouldUpdate = true;
        break;
      }
    }
  }
  // Only update if decorations changed or cache was not used
  if (shouldUpdate || !usedCache) {
    editor.setDecorations(decorationType, decorations);
    lastFoldedState.set(editor, currentlyFolded);
    // Cache the decorations for instant re-apply on tab switch
    lastDecorationsCache.set(doc, { version: docVersion, decorations });
  }
}
