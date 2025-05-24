import {
  Position,
  type DecorationOptions,
  FoldingRange,
  ColorThemeKind,
  commands,
  FoldingRangeKind,
  FoldingRangeProvider,
  Range,
  Selection,
  TextDocument,
  TextEditor,
  TextEditorDecorationType,
  Uri,
  window,
} from 'vscode';
import { getSetting, settings } from './configuration';
import { svgToDataUri } from './utils/svg-to-data-uri';
import { areEqualSets } from './utils/lang.utils';

// Regex to match <svg ...>...</svg> blocks, non-greedy and multiline
const SVG_REGEX = /<svg[\s\S]*?<\/svg>/gi;

type SvgPositionRange = { svg: string; start: Position; end: Position };
type SvgFoldingData = { version: number; svgMatches: SvgPositionRange[]; foldingRanges: FoldingRange[] };
type SvgVersionedDecorations = { version: number; decorations: DecorationOptions[] };

export class SvgFoldManager implements FoldingRangeProvider {
  private documentSvgFoldingCache = new WeakMap<TextDocument, SvgFoldingData>();
  private documentDecorationsCache = new WeakMap<TextDocument, SvgVersionedDecorations>();
  private editorFoldedRangesCache = new WeakMap<TextEditor, Set<number>>();
  private documentAutofolded = new WeakSet<TextDocument>();

  constructor(private decorationType: TextEditorDecorationType) {}

  // Provide folding ranges for SVGs
  public async provideFoldingRanges(document: TextDocument): Promise<FoldingRange[]> {
    const { foldingRanges } = await this.parseSvgRegions(document);
    return foldingRanges;
  }
  // Parse SVG regions and cache results
  private async parseSvgRegions(doc: TextDocument) {
    let cache = this.documentSvgFoldingCache.get(doc);
    if (cache?.version === doc.version) return cache;

    const text = doc.getText();

    // matchAll() to get all matches at once
    const svgMatches: SvgPositionRange[] = Array.from(text.matchAll(SVG_REGEX)).map((match) => {
      const svg = match[0];
      const start = doc.positionAt(match.index!);
      const end = doc.positionAt(match.index! + match[0].length);
      return { svg, start, end };
    });

    // Generate folding ranges for multiline SVGs
    const foldingRanges: FoldingRange[] = svgMatches
      .filter(({ start, end }) => end.line > start.line)
      .map(({ start, end }) => new FoldingRange(start.line, end.line, FoldingRangeKind.Region));

    cache = { version: doc.version, svgMatches, foldingRanges };
    this.documentSvgFoldingCache.set(doc, cache);
    return cache;
  }

  // Update SVG decorations
  public async update(editor: TextEditor, { force = false }: { force?: boolean } = {}) {
    if (!editor) return;
    if (!getSetting(settings.supportedLanguages).includes(editor.document.languageId)) return;

    if (getSetting(settings.autoFold) && !this.documentAutofolded.has(editor.document)) {
      this.documentAutofolded.add(editor.document);
      this.foldAllSvg(editor);
      return;
    }

    const doc = editor.document;
    const renderColor = this.getRenderedSVGColor();

    // Try to instantly re-apply last known decorations if available and version matches
    const documentCachedDecorations = this.documentDecorationsCache.get(doc);
    let isUsingCachedDecorations = false;
    if (documentCachedDecorations?.version === doc.version) {
      editor.setDecorations(this.decorationType, documentCachedDecorations.decorations);
      isUsingCachedDecorations = true;
    }

    // Yield to UI to allow instant paint of cached decorations before async update
    await Promise.resolve();

    // Parse SVG regions and folding ranges
    let documentSvgFolding = this.documentSvgFoldingCache.get(doc);
    if (documentSvgFolding?.version !== doc.version) {
      documentSvgFolding = await this.parseSvgRegions(doc);
    }

    // Track which SVGs are currently folded
    const currFolded = new Set<number>();
    const decorations: DecorationOptions[] = [];

    for (const { svg, start, end } of documentSvgFolding.svgMatches) {
      // Find the corresponding folding range
      const foldingRange = documentSvgFolding.foldingRanges.find(
        (range) => range.start === start.line && range.end === end.line && range.kind === FoldingRangeKind.Region
      );
      if (!foldingRange) continue;
      // If the start line is visible but the next line is not, it's folded
      const isSvgFolded = this.isNextLineFolded(editor, start.line);
      if (isSvgFolded) {
        const dataUri = svgToDataUri(svg, renderColor);
        const decoration = this.createDecoration(doc, start, end, dataUri);
        currFolded.add(start.line);
        decorations.push(decoration);
      }
    }

    // Only update decorations if the fold state has changed
    const prevFolded = this.editorFoldedRangesCache.get(editor);
    const shouldUpdate = !prevFolded || !areEqualSets(prevFolded, currFolded);

    // Only update if decorations changed or cache was not used or force update is requested
    if (shouldUpdate || !isUsingCachedDecorations || force) {
      editor.setDecorations(this.decorationType, decorations);
      this.editorFoldedRangesCache.set(editor, currFolded);
      // Cache the decorations for instant re-apply on tab switch
      this.documentDecorationsCache.set(doc, { version: doc.version, decorations });
    }
  }

  private isNextLineFolded(editor: TextEditor, line: number) {
    return editor.visibleRanges.every((vr) => !vr.contains(new Position(line + 1, 0)));
  }

  private createDecoration(doc: TextDocument, start: Position, end: Position, uri: string): DecorationOptions {
    return {
      range: new Range(start.line, start.character, start.line, doc.lineAt(start.line).text.length),
      renderOptions: {
        before: { contentText: `<svg`, backgroundColor: 'transparent' },
        after: { contentIconPath: Uri.parse(uri), margin: '0 4px', backgroundColor: 'transparent' },
      },
    };
  }

  private getRenderedSVGColor() {
    const colorTheme = window.activeColorTheme;
    const isLightTheme = colorTheme.kind === ColorThemeKind.Light;
    const renderedSVGColor = getSetting(isLightTheme ? settings.renderedSVGColorLight : settings.renderedSVGColorDark);
    return renderedSVGColor;
  }

  // Batch fold all unfolded SVGs in the editor
  public async foldAllSvg(editor: TextEditor) {
    const activeEditorSelection = editor.selection;

    const { foldingRanges } = await this.parseSvgRegions(editor.document);
    const unfoldedRanges = foldingRanges.filter((range) => !this.isNextLineFolded(editor, range.start));
    if (unfoldedRanges.length === 0) return;
    const selections = unfoldedRanges.map(
      (range) => new Selection(range.start, 0, range.end, editor.document.lineAt(range.end).text.length)
    );

    editor.selections = selections;
    await commands.executeCommand('editor.createFoldingRangeFromSelection');

    editor.selection = activeEditorSelection;
  }

  // Batch unfold all SVGs in the editor
  public async unfoldAllSvg(editor: TextEditor) {
    const activeEditorSelection = editor.selection;

    const { foldingRanges } = await this.parseSvgRegions(editor.document);
    const foldedRanges = foldingRanges.filter((range) => this.isNextLineFolded(editor, range.start));
    if (foldedRanges.length === 0) return;
    const selections = foldedRanges.map(
      (range) => new Selection(range.start, 0, range.end, editor.document.lineAt(range.end).text.length)
    );

    editor.selections = selections;
    await commands.executeCommand('editor.unfold');

    editor.selection = activeEditorSelection;
  }
}
