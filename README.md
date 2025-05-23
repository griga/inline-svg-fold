# Inline SVG Fold

Enhance your code readability by folding inline SVG code blocks directly within your editor. This VS Code extension automatically detects SVG blocks in your code and provides convenient folding capabilities with visual previews.

## Features

- **Automatic SVG Detection**: Identifies inline `<svg>...</svg>` blocks in your code
- **Visual Previews**: Shows rendered SVG thumbnails next to folded blocks
- **Theme-Aware Rendering**: Adapts SVG preview colors based on your current theme
- **High Performance**: Designed to handle large files without blocking the editor

## Usage

The extension automatically activates for supported file types and provides folding regions for inline SVG blocks. You can:

- Fold/unfold SVG blocks using the standard VS Code folding commands
- Use keyboard shortcuts `Ctrl+Alt+F` / `Cmd+Alt+F` to fold all SVGs in the current file
- Use keyboard shortcuts `Ctrl+Alt+U` / `Cmd+Alt+U` to unfold all SVGs in the current file

## Supported Languages

By default, the extension supports SVG folding in:

- HTML
- JavaScript
- TypeScript
- JavaScript React (JSX)
- TypeScript React (TSX)

You can customize this list in the settings.

## Extension Settings

This extension contributes the following settings:

| Setting                                 | Description                                                              | Default                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `inline-svg-fold.supportedLanguages`    | Languages in which inline SVG folding is enabled                         | `["html", "javascript", "javascriptreact", "typescript", "typescriptreact"]` |
| `inline-svg-fold.renderedSVGColorLight` | Color of rendered SVG elements in light themes                           | `#222222dd`                                                                  |
| `inline-svg-fold.renderedSVGColorDark`  | Color of rendered SVG elements in dark themes                            | `#ccccccaa`                                                                  |
| `inline-svg-fold.autoFold`              | Automatically fold all inline SVG blocks when a supported file is opened | `false`                                                                      |

## Commands

| Command                                    | Description                                | Keybinding                          |
| ------------------------------------------ | ------------------------------------------ | ----------------------------------- |
| `Inline SVG Fold: Fold All SVGs in File`   | Folds all SVG blocks in the current file   | `Ctrl+Alt+F` (`Cmd+Alt+F` on macOS) |
| `Inline SVG Fold: Unfold All SVGs in File` | Unfolds all SVG blocks in the current file | `Ctrl+Alt+U` (`Cmd+Alt+U` on macOS) |

## Known Issues

- Nested SVG elements may not always fold correctly
- SVGs inside template literals may have inconsistent folding in some edge cases

## Release Notes

### 0.0.1

- Initial release
- Added support for folding inline SVG in HTML, JS, TS, JSX and TSX files
- Added commands for folding/unfolding all SVGs in a file
- Added visual SVG preview when folded

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests on [GitHub](https://github.com/griga/inline-svg-fold).

## License

This extension is licensed under the [MIT License](LICENSE.md).

---

**Enjoy more readable code with Inline SVG Fold!**
