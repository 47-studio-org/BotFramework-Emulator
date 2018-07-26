//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
import * as React from 'react';
import { ServicePane } from '../servicePane/servicePane';
import { DispatchEditorContainer } from './dispatchEditor';
export class DispatchExplorer extends ServicePane {
    constructor(props, context) {
        super(props, context);
        this.state = {};
        this.onLinkClick = (event) => {
            const { currentTarget } = event;
            const { index } = currentTarget.dataset;
            const { [index]: dispatchService } = this.props.dispatchServices;
            this.props.openDispatchDeepLink(dispatchService);
        };
        this.onAddIconClick = (_event) => {
            this.props.launchDispatchEditor(DispatchEditorContainer);
        };
    }
    get links() {
        const { dispatchServices = [] } = this.props;
        return dispatchServices
            .map((model, index) => {
            return React.createElement("li", { key: index, onClick: this.onLinkClick, "data-index": index }, model.name);
        });
    }
    onContextMenuOverLiElement(li) {
        super.onContextMenuOverLiElement(li);
        const { index } = li.dataset;
        const { [index]: dispatchService } = this.props.dispatchServices;
        this.props.openContextMenu(dispatchService, DispatchEditorContainer);
    }
}
//# sourceMappingURL=dispatchExplorer.js.map