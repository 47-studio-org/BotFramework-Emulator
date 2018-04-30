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

import { connect } from 'react-redux';
import { css } from 'glamor';
import { Subscription, BehaviorSubject } from 'rxjs';
import * as _ from 'lodash';
import * as React from 'react';
import base64Url from 'base64url';

import { ActivityOrID, uniqueId, IEndpointService } from '@bfemulator/sdk-shared';
import { Splitter, Colors } from '@bfemulator/ui-react';
import * as BotChat from '@bfemulator/custom-botframework-webchat';

import { CommandService } from '../../../platform/commands/commandService';
import { getActiveBot } from '../../../data/botHelpers';
import { SettingsService } from '../../../platform/settings/settingsService';
import * as ChatActions from '../../../data/action/chatActions';
import * as PresentationActions from '../../../data/action/presentationActions';
import ChatPanel from './chatPanel';
import DetailPanel from './detailPanel';
import LogPanel from './logPanel';
import PlaybackBar from './playbackBar';
import store, { IRootState } from '../../../data/store';
import ToolBar, { Button as ToolBarButton, Separator as ToolBarSeparator } from '../toolbar';

const { encode } = base64Url;

const CSS = css({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',

  '& .vertical': {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },

  '& .header': {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: '0px'
  },

  '& .content': {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0px',
    height: '100%'
  },
});

const PRESENTATION_CSS = css({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: Colors.APP_BACKGROUND_DARK,

  '& .chat-panel': {
    position: 'absolute',
    top: '50%',
    height: '75%',
    maxHeight: '800px',
    width: '100%',
    transform: 'translateY(-50%)'
  },

  '& > .presentation-content': {
    position: 'relative',
    height: '100%',
    padding: '64px 0',
    maxWidth: '400px',
    margin: '0 auto'
  },

  '& > .close-presentation-icon': {
    position: 'absolute',
    top: 0,
    right: 0,
    display: 'inline-block',
    width: '64px',
    height: '64px',
    backgroundImage: 'url(./external/media/ic_close.svg)',
    backgroundSize: '32px',
    backgroundPosition: '50% 50%',
    backgroundRepeat: 'no-repeat',
    cursor: 'pointer'
  },

  '& .presentation-playback-dock': {
    display: 'none',
    position: 'absolute',
    bottom: 0,
    height: '64px',
    width: '400px',
  }
});

export type EmulatorMode = 'transcript' | 'livechat';

interface IEmulatorProps {
  conversationId?: string;
  dirty?: boolean;
  document?: any;
  documentId?: string;
  endpointId?: string;
  endpointService?: IEndpointService;
  mode?: EmulatorMode;
  pingId?: number;
  presentationModeEnabled?: boolean;
}

class Emulator extends React.Component<IEmulatorProps, {}> {
  constructor(props, context) {
    super(props, context)
    this.handlePresentationClick = this.handlePresentationClick.bind(this);
    this.handleStartOverClick = this.handleStartOverClick.bind(this);
    this.handleExportClick = this.handleExportClick.bind(this);
    this.handleImportClick = this.handleImportClick.bind(this);

    this.onVerticalSizeChange = _.debounce(this.onVerticalSizeChange.bind(this), 500);
    this.onHorizontalSizeChange = _.debounce(this.onHorizontalSizeChange.bind(this), 500);

    this.getVerticalSplitterSizes = this.getVerticalSplitterSizes.bind(this);

    this.getHorizontalSplitterSizes = this.getHorizontalSplitterSizes.bind(this);
  }

  getVerticalSplitterSizes() {
    return {
      0: `${this.props.document.ui.verticalSplitter[0].percentage}`
    }
  }

  getHorizontalSplitterSizes() {
    return {
      0: `${this.props.document.ui.horizontalSplitter[0].percentage}`
    }
  }

  onVerticalSizeChange(sizes) {
    this.props.document.ui = {
      ...this.props.document.ui,
      verticalSplitter: sizes
    };
  }

  onHorizontalSizeChange(sizes) {
    this.props.document.ui = {
      ...this.props.document.ui,
      horizontalSplitter: sizes
    };
  }

  shouldStartNewConversation(props?: any) {
    props = props || this.props;
    return !props.document.directLine ||
      (props.document.conversationId != props.document.directLine.conversationId);
  }

  componentWillMount() {
    if (this.shouldStartNewConversation()) {
      this.startNewConversation();
    }
  }

  componentWillReceiveProps(nextProps, nextContext) {
    for (; ;) {
      if (nextProps.document.directLine || this.props.document.documentId === nextProps.document.documentId) {
        break;
      }
      this.startNewConversation(nextProps);
      break;
    }
    if (this.props.document.documentId !== nextProps.document.documentId) {
      store.dispatch(ChatActions.pingDocument(nextProps.document.documentId));
    }
  }

  componentWillUpdate(nextProps, nextState, nextContext) {
  }

  componentDidUpdate(prevProps, prevState, prevContext) {
  }

  handlePresentationClick(enable: boolean) {
    enable ? store.dispatch(PresentationActions.enable()) :
      store.dispatch(PresentationActions.disable());
  }

