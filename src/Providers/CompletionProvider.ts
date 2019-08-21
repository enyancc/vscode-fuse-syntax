import {
    CancellationToken,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    Position,
    Range,
    TextDocument,
} from 'vscode';

import { FuseDaemon } from '../Fuse/Daemon';

export class CompletionProvider implements CompletionItemProvider {

    language: string;

    constructor(language: string) {
        this.language = language;
    }

    public async provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken) : Promise<CompletionItem[]> {

        if (position.character <= 0) {
            return []
        }

        const Path = document.fileName;
        const Text = document.getText();
        const CaretPosition = {
            Line: 1 + position.line,
            Character: 1 + position.character
        };

        try {
            const payload = await FuseDaemon.Instance.sendRequest<FuseGetSuggestionsResponse>({
                Name: "Fuse.GetCodeSuggestions",
                Arguments: {
                    CaretPosition,
                    Path,
                    Text,
                    SyntaxType: this.language
                }
            })

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
        } catch(err) {
            console.log(err);
        }

        return [];
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


type FuseGetSuggestionsResponse = {
	"Id": 42, // Id of request
	"Status": "Success",
	"Result": 
	{
        // If true you should consider trying again later
		IsUpdatingCache: boolean, 
		CodeSuggestions: FuseSuggestion[]
	}
}


type FuseSuggestion = {
        Suggestion: string,
        PreText: string,
        PostText: string,
        Type: any // "<datatype>",
        ReturnType: any //"<datatype>",
        AccessModifiers: any //[ "<accessmodifier>", ... ],
        FieldModifiers: any //[ "<fieldmodifier>", ... ],
        MethodArguments: FuseSuggestionMethodArguments[],
}

type FuseSuggestionMethodArguments = {
    Name: string;
    ArgType: any
    IsOut: "false" | "true"
}