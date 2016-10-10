/// <reference path="../../node_modules/vscode/typings/index.d.ts" />
import {
  CancellationToken,
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  Position,
  Range,
  TextDocument,
} from 'vscode';

import { request } from './client';

export class CompletionProvider implements CompletionItemProvider {
  constructor(lang: string) {
    this.lang = lang;
  }

  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ) {
    return new Promise((resolve, reject) => {
      const filename = document.fileName;

      if (position.character <= 0) {
        return resolve([]);
      }

      const source = document.getText();

      return resolve(request({
        "Name": "Fuse.GetCodeSuggestions",
        "Arguments":
        {
          // Typically "UX" or "Uno"
          "SyntaxType": this.lang,
          // Path to document where suggestion is requested
          "Path": document.fileName,
          // Full source of document where suggestion is requested
          "Text": source,
          // 1-indexed text position within Text where suggestion is requested
          "CaretPosition": { "Line": position.line + 1, "Character": position.character + 1 }
        }
      }).then((payload) => {
        if (payload.Status === 'Success') {
          const result = payload.Result;

          if (result.IsUpdatingCache) {
            return [];
          }

          return result.CodeSuggestions.map((item => {
            const kind = CompletionItemKind[item.Type]

            return new CompletionItem(item.Suggestion, kind);
          }));
        }

        return [];
      }));
    });
  }
}