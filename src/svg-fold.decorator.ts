import * as vscode from 'vscode';
import { getSetting, settings } from './configuration';
import { svgToDataUri } from './utils/svg-to-data-uri';

// Regex to match <svg ...>...</svg> blocks, non-greedy and multiline
const SVG_REGEX = /<svg[\s\S]*?<\/svg>/gi;

export class SvgFoldManager implements vscode.FoldingRangeProvider {
  private svgFoldCache = new WeakMap<
    vscode.TextDocument,
    {
      version: number;
      svgMatches: { svg: string; headPos: vscode.Position; tailPos: vscode.Position }[];
      foldingRanges: vscode.FoldingRange[];
    }
  >();

  private lastFoldedState = new WeakMap<vscode.TextEditor, Set<number>>();
  private lastDecorationsCache = new WeakMap<
    vscode.TextDocument,
    {
      version: number;
      decorations: vscode.DecorationOptions[];
    }
  >();

  constructor(private decorationType: vscode.TextEditorDecorationType) {}

  // Provide folding ranges for SVGs
  public async provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
  ): Promise<vscode.FoldingRange[]> {
    const { foldingRanges } = await this.parseSvgRegions(document);
    return foldingRanges;
  }

  // Parse SVG regions and cache results
  private async parseSvgRegions(doc: vscode.TextDocument) {
    const docVersion = doc.version;
    let cache = this.svgFoldCache.get(doc);
    if (!cache || cache.version !== docVersion) {
      const text = doc.getText();
      let match: RegExpExecArray | null;
      const svgMatches: { svg: string; headPos: vscode.Position; tailPos: vscode.Position }[] = [];
      const foldingRanges: vscode.FoldingRange[] = [];
      while ((match = SVG_REGEX.exec(text)) !== null) {
        const svg = match[0];
        const headPos = doc.positionAt(match.index);
        const tailPos = doc.positionAt(match.index + match[0].length);
        svgMatches.push({ svg, headPos, tailPos });
        const start = headPos.line;
        const end = tailPos.line;
        if (end > start) {
          foldingRanges.push(new vscode.FoldingRange(start, end, vscode.FoldingRangeKind.Region));
        }
      }
      cache = { version: docVersion, svgMatches, foldingRanges };
      this.svgFoldCache.set(doc, cache);
    }
    return cache;
  }

  // Update SVG decorations
  public async update(editor: vscode.TextEditor) {
    if (!editor) return;
    const supportedLanguages = getSetting<string[]>(settings.supportedLanguages, []);
    if (!supportedLanguages.includes(editor.document.languageId)) return;

    const doc = editor.document;
    const docVersion = doc.version;
    let cache = this.svgFoldCache.get(doc);

    // Try to instantly re-apply last known decorations if available and version matches
    const lastDeco = this.lastDecorationsCache.get(doc);
    let usedCache = false;
    if (lastDeco && lastDeco.version === docVersion) {
      editor.setDecorations(this.decorationType, lastDeco.decorations);
      usedCache = true;
    }

    // Yield to UI to allow instant paint of cached decorations before async update
    await Promise.resolve();

    if (!cache || cache.version !== docVersion) {
      cache = await this.parseSvgRegions(doc);
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
    const prevFolded = this.lastFoldedState.get(editor);
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
      editor.setDecorations(this.decorationType, decorations);
      this.lastFoldedState.set(editor, currentlyFolded);
      // Cache the decorations for instant re-apply on tab switch
      this.lastDecorationsCache.set(doc, { version: docVersion, decorations });
    }
  }

  // Get all SVG folding ranges for a document
  public async getSvgFoldingRanges(doc: vscode.TextDocument): Promise<vscode.FoldingRange[]> {
    const { foldingRanges } = await this.parseSvgRegions(doc);
    return foldingRanges;
  }

  // Batch fold all SVGs in the editor
  public async foldAllSvg(editor: vscode.TextEditor) {
    const foldingRanges = await this.getSvgFoldingRanges(editor.document);
    const selections = foldingRanges.map(range => new vscode.Selection(range.start, 0, range.start, 0));
    editor.selections = selections;
    await vscode.commands.executeCommand('editor.fold');
    // Restore cursor to first selection
    if (selections.length > 0) {
      editor.selection = selections[0];
    }
  }

  // Batch unfold all SVGs in the editor
  public async unfoldAllSvg(editor: vscode.TextEditor) {
    const foldingRanges = await this.getSvgFoldingRanges(editor.document);
    const selections = foldingRanges.map(range => new vscode.Selection(range.start, 0, range.start, 0));
    editor.selections = selections;
    await vscode.commands.executeCommand('editor.unfold');
    // Restore cursor to first selection
    if (selections.length > 0) {
      editor.selection = selections[0];
    }
  }
}
