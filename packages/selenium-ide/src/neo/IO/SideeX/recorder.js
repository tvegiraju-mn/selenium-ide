// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import browser from 'webextension-polyfill'
import UiState from '../../stores/view/UiState'
import ModalState from '../../stores/view/ModalState'
import { focusRecordingWindow } from '../../IO/SideeX/find-select'
import record, { recordOpensWindow } from './record'
import { Logger, Channels } from '../../stores/view/Logs'

const logger = new Logger(Channels.PLAYBACK)
const actionCommentMap = {
  'click' : 'Click on',
  'type' : 'Entering',
  'select' : 'Selecting',
  'readDataFromUI' : 'Reading',
  'readElementAttribute' : 'Reading Attribute',
  'readElementStyle' : 'Reading Style',
  'readElementPresence' : 'Reading Presence',
  'checkbox': 'Check/Uncheck',
  'performWait' : 'Wait on',
  'dragAndDropToObject' : 'Drag',
  'jsclick' : 'Click on'
}
const actionsReqDetails = ['readElementAttribute', 'readElementStyle', 'performWait', 'ComparisonOfTwoValues'];
var ignoreTableDetailsForActions = ['ComparisonOfTwoValues']
var appType = undefined
var reactTableRowData = undefined
//var tableData = undefined

function getSelectedCase() {
  return {
    id: UiState.selectedTest.test.id,
  }
}

function hasRecorded() {
  return !!UiState.selectedTest.test.commands.length
}

export default class BackgroundRecorder {
  constructor(windowSession) {
    // The only way to know if a tab is recordable is to assume it is, and verify it sends a record
    // In order to do that we need to optimistically attach the recorder to all tabs, and try to
    // remove it, even if it's in a priviledged tab
    this.windowSession = windowSession
    this.lastAttachedTabId = undefined
    this.lastActivatedTabId = undefined
    this.isAttaching = false
    this.attached = false
    this.rebind()
    if (browser && browser.runtime && browser.runtime.onMessage) {
      browser.runtime.onMessage.addListener(this.attachRecorderRequestHandler)
      browser.runtime.onMessage.addListener(this.frameCountHandler)
      browser.runtime.onMessage.addListener(this.initRecordingMessageHandler)
    }
  }

  async attachToTab(tabId) {
    await browser.tabs.sendMessage(tabId, { attachRecorder: true })
    await browser.tabs.sendMessage(tabId, { updateAppType: true, appType: appType })
  }

  async detachFromTab(tabId) {
    await browser.tabs
      .sendMessage(tabId, { detachRecorder: true })
      .catch(() => {
        // the tab was deleted during the test, ignoring
      })
  }

  async reattachToTab(tabId) {
    if (tabId !== this.lastAttachedTabId) {
      if (this.lastAttachedTabId && this.lastAttachedTabId !== tabId) {
        await this.detachFromTab(this.lastAttachedTabId)
      }
      try {
        await this.attachToTab(tabId)
      } catch (e) {
        // tab was created by onCreatedNavigationTarget
        // its not in ready state, but we know it will
        // bootstrap once it is ready
        // so we set the last attached tabId anyway
      }
      this.lastAttachedTabId = tabId
    }
  }

  // TODO: rename method
  tabsOnActivatedHandler(activeInfo) {
    this.lastActivatedTabId = activeInfo.tabId
    let testCase = getSelectedCase()
    if (!testCase) {
      return
    }
    let testCaseId = testCase.id
    if (!this.windowSession.openedTabIds[testCaseId]) {
      return
    }

    if (
      this.windowSession.openedTabIds[testCaseId] &&
      this.doesTabBelongToRecording(activeInfo.tabId)
    ) {
      this.reattachToTab(activeInfo.tabId)
    }

    // Because event listener is so fast that selectWindow command is added
    // before other commands like clicking a link to browse in new tab.
    // Delay a little time to add command in order.
    setTimeout(() => {
      if (
        this.windowSession.currentUsedTabId[testCaseId] === activeInfo.tabId &&
        this.windowSession.currentUsedWindowId[testCaseId] ===
          activeInfo.windowId
      )
        return
      // If no command has been recorded, ignore selectWindow command
      // until the user has select a starting page to record the commands
      if (!hasRecorded()) return
      // Ignore all unknown tabs, the activated tab may not derived from
      // other opened tabs, or it may managed by other SideeX panels
      if (
        this.windowSession.openedTabIds[testCaseId][activeInfo.tabId] ==
        undefined
      )
        return
      // Tab information has existed, add selectWindow command
      this.windowSession.currentUsedTabId[testCaseId] = activeInfo.tabId
      this.windowSession.currentUsedWindowId[testCaseId] = activeInfo.windowId
      this.windowSession.currentUsedFrameLocation[testCaseId] = 'root'
      record(
        'selectWindow',
        [
          [
            `handle=\${${
              this.windowSession.openedTabIds[testCaseId][activeInfo.tabId]
            }}`,
          ],
        ],
        ''
      )
    }, 150)
  }

  windowsOnFocusChangedHandler(windowId) {
    let testCase = getSelectedCase()
    if (!testCase) {
      return
    }
    let testCaseId = testCase.id
    if (!this.windowSession.openedTabIds[testCaseId]) {
      return
    }

    if (windowId === browser.windows.WINDOW_ID_NONE) {
      // In some Linux window managers, WINDOW_ID_NONE will be listened before switching
      // See MDN reference :
      // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/onFocusChanged
      return
    }

    browser.tabs
      .query({
        windowId: windowId,
        active: true,
      })
      .then(tabs => {
        const tab = tabs[0]
        this.lastActivatedTabId = tab.id
        if (
          this.windowSession.openedTabIds[testCaseId] &&
          this.doesTabBelongToRecording(tab.id)
        ) {
          this.reattachToTab(tab.id)
        }
      })

    // If the activated window is the same as the last, just do nothing
    // selectWindow command will be handled by tabs.onActivated listener
    // if there also has a event of switching a activated tab
    if (this.windowSession.currentUsedWindowId[testCaseId] === windowId) return

    browser.tabs
      .query({
        windowId: windowId,
        active: true,
      })
      .then(tabs => {
        if (tabs.length === 0 || this.isPrivilegedPage(tabs[0].url)) {
          return
        }

        // The activated tab is not the same as the last
        if (tabs[0].id !== this.windowSession.currentUsedTabId[testCaseId]) {
          // If no command has been recorded, ignore selectWindow command
          // until the user has select a starting page to record commands
          if (!hasRecorded()) return

          // Ignore all unknown tabs, the activated tab may not derived from
          // other opened tabs, or it may managed by other SideeX panels
          if (
            this.windowSession.openedTabIds[testCaseId][tabs[0].id] == undefined
          )
            return

          // Tab information has existed, add selectWindow command
          this.windowSession.currentUsedWindowId[testCaseId] = windowId
          this.windowSession.currentUsedTabId[testCaseId] = tabs[0].id
          this.windowSession.currentUsedFrameLocation[testCaseId] = 'root'
          record(
            'selectWindow',
            [
              [
                `handle=\${${
                  this.windowSession.openedTabIds[testCaseId][tabs[0].id]
                }}`,
              ],
            ],
            ''
          )
        }
      })
  }

  tabsOnRemovedHandler(tabId, _removeInfo) {
    let testCase = getSelectedCase()
    if (!testCase) {
      return
    }
    let testCaseId = testCase.id
    if (!this.windowSession.openedTabIds[testCaseId]) {
      return
    }

    if (this.windowSession.openedTabIds[testCaseId][tabId] != undefined) {
      if (this.windowSession.currentUsedTabId[testCaseId] !== tabId) {
        record(
          'selectWindow',
          [
            [
              `handle=\${${
                this.windowSession.openedTabIds[testCaseId][tabId]
              }}`,
            ],
          ],
          ''
        )
        record('close', [['']], '')
        record(
          'selectWindow',
          [
            [
              `handle=\${${
                this.windowSession.openedTabIds[testCaseId][
                  this.windowSession.currentUsedTabId[testCaseId]
                ]
              }}`,
            ],
          ],
          ''
        )
      } else {
        record('close', [['']], '')
      }
      delete this.windowSession.openedTabIds[testCaseId][tabId]
      this.windowSession.currentUsedFrameLocation[testCaseId] = 'root'
    }
  }

  webNavigationOnCreatedNavigationTargetHandler(details) {
    // we can't necessarily know that this will indicate a tab being
    // activated, and we hope tabs.onActivated will get called for us
    let testCase = getSelectedCase()
    if (!testCase) return
    let testCaseId = testCase.id
    if (
      this.windowSession.openedTabIds[testCaseId][details.sourceTabId] !=
      undefined
    ) {
      this.windowSession.openedTabIds[testCaseId][
        details.tabId
      ] = `win${Math.floor(Math.random() * 10000)}`
      recordOpensWindow(
        this.windowSession.openedTabIds[testCaseId][details.tabId]
      )
      if (details.windowId != undefined) {
        this.windowSession.setOpenedWindow(details.windowId)
      } else {
        // Google Chrome does not support windowId.
        // Retrieve windowId from tab information.
        browser.tabs.get(details.tabId).then(tabInfo => {
          this.windowSession.setOpenedWindow(tabInfo.windowId)
        })
      }
      this.windowSession.openedTabCount[testCaseId]++
      if (
        this.lastAttachedTabId !== this.lastActivatedTabId &&
        this.lastActivatedTabId === details.tabId
      ) {
        this.reattachToTab(details.tabId)
      }
    }
  }

  attachRecorderRequestHandler(message, sender, sendResponse) {
    if (message.attachRecorderRequest) {
      if (this.doesTabBelongToRecording(sender.tab.id)) {
        return sendResponse(this.attached)
      }
      return sendResponse(false)
    }
  }

  addCommandMessageHandler(message, sender, sendResponse) {
    if (message.frameRemoved) {
      browser.tabs.sendMessage(sender.tab.id, {
        recalculateFrameLocation: true,
      })
      return sendResponse(true)
    }
    if (
      !message.command ||
      this.windowSession.openedWindowIds[sender.tab.windowId] == undefined
    ) {
      return
    }
    sendResponse(true)

    let testCaseId = getSelectedCase().id

    if (!hasRecorded()) {
      record('open', [[sender.tab.url]], '')
    }

    if (this.windowSession.openedTabIds[testCaseId][sender.tab.id] == undefined)
      return

    if (this.windowSession.currentUsedTabId[testCaseId] != sender.tab.id) {
      this.windowSession.currentUsedTabId[testCaseId] = sender.tab.id
      this.windowSession.currentUsedWindowId[testCaseId] = sender.tab.windowId
      this.windowSession.currentUsedFrameLocation[testCaseId] = 'root'
      record(
        'selectWindow',
        [
          [
            `handle=\${${
              this.windowSession.openedTabIds[testCaseId][sender.tab.id]
            }}`,
          ],
        ],
        ''
      )
    }

    if (
      message.frameLocation !==
      this.windowSession.currentUsedFrameLocation[testCaseId]
    ) {
      let newFrameLevels = message.frameLocation.split(':')
      let oldFrameLevels = this.windowSession.currentUsedFrameLocation[
        testCaseId
      ].split(':')
      while (oldFrameLevels.length > newFrameLevels.length) {
        record('selectFrame', [['relative=parent']], '')
        oldFrameLevels.pop()
      }
      while (
        oldFrameLevels.length != 0 &&
        oldFrameLevels[oldFrameLevels.length - 1] !=
          newFrameLevels[oldFrameLevels.length - 1]
      ) {
        record('selectFrame', [['relative=parent']], '')
        oldFrameLevels.pop()
      }
      while (oldFrameLevels.length < newFrameLevels.length) {
        record(
          'selectFrame',
          [['index=' + newFrameLevels[oldFrameLevels.length]]],
          ''
        )
        oldFrameLevels.push(newFrameLevels[oldFrameLevels.length])
      }
      this.windowSession.currentUsedFrameLocation[testCaseId] =
        message.frameLocation
    }
    if (
      message.command.includes('Value') && actionsReqDetails.indexOf(message.command) == -1 &&
      typeof message.value === 'undefined'
    ) {
      logger.error(
        "This element does not have property 'value'. Please change to use storeText command."
      )
      return
    } else if (message.command.includes('Text') && actionsReqDetails.indexOf(message.command) == -1 && message.value === '') {
      logger.error(
        "This element does not have property 'Text'. Please change to use storeValue command."
      )
      return
    } else if (message.command.includes('store')) {
      // In Google Chrome, window.prompt() must be triggered in
      // an actived tabs of front window, so we let panel window been focused
      browser.windows
        .update(this.windowSession.ideWindowId, { focused: true })
        .then(() => {
          // Even if window has been focused, window.prompt() still failed.
          // Delay a little time to ensure that status has been updated
          setTimeout(() => {
            message.value = prompt('Enter the name of the variable')
            if (message.insertBeforeLastCommand) {
              record(message.command, message.target, message.value, true)
            } else {
              this.sendRecordNotification(
                sender.tab.id,
                message.command,
                message.target,
                message.value
              )
              record(message.command, message.target, message.value)
            }
          }, 100)
        })
      return
    } else if (message.command.includes('addStep')) {
      this.getInputFromUserAndRecord(message, sender, 'Enter the name of the Step')
      return
    } else if (message.command == 'reactTableRowData') {
      var indicatorMessage = ''
      if (message.target) {
        if (!reactTableRowData) {
          reactTableRowData = []
        }
        reactTableRowData.push(message.target)
        indicatorMessage = 'criteria added for table row identification'
      } else {
        indicatorMessage = 'row criteria not registered as it is not supported on this.'
      }
      this.sendRecordNotification(
          sender.tab.id,
          indicatorMessage,
          message.target,
          message.value
      )
      return
    }

    //handle choose ok/cancel confirm
    if (message.insertBeforeLastCommand) {
      record(message.command, message.target, message.value, true)
    } else {
      var indMessage = message.command;
      if (appType == 'BOB' && message.target[0][1] != 'id' && message.target[0][1] != 'table')
        indMessage = indMessage + ' action does not have ID'
      this.sendRecordNotification(
        sender.tab.id,
        indMessage,
        message.target,
        message.value
      )
      record(message.command, message.target, message.value)
    }
    this.updateCommentInRecordedCommand(message.command, message.comment);
    //if the element is inside table
    var recCommand = UiState.lastRecordedCommand;
    if (!recCommand) return;
    if (message.command == 'dragAndDropToObject') {
      var dropToObjectData = {
        "toElementTargets": message.additionalData
      };
      recCommand.setOtherData(dropToObjectData);
      //Mostly dragAndDropToObject action won't have additional inputs or from a table
      return;
    }
    var self = this;
    var isUserClicksOnCancel = function(response) {
      if (response.data.removeLastCommand) {
        //Remove last recorded command && resume recording
        UiState.displayedTest.removeCommand(recCommand)
        self.startRecording();
        return true;
      }
      return false;
    }
    var getResponseFromWebApp = function() {
      if (actionsReqDetails.indexOf(message.command) > -1) {
        self.stopRecording();
        var dataInputToWebapp = {modalType: message.command, data: { comment : message.comment}};
        var callbackFn = function(response) {
          if (isUserClicksOnCancel(response)) {
            return;
          }
          recCommand.setOtherData(response.data);
          if (ignoreTableDetailsForActions.indexOf(message.command) > -1 && message.recordedType == 'table') {
            var newTarget = message.target && message.target[1] ? message.target[1][0] : message.target[0][0];
            recCommand.setTarget(newTarget);
          }
          self.startRecording();
        }
        self.updateDataFromWebAppInRecCommand(dataInputToWebapp, callbackFn, true);
      } else
        self.startRecording();
    }
    if (message.recordedType) {
      if (message.recordedType == 'table' && ignoreTableDetailsForActions.indexOf(message.command) == -1) {
        var attrValues = message.additionalData.split('|');
        var rowAttrs = attrValues[0].split('=')
        var rowType = rowAttrs[1];
        var typeAttrs = attrValues[1].split('=')
        var elementType = typeAttrs[1];
        var columnType = undefined, columnName = undefined
        if (attrValues.length > 2) {
          columnName = attrValues[2].split('=')[1]
          columnType = attrValues[3].split('=')[1]
        }
        var elementIndex = attrValues.length >= 5 ? attrValues[4].split('=')[1] : '1'
        /*browser.windows.update(this.windowSession.ideWindowId, { focused: true })
            .then(() => {setTimeout(() => {
                recCommand.setHasTableInput(true);
                recCommand.setTableInput({'SelectRow': {'rowType' : rowType}, 'SelectColumn': {'elementType' : elementType}});
                ModalState.toggleTableInputConfig();
                recCommand.toggleOpensTableInput();
              }, 100)});*/
        var newTableData = [{SelectRow: [{rowType : rowType}], SelectColumn: [{elementType : elementType, columnType : columnType, columnName : columnName, elementIndex : elementIndex}]}]
        var uniqColName = columnName && columnName.length > 2 ? columnName : undefined;
        if (reactTableRowData && reactTableRowData.length > 0) {
          newTableData[0].SelectRow[0]['ColumnIdentifier'] = JSON.parse(JSON.stringify(reactTableRowData));
          if (!uniqColName) {
            for (var idx in reactTableRowData) {
              var colIdData = reactTableRowData[idx]
              if (colIdData.columnName != undefined && colIdData.columnName != '' && colIdData.columnName.length > 2) {
                uniqColName = colIdData.columnName
                break
              }
            }
          }
          reactTableRowData = undefined;
        }
        newTableData[0].columnName = uniqColName;
        /*if (tableData) {
          newTableData = JSON.parse(JSON.stringify(tableData))
          newTableData[0].SelectRow[0].rowType = rowType
          newTableData[0].SelectColumn[0].elementType = elementType
        }*/
        var selectTableData = {modalType: 'SelectTable', data: newTableData};
        var callbackFn = function(response) {
          //If user click on cancel in table view
          if (isUserClicksOnCancel(response)) {
            return;
          }
          recCommand.setTableInput(response.data)
          //tableData = response.data
          var newComm = ''
          if (response.data[0] && response.data[0].SelectColumn && response.data[0].SelectColumn[0] && response.data[0].SelectColumn[0]) {
            var colData = response.data[0].SelectColumn[0];
            newComm = (colData.columnName && colData.columnName != '' ? colData.columnName : (colData.columnType && colData.columnType != '' ? colData.columnType : ''))
          }
          if (newComm != '') {
            newComm = (message.comment ? message.comment + ' in ' + newComm + ' column' : newComm + ' column')
            self.updateCommentInRecordedCommand(message.command, newComm)
          }
          getResponseFromWebApp();
        }
        self.stopRecording();
        this.updateDataFromWebAppInRecCommand(selectTableData, callbackFn, actionsReqDetails.indexOf(message.command) > -1);
      } else if (message.recordedType == 'leftNav' || message.recordedType == 'locatorHavingData') {
        recCommand.setIsLeftNav('true');
        var attrValues = message.additionalData.split('=');
        var otherData = recCommand.otherData;
        if (!otherData) otherData = {};
        if (message.recordedType == 'leftNav')
          otherData.navLinks = attrValues[1];
        else
          otherData.innerText = attrValues[1];
        recCommand.setOtherData(otherData) ;
      }
    }
    if (message.recordedType != 'table' || ignoreTableDetailsForActions.indexOf(message.command) > -1) {
      reactTableRowData = undefined;
      getResponseFromWebApp();
    }
  }

  startRecording() {
    if (!UiState.isRecording)
      UiState.toggleRecord();
}

  stopRecording() {
    if (UiState.isRecording)
      UiState.toggleRecord();
  }

  initRecordingMessageHandler(message, sender, sendResponse) {
    if (message.initRecording) {
      //First stopping the recording
      this.stopRecording();
      appType = message.appType;
      if (message.clearAllCommands)
        UiState.displayedTest.clearAllCommands();
      this.startRecording();
    }
  }

  updateDataFromWebAppInRecCommand(data, callbackFn, noToggling) {
    var self = this;
    if (!noToggling)
      self.stopRecording();
    browser.runtime.sendMessage({type: 'showModal', payload: data}).then(function(response) {
      callbackFn(response);
      if (!noToggling)
        self.startRecording();
    });
  }

  updateCommentInRecordedCommand(command, comment) {
    var recCommand = UiState.lastRecordedCommand;
    if (comment && recCommand) {
      recCommand.setComment((actionCommentMap[command] ? actionCommentMap[command] : command) + ' ' + comment.replace(':', ''));
    }
  }

  getInputFromUserAndRecord(message, sender, promptMsg) {
    if (message.recordedType) {
      //if recorded Type is set, it may be from Table or left navs
      //Ignore reading variable in case of table as that will be generated based on user input
      return;
    }
    UiState.toggleRecord();
    /*var self = this;
    browser.runtime.sendMessage({type: 'showModal', payload: 'Hello There...'}).then(function(response) {
      message.value = response.data.aliasName;
      if (message.insertBeforeLastCommand) {
        record(message.command, message.target, message.value, true)
      } else {
        self.sendRecordNotification(
            sender.tab.id,
            message.command,
            message.target,
            message.value
        )
        record(message.command, message.target, message.value);
        self.updateCommentInRecordedCommand(message.command, message.comment);
      }
      UiState.toggleRecord();
      //focusRecordingWindow();
    });*/
    /*if (message.comment) {
      record(message.command, message.target, message.comment.replace(/[^a-zA-Z0-9_]/ig, ''));
      this.updateCommentInRecordedCommand(message.command, message.comment);
      return;
    }*/
    // In Google Chrome, window.prompt() must be triggered in
    // an actived tabs of front window, so we let panel window been focused
    browser.windows
        .update(this.windowSession.ideWindowId, { focused: true })
        .then(() => {
          // Even if window has been focused, window.prompt() still failed.
          // Delay a little time to ensure that status has been updated
          setTimeout(() => {
            message.value = prompt(promptMsg)
            if (message.insertBeforeLastCommand) {
              record(message.command, message.target, message.value, true)
            } else {
              this.sendRecordNotification(
                  sender.tab.id,
                  message.command,
                  message.target,
                  message.value
              )
              record(message.command, message.target, message.value);
              this.updateCommentInRecordedCommand(message.command, message.comment);
            }
            UiState.toggleRecord();
            //focusRecordingWindow();
          }, 100)
        })
  }