  async startNewConversation(props?: any) {
    props = props || this.props;

    store.dispatch(ChatActions.clearLog(this.props.document.documentId));
    store.dispatch(ChatActions.setInspectorObjects(props.document.documentId, []));

    if (props.document.subscription) {
      props.document.subscription.unsubscribe();
    }
    const selectedActivity$ = new BehaviorSubject({});
    const subscription = selectedActivity$.subscribe((obj: any) => {
      if (obj && obj.activity) {
        store.dispatch(ChatActions.setInspectorObjects(props.document.documentId, obj.activity));
      }
    });

    const { services = [] } = getActiveBot() || {};
    const endpointService: IEndpointService = services.find(s => s.id === props.document.endpointId) as IEndpointService;

    // TODO: Don't append mode
    const conversationId = `${ uniqueId() }|${ props.mode }`;
    const options = {
      conversationId,
      conversationMode: props.mode,
      endpointId: props.endpointId
    };

    if (props.document.directLine) {
      props.document.directLine.end();
    }

    this.initConversation(props, options, selectedActivity$, subscription)

    if (props.mode === 'transcript') {
      try {
        const conversation = await CommandService.remoteCall('transcript:new', conversationId);

        if (props.document && props.document.deepLink && props.document.activities) {
          try {
            // transcript was deep linked via protocol, and should just be fed its own activities attached to the document
            await CommandService.remoteCall('emulator:feed-transcript:deep-link', conversation.conversationId, props.document.activities)
          } catch (err) {
            throw new Error(`Error while feeding deep-linked transcript to conversation: ${err}`);
          }
        } else {
          try {
            // the transcript is on disk, so its activities need to be read on the main side and fed in
            await CommandService.remoteCall('emulator:feed-transcript:disk', conversation.conversationId, props.document.documentId)
          } catch (err) {
            throw new Error(`Error while feeding transcript on disk to conversation: ${err}`);
          }
        }
      } catch (err) {
        // TODO: surface error somewhere
        console.error('Error creating a new conversation for transcript mode: ', err)
      }
    }
  }

  initConversation(props, options, selectedActivity$, subscription) {
    const webChatStore = BotChat.createStore();
    const encodedOptions = encode(JSON.stringify(options));

    // TODO: We need to use encoded token because we need to pass both endpoint ID and conversation ID
    //       We should think about a better model to pass conversation ID from Web Chat to emulator core
    const directLine = new BotChat.DirectLine({
      secret: encodedOptions,
      domain: `${ SettingsService.emulator.url }/v3/directline`,
      webSocket: false
    });

    props.dispatch(
      ChatActions.newConversation(props.documentId, {
        conversationId: options.conversationId,
        webChatStore,
        directLine,
        selectedActivity$,
        subscription
      })
    );
  }

  handleStartOverClick() {
    this.startNewConversation();
  }

  handleExportClick() {
    if (this.props.document.directLine) {
      CommandService.remoteCall('emulator:save-transcript-to-file', this.props.document.directLine.conversationId);
    }
  }

  handleImportClick() {
  }

  render(): JSX.Element {
    return this.props.presentationModeEnabled ? this.renderPresentationView() : this.renderDefaultView();
  }

  renderPresentationView(): JSX.Element {
    return (
      <div { ...PRESENTATION_CSS }>
        <div className="presentation-content">
          <ChatPanel mode={ this.props.mode } document={ this.props.document } onStartConversation={ this.handleStartOverClick } />
          {
            this.props.mode === 'transcript' ?
              <div className="presentation-playback-dock"><PlaybackBar /></div>
              :
              null
          }
        </div>
        <span className="close-presentation-icon" onClick={ () => this.handlePresentationClick(false) }></span>
      </div>
    );
  }

  renderDefaultView(): JSX.Element {
    return (
      <div { ...CSS } key={ this.props.pingId }>
        <div className="header">
          <ToolBar>
            <ToolBarButton visible={ true } title="Presentation" onClick={ () => this.handlePresentationClick(true) } />
            <ToolBarSeparator visible={ true } />
            <ToolBarButton visible={ this.props.mode === 'livechat' } title="Start Over" onClick={ this.handleStartOverClick } />
            <ToolBarButton visible={ true } title="Save Transcript As..." onClick={ this.handleExportClick } />
          </ToolBar>
        </div>
        <div className="content vertical">
          <Splitter orientation="vertical" primaryPaneIndex={ 0 } minSizes={ { 0: 80, 1: 80 } } initialSizes={ this.getVerticalSplitterSizes } onSizeChange={ this.onVerticalSizeChange } key={ this.props.pingId }>
            <div className="content">
              <ChatPanel mode={ this.props.mode } document={ this.props.document } onStartConversation={ this.handleStartOverClick } />
            </div>
            <div className="content">
              <Splitter orientation="horizontal" primaryPaneIndex={ 0 } minSizes={ { 0: 80, 1: 80 } } initialSizes={ this.getHorizontalSplitterSizes } onSizeChange={ this.onHorizontalSizeChange } key={ this.props.pingId }>
                <DetailPanel document={ this.props.document } key={ this.props.pingId } />
                <LogPanel document={ this.props.document } key={ this.props.pingId } />
              </Splitter>
            </div>
          </Splitter>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state: IRootState, { documentId }: { documentId: string }): IEmulatorProps {
  return {
    conversationId: state.chat.chats[documentId].conversationId,
    document: state.chat.chats[documentId],
    endpointId: state.chat.chats[documentId].endpointId,
    pingId: state.chat.chats[documentId].pingId,
    presentationModeEnabled: state.presentation.enabled
  };
}

export default connect(mapStateToProps, null)(Emulator as any);
