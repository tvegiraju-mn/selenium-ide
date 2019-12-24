/*
 * Copyright 2005 Shinya Kasatani
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//import { MozillaBrowserBot } from "./selenium-browserbot";
import { bot, core } from './closure-polyfill'
import { parse_locator } from './utils'
//import finder from '@medv/finder'

export default function LocatorBuilders(window) {
  this.window = window
}

window.LocatorBuilders = LocatorBuilders

LocatorBuilders.prototype.detach = function() {}

LocatorBuilders.prototype.buildWith = function(name, e, opt_contextNode) {
  return LocatorBuilders.builderMap[name].call(this, e, opt_contextNode)
}

LocatorBuilders.prototype.elementEquals = function(name, e, locator) {
  let fe = this.findElement(locator)
  //TODO: add match function to the ui locator builder, note the inverted parameters
  return (
    e == fe ||
    (LocatorBuilders.builderMap[name] &&
      LocatorBuilders.builderMap[name].match &&
      LocatorBuilders.builderMap[name].match(e, fe))
  )
}

LocatorBuilders.prototype.build = function(e) {
  let locators = this.buildAll(e)
  if (locators.length > 0) {
    return locators[0][0]
  } else {
    return 'LOCATOR_DETECTION_FAILED'
  }
}

LocatorBuilders.prototype.buildAll = function(el, ignoreInnerText) {
  this.recordedType = undefined;
  this.additionalData = undefined;
  let e = core.firefox.unwrap(el) //Samit: Fix: Do the magic to get it to work in Firefox 4
  if (this.appType == 'BOB') {
    //Ignore React Upload button
    var elClass = e.getAttribute('class');
    if (elClass && elClass.indexOf('slds-file-selector__button') > -1)
      return [];
  }
  this.displayName = this.getDisplayName(e, ignoreInnerText);
  let locator
  let locators = []
  for (let i = 0; i < LocatorBuilders.order.length; i++) {
    let finderName = LocatorBuilders.order[i]
    try {
      locator = this.buildWith(finderName, e)
      if (locator) {
        locator = String(locator)
        //Samit: The following is a quickfix for above commented code to stop exceptions on almost every locator builder
        //TODO: the builderName should NOT be used as a strategy name, create a feature to allow locatorBuilders to specify this kind of behaviour
        //TODO: Useful if a builder wants to capture a different element like a parent. Use the this.elementEquals
        let fe = this.findElement(locator)
        var isElementMatchedWithBuiltLocator = (e == fe)
        //If the element is not matched with built locator and appType is BOB
        //if it is part of popover, add that locator to record the action
        if (!isElementMatchedWithBuiltLocator && this.appType == 'BOB') {
          if (e.closest('[class*=slds-popover]'))
            isElementMatchedWithBuiltLocator = true
        }
        if (finderName == 'leftNav' || finderName == 'xpath:comppathRelative' || finderName == 'table' || isElementMatchedWithBuiltLocator) {
          locators.push([locator, finderName])
        }
      }
    } catch (e) {
      // TODO ignore the buggy locator builder for now
      //this.log.debug("locator exception: " + e);
      //  this.logging(finderName + ":locator Exception: " + e)
    }
  }
  return locators
}

LocatorBuilders.prototype.findElement = function(loc) {
  try {
    const locator = parse_locator(loc, true)
    return bot.locators.findElement(
      { [locator.type]: locator.string },
      this.window.document
    )
  } catch (error) {
    //this.log.debug("findElement failed: " + error + ", locator=" + locator);
    return null
  }
}

/*
 * Class methods
 */

LocatorBuilders.order = []
LocatorBuilders.builderMap = {}
LocatorBuilders._preferredOrder = []
// NOTE: for some reasons we does not use this part
// classObservable(LocatorBuilders);

LocatorBuilders.add = function(name, finder) {
  this.order.push(name)
  this.builderMap[name] = finder
  this._orderChanged()
}

/**
 * Call when the order or preferred order changes
 */
LocatorBuilders._orderChanged = function() {
  let changed = this._ensureAllPresent(this.order, this._preferredOrder)
  this._sortByRefOrder(this.order, this._preferredOrder)
  if (changed) {
    // NOTE: for some reasons we does not use this part
    // this.notify('preferredOrderChanged', this._preferredOrder);
  }
}

/**
 * Set the preferred order of the locator builders
 *
 * @param preferredOrder can be an array or a comma separated string of names
 */
LocatorBuilders.setPreferredOrder = function(preferredOrder) {
  if (typeof preferredOrder === 'string') {
    this._preferredOrder = preferredOrder.split(',')
  } else {
    this._preferredOrder = preferredOrder
  }
  this._orderChanged()
}

/**
 * Returns the locator builders preferred order as an array
 */
LocatorBuilders.getPreferredOrder = function() {
  return this._preferredOrder
}

/**
 * Sorts arrayToSort in the order of elements in sortOrderReference
 * @param arrayToSort
 * @param sortOrderReference
 */
LocatorBuilders._sortByRefOrder = function(arrayToSort, sortOrderReference) {
  let raLen = sortOrderReference.length
  arrayToSort.sort(function(a, b) {
    let ai = sortOrderReference.indexOf(a)
    let bi = sortOrderReference.indexOf(b)
    return (ai > -1 ? ai : raLen) - (bi > -1 ? bi : raLen)
  })
}

/**
 * Function to add to the bottom of destArray elements from source array that do not exist in destArray
 * @param sourceArray
 * @param destArray
 */
LocatorBuilders._ensureAllPresent = function(sourceArray, destArray) {
  let changed = false
  sourceArray.forEach(function(e) {
    if (destArray.indexOf(e) == -1) {
      destArray.push(e)
      changed = true
    }
  })
  return changed
}

/*
 * Utility function: Encode XPath attribute value.
 */
LocatorBuilders.prototype.attributeValue = function(value) {
  if (value.indexOf("'") < 0) {
    return "'" + value + "'"
  } else if (value.indexOf('"') < 0) {
    return '"' + value + '"'
  } else {
    let result = 'concat('
    let part = ''
    let didReachEndOfValue = false
    while (!didReachEndOfValue) {
      let apos = value.indexOf("'")
      let quot = value.indexOf('"')
      if (apos < 0) {
        result += "'" + value + "'"
        didReachEndOfValue = true
        break
      } else if (quot < 0) {
        result += '"' + value + '"'
        didReachEndOfValue = true
        break
      } else if (quot < apos) {
        part = value.substring(0, apos)
        result += "'" + part + "'"
        value = value.substring(part.length)
      } else {
        part = value.substring(0, quot)
        result += '"' + part + '"'
        value = value.substring(part.length)
      }
      result += ','
    }
    result += ')'
    return result
  }
}

LocatorBuilders.prototype.xpathHtmlElement = function(name) {
  let specialCaseTagNames = ['svg', 'use'];
  if (this.window.document.contentType == 'application/xhtml+xml') {
    // "x:" prefix is required when testing XHTML pages
    return 'x:' + name
  } else if (specialCaseTagNames.indexOf(name) > -1){
    return '*[local-name()=\''+name+'\']'
  } else {
    return name
  }
}

LocatorBuilders.prototype.relativeXPathFromParent = function(current) {
  let index = this.getNodeNbr(current)
  let currentPath = '/' + this.xpathHtmlElement(current.nodeName.toLowerCase())
  if (index > 0) {
    currentPath += '[' + (index + 1) + ']'
  }
  return currentPath
}

LocatorBuilders.prototype.getNodeNbr = function(current) {
  let childNodes = current.parentNode.childNodes
  let total = 0
  let index = -1
  for (let i = 0; i < childNodes.length; i++) {
    let child = childNodes[i]
    if (child.nodeName == current.nodeName) {
      if (child == current) {
        index = total
      }
      total++
    }
  }
  return index
}

LocatorBuilders.prototype.preciseXPath = function(xpath, e) {
  //only create more precise xpath if needed
  if (this.findElement(xpath) != e) {
    let result = e.ownerDocument.evaluate(
      xpath,
      e.ownerDocument,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    )
    //skip first element (result:0 xpath index:1)
    for (let i = 0, len = result.snapshotLength; i < len; i++) {
      let newPath = 'xpath=(' + xpath + ')[' + (i + 1) + ']'
      if (this.findElement(newPath) == e) {
        return newPath
      }
    }
  }
  return 'xpath=' + xpath
}

/*
 * ===== builders =====
 */

// order listed dictates priority
// e.g., 1st listed is top priority

LocatorBuilders.add('css:data-attr', function cssDataAttr(e) {
  const dataAttributes = ['data-test', 'data-test-id']
  for (let i = 0; i < dataAttributes.length; i++) {
    const attr = dataAttributes[i]
    const value = e.getAttribute(attr)
    if (attr) {
      return `css=*[${attr}="${value}"]`
    }
  }
  return null
})

LocatorBuilders.add('id', function id(e) {
  if (e.id && (e.id.split(/\d+/).length == 1 || this.appType != 'MN')) {
    return 'id=' + e.id
  }
  return null
})

LocatorBuilders.add('linkText', function linkText(e) {
  if (e.nodeName == 'A') {
    let text = e.textContent
    if (!text.match(/^\s*$/)) {
      return (
        'linkText=' + text.replace(/\xA0/g, ' ').replace(/^\s*(.*?)\s*$/, '$1')
      )
    }
  }
  return null
})

LocatorBuilders.add('name', function name(e) {
  if (e.name) {
    if (this.appType != 'MN')
      return 'name=' + e.name
    var splitByNumber = e.name.split(/\d+/)
    if (splitByNumber.length == 1) {
      return 'name=' + e.name
    } else if (splitByNumber.length > 1) {
      return 'xpath=//' + this.xpathHtmlElement(e.nodeName.toLowerCase()) + '[' + this.getXpathForAttribute('name', e.name) + ']'
    }
  }
  return null
})

/*LocatorBuilders.add('css:finder', function cssFinder(e) {
  return 'css=' + finder(e)
})*/

LocatorBuilders.add('xpath:link', function xpathLink(e) {
  if (e.nodeName == 'A') {
    let text = e.textContent
    if (!text.match(/^\s*$/)) {
      return this.preciseXPath(
        '//' +
          this.xpathHtmlElement('a') +
          "[contains(text(),'" +
          text.replace(/^\s+/, '').replace(/\s+$/, '') +
          "')]",
        e
      )
    }
  }
  return null
})

LocatorBuilders.add('xpath:img', function xpathImg(e) {
  if (e.nodeName == 'IMG') {
    if (e.alt != '') {
      return this.preciseXPath(
        '//' +
          this.xpathHtmlElement('img') +
          '[@alt=' +
          this.attributeValue(e.alt) +
          ']',
        e
      )
    } else if (e.title != '') {
      return this.preciseXPath(
        '//' +
          this.xpathHtmlElement('img') +
          '[@title=' +
          this.attributeValue(e.title) +
          ']',
        e
      )
    } else if (e.src != '') {
      return this.preciseXPath(
        '//' +
          this.xpathHtmlElement('img') +
          '[contains(@src,' +
          this.attributeValue(e.src) +
          ')]',
        e
      )
    }
  }
  return null
})

LocatorBuilders.add('xpath:attributes', function xpathAttr(e) {
  let PREFERRED_ATTRIBUTES = [
    'id',
    'name',
    'value',
    'type',
    'action',
    'onclick',
  ]
  if (this.appType == 'MN') {
    PREFERRED_ATTRIBUTES = [
      'comppath',
      'name',
      'value',
      'type',
      'action',
      'onclick'
    ]
  } else if (this.appType == 'Flex') {
    PREFERRED_ATTRIBUTES = [
      'name',
      'id',
      'title',
      'value',
      'type',
      'action',
      'onclick'
    ]
  }
  let i = 0

  function attributesXPath(name, attNames, attributes) {
    let locator = '//' + this.xpathHtmlElement(name) + '['
    for (i = 0; i < attNames.length; i++) {
      if (i > 0) {
        locator += ' and '
      }
      let attName = attNames[i]
      if (attName == 'action' || attName == 'value' || attName == 'onclick')
        locator += '@' + attName + '=' + this.attributeValue(attributes[attName])
      else
        locator += this.getXpathForAttribute(attName, attributes[attName])
    }
    locator += ']'
    return this.preciseXPath(locator, e)
  }

  if (e.attributes) {
    let atts = e.attributes
    let attsMap = {}
    for (i = 0; i < atts.length; i++) {
      let att = atts[i]
      attsMap[att.name] = att.value
    }
    let names = []
    // try preferred attributes
    for (i = 0; i < PREFERRED_ATTRIBUTES.length; i++) {
      let name = PREFERRED_ATTRIBUTES[i]
      if (attsMap[name] != null) {
        names.push(name)
        let locator = attributesXPath.call(
          this,
          e.nodeName.toLowerCase(),
          names,
          attsMap
        )
        if (e == this.findElement(locator)) {
          return locator
        }
      }
    }
  }
  return null
})

LocatorBuilders.add('xpath:idRelative', function xpathIdRelative(e) {
  let path = ''
  let current = e
  while (current != null) {
    if (current.parentNode != null) {
      path = this.relativeXPathFromParent(current) + path
      if (
        1 == current.parentNode.nodeType && // ELEMENT_NODE
        current.parentNode.getAttribute('id')
      ) {
        return this.preciseXPath(
          '//' +
            this.xpathHtmlElement(current.parentNode.nodeName.toLowerCase()) +
            '[@id=' +
            this.attributeValue(current.parentNode.getAttribute('id')) +
            ']' +
            path,
          e
        )
      }
    } else {
      return null
    }
    current = current.parentNode
  }
  return null
})