  sendRecordNotification(tabId, command, target, value) {
    browser.tabs
      .sendMessage(
        tabId,
        {
          recordNotification: true,
          command,
          target,
          value,
        },
        {
          frameId: 0,
        }
      )
      .catch(() => {})
  }

  isPrivilegedPage(url) {
    if (
      url.substr(0, 13) == 'moz-extension' ||
      url.substr(0, 16) == 'chrome-extension'
    ) {
      return true
    }
    return false
  }

  rebind() {
    this.tabsOnActivatedHandler = this.tabsOnActivatedHandler.bind(this)
    this.windowsOnFocusChangedHandler = this.windowsOnFocusChangedHandler.bind(
      this
    )
    this.tabsOnRemovedHandler = this.tabsOnRemovedHandler.bind(this)
    this.webNavigationOnCreatedNavigationTargetHandler = this.webNavigationOnCreatedNavigationTargetHandler.bind(
      this
    )
    this.addCommandMessageHandler = this.addCommandMessageHandler.bind(this)
    this.attachRecorderRequestHandler = this.attachRecorderRequestHandler.bind(
      this
    )
    this.initRecordingMessageHandler = this.initRecordingMessageHandler.bind(this)
    this.frameCountHandler = this.frameCountHandler.bind(this)
  }

  frameCountHandler(message, sender, sendResponse) {
    if (message.requestFrameCount) {
      const result =
        this.attached || this.isAttaching
          ? this.windowSession.frameCountForTab[sender.tab.id]
          : undefined
      return sendResponse(result)
    } else if (message.setFrameNumberForTab) {
      this.windowSession.frameCountForTab[sender.tab.id] = {
        indicatorIndex: message.indicatorIndex,
      }
      return sendResponse(true)
    }
  }

