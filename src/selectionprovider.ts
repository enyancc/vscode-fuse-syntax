import {
    CancellationToken,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    Position,
    Range,
    TextDocument,
} from 'vscode';

import { FuseDaemon } from './Fuse/Daemon';

export class CompletionProvider implements CompletionItemProvider {

    language: string;

    constructor(language: string) {
        this.language = language;
    }

    public provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken) : Promise<CompletionItem[]> {
        return new Promise((resolve, reject) => {
            const filename = document.fileName;

            if (position.character <= 0) {
                return resolve([]);
            }

            const source = document.getText();

            return resolve(FuseDaemon.Instance.sendRequest({
                "Name": "Fuse.GetCodeSuggestions",
                "Arguments":
                {
                    "SyntaxType": this.language,
                    "Path": document.fileName,
                    "Text": source,
                    "CaretPosition": { "Line": 1 + position.line, "Character": 1 + position.character }
                }
            }).then((payload) => {
                if (payload.Status === 'Success') {
                    const result = payload.Result;

                    if (result.IsUpdatingCache) {
                        return [];
                    }

                    return result.CodeSuggestions.map((item => {
                        const kind = getRemapFuseKind(item.Type)

                        return new CompletionItem(item.Suggestion, kind);
                    }));
                }

                return [];
            }));
        });
    }
}




function getRemapFuseKind(fusekind: string | number) {

    fusekind = Number(fusekind);

    switch(fusekind) {
        case FuseSuggestItemKind.Event:
                return CompletionItemKind.Event;

        case FuseSuggestItemKind.Directory:
                return CompletionItemKind.Folder;

        case FuseSuggestItemKind.File:
                return CompletionItemKind.File;

        case FuseSuggestItemKind.TypeAlias:
        case FuseSuggestItemKind.GenericParameterType:
                return CompletionItemKind.TypeParameter;

        case FuseSuggestItemKind.Constructor:
                return CompletionItemKind.Constructor;

        case FuseSuggestItemKind.Interface:
                return CompletionItemKind.Interface;

        case FuseSuggestItemKind.Constant:
                return CompletionItemKind.Constant;

        case FuseSuggestItemKind.Variable:
                return CompletionItemKind.Variable;

        case FuseSuggestItemKind.Struct:
                return CompletionItemKind.Struct;

        case FuseSuggestItemKind.EnumValue:
                return CompletionItemKind.EnumMember;

        case FuseSuggestItemKind.Enum:
                return CompletionItemKind.Enum;

        case FuseSuggestItemKind.Field:
                return CompletionItemKind.Field;

        case FuseSuggestItemKind.Property:
                return CompletionItemKind.Property;

        case FuseSuggestItemKind.Importer:
                return CompletionItemKind.Module;

        case FuseSuggestItemKind.Method:
                return CompletionItemKind.Method;

        case FuseSuggestItemKind.Interface:
                return CompletionItemKind.Interface;

        case FuseSuggestItemKind.Class:
            return CompletionItemKind.Class;

        case FuseSuggestItemKind.Namespace:
        case FuseSuggestItemKind.Keyword:
            return CompletionItemKind.Keyword;
        default:
            return CompletionItemKind.Text;
    }

}

enum FuseSuggestItemKind {
    Keyword,
    Namespace,
    Class,
    Struct,
    Interface,
    Delegate,
    GenericParameterType,
    Enum,
    EnumValue,
    Constant,
    Field,
    Variable,
    MethodArgument,
    Method,
    Property,
    Event,
    MetaProperty,
    Block,
    BlockFactory,
    Importer,
    Directory,
    File,
    TypeAlias,
    Error,
    Constructor //Need some way to differentiate between methods and constructors..
}
