import * as vscode from "vscode";
import {CancellationToken, WebviewView, WebviewViewResolveContext} from "vscode";

export class JMWebviewViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'jmView';

    iframeUrl: string = "http://127.0.0.1:47310/index.html";

    constructor(iframeUrl: string) {
        this.iframeUrl = iframeUrl;
    }

    resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext, token: CancellationToken): void {
        console.log('resolveWebviewView called');
        webviewView.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
            localResourceRoots: []
        };

        webviewView.webview.html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JM</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--vscode-editor-background);
      box-sizing: border-box;
    }
    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <iframe src="${this.iframeUrl}"></iframe>
</body>
</html>
`;
    }
}
