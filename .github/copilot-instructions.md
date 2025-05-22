# Copilot Instructions for inline-svg-fold

## Extension Purpose

This Visual Studio Code extension, **inline-svg-fold**, enhances code readability by enabling folding of inline SVG code blocks directly within supported files (such as HTML, XML, JS, TS, JSX, and TSX).  
It should detect SVG regions and allow users to fold/unfold them as logical blocks.

## Implementation Guidance

- **Primary Function**: Detect inline `<svg>...</svg>` blocks in the editor and provide folding ranges for them.
- **Target Languages**: HTML, XML, JavaScript (including JSX/TSX), and TypeScript.
- **Activation**: Extension should activate on opening files of the above types.
- **Performance**: Folding should be fast and not block the main thread, even in large files.

## References

- [tailwind-fold (GitHub)](https://github.dev/stivoat/tailwind-fold):  
  Reference for detecting and folding utility classes in Tailwind, including how to provide folding ranges and register language features.  
  Note how it parses and identifies regions and uses the VS Code FoldingRangeProvider API.

- [vscode-better-folding (GitHub)](https://github.com/mtbaqer/vscode-better-folding):  
  Reference for improved folding strategies and multi-language support.  
  See how it registers folding providers for multiple languages and handles custom folding logic.

## API Usage

- Use the [FoldingRangeProvider](https://code.visualstudio.com/api/references/vscode-api#FoldingRangeProvider) API.
- Register the provider for relevant languages in your `activate` function.
- Use regular expressions or a parser to accurately find `<svg>...</svg>` regions, accounting for nesting, multiline SVGs, and attributes.

## UX

- Ensure folded SVG blocks display a placeholder (e.g., `<svg>…`).
- Prerender inline svg and show next to the placeholder.
- Add a command to fold/unfold all SVGs in the current file (optional).
- Consider providing a setting to enable/disable SVG folding per language.

## Testing

- Include test cases for:
  - HTML with multiple SVGs
  - JS/TS with inline SVG templates (e.g., React JSX)
  - Edge cases: nested SVGs, SVGs with comments, malformed SVGs

## Code Style

- Follow TypeScript best practices.
- Keep the code modular for easy maintenance and future extension.
- Include clear comments, especially around SVG region detection logic.

## Example Folding Logic

- Use a regex like `<svg[\s\S]*?>[\s\S]*?<\/svg>` for initial detection, but refine as needed to avoid false positives.
- Use the document's line numbers to create accurate `FoldingRange` objects for each SVG block.

---

## References for Copilot

- [tailwind-fold (GitHub)](https://github.dev/stivoat/tailwind-fold)
- [vscode-better-folding (GitHub)](https://github.com/mtbaqer/vscode-better-folding)
