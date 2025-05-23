# Copilot Instructions for inline-svg-fold

## Extension Purpose

This Visual Studio Code extension, **inline-svg-fold**, enhances code readability by rendering inline SVG code blocks directly within supported files (such as HTML, XML, JS, TS, JSX, and TSX).  
It should detect SVG regions and allow users to show/hide them as logical blocks.

## Implementation Guidance

- **Primary Function**: Detect inline `<svg>...</svg>` blocks in the editor and replace them with decorations.
- **Target Languages**: HTML, XML, JavaScript (including JSX/TSX), and TypeScript.
- **Activation**: Extension should activate on opening files of the above types.
- **Folding**: Implement toggling for SVG blocks, allowing users to collapse/expand them
- **Performance**: Toggling should be fast and not block the main thread, even in large files.

## References

- [tailwind-fold (GitHub)](https://github.com/stivoat/tailwind-fold):  
  Reference for detecting and folding utility classes in Tailwind, including how to provide toggle ranges and register language features.  
  Note how it parses and identifies regions and uses replaces them with decorations.

## API Usage

- Use regular expressions or a parser to accurately find `<svg>...</svg>` regions, accounting for nesting, multiline SVGs, and attributes.

## UX

- Ensure toggled SVG blocks display a placeholder (e.g., `<svg…`).
- Prerender inline svg and show next to the placeholder.
- Add a command to fold/unfold all SVGs in the current file.
- User can toggle SVG blocks by clicking on the placeholder or using a keyboard shortcut.

## Code Style

- Follow TypeScript best practices.
- Keep the code modular for easy maintenance and future extension.
- Include clear comments, especially around SVG region detection logic.

## Example Folding Logic

- Use a regex like `<svg[\s\S]*?>[\s\S]*?<\/svg>` for initial detection, but refine as needed to avoid false positives.
- Use the document's line numbers to create accurate `FoldingRange` objects for each SVG block.

---

## References for Copilot

- [tailwind-fold (GitHub)](https://github.com/stivoat/tailwind-fold)
