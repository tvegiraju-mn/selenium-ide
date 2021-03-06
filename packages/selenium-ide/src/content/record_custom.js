/* eslint no-unused-vars: off, no-useless-escape: off */
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
import goog, { bot } from './closure-polyfill'
import { Recorder, recorder, record } from './record-api'
import { attach } from './prompt-recorder'
import LocatorBuilders from './locatorBuilders_custom'
import customLocatorBuilders from './customLocatorBuilders'
import { isTest, isFirefox } from '../common/utils'

export { record }
export const locatorBuilders = new LocatorBuilders(window)
const customBuilders = new customLocatorBuilders(locatorBuilders);

attach(record)

function updateAppTypeHandler(message, _sender, sendResponse) {
  if (message.updateAppType) {
    console.log('inside update apptype to : ' + message.appType);
    //locatorBuilders.setPreferredOrderByAppType(message.appType)
    customBuilders.updateAppType(message.appType);
    sendResponse(true)
  }
}

browser.runtime.onMessage.addListener(updateAppTypeHandler)

function handleRecord(cmd, targets, value) {
  record(cmd, targets, value, undefined, undefined, locatorBuilders.displayName, locatorBuilders.recordedType, locatorBuilders.additionalData)
}

function buildLocators(el, ignoreInnerText) {
  return locatorBuilders.buildAll(el, ignoreInnerText);
}

Recorder.inputTypes = [
  'text',
  'password',
  'file',
  'datetime',
  'datetime-local',
  'date',
  'month',
  'time',
  'week',
  'number',
  'range',
  'email',
  'url',
  'search',
  'tel',
  'color',
]
Recorder.addEventHandler('type', 'change', function(event) {
  if (!event.target.tagName) return;
  let tagName = event.target.tagName.toLowerCase()
  let type = event.target.type
  if (('input' == tagName && Recorder.inputTypes.indexOf(type) >= 0) || 'textarea' == tagName) {
    handleRecord('type', buildLocators(event.target), event.target.value)
  }
  /*// © Chen-Chieh Ping, SideeX Team
  if (
    event.target.tagName &&
    !this.recordingState.preventType &&
    this.recordingState.typeLock == 0 &&
    (this.recordingState.typeLock = 1)
  ) {
    // END
    let tagName = event.target.tagName.toLowerCase()
    let type = event.target.type
    if ('input' == tagName && Recorder.inputTypes.indexOf(type) >= 0) {
      if (event.target.value.length > 0) {
        handleRecord(
          'type',
          buildLocators(event.target),
          event.target.value
        )

        // © Chen-Chieh Ping, SideeX Team
        if (this.recordingState.enterTarget != null) {
          let tempTarget = event.target.parentElement
          let formChk = tempTarget.tagName.toLowerCase()
          while (formChk != 'form' && formChk != 'body') {
            tempTarget = tempTarget.parentElement
            formChk = tempTarget.tagName.toLowerCase()
          }

          handleRecord(
            'sendKeys',
            buildLocators(this.recordingState.enterTarget),
            '${KEY_ENTER}'
          )
          this.recordingState.enterTarget = null
        }
        // END
      } else {
        handleRecord(
          'type',
          buildLocators(event.target),
          event.target.value
        )
      }
    } else if ('textarea' == tagName) {
      handleRecord('type', buildLocators(event.target), event.target.value)
    }
  }
  this.recordingState.typeLock = 0*/
}, true)

Recorder.addEventHandler('type', 'input', function(event) {
  this.recordingState.typeTarget = event.target
})

function eventIsTrusted(event) {
  return isTest ? true : event.isTrusted
}

let ignoreClickOnOtherTags = ['select', 'option', 'textarea'];

// © Jie-Lin You, SideeX Team
Recorder.addEventHandler(
  'clickAt',
  'click',
  function(event) {
    if (
      event.button == 0 &&
      !this.recordingState.preventClick &&
      eventIsTrusted(event)
    ) {
      var tagName = event.target.nodeName.toLowerCase();
      var type = event.target.type
      var shouldRecordClick = true;
      if (('input' == tagName && Recorder.inputTypes.indexOf(type) > -1) || ignoreClickOnOtherTags.indexOf(tagName) > -1) {
        shouldRecordClick = false;
        if (tagName == 'select' || tagName == 'option') {
          var selOption = getOptionLocator(event.target.options[event.target.selectedIndex]);
          if (this.recordingState.lastSelectField == event.target && this.recordingState.lastSelectedOption == selOption) {
            this.recordingState.lastSelectedOption = undefined;
            this.recordingState.lastSelectField = undefined;
            handleRecord('select', buildLocators(event.target), selOption);
          } else {
            this.recordingState.lastSelectedOption = selOption;
            this.recordingState.lastSelectField = event.target;
          }
          /*else if ( event.target.value != undefined && event.target.value != '' && (('input' == tagName && Recorder.inputTypes.indexOf(type) > -1) || tagName == 'textarea'))
           handleRecord('type', buildLocators(event.target), event.target.value);*/
        } else {
          this.recordingState.lastSelectedOption = undefined;
          this.recordingState.lastSelectField = undefined;
        }
      } else {
        this.recordingState.lastSelectedOption = undefined;
        this.recordingState.lastSelectField = undefined;
      }
      if (!this.recordingState.preventClickTwice && shouldRecordClick) {
        if (tagName == 'input' && type == 'checkbox') {
          var isChecked = event.target.getAttribute('checked') || event.target.getAttribute('checked') == 'true';
          var value = !isChecked ? 'on' : 'off';
          handleRecord('checkbox', buildLocators(event.target), value);
        } else
          handleRecord('click', buildLocators(event.target), '')
        /*To handle recording double click, add below code as part of above else condition.
        {
          if (event.detail == 1) {
            this.recordingState.clickedElement = event.target;
            var locators = buildLocators(event.target);
            setTimeout(() => {
              if (this.recordingState.clickedElement) {
                console.log('timed out, recording as click');
                handleRecord('click', locators, '');
                this.recordingState.clickedElement = undefined;
              }
            }, 250);
          }
        }*/
        this.recordingState.preventClickTwice = true
      }
      setTimeout(() => {
        this.recordingState.preventClickTwice = false
      }, 30)
    }
  },
  true
)
// END

// © Chen-Chieh Ping, SideeX Team
/*Recorder.addEventHandler(
  'doubleClickAt',
  'dblclick',
  function(event) {
    this.recordingState.clickedElement = undefined;
    handleRecord('doubleClick', buildLocators(event.target), '')
  },
  true
)
// END

Recorder.addEventHandler(
  'sendKeys',
  'keydown',
  function(event) {
    if (event.target.tagName) {
      let key = event.keyCode
      let tagName = event.target.tagName.toLowerCase()
      let type = event.target.type
      if (tagName == 'input' && Recorder.inputTypes.indexOf(type) >= 0) {
        if (key == 13) {
          this.recordingState.enterTarget = event.target
          this.recordingState.enterValue = this.recordingState.enterTarget.value
          let tempTarget = event.target.parentElement
          let formChk = tempTarget.tagName.toLowerCase()
          if (
            this.recordingState.tempValue ==
              this.recordingState.enterTarget.value &&
            this.recordingState.tabCheck == this.recordingState.enterTarget
          ) {
            handleRecord(
              'sendKeys',
              buildLocators(this.recordingState.enterTarget),
              '${KEY_ENTER}'
            )
            this.recordingState.enterTarget = null
            this.recordingState.preventType = true
          } else if (
            this.recordingState.focusValue == this.recordingState.enterValue
          ) {
            while (formChk != 'form' && formChk != 'body') {
              tempTarget = tempTarget.parentElement
              formChk = tempTarget.tagName.toLowerCase()
            }
            handleRecord(
              'sendKeys',
              buildLocators(this.recordingState.enterTarget),
              '${KEY_ENTER}'
            )
            this.recordingState.enterTarget = null
          }
          if (
            this.recordingState.typeTarget &&
            this.recordingState.typeTarget.tagName &&
            !this.recordingState.preventType &&
            (this.recordingState.typeLock = 1)
          ) {
            // END
            tagName = this.recordingState.typeTarget.tagName.toLowerCase()
            type = this.recordingState.typeTarget.type
            if ('input' == tagName && Recorder.inputTypes.indexOf(type) >= 0) {
              if (this.recordingState.typeTarget.value.length > 0) {
                handleRecord(
                  'type',
                  buildLocators(this.recordingState.typeTarget),
                  this.recordingState.typeTarget.value
                )

                // © Chen-Chieh Ping, SideeX Team
                if (this.recordingState.enterTarget != null) {
                  tempTarget = this.recordingState.typeTarget.parentElement
                  formChk = tempTarget.tagName.toLowerCase()
                  while (formChk != 'form' && formChk != 'body') {
                    tempTarget = tempTarget.parentElement
                    formChk = tempTarget.tagName.toLowerCase()
                  }
                  handleRecord(
                    'sendKeys',
                    buildLocators(this.recordingState.enterTarget),
                    '${KEY_ENTER}'
                  )
                  this.recordingState.enterTarget = null
                }
                // END
              } else {
                handleRecord(
                  'type',
                  buildLocators(this.recordingState.typeTarget),
                  this.recordingState.typeTarget.value
                )
              }
            } else if ('textarea' == tagName) {
              handleRecord(
                'type',
                buildLocators(this.recordingState.typeTarget),
                this.recordingState.typeTarget.value
              )
            }
          }
          this.recordingState.preventClick = true
          setTimeout(() => {
            this.recordingState.preventClick = false
          }, 500)
          setTimeout(() => {
            if (this.recordingState.enterValue != event.target.value)
              this.recordingState.enterTarget = null
          }, 50)
        }

        let tempbool = false
        if ((key == 38 || key == 40) && event.target.value != '') {
          if (
            this.recordingState.focusTarget != null &&
            this.recordingState.focusTarget.value !=
              this.recordingState.tempValue
          ) {
            tempbool = true
            this.recordingState.tempValue = this.recordingState.focusTarget.value
          }
          if (tempbool) {
            handleRecord(
              'type',
              buildLocators(event.target),
              this.recordingState.tempValue
            )
          }

          setTimeout(() => {
            this.recordingState.tempValue = this.recordingState.focusTarget.value
          }, 250)

          if (key == 38)
            handleRecord(
              'sendKeys',
              buildLocators(event.target),
              '${KEY_UP}'
            )
          else
            handleRecord(
              'sendKeys',
              buildLocators(event.target),
              '${KEY_DOWN}'
            )
          this.recordingState.tabCheck = event.target
        }
        if (key == 9) {
          if (this.recordingState.tabCheck == event.target) {
            handleRecord(
              'sendKeys',
              buildLocators(event.target),
              '${KEY_TAB}'
            )
            this.recordingState.preventType = true
          }
        }
      }
    }
  },
  true
)*/
// END

