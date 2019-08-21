'use strict';

import * as vscode from 'vscode';
import { StatusBar } from './Code/StatusBar';
import { FuseDaemon } from './Fuse/Daemon';
import { fuseLocalPreview, fuseAndroidPreview, fuseiOSPreview, fuseLocalDebug } from './Fuse/Launcher';
import { CompletionProvider } from './Providers/CompletionProvider';
import { HighlightProvider } from './Providers/HighlightProvider';
import { Diagnostics } from './Providers/Diagnostics';

let statusBar: StatusBar;
let diagnostics: Diagnostics;

export function activate(context: vscode.ExtensionContext) {

    diagnostics = new Diagnostics();

    // Commands
    const connectToDaemon = vscode.commands.registerCommand('fuse.connect', () => {
        FuseDaemon.Instance.connect();
    });
    const commandLocalPreview = vscode.commands.registerCommand('fuse.preview.local', () => {
        fuseLocalPreview();
    });
    const commandAndroidPreview = vscode.commands.registerCommand('fuse.preview.android', () => {
        fuseAndroidPreview();
    });
    const commandiOSPreview = vscode.commands.registerCommand('fuse.preview.ios', () => {
        fuseiOSPreview();
    });
    const commandLocalDebug = vscode.commands.registerCommand('fuse.preview.local.debug', () =>
    {
        fuseLocalDebug();
    });

    context.subscriptions.push(
        connectToDaemon,
        commandLocalPreview,
        commandAndroidPreview,
        commandiOSPreview,
        commandLocalDebug);

    // Status bar
    statusBar = new StatusBar();

    // Daemon connection/disconnect
    FuseDaemon.Instance.connected = () => {
        statusBar.connected();
        FuseDaemon.Instance.subscribe("Fuse.BuildStarted");
        // Client.Instance.subscribe("Fuse.BuildLogged");
        FuseDaemon.Instance.subscribe("Fuse.BuildIssueDetected");
        FuseDaemon.Instance.subscribe("Fuse.BuildEnded");
    }

    FuseDaemon.Instance.disconnected = () => {
        statusBar.disconnected();
        vscode.window.showInformationMessage("Disconnected from Fuse daemon", "Reconnect").then((command) => {
            if (command === "Reconnect") {
                FuseDaemon.Instance.connect();
            }
        });
    }

    FuseDaemon.Instance.buildStarted = (data) => {
        statusBar.buildStarted();
        diagnostics.clear();
    };

    FuseDaemon.Instance.buildEnded = (data) => {
        diagnostics.ended(data);
        if (data.Data.Status === "Error") {
            statusBar.buildFailed();
        } else {
            statusBar.buildSucceeded();
        }
    };

    FuseDaemon.Instance.buildLogged = (data) => {
        //console.log("Build logged: " + JSON.stringify(data));
    };

    FuseDaemon.Instance.buildIssueDetected = (data) => {
        diagnostics.set(data);
    };

    FuseDaemon.Instance.connect();

    // Syntax hiliting
    vscode.languages.registerDocumentHighlightProvider('ux', new HighlightProvider());

    // Auto completion
    vscode.languages.registerCompletionItemProvider('ux', new CompletionProvider('UX'));
    vscode.languages.registerCompletionItemProvider('uno', new CompletionProvider('Uno'));
}


export function deactivate() {

}