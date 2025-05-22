import * as vscode from 'vscode';
import { getSetting, settings } from './configuration';

export function svgToDataUri(svg: string, color: string): string {
  // Extract viewBox from original SVG
  const viewBoxMatch = svg.match(/viewBox="([^"]*)"/);
  const viewBox = viewBoxMatch ? `viewBox=\"${viewBoxMatch[1]}\"` : '';
  // Get font size and calculate width/height
  const fontSize = vscode.workspace.getConfiguration('editor').get('fontSize') as number;
  const scaleFactor = 1;
  const width = fontSize * scaleFactor;
  const height = fontSize * scaleFactor;

  // Extract all <path ... d="..." ... /> (handles single/double quotes, self-closing, and attributes after d)
  const pathRegex = /<path[^>]*\sd=(["'])(.*?)\1[^>]*\/?\>/gi;
  const paths: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(svg)) !== null) {
    const d = match[2];
    paths.push(`<path d=\"${d}\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>`);
  }


  // Compose new SVG string
  const newSvg = `
		<svg xmlns="http://www.w3.org/2000/svg"  
		  width=\"${width}\" height=\"${height}\" ${viewBox} 
		  fill=\"none\" stroke-width=\"1\" stroke=\"${color}\">
		    ${paths.join('')}
		</svg>`;
  const minified = newSvg.replace(/\s{2,}/g, ' ').replace(/\n/g, '');
  const encoded = encodeURIComponent(minified).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
  return `data:image/svg+xml;utf8,${encoded}`;
}
