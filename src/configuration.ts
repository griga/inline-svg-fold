import * as vscode from 'vscode';

export const settings = {
  identifier: 'inline-svg-fold',

  supportedLanguages: 'supportedLanguages',
} as const;

export function setSetting(key: keyof typeof settings, value: any) {
  vscode.workspace.getConfiguration(settings.identifier).update(key, value, true);
}

export function getSetting<T>(key: keyof typeof settings, fallback: T): T {
  return (vscode.workspace.getConfiguration(settings.identifier).get<T>(key) as T) ?? fallback;
}