  async attach(startUrl) {
    if (this.attached || this.isAttaching) {
      return
    }
    try {
      this.isAttaching = true
      browser.tabs.onActivated.addListener(this.tabsOnActivatedHandler)
      browser.windows.onFocusChanged.addListener(
        this.windowsOnFocusChangedHandler
      )
      browser.tabs.onRemoved.addListener(this.tabsOnRemovedHandler)
      browser.webNavigation.onCreatedNavigationTarget.addListener(
        this.webNavigationOnCreatedNavigationTargetHandler
      )
      browser.runtime.onMessage.addListener(this.addCommandMessageHandler)

      await this.attachToExistingRecording(startUrl)

      this.attached = true
      this.isAttaching = false
    } catch (err) {
      this.isAttaching = false
      throw err
    }
  }

  async detach() {
    if (!this.attached) {
      return
    }
    await this.detachFromTab(this.lastAttachedTabId)
    this.lastAttachedTabId = undefined
    this.attached = false
    browser.tabs.onActivated.removeListener(this.tabsOnActivatedHandler)
    browser.windows.onFocusChanged.removeListener(
      this.windowsOnFocusChangedHandler
    )
    browser.tabs.onRemoved.removeListener(this.tabsOnRemovedHandler)
    browser.webNavigation.onCreatedNavigationTarget.removeListener(
      this.webNavigationOnCreatedNavigationTargetHandler
    )
    browser.runtime.onMessage.removeListener(this.addCommandMessageHandler)
  }

  // this will attempt to connect to a previous recording
  // else it will create a new window for recording
  async attachToExistingRecording(url) {
    let testCaseId = getSelectedCase().id
    try {
      if (this.windowSession.currentUsedWindowId[testCaseId]) {
        // test was recorded before and has a dedicated window
        await browser.windows.update(
          this.windowSession.currentUsedWindowId[testCaseId],
          {
            focused: true,
          }
        )
      } else if (
        this.windowSession.generalUseLastPlayedTestCaseId === testCaseId
      ) {
        // the last played test was the one the user wishes to record now
        this.windowSession.dedicateGeneralUseSession(testCaseId)
        await browser.windows.update(
          this.windowSession.currentUsedWindowId[testCaseId],
          {
            focused: true,
          }
        )
      } else {
        // the test was never recorded before, nor it was the last test ran
        await this.createNewRecordingWindow(testCaseId, url)
      }
    } catch (e) {
      // window was deleted at some point by the user, creating a new one
      await this.createNewRecordingWindow(testCaseId, url)
    }
  }

  async createNewRecordingWindow(testCaseId, url) {
    const win = await browser.windows.create({
      url,
    })
    const tab = win.tabs[0]
    this.lastAttachedTabId = tab.id
    this.windowSession.setOpenedWindow(tab.windowId)
    this.windowSession.openedTabIds[testCaseId] = {}

    this.windowSession.currentUsedFrameLocation[testCaseId] = 'root'
    this.windowSession.currentUsedTabId[testCaseId] = tab.id
    this.windowSession.currentUsedWindowId[testCaseId] = tab.windowId
    this.windowSession.openedTabIds[testCaseId][tab.id] = 'root'
    this.windowSession.openedTabCount[testCaseId] = 1
  }

  doesTabBelongToRecording(tabId) {
    let testCaseId = getSelectedCase().id
    return (
      this.windowSession.openedTabIds[testCaseId] &&
      Object.keys(this.windowSession.openedTabIds[testCaseId]).includes(
        `${tabId}`
      )
    )
  }
}