LocatorBuilders.add('xpath:href', function xpathHref(e) {
  if (e.attributes && e.hasAttribute('href')) {
    let href = e.getAttribute('href')
    if (href.search(/^http?:\/\//) >= 0) {
      return this.preciseXPath(
        '//' +
          this.xpathHtmlElement('a') +
          '[@href=' +
          this.attributeValue(href) +
          ']',
        e
      )
    } else {
      // use contains(), because in IE getAttribute("href") will return absolute path
      return this.preciseXPath(
        '//' +
          this.xpathHtmlElement('a') +
          '[contains(@href, ' +
          this.attributeValue(href) +
          ')]',
        e
      )
    }
  }
  return null
})

LocatorBuilders.add('xpath:position', function xpathPosition(
  e,
  opt_contextNode
) {
  let path = ''
  let current = e
  while (current != null && current != opt_contextNode) {
    let currentPath
    if (current.parentNode != null) {
      currentPath = this.relativeXPathFromParent(current)
    } else {
      currentPath = '/' + this.xpathHtmlElement(current.nodeName.toLowerCase())
    }
    path = currentPath + path
    let locator = '/' + path
    if (e == this.findElement(locator)) {
      return 'xpath=' + locator
    }
    current = current.parentNode
  }
  return null
})

LocatorBuilders.add('xpath:innerText', function xpathInnerText(el) {
  if (el.innerText) {
    return `xpath=//${el.nodeName.toLowerCase()}[contains(.,'${el.innerText}')]`
  } else {
    return null
  }
})

LocatorBuilders.prototype.buildReactTableRowData = function(e) {
  try {
    if (this.appType == 'BOB') {
      //Table check
      var closestTable = e.closest('table[id*=-body]');
      var tableInModal = false;
      if (closestTable == null || closestTable == undefined) {
        closestTable = e.closest('table[class*=slds-table_fixed-layout]');
        tableInModal = true;
      }
      if (closestTable == null || closestTable == undefined)
        return undefined;
      var tableClass = closestTable.getAttribute('class')
      if (tableClass == null || tableClass == undefined || (tableClass != undefined && !tableClass.toLowerCase().includes('slds-table')))
        return undefined;
      var tableRowData = {};
      var elementType = '', innerText = '', columnName = '', columnType = ''
      if (tableInModal) {
        var tdEl = e
        if (e.nodeName.toLowerCase() != 'td') {
          tdEl = e.closest('td[role=gridcell]')
        }
        var finalEl = tdEl.querySelectorAll('[id*=-content]')[0]
        if (finalEl == undefined || finalEl == null) {
          finalEl = tdEl.querySelectorAll('button')
          elementType = 'BUTTON'
          columnType = 'BLANK_INDEX'
        } else {
          innerText = finalEl.textContent.trim()
          var tdIdx = Array.prototype.slice.call(tdEl.parentNode.children).indexOf(tdEl)
          var theadRow = closestTable.querySelectorAll('thead')[0].children[0]
          var reqTableHead = theadRow.children[tdIdx]
          columnName = reqTableHead.querySelectorAll('span[id*=-text][class*=slds-truncate]')[0].textContent.trim()
          elementType = 'PLAIN_TEXT'
          columnType = 'HEADER_NAME'
        }
      } else {
        //if event in td element itself && not stacked
        if (e.nodeName.toLowerCase() == 'td' && e.children.length != 1)
          return undefined;
        var divEl = e.closest('div[class=slds-truncate]')
        if (e.nodeName.toLowerCase() == 'td' && (divEl == null || divEl == undefined))
          divEl = e.querySelectorAll('div[class=slds-truncate]')[0]
        if (divEl == null || divEl == undefined) {
          var tdEl = e.closest('td[role=gridcell]')
          if (tdEl) {
            var checkBoxEl = tdEl.querySelectorAll('input[type=checkbox]')
            var buttonEl = tdEl.querySelectorAll('button')
            if (checkBoxEl && checkBoxEl[0]) {
              elementType = 'OTHER'
              columnType = 'CHECKBOX_INDEX'
              var isChecked = checkBoxEl[0].getAttribute('checked') || checkBoxEl[0].getAttribute('checked') == 'true'
              innerText = isChecked ? 'on' : 'off';
            }
          }
        } else {
          columnType = 'HEADER_NAME'
          var tdEl = divEl.parentNode;
          var tdIdx = Array.prototype.slice.call(tdEl.parentNode.children).indexOf(tdEl)
          var divIdx = Array.prototype.slice.call(divEl.parentNode.children).indexOf(divEl)
          var finalEl = divEl.querySelectorAll('[id*=-content]')[0];
          if (!finalEl || finalEl == null) {
            finalEl = divEl.querySelectorAll('div');
            finalEl = finalEl[finalEl.length - 1]
          }
          var nodeName = finalEl.nodeName.toLowerCase();
          if (finalEl.querySelectorAll('button').length > 0)
            elementType = 'BUTTON'
          else if (finalEl.querySelectorAll('use').length > 0)
            elementType = 'IMAGE'
          else if (nodeName == 'a') {
            elementType = 'LINK'
            innerText = finalEl.textContent.trim()
          } else if ((nodeName == 'input' && eType != 'hidden') || nodeName == 'select')
            elementType = 'OTHER'
          else {
            elementType = 'PLAIN_TEXT'
            innerText = finalEl.textContent.trim()
          }
          var theadRow = closestTable.querySelectorAll('thead[class=data_table_head]')[0].children[0]
          var reqTableHead = theadRow.children[tdIdx]
          var reqDiv = reqTableHead.querySelectorAll('div[id*=-body]')[divIdx]
          columnName = reqDiv.querySelectorAll('[class=slds-truncate]')[0].textContent.trim()
        }
      }
      tableRowData.elementType = elementType
      tableRowData.columnType = columnType
      tableRowData.expectedValue = innerText
      tableRowData.columnName = columnName
      console.log(JSON.stringify(tableRowData))
      return tableRowData;
    }
  } catch(e) {
    console.error(e)
  }
  return undefined;
}

LocatorBuilders.prototype.getDisplayName = function(e, ignoreInnerText) {
  if (e.innerText && ignoreInnerText != true) {
    var innerText = this.getInnerTextWithoutChildren(e);
    if (innerText.length > 1)
      return innerText;
  }
  if (e.getAttribute('title')) {
    return e.getAttribute('title');
  }
  if (e.getAttribute('placeholder')) {
    return e.getAttribute('placeholder');
  }
  var tagName = e.nodeName.toLowerCase();
  if (tagName == 'input' && (e.getAttribute('type') == 'checkbox' || e.getAttribute('type') == 'radio')) {
    if (e.id) {
      var lblXpath = '//label[@for=\'' + e.id + '\']'
      var lblEl = this.findElement(lblXpath);
      if (lblEl && lblEl.innerText) {
        var labelText = this.getInnerTextWithoutChildren(lblEl);
        if (labelText.length > 1)
          return labelText;
      }
    }
  }
  if (this.appType == 'MN') {
    var elXpath = this.getXpathOfAnElement(e, false);
    if (elXpath) {
      var labelXpath = elXpath + '/preceding::*[((local-name() = \'span\' and contains(@domattr,\'extField\')) or (local-name() = \'label\' and contains(@class,\'left\'))) and string-length(normalize-space(text())) > 1][1]';
      var labelEl = this.findElement(labelXpath);
      if (labelEl && labelEl.innerText) {
        var innerText = this.getInnerTextWithoutChildren(labelEl);
        if (innerText.length > 1)
          return innerText;
      }
    }
  }
  return undefined;
}

LocatorBuilders.prototype.logging = function(message) {
    browser.runtime.sendMessage({type: "bglog", payload: message});
}

LocatorBuilders.prototype.setPreferredOrderByAppType = function(appType) {
  this.appType = appType;
  if (appType == 'MN')
    LocatorBuilders.setPreferredOrder('leftNav,table,xpath:comppath,xpath:popupsinmn,xpath:comppathRelative,xpath:attributes,xpath:link,linkText,name,' +
        'xpath:innerText,xpath:img,id,xpath:idRelative,xpath:href,xpath:position,css:data-attr');
  else if (appType == 'Flex')
    LocatorBuilders.setPreferredOrder('table,xpath:attributes,name,id,xpath:link,xpath:idRelative,xpath:innerText,linkText,' +
        'xpath:img,xpath:href,xpath:position,css:data-attr,leftNav,xpath:comppath,xpath:comppathRelative,xpath:popupsinmn');
  else if (appType == 'BOB')
    LocatorBuilders.setPreferredOrder('table,id,linkText,name,css:data-attr,xpath:link,xpath:img,xpath:idRelative,xpath:attributes,' +
        'xpath:href,xpath:position,xpath:innerText,leftNav,xpath:comppath,xpath:comppathRelative,xpath:popupsinmn');
  else
    LocatorBuilders.setPreferredOrder('id,linkText,name,css:data-attr,xpath:link,xpath:img,xpath:attributes,xpath:idRelative,' +
        'xpath:href,xpath:position,xpath:innerText,table,leftNav,xpath:comppath,xpath:comppathRelative,xpath:popupsinmn');
  console.log('Updated order for App Type: ' + this.appType);
}

LocatorBuilders.prototype.setPreferredOrderByAppTypeFirstTime = function() {
  var self = this;
  function getAppType() {
    let appType = undefined;
    browser.runtime.sendMessage({type: "getAppType"}).then(function(response) {
      if (response && response.appType) {
        appType = response.appType;
        self.setPreferredOrderByAppType(appType);
        console.log('Updated First time order for App Type: ' + self.appType);
      }
    });
    return appType;
  }
  let appType = getAppType();
  self.setPreferredOrderByAppType(appType);
}

LocatorBuilders.prototype.isElementUniqueWithXPath = function(xpath, e) {
    let result = e.ownerDocument.evaluate(
        xpath,
        e.ownerDocument,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    return !(result.snapshotLength > 1);
}

LocatorBuilders.prototype.getXpathForAttribute = function(attrName, attrValue) {
  var splitByNumbers = attrValue.split(/\d+/);
  var xpathCond = '@' + attrName + '=' + this.attributeValue(attrValue);
  if (splitByNumbers.length > 1) {
    splitByNumbers = splitByNumbers.filter(Boolean);
    xpathCond = '';
    for (let i = 0, j = 0; i < splitByNumbers.length; i++) {
      if (splitByNumbers[i] === '-' || splitByNumbers[i] === '~')
        continue;
      j++;
      if (j > 1)
        xpathCond += ' and ';
      xpathCond += 'contains(@' + attrName + ',' + this.attributeValue(splitByNumbers[i]) + ')';
    }
  }
  return xpathCond;
}

LocatorBuilders.prototype.getXpathFromComppathAttr = function(nodeName, comppath) {
    var xpathCond = '[' + this.getXpathForAttribute('comppath', comppath) + ']';
    return '//' + this.xpathHtmlElement(nodeName.toLowerCase()) + xpathCond;
}

LocatorBuilders.prototype.getInnerTextWithoutChildren = function(node) {
  let child = node.firstChild, texts = [];
  while (child) {
    if (child.nodeType == 3) {
      texts.push(child.data);
    }
    child = child.nextSibling;
  }
  return texts.join('').trim()
}

LocatorBuilders.prototype.getXpathOfAnElement = function(e, skipCases) {
  var elXpath = undefined;
  if (this.appType == 'MN' || this.appType == 'Flex' || this.appType == "BOB") {
    if (this.appType == 'MN') {
      var comppath = e.getAttribute('comppath');
      if (comppath) {
        if (comppath.indexOf('spreadsheetContainer') > -1 && skipCases)
          return undefined;
        elXpath = this.preciseXPath('//' + this.xpathHtmlElement(e.nodeName.toLowerCase()) + '[@comppath=' + this.attributeValue(comppath) + ']', e);
        elXpath = elXpath.substring(6);
        return elXpath;
      }
    }
    if (this.appType == 'Flex' && e.getAttribute('title')) {
      elXpath = '//' + this.xpathHtmlElement(e.nodeName.toLowerCase()) + '[@title=' + this.attributeValue(e.getAttribute('title')) + ']';
      if (e == this.findElement('xpath=' + elXpath)) {
        return elXpath;
      }
    }
    if (e.id) {
      elXpath = '//' + this.xpathHtmlElement(e.nodeName.toLowerCase()) + '[@id=' + this.attributeValue(e.id) + ']';
      if (e == this.findElement('id=' + e.id)) {
        return elXpath;
      }
    }
    if (e.name) {
      elXpath = '//' + this.xpathHtmlElement(e.nodeName.toLowerCase()) + '[@name=' + this.attributeValue(e.name) + ']';
      if (e == this.findElement('name=' + e.name)) {
        return elXpath;
      } else {
        elXpath = this.preciseXPath(elXpath, e);
        elXpath = elXpath.substring(6);
        return elXpath;
      }
    }
  }
  return undefined;
}

LocatorBuilders.add('leftNav', function leftNav(e) {
  if (this.appType == 'MN') {
    var current = e;
    if (current.parentNode != null) {
      var parentNode = current.parentNode;
      var isLeftNav = (parentNode.nodeName.toLowerCase() == 'div' ? (parentNode.hasAttribute('open') && parentNode.hasAttribute('isleaf')) : false);
      if ( isLeftNav ) {
        var displayName = undefined;
        var nodeName = current.nodeName.toLowerCase();
        var isToggleBtn = nodeName == 'span' && current.hasAttribute('class') && current.getAttribute('class').includes('clickable');
        var elXpath = this.xpathHtmlElement(nodeName);
        var elInnerText;
        if (isToggleBtn) {
          elXpath = elXpath + '[contains(@class,\'clickable\')]';
          var nextEl = e.nextSibling;
          elInnerText = this.getInnerTextWithoutChildren(nextEl);
          displayName = 'expand/collapse button next to ' + elInnerText;
        } else if (nodeName == 'a') {
          elInnerText = this.getInnerTextWithoutChildren(current);
          elXpath = elXpath + '[contains(.,\'' + elInnerText + '\')]';
        } else {
          return null;
        }
        var links = '',dynamicLinks = [];
        while (parentNode != null && isLeftNav) {
          var isLeaf = parentNode.hasAttribute('isleaf') ? parentNode.getAttribute('isleaf') : undefined;
          var curText = this.getInnerTextWithoutChildren(parentNode.querySelectorAll('a')[0]);
          links = curText + '->' + links;
          if (isLeaf == 'false')
            dynamicLinks.push(curText);
          var nameAttr = parentNode.hasAttribute('name') ? ('-node-' + parentNode.getAttribute('name').split('-node-')[1]) : undefined;
          var curElXpath = 'div[';
          if (nameAttr)
            curElXpath = curElXpath + 'contains(@name,\'' + nameAttr + '\')';
          else if (elInnerText)
            curElXpath = curElXpath + 'contains(.,\'' + elInnerText + '\')';
          else
            return null;
          elXpath = curElXpath + ']/' + elXpath;
          parentNode = parentNode.parentNode;
          if (parentNode != null) {
            isLeftNav = (parentNode.nodeName.toLowerCase() == 'div' ? (parentNode.hasAttribute('open') && parentNode.hasAttribute('isleaf')) : false);
          }
        }
        if (this.isElementUniqueWithXPath('//' + elXpath, e)) {
          if (dynamicLinks.length >= 2 && !this.recordedType) {
            this.recordedType = 'leftNav';
            var navLinks = '';
            //Ignore last element
            for (var k = 0 ; k < dynamicLinks.length - 1; k++) {
              navLinks = dynamicLinks[k] + (navLinks == '' ? '' : '->' + navLinks);
            }
            this.additionalData = 'navLinks=' + navLinks;
            this.logging('From leftNav: ' + this.additionalData);
          }
          if (displayName && !this.displayName)
            this.displayName = displayName;
          return "xpath=//" + elXpath;
        }
      }
    }
  }
  return null;
})

LocatorBuilders.add('table', function table(e) {
  if (this.appType == 'BOB') {
    var tableRowData = this.buildReactTableRowData(e);
    if (tableRowData) {
      if (!this.recordedType) {
        this.recordedType = 'table';
        this.additionalData = 'rowType=data|elementType=' + tableRowData.elementType + '|columnName=' + tableRowData.columnName + '|columnType=' + tableRowData.columnType;
        this.displayName = undefined;
      }
      var id = (tableRowData.columnName && tableRowData.columnName != '' ? tableRowData.columnName : (tableRowData.columnType != '' ? tableRowData.columnType : undefined))
      if (!id)
        id = e.id ? e.id : (e.name ? e.name : e.getAttribute('data-id'));
      return 'table=' + id;
    }
    return undefined;
  }
  var elXpath = this.getXpathOfAnElement(e, true);
  if (elXpath) {
    var parXpath = '';
    if (this.appType == 'MN') {
      parXpath = elXpath + '/ancestor::tr[contains(@class,\'tableRow bodyRow bodyRow-\') or contains(@class,\'tableRow headerRow headerRow-\')]';
      // or contains(@class,\'tableRow footerRow footerRow-\')
    } else {
      parXpath = elXpath + '/ancestor::div[contains(@id,\'tbl-container\')]'
    }
    var tdEl = this.findElement(parXpath);
    if (tdEl) {
      var rowType = 'data';
      if (tdEl.getAttribute('class').includes('headerRow-')) {
        rowType = 'header';
      }/*else if (tdEl.getAttribute('class').includes('footerRow-')) {
        rowType = 'footer';
      }*/
      var elementType = '';
      var nodeName = e.nodeName.toLowerCase();
      var eType = e.type ? e.type.toLowerCase() : '';
      var classes = e.getAttribute('class') ? e.getAttribute('class').toLowerCase() : '';
      if (nodeName == 'span' && !classes.includes('anchor') && !classes.includes('fa-fw'))
        elementType = 'PLAIN_TEXT'
      else if (nodeName == 'a' || (nodeName == 'span' && classes.includes('anchor')))
        elementType = 'LINK'
      else if ((nodeName == 'input' && eType != 'hidden') || nodeName == 'select')
        elementType = 'OTHER'
      else if (nodeName == 'button')
        elementType = 'BUTTON'
      else if (nodeName == 'img')
        elementType = 'IMAGE'
      if (!this.recordedType) {
        this.recordedType = 'table';
        this.additionalData = 'rowType=' + rowType + '|elementType=' + elementType;
        this.displayName = undefined;
      }
      return 'table=' + elXpath;
    }
  }
  return null;
})

LocatorBuilders.add('xpath:comppath', function xpathComppath(e) {
    var comppath = e.getAttribute('comppath');
    if (comppath) {
    let locator = this.getXpathFromComppathAttr(e.nodeName, comppath);
    //If comppath matches exactly with element found then only return comppath
    if (this.isElementUniqueWithXPath(locator, e))
      return 'xpath=' + locator;
    else {
      if (e.innerText) {
        let textLoc = locator + '[contains(.,\'' + this.getInnerTextWithoutChildren(e) + '\')]';
        if (this.isElementUniqueWithXPath(textLoc, e))
          return 'xpath=' + textLoc;
      }
      if (comppath.indexOf('spreadsheetContainer') > -1) {
        let labelLoc = '//' + this.xpathHtmlElement(e.nodeName.toLowerCase()) + '[@comppath=' + this.attributeValue(comppath) + ']' +
            '/ancestor::tr[contains(@class, \'tableRow bodyRow\')]/td[1]/span';
        let labelEl = this.findElement(labelLoc);
        if (labelEl && labelEl.innerText) {
          let finalLoc = '//td[(normalize-space(.)=\'' + this.getInnerTextWithoutChildren(labelEl) + '\')]//following::' + locator.substring(2);
          if (comppath.indexOf('spreadsheetContainer.FormularyCondition') > -1) {
            let labelParLoc = labelLoc + '/ancestor::div[contains(@comppath,\'spreadsheetContainer.FormularyCondition\')]//div[contains(@class,\'title\')]';
            let labelParEl = this.findElement(labelParLoc);
            if (labelParEl && labelParEl.innerText)
              finalLoc = '//div[(translate(normalize-space(.),\'ABCDEFGHIJKLMNOPQRSTUVWXYZ\',\'abcdefghijklmnopqrstuvwxyz\')=\'' + this.getInnerTextWithoutChildren(labelParEl).toLowerCase() + '\')]' +
                  '//following::' + finalLoc.substring(2);
          }
          //this.logging('Final Locator: ' + finalLoc);
          if (e == this.findElement(finalLoc))
            return 'xpath=' + finalLoc;
        }
      }
    }
  }
  return null;
})

LocatorBuilders.add('xpath:comppathRelative', function xpathComppathRelative(e) {
    let path = '';
    let current = e;
    while (current != null) {
      if (current.parentNode != null) {
        path = this.relativeXPathFromParent(current) + path;
        if (
            1 == current.parentNode.nodeType && // ELEMENT_NODE
            current.parentNode.getAttribute('comppath')
        ) {
            let locator = this.getXpathFromComppathAttr(current.parentNode.nodeName, current.parentNode.getAttribute('comppath'));
            //this.logging('inside xpath:comppathRelative: ' + locator);
            if (this.isElementUniqueWithXPath(locator, current.parentNode)) {
              if (current.parentNode.nodeName.toLowerCase() == 'a') {
                this.displayName = (current.parentNode.innerText && current.parentNode.innerText.trim().length > 1) ? current.parentNode.innerText.trim() :
                    (this.displayName ? this.displayName : this.getDisplayName(current.parentNode));
                return 'xpath=' + locator;
              }
              return 'xpath=' + locator + path;
            }
        }
      } else {
          return null;
      }
    current = current.parentNode;
  }
  return null;
})

LocatorBuilders.add('xpath:popupsinmn', function specialCasesInMN(e) {
  if (this.appType != 'MN')
    return null;
  var detailTitleBar = e.closest('[class*=detailTitleBar]');
  var alertBar = e.closest('[class*=showAlert]');
  var msgPopup = e.closest('[class*=CMnDisplayMsgComp],[class*=CMnPopupComp]');
  var errorIcon = e.closest('[class*=fieldError]');// span class=fieldError for error icon
  var errorMsgPopup = e.closest('[class*=validationContainer]');
  var locator;
  if (detailTitleBar || alertBar) {
    //find parent element for which comppath is defined and build locator relative to that
    var comppathEl = e.closest('[comppath*=root]');
    if (comppathEl) {
      var comppath = comppathEl.getAttribute('comppath');
      var titleClass = detailTitleBar ? 'detailTitleBar' : 'showAlert';
      locator = "//*[@comppath='" + comppath + "']" + "//*[contains(@class,'" + titleClass + "')]//*[normalize-space(@class)='title']";
    }
  } else if (msgPopup) {
    if (e.closest('table')) {
      locator = "//*[contains(@class,'CMnDisplayMsgComp') or contains(@class,'CMnPopupComp')]//*[normalize-space(@class)='msgText']";
    }
  } else if (errorMsgPopup) {
    locator = "//*[contains(@class,'validationContainer')]";
    var elClass = e.getAttribute('class');
    var elStyle = e.getAttribute('style');
    //message is present at 2nd div child of above validationContainer
    if (elClass && elClass.indexOf('closeLink') > -1)
      locator = locator + "//*[contains(@class,'closeLink')]";
    else if (elStyle && elStyle.indexOf('block') > -1)
      locator = locator + "/div[2]";
  } else if (errorIcon) {
    //Below may need special handling if more than one error field appears at once on the page
    //currently handled for one error field case only
    locator = "//*[contains(@class,'fieldError') and contains(@class,'fa-fw')]";
    if (this.isElementUniqueWithXPath(locator, e))
      return 'xpath=' + locator;
    else
      locator = undefined;
  }
  if (locator)
    return "xpath=" + locator;
  return null;
})

LocatorBuilders.prototype.setPreferredOrderByAppTypeFirstTime()