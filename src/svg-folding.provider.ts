import * as vscode from 'vscode';

// Regex to match <svg ...>...</svg> blocks, non-greedy and multiline
const SVG_REGEX = /<svg[\s\S]*?<\/svg>/gi;

export class SvgFoldingProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        const text = document.getText();
        const ranges: vscode.FoldingRange[] = [];
        let match: RegExpExecArray | null;
        while ((match = SVG_REGEX.exec(text)) !== null) {
            const start = document.positionAt(match.index).line;
            const end = document.positionAt(match.index + match[0].length).line;
            if (end > start) {
                ranges.push(new vscode.FoldingRange(start, end, vscode.FoldingRangeKind.Region));
            }
        }
        return ranges;
    }
}
