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
  if (!this.isElementEligibleForRecording(e))
    return [];
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
        var isElementMatchedWithBuiltLocator = this.isElementFoundByLocatorNotMatchedEligibleForRecording(e, fe);
        if (LocatorBuilders.finderNamesToAddLocatorEvenIfElNotMatched.includes(finderName) || finderName == 'table' || isElementMatchedWithBuiltLocator) {
          locators.push([locator, finderName])
        }
      }
    } catch (e) {
      // TODO ignore the buggy locator builder for now
      console.log('locator exception: ' + e);
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

function buildReactTableRowDataFn(e) {
  return undefined;
}
function isElementEligibleForRecordingCustomFn(e) {
  return true;
}
function isElementFoundByLocatorNotMatchedEligibleForRecordingFn(origEl, newlyFoundEl) {
  return (origEl == newlyFoundEl);
}

LocatorBuilders.prototype.buildReactTableRowData = buildReactTableRowDataFn;
LocatorBuilders.prototype.isElementEligibleForRecording = isElementEligibleForRecordingCustomFn;
LocatorBuilders.prototype.isElementFoundByLocatorNotMatchedEligibleForRecording = isElementFoundByLocatorNotMatchedEligibleForRecordingFn;

LocatorBuilders.prototype.cleanup = function() {
  LocatorBuilders.order = [];
  LocatorBuilders.builderMap = {};
  LocatorBuilders._preferredOrder = [];
  LocatorBuilders.finderNamesToAddLocatorEvenIfElNotMatched = [];
  LocatorBuilders.PREFERRED_ATTRIBUTES = [
    'id',
    'name',
    'value',
    'type',
    'action',
    'onclick'
  ];
  if (!LocatorBuilders.getDisplayNameFn)
    LocatorBuilders.getDisplayNameFn = this.getDisplayName;
  else
    this.getDisplayName = LocatorBuilders.getDisplayNameFn;
  this.buildReactTableRowData = buildReactTableRowDataFn;
  this.isElementEligibleForRecording = isElementEligibleForRecordingCustomFn;
  this.isElementFoundByLocatorNotMatchedEligibleForRecording = isElementFoundByLocatorNotMatchedEligibleForRecordingFn;
};

LocatorBuilders.finderNamesToAddLocatorEvenIfElNotMatched = [];
LocatorBuilders.PREFERRED_ATTRIBUTES = [
  'id',
  'name',
  'value',
  'type',
  'action',
  'onclick'
]

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

LocatorBuilders.prototype.xpathAttr = function(e) {
  let i = 0
  var self = this;
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
        locator += self.getXpathForAttribute(attName, attributes[attName])
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
    for (i = 0; i < LocatorBuilders.PREFERRED_ATTRIBUTES.length; i++) {
      let name = LocatorBuilders.PREFERRED_ATTRIBUTES[i]
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
  return undefined;
}

LocatorBuilders.prototype.logging = function(message) {
    browser.runtime.sendMessage({type: "bglog", payload: message});
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
