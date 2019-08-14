/*
 * Copyright 2017 SideeX committers
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

import browser from 'webextension-polyfill'
import { isStaging } from '../common/utils'

let ideWindowId = undefined
let master = {}
let clickEnabled = true

window.master = master
window.openedWindowIds = []

if (isStaging) openPanel({ windowId: 0 })

function openPanel(tab) {
  let contentWindowId = tab.windowId
  if (ideWindowId) {
    browser.windows
      .update(ideWindowId, {
        focused: true,
      })
      .catch(function() {
        ideWindowId == undefined
        openPanel(tab)
      })
    return
  } else if (!clickEnabled) {
    return
  }

  clickEnabled = false
  setTimeout(function() {
    clickEnabled = true
  }, 1500)

  openWindowFromStorageResolution()
    .then(function waitForPanelLoaded(panelWindowInfo) {
      return new Promise(function(resolve, reject) {
        let count = 0
        let interval = setInterval(function() {
          if (count > 100) {
            reject('SideeX editor has no response')
            clearInterval(interval)
          }

          browser.tabs
            .query({
              active: true,
              windowId: panelWindowInfo.id,
              status: 'complete',
            })
            .then(function(tabs) {
              if (tabs.length != 1) {
                count++
                return
              } else {
                master[contentWindowId] = panelWindowInfo.id
                resolve(panelWindowInfo)
                clearInterval(interval)
              }
            })
        }, 200)
      })
    })
    .then(function bridge(panelWindowInfo) {
      ideWindowId = panelWindowInfo.id
      return browser.tabs.sendMessage(panelWindowInfo.tabs[0].id, {
        selfWindowId: panelWindowInfo.id,
        commWindowId: contentWindowId,
      })
    })
    .catch(function(e) {
      console.log(e) // eslint-disable-line no-console
    })
}

function openWindowFromStorageResolution() {
  let opts = {
    height: 720,
    width: 1350,
  }
  return browser.storage.local
    .get()
    .then(storage => {
      if (sizeIsValid(storage.size)) {
        opts.height = storage.size.height
        opts.width = storage.size.width
      }
      if (originIsValid(storage.origin)) {
        opts.top = storage.origin.top
        opts.left = storage.origin.left
      }
      return browser.windows.create(
        Object.assign(
          {
            url: browser.extension.getURL('index.html'),
            type: 'popup',
          },
          opts
        )
      )
    })
    .catch(e => {
      console.error(e) // eslint-disable-line no-console
      return browser.windows.create(
        Object.assign(
          {
            url: browser.extension.getURL('index.html'),
            type: 'popup',
          },
          opts
        )
      )
    })
}

function sizeIsValid(size) {
  return size && sideIsValid(size.height) && sideIsValid(size.width)
}

function sideIsValid(number) {
  return number && number.constructor.name === 'Number' && number > 50
}

function originIsValid(origin) {
  return origin && pointIsValid(origin.top) && pointIsValid(origin.left)
}

function pointIsValid(point) {
  return point >= 0 && point.constructor.name === 'Number'
}

browser.browserAction.onClicked.addListener(openPanel)

browser.windows.onRemoved.addListener(function(windowId) {
  let keys = Object.keys(master)
  for (let key of keys) {
    if (master[key] === windowId) {
      delete master[key]
      if (keys.length === 1) {
        browser.contextMenus.removeAll()
      }
    }
  }
  if (windowId === ideWindowId) {
    ideWindowId = undefined
    Promise.all(
      window.openedWindowIds.map(windowId =>
        browser.windows.remove(windowId).catch(() => {
          /* Window was removed previously by the user */
        })
      )
    ).then(() => {
      window.openedWindowIds = []
    })
  }
})

let port

browser.contextMenus.onClicked.addListener(function(info) {
  port.postMessage({ cmd: info.menuItemId })
})

browser.runtime.onConnect.addListener(function(m) {
  port = m
})

browser.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (!message.payload) {
      message.payload = {}
    }
    message.payload.sender = sender.id
    browser.runtime
      .sendMessage(message)
      .then(sendResponse)
      .catch(() => {
        return sendResponse({ error: 'Selenium IDE is not active' })
      })
    return true
  }
)

browser.runtime.onInstalled.addListener(() => {
  // Notify updates only in production
  if (process.env.NODE_ENV === 'production') {
    browser.storage.local.set({
      updated: true,
    })
  }
})

let url = undefined
let appType = undefined
let tabPort = undefined, tabId = undefined, windowId = undefined

var focusSourceTab = function() {
  browser.tabs.update(tabId, {
    active: true,
  });
  browser.windows.update(windowId, {
    focused: true,
  });
};

var onMessageListener = function(message, sender, sendResponse) {
  switch(message.type) {
    case "bglog":
      console.log(message.payload);
      if (tabPort)
        tabPort.postMessage({type: 'log', payload: message.payload});
      break;
    case "data":
      if (tabPort) {
        tabPort.postMessage({type: 'data', payload: message.payload});
        focusSourceTab();
      }
      break;
    case "showModal":
      if (tabPort) {
        tabPort.postMessage({type: 'showModal', payload: message.payload});
        focusSourceTab();
        var modalHandler = function(request) {
          if (request.type == 'requestedData' ) {
            console.log('ModalData From WebApp: ' + JSON.stringify(request.payload));
            sendResponse({data: request.payload});
            tabPort.onMessage.removeListener(modalHandler);
          }
        }
        tabPort.onMessage.addListener(modalHandler);
      }
      break;
    case "geturl":
      sendResponse({url: url})
      break;
    case "getAppType":
      sendResponse({appType: appType})
      break;
  }
  return true;
};

browser.runtime.onMessage.addListener(onMessageListener);

/*//Below code is for one time messages with external tabs/apps
browser.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
    console.log('got request: ' + JSON.stringify(request) + ' from tab id: ' + sender.tab.id)
    tabId = sender.tab.id
    if (request.type && request.type == 'OPENIDE') {
        openPanel({ windowId: 0 })
        if (request.payload && request.payload.url) {
          url = request.payload && request.payload.url
        }
        if (request.payload && request.payload.appType) {
          appType = request.payload && request.payload.appType
        }
    }
  console.log('end of request')
  sendResponse({success: true})
  return true;
});*/

browser.runtime.onConnectExternal.addListener(function(port) {
  tabPort = port;
  port.onMessage.addListener(function(request) {
    console.log('got request using onConnectExternal: ' + JSON.stringify(request))
    if (request.type) {
      if (request.type == 'OPENIDE') {
        browser.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
          var currTab = tabs[0];
          if (currTab) {
            tabId = currTab.id
            windowId = currTab.windowId
          }
        });
        openPanel({windowId: 0})
        if (request.payload && request.payload.url) {
          url = request.payload && request.payload.url
        }
        if (request.payload && request.payload.appType) {
          appType = request.payload && request.payload.appType
        }
        port.postMessage({type: 'log', payload: 'Ide Started with AppType: ' + appType + ' & URL: ' + url})
      } else if (request.type == 'CLOSEIDE') {
        browser.windows.remove(ideWindowId)
        port.disconnect();
        tabPort = undefined;
        tabId = undefined;
        windowId = undefined;
      }
    }
    console.log('end of request')
  })
});
