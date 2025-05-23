import * as vscode from 'vscode';

export const identifier = 'inline-svg-fold';

export const settings = {
  supportedLanguages: 'supportedLanguages',
  renderedSVGColorLight: 'renderedSVGColorLight',
  renderedSVGColorDark: 'renderedSVGColorDark',
  autoFold: 'autoFold',
} as const;

export const commands = {
  foldAllSvg: `${identifier}.foldAllSvg`,
  unfoldAllSvg: `${identifier}.unfoldAllSvg`,
  debugInlineSvgFold: `${identifier}.debugInlineSvgFold`,
};

export const fallbacks = {
  [settings.supportedLanguages]: [] as string[],
  [settings.renderedSVGColorLight]: '#222222dd',
  [settings.renderedSVGColorDark]: '#ccccccaa',
  [settings.autoFold]: false,
} as const;

type SettingKeys = keyof typeof settings;
type SettingTypes = {
  [key in SettingKeys]: (typeof fallbacks)[key];
};

export function getSetting<T extends SettingKeys>(key: T, fallback?: SettingTypes[T]): SettingTypes[T] {
  return vscode.workspace.getConfiguration(identifier).get(key) ?? fallback ?? fallbacks[key];
}

export function setSetting<T extends SettingKeys>(key: T, value: SettingTypes[T]) {
  vscode.workspace.getConfiguration(identifier).update(key, value, true);
}