let mousedown, mouseup, selectMouseup, selectMousedown, mouseoverQ, clickLocator
// © Shuo-Heng Shih, SideeX Team
/*Recorder.addEventHandler(
  'dragAndDrop',
  'mousedown',
  function(event) {
    if (
      event.clientX < window.document.documentElement.clientWidth &&
      event.clientY < window.document.documentElement.clientHeight
    ) {
      mousedown = event
      mouseup = setTimeout(() => {
        mousedown = undefined
      }, 200)

      selectMouseup = setTimeout(() => {
        selectMousedown = event
      }, 200)
    }
    mouseoverQ = []

    if (event.target.nodeName) {
      let tagName = event.target.nodeName.toLowerCase()
      if ('option' == tagName) {
        let parent = event.target.parentNode
        if (parent.multiple) {
          let options = parent.options
          for (let i = 0; i < options.length; i++) {
            options[i]._wasSelected = options[i].selected
          }
        }
      }
    }
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  'dragAndDrop',
  'mouseup',
  function(event) {
    function getSelectionText() {
      let text = ''
      let activeEl = window.document.activeElement
      let activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null
      if (activeElTagName == 'textarea' || activeElTagName == 'input') {
        text = activeEl.value.slice(
          activeEl.selectionStart,
          activeEl.selectionEnd
        )
      } else if (window.getSelection) {
        text = window.getSelection().toString()
      }
      return text.trim()
    }
    clearTimeout(selectMouseup)
    if (selectMousedown) {
      let x = event.clientX - selectMousedown.clientX
      let y = event.clientY - selectMousedown.clientY

      if (
        selectMousedown &&
        event.button === 0 &&
        x + y &&
        (event.clientX < window.document.documentElement.clientWidth &&
          event.clientY < window.document.documentElement.clientHeight) &&
        getSelectionText() === ''
      ) {
        let sourceRelateX =
          selectMousedown.pageX -
          selectMousedown.target.getBoundingClientRect().left -
          window.scrollX
        let sourceRelateY =
          selectMousedown.pageY -
          selectMousedown.target.getBoundingClientRect().top -
          window.scrollY
        let targetRelateX, targetRelateY
        if (
          !!mouseoverQ.length &&
          mouseoverQ[1].relatedTarget == mouseoverQ[0].target &&
          mouseoverQ[0].target == event.target
        ) {
          targetRelateX =
            event.pageX -
            mouseoverQ[1].target.getBoundingClientRect().left -
            window.scrollX
          targetRelateY =
            event.pageY -
            mouseoverQ[1].target.getBoundingClientRect().top -
            window.scrollY
          handleRecord(
            'mouseDownAt',
            buildLocators(selectMousedown.target),
            sourceRelateX + ',' + sourceRelateY
          )
          handleRecord(
            'mouseMoveAt',
            buildLocators(mouseoverQ[1].target),
            targetRelateX + ',' + targetRelateY
          )
          handleRecord(
            'mouseUpAt',
            buildLocators(mouseoverQ[1].target),
            targetRelateX + ',' + targetRelateY
          )
        } else {
          targetRelateX =
            event.pageX -
            event.target.getBoundingClientRect().left -
            window.scrollX
          targetRelateY =
            event.pageY -
            event.target.getBoundingClientRect().top -
            window.scrollY
          handleRecord(
            'mouseDownAt',
            buildLocators(event.target),
            targetRelateX + ',' + targetRelateY
          )
          handleRecord(
            'mouseMoveAt',
            buildLocators(event.target),
            targetRelateX + ',' + targetRelateY
          )
          handleRecord(
            'mouseUpAt',
            buildLocators(event.target),
            targetRelateX + ',' + targetRelateY
          )
        }
      }
    } else {
      clickLocator = undefined
      mouseup = undefined
      let x = event.clientX - mousedown.clientX
      let y = event.clientY - mousedown.clientY

      if (mousedown && mousedown.target !== event.target && !(x + y)) {
        handleRecord('mouseDown', buildLocators(mousedown.target), '')
        handleRecord('mouseUp', buildLocators(event.target), '')
      } else if (mousedown && mousedown.target === event.target) {
        let target = buildLocators(mousedown.target)
        // setTimeout(function() {
        //     if (!self.clickLocator)
        //         handleRecord("click", target, '');
        // }.bind(this), 100);
      }
    }
    mousedown = undefined
    selectMousedown = undefined
    mouseoverQ = undefined
  },
  true
)
// END
*/
let dropLocator, dragstartLocator
// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  'dragAndDropToObject',
  'dragstart',
  function(event) {
    dropLocator = setTimeout(() => {
      dragstartLocator = event
    }, 200)
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  'dragAndDropToObject',
  'drop',
  function(event) {
    clearTimeout(dropLocator)
    if (
      dragstartLocator &&
      event.button == 0 &&
      dragstartLocator.target !== event.target
    ) {
      var sourceLocators = buildLocators(dragstartLocator.target);
      var displayName = locatorBuilders.displayName;
      var targetLocators = buildLocators(event.target);
      locatorBuilders.displayName = displayName + ' and drop on ' + locatorBuilders.displayName;
      locatorBuilders.additionalData = targetLocators;
      handleRecord(
        'dragAndDropToObject',
        sourceLocators,
        targetLocators[0][0]
      )
    }
    dragstartLocator = undefined
    selectMousedown = undefined
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
let prevTimeOut = null,
  scrollDetector
Recorder.addEventHandler(
  'runScript',
  'scroll',
  function(event) {
    if (pageLoaded === true) {
      scrollDetector = event.target
      clearTimeout(prevTimeOut)
      prevTimeOut = setTimeout(() => {
        scrollDetector = undefined
      }, 500)
    }
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
let nowNode = 0,
  mouseoverLocator,
  nodeInsertedLocator,
  nodeInsertedAttrChange
/*Recorder.addEventHandler(
  'mouseOver',
  'mouseover',
  function(event) {
    if (window.document.documentElement)
      nowNode = window.document.documentElement.getElementsByTagName('*').length
    if (pageLoaded === true) {
      let clickable = findClickableElement(event.target)
      if (clickable) {
        nodeInsertedLocator = event.target
        nodeInsertedAttrChange = buildLocators(event.target)
        setTimeout(() => {
          nodeInsertedLocator = undefined
          nodeInsertedAttrChange = undefined
        }, 500)
      }
      //drop target overlapping
      if (mouseoverQ) {
        //mouse keep down
        if (mouseoverQ.length >= 3) mouseoverQ.shift()
        mouseoverQ.push(event)
      }
    }
  },
  true
)*/
// END

let mouseoutLocator = undefined
// © Shuo-Heng Shih, SideeX Team
/*Recorder.addEventHandler(
  'mouseOut',
  'mouseout',
  function(event) {
    if (mouseoutLocator !== null && event.target === mouseoutLocator) {
      handleRecord('mouseOut', buildLocators(event.target), '')
    }
    mouseoutLocator = undefined
  },
  true
)*/
// END

Recorder.addMutationObserver(
  'FrameDeleted',
  function(mutations) {
    mutations.forEach(async mutation => {
      const removedNodes = await mutation.removedNodes
      if (
        removedNodes.length &&
        removedNodes[0].nodeName === 'IFRAME' &&
        removedNodes[0].id !== 'selenium-ide-indicator'
      ) {
        browser.runtime.sendMessage({ frameRemoved: true }).catch(() => {})
      }
    })
  },
  { childList: true }
)

/*Recorder.addMutationObserver(
  'DOMNodeInserted',
  function(mutations) {
    if (
      pageLoaded === true &&
      window.document.documentElement.getElementsByTagName('*').length > nowNode
    ) {
      // Get list of inserted nodes from the mutations list to simulate 'DOMNodeInserted'.
      const insertedNodes = mutations.reduce((nodes, mutation) => {
        if (mutation.type === 'childList') {
          nodes.push.apply(nodes, mutation.addedNodes)
        }
        return nodes
      }, [])
      // If no nodes inserted, just bail.
      if (!insertedNodes.length) {
        return
      }

      if (scrollDetector) {
        //TODO: fix target
        handleRecord('runScript', [['window.scrollTo(0,' + window.scrollY + ')']], '')
        pageLoaded = false
        setTimeout(() => {
          pageLoaded = true
        }, 550)
        scrollDetector = undefined
        nodeInsertedLocator = undefined
      }
      if (nodeInsertedLocator) {
        handleRecord('mouseOver', nodeInsertedAttrChange, '')
        mouseoutLocator = nodeInsertedLocator
        nodeInsertedLocator = undefined
        nodeInsertedAttrChange = undefined
        mouseoverLocator = undefined
      }
    }
  },
  { childList: true, subtree: true }
)*/

// © Shuo-Heng Shih, SideeX Team
let readyTimeOut = null
let pageLoaded = true
Recorder.addEventHandler(
  'checkPageLoaded',
  'readystatechange',
  function(event) {
    if (window.document.readyState === 'loading') {
      pageLoaded = false
    } else {
      pageLoaded = false
      clearTimeout(readyTimeOut)
      readyTimeOut = setTimeout(() => {
        pageLoaded = true
      }, 1500) //setReady after complete 1.5s
    }
  },
  true
)
// END

let customContextMenuItems = ['mouseOver', 'jsclick', 'readElementPresence', 'readElementAttribute', 'readElementStyle', 'performWait', 'ComparisonOfTwoValues']
let ignoreInnerTextDisplayNameForCommands = ['readDataFromUI', 'readElementPresence', 'readElementAttribute', 'readElementStyle']

// © Ming-Hung Hsu, SideeX Team
Recorder.addEventHandler(
  'contextMenu',
  'contextmenu',
  function(event) {
    let myPort = browser.runtime.connect()
    let tmpVal = bot.dom.getVisibleText(event.target)
    let tmpTitle = goog.string.normalizeSpaces(event.target.ownerDocument.title)
    myPort.onMessage.addListener(function(m) {
      if (m.cmd.includes('Text')) {
        handleRecord(m.cmd, buildLocators(event.target), tmpVal)
      } else if (m.cmd.includes('Title')) {
        handleRecord(m.cmd, [[tmpTitle]], '')
      } else if (m.cmd.includes('Value')) {
        handleRecord(m.cmd, buildLocators(event.target), event.target.value)
      } else if (m.cmd === 'addStep') {
        handleRecord('addStep', [['']], '')
      } else if (customContextMenuItems.indexOf(m.cmd) > -1) {
        handleRecord(m.cmd, buildLocators(event.target, ignoreInnerTextDisplayNameForCommands.indexOf(m.cmd) > -1), '')
      }else if (m.cmd == 'readDataFromUI') {
        let value = event.target.value ? event.target.value : tmpVal;
        handleRecord(m.cmd, buildLocators(event.target, ignoreInnerTextDisplayNameForCommands.indexOf(m.cmd) > -1), value)
      } else if (m.cmd == 'reactTableRowData') {
        handleRecord(m.cmd, locatorBuilders.buildReactTableRowData(event.target), '');
      }
      myPort.onMessage.removeListener(this)
    })
  },
  true
)
// END

// © Yun-Wen Lin, SideeX Team
let getEle
let checkFocus = 0
let contentTest
Recorder.addEventHandler(
  'editContent',
  'focus',
  function(event) {
    let editable = event.target.contentEditable
    if (editable == 'true') {
      getEle = event.target
      contentTest = getEle.innerHTML
      checkFocus = 1
    }
  },
  true
)
// END

// © Yun-Wen Lin, SideeX Team
Recorder.addEventHandler(
  'editContent',
  'blur',
  function(event) {
    if (checkFocus == 1) {
      if (event.target == getEle) {
        if (getEle.innerHTML != contentTest) {
          handleRecord(
            'editContent',
            buildLocators(event.target),
            getEle.innerHTML
          )
        }
        checkFocus = 0
      }
    }
  },
  true
)
// END

browser.runtime
  .sendMessage({
    attachRecorderRequest: true,
  })
  .catch(function(reason) {
    // Failed silently if receiveing end does not exist
  })

// Copyright 2005 Shinya Kasatani
Recorder.prototype.getOptionLocator = function(option) {
  let label = option.text.replace(/^ *(.*?) *$/, '$1')
  if (label.match(/\xA0/)) {
    // if the text contains &nbsp;
    return (
      'label=regexp:' +
      label
        .replace(/[\(\)\[\]\\\^\$\*\+\?\.\|\{\}]/g, function(str) {
          // eslint-disable-line no-useless-escape
          return '\\' + str
        })
        .replace(/\s+/g, function(str) {
          if (str.match(/\xA0/)) {
            if (str.length > 1) {
              return '\\s+'
            } else {
              return '\\s'
            }
          } else {
            return str
          }
        })
    )
  } else {
    return 'label=' + label
  }
}

function findClickableElement(e) {
  if (!e.tagName) return null
  let tagName = e.tagName.toLowerCase()
  let type = e.type
  if (
    e.hasAttribute('onclick') ||
    e.hasAttribute('href') ||
    tagName == 'button' ||
    (tagName == 'input' &&
      (type == 'submit' ||
        type == 'button' ||
        type == 'image' ||
        type == 'radio' ||
        type == 'checkbox' ||
        type == 'reset'))
  ) {
    return e
  } else {
    if (e.parentNode != null) {
      return findClickableElement(e.parentNode)
    } else {
      return null
    }
  }
}

//select / addSelect / removeSelect
Recorder.addEventHandler(
  'select',
  'focus',
  function(event) {
    if (event.target.nodeName) {
      let tagName = event.target.nodeName.toLowerCase()
      if ('select' == tagName && event.target.multiple) {
        let options = event.target.options
        for (let i = 0; i < options.length; i++) {
          if (options[i]._wasSelected == null) {
            // is the focus was gained by mousedown event, _wasSelected would be already set
            options[i]._wasSelected = options[i].selected
          }
        }
      }
    }
  },
  true
)

Recorder.addEventHandler('select', 'change', function(event) {
  if (event.target.tagName) {
    let tagName = event.target.tagName.toLowerCase()
    if ('select' == tagName) {
      if (!event.target.multiple) {
        let option = event.target.options[event.target.selectedIndex]
        handleRecord(
          'select',
          buildLocators(event.target),
          getOptionLocator(option)
        )
      } else {
        let options = event.target.options
        for (let i = 0; i < options.length; i++) {
          if (options[i]._wasSelected != options[i].selected) {
            let value = getOptionLocator(options[i])
            if (options[i].selected) {
              handleRecord(
                'addSelection',
                buildLocators(event.target),
                value
              )
            } else {
              handleRecord(
                'removeSelection',
                buildLocators(event.target),
                value
              )
            }
            this.recordingState.preventClickTwice = true
            options[i]._wasSelected = options[i].selected
          }
        }
      }
    }
  }
})

function getOptionLocator(option) {
  let label = option.text.replace(/^ *(.*?) *$/, '$1')
  if (label.match(/\xA0/)) {
    // if the text contains &nbsp;
    return (
      'label=regexp:' +
      label
        .replace(/[(\)\[\]\\\^\$\*\+\?\.\|\{\}]/g, function(str) {
          // eslint-disable-line no-useless-escape
          return '\\' + str
        })
        .replace(/\s+/g, function(str) {
          if (str.match(/\xA0/)) {
            if (str.length > 1) {
              return '\\s+'
            } else {
              return '\\s'
            }
          } else {
            return str
          }
        })
    )
  } else {
    return 'label=' + label
  }
}

browser.runtime
  .sendMessage({
    attachRecorderRequest: true,
  })
  .then(shouldAttach => {
    if (shouldAttach) {
      recorder.attach()
    }
  })
  .catch(() => {})
