/**
 * Created by Tvegiraju on 12/27/2019.
 */

const PREFERRED_ATTRIBUTES = [
    'id',
    'data-id',
    'name'
];

const dataColumnAttr = 'data-column-attr';
const contentElSelector = '[id$=-content]';

export default function locatorBuilder_BOB() {

}

locatorBuilder_BOB.updateAppSpecificOrder = function () {
    console.log('inside React custom')
    locatorBuilders.buildReactTableRowData = buildReactTableRowData;
    locatorBuilders.isElementEligibleForRecording = isElementEligibleForRecordingCustom;
    locatorBuilders.isElementFoundByLocatorNotMatchedEligibleForRecording = isElementFoundByLocatorNotMatchedEligibleForRecordingCustom;
    LocatorBuilders.PREFERRED_ATTRIBUTES = PREFERRED_ATTRIBUTES;
    LocatorBuilders.add('table', table);
    LocatorBuilders.add('id', id);
    //Below methods can be removed from BOB, as these won't be required in future
    LocatorBuilders.add('xpath:attributes', locatorBuilders.xpathAttr);
    LocatorBuilders.add('xpath:idRelative', xpathIdRelative);
    var origDisplayNameFn = locatorBuilders.getDisplayName;
    locatorBuilders.getDisplayName = function(e, ignoreInnerText) {
        console.log('custom React displayName');
        var displayName = getCustomDisplayNameFn(e, ignoreInnerText);
        if (!displayName) {
            console.log('not found with React custom displayName. finding in base method')
            displayName = origDisplayNameFn.apply(this, arguments);
        }
        return displayName;
    };
};

function getCustomDisplayNameFn(e, ignoreInnerText) {
    if (e.innerText && e.innerText.trim().length > 1 && ignoreInnerText != true)
        return undefined;
    //ignore if element is inside table
    if (e.closest('div[class*=ReactVirtualized__Grid],table[id*=-body],table[class*=slds-table_fixed-layout]'))
        return undefined;
    //ignore if element is in dropdown menu
    if (e.closest('div[class*=slds-dropdown_menu]'))
        return undefined;
    var currentNode = e;
    while (currentNode != null) {
        var elContainsTextInParentNode = window.document.evaluate('.//*[string-length(normalize-space(text()))>1]', currentNode,
            null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
        if (elContainsTextInParentNode != null && elContainsTextInParentNode != e)
            return elContainsTextInParentNode.textContent.trim();
        currentNode = currentNode.parentNode;
    }
    return undefined;
}

function isElementEligibleForRecordingCustom(e) {
    console.log('custom BOB isElementEligibleForRecording');
    //Ignore React Upload button
    var elClass = e.getAttribute('class');
    return !(elClass && elClass.indexOf('slds-file-selector__button') > -1);
}

function isElementFoundByLocatorNotMatchedEligibleForRecordingCustom(origEl, newlyFoundEl) {
    console.log('custom BOB isElementFoundByLocatorNotMatchedEligibleForRecording');
    var isElementMatchedWithBuiltLocator = (origEl == newlyFoundEl);
    //If the element is not matched with built locator and appType is BOB
    //if it is part of popover, add that locator to record the action
    if (!isElementMatchedWithBuiltLocator && origEl.closest('[class*=slds-popover]'))
        isElementMatchedWithBuiltLocator = true;
    return isElementMatchedWithBuiltLocator;
}

function buildTableExpectedData(e, isVirtualizedTable) {
    var elementType = '', innerText = '';
    var tableExpData = {};
    var elIdAttr = e.getAttribute('id') ? e.getAttribute('id') : '';
    var elClassAttr = e.getAttribute('class') ? e.getAttribute('class') : '';
    var elTypeAttr = e.getAttribute('type') ? e.getAttribute('type').toLowerCase() : '';
    //check if the action element is button or not
    var parButtonEl = e.closest('[class*=slds-button]')
    var childButtonEl = e.querySelectorAll('[class*=slds-button]')[0]
    if (elClassAttr.includes('slds-button') || parButtonEl || childButtonEl) {
        elementType = 'BUTTON';
        var buttonEl = elClassAttr.includes('slds-button') ? e : (parButtonEl ? parButtonEl : (childButtonEl ? childButtonEl : undefined))
        if (buttonEl)
            innerText = buttonEl.textContent ? buttonEl.textContent.trim() : ''
    } else if (elClassAttr.includes('slds-checkbox') || e.querySelectorAll('[class*=slds-checkbox]')[0]) {
        elementType = 'OTHER'
        var checkBoxEl;
        if (elTypeAttr == 'checkbox')
            checkBoxEl = e
        else if(elClassAttr == 'slds-checkbox')
            checkBoxEl = e.querySelectorAll('input[type=checkbox]')[0]
        else
            checkBoxEl = e.closest('[class=slds-checkbox]').querySelectorAll('input[type=checkbox]')[0]
        var isChecked = checkBoxEl.getAttribute('checked') || checkBoxEl.getAttribute('checked') == 'true'
        innerText = isChecked ? 'on' : 'off';
    } else {
        var finalEl;
        //check if target itself has -content
        if (elIdAttr && elIdAttr.includes('-content'))
            finalEl = e;
        else {
            //get parent having -content
            finalEl = e.closest(contentElSelector);
            //get child having -content
            if (!finalEl)
                finalEl = e.querySelectorAll(contentElSelector)[0]
            if (!finalEl)
                return;
        }
        var nodeName = finalEl.nodeName.toLowerCase();
        var eType = finalEl.getAttribute('type');
        eType = eType ? eType.toLowerCase() : '';
        if (finalEl.querySelectorAll('svg').length > 0 || finalEl.querySelectorAll('use').length > 0)
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
    }
    tableExpData.elementType = elementType
    tableExpData.expectedValue = innerText
    return tableExpData;
}

function handleVirtualizedTableRecording(e) {
    if (!e.closest('table[class*=slds-table_fixed-layout],div[class*=ReactVirtualized__Grid]'))
        return undefined;
    //don't record for header rows
    if (e.closest('th,div[class*=table-head-cell],div[class*=thead-row-selection]')) {
        console.log('action on header, skipping table')
        return;
    }
    var isVirtualizedTable = e.closest('div[class*=ReactVirtualized__Grid]') ? true : false;
    var parentDivCellClass='slds-truncate', parentDivSelectionClass='tbody-row-selection';
    var nonVirtTableSearchChooser = 'table-search-chooser', nonVirtTableResultChooser = 'table-result-chooser';
    var parentDivChoserSelector = 'div[class='+parentDivCellClass+'],div[class*='+parentDivSelectionClass+'],' +
        '[id*=\''+nonVirtTableSearchChooser+'\'],[id*=\''+nonVirtTableResultChooser+'\']';
    //Find parent Column div
    var parentDivCell = e.closest(parentDivChoserSelector);
    if (!parentDivCell) {
        var elClass = e.getAttribute('class');
        var elId = e.getAttribute('id') ? e.getAttribute('id') : '';
        elClass = elClass ? elClass.trim() : '';
        //event itself is parent DIV
        if (elClass == parentDivCellClass || elClass.includes(parentDivSelectionClass))
            parentDivCell = e;
        //if not, find child inside cell parent
        if (!parentDivCell)
            parentDivCell = e.querySelectorAll(parentDivChoserSelector)[0];
    }
    var isModalNonSelectionColumn = false
    //Handle chooser modal
    if (!parentDivCell && e.closest('div[data-id=modalContent]')) {
        isModalNonSelectionColumn = true;
        var tdCell = e.tagName.toLowerCase() == 'td' ? e : e.closest('td')
        console.log(tdCell)
        if (tdCell.children.length == 1) {
            parentDivCell = tdCell.children[0]
        } else if (tdCell.children.length > 1) {
            var dataAttrCurrCol = e.getAttribute(dataColumnAttr) ? e.getAttribute(dataColumnAttr) : '';
            if (!dataAttrCurrCol) {
                if (e.parentNode == tdCell)
                    parentDivCell = e.querySelectorAll(contentElSelector)[0]
                else {
                    var elId = e.getAttribute('id') ? e.getAttribute('id') : '';
                    if (elId.endsWith('-content'))
                        parentDivCell = e;
                    else {
                        var parContentEl = e.closest(contentElSelector)
                        var childContentEl = e.querySelectorAll(contentElSelector)[0]
                        parentDivCell = parContentEl ? parContentEl : (childContentEl ? childContentEl : undefined)
                    }
                }

            }
        }
    }
    if (!parentDivCell) {
        console.log('unable to find parent div cell')
        return;
    }
    var parentDivClass = parentDivCell.getAttribute('class');
    parentDivClass = parentDivClass ? parentDivClass.trim() : '';
    var parentDivID = parentDivCell.getAttribute('id') ? parentDivCell.getAttribute('id') : '';
    var elementType = '', innerText = '', columnName = '', columnType = '', isValidEl=false;
    var parentTableDivClass = 'div[class*=table-body]';
    if (!isVirtualizedTable)
        parentTableDivClass = 'table[class*=slds-table_fixed-layout]';
    var parentTableDiv = parentDivCell.closest(parentTableDivClass);
    if (!parentTableDiv) {
        console.log('unable to find table parent Div')
        return;
    }
    //if first column, most of the cases header is checkbox and element will be checkbox in virtualized table
    if (parentDivClass.includes(parentDivSelectionClass)
        || (!isVirtualizedTable && (parentDivID.includes(nonVirtTableSearchChooser)||parentDivID.includes(nonVirtTableResultChooser)))) {
        var headerFirstColumnSelector = 'th,div[class*=thead-row-selection]'
        var headerFirstColumnEl = parentTableDiv.querySelectorAll(headerFirstColumnSelector)[0];
        if (headerFirstColumnEl.querySelectorAll('input[type=checkbox]')[0])
            columnType = 'CHECKBOX_INDEX'
        else if (headerFirstColumnEl.querySelectorAll('input[type=radio]')[0])
            columnType = 'RADIO_INDEX'
        else
            columnType = 'BLANK_INDEX'
        var checkBoxEl = parentDivCell.querySelectorAll('input[type=checkbox]')[0]
        var radioEl = parentDivCell.querySelectorAll('input[type=radio]')[0]
        var buttonEl = parentDivCell.tagName.toLowerCase() == 'button' ? parentDivCell : parentDivCell.closest('button') || parentDivCell.querySelectorAll('button')[0]
        if (checkBoxEl || radioEl) {
            elementType = 'OTHER'
            if (checkBoxEl) {
                var isChecked = checkBoxEl.getAttribute('checked') || checkBoxEl.getAttribute('checked') == 'true'
                innerText = isChecked ? 'on' : 'off';
            }
            isValidEl=true;
        } else if (buttonEl) {
            elementType = 'BUTTON'
            isValidEl=true;
        }
    } else if (parentDivClass.includes(parentDivCellClass) || isModalNonSelectionColumn) {
        //if other column
        columnType = 'HEADER_NAME'
        var columnAttr = parentDivCell.getAttribute(dataColumnAttr);
        if (!columnAttr) {
            console.log('data column attr is not defined')
            return;
        }
        columnAttr = columnAttr.trim();
        var headerParentDiv = parentTableDiv.querySelectorAll('['+dataColumnAttr+'=\'' + columnAttr + '\'][id$=-text]:not([class*=slds-assistive-text])')[0];
        if (headerParentDiv) {
            columnName = headerParentDiv.textContent.trim();
            var tableExpData = buildTableExpectedData(e, isVirtualizedTable);
            if (tableExpData) {
                elementType = tableExpData.elementType;
                innerText = tableExpData.expectedValue;
                isValidEl=true;
            }
        } else
            console.log('header text element not found')
    }
    console.log('after processing:'+isValidEl)
    if (isValidEl) {
        var tableRowData = {};
        tableRowData.elementType = elementType
        tableRowData.columnType = columnType
        tableRowData.expectedValue = innerText
        tableRowData.columnName = columnName
        console.log(JSON.stringify(tableRowData))
        return tableRowData;
    }
}

function buildReactTableRowData(e) {
    try {
        /*var virtualizedTable = e.closest('div[class*=ReactVirtualized__Grid]');
        if (virtualizedTable)*/
            return handleVirtualizedTableRecording(e);
        //Table check
        /*var closestTable = e.closest('table[class*=slds-table_fixed-layout]');
        if (!closestTable)
            return undefined;
        var tableInModal = false;
        if (e.closest('div[data-id=modalContent]'))
            tableInModal = true;
        console.log('inside non virtual table, tableInModal:'+tableInModal)
        var tableRowData = {};
        var elementType = '', innerText = '', columnName = '', columnType = ''
        if (tableInModal) {
            var tdEl = e
            if (e.nodeName.toLowerCase() != 'td')
                tdEl = e.closest('td')
            var finalEl = tdEl.querySelectorAll(contentElSelector)[0]
            if (finalEl == undefined || finalEl == null) {
                console.log('inside modal, selection row')
                if (tdEl.querySelectorAll('button')[0])
                    elementType = 'BUTTON'
                else if (tdEl.querySelectorAll('input[type=radio],input[type=checkbox]')[0])
                    elementType = 'OTHER'
                columnType = 'BLANK_INDEX'
            } else {
                console.log('inside modal, non selection row')
                innerText = finalEl.textContent.trim()
                var tdIdx = Array.prototype.slice.call(tdEl.parentNode.children).indexOf(tdEl)
                var theadRow = closestTable.querySelectorAll('thead')[0].children[0]
                var reqTableHead = theadRow.children[tdIdx]
                columnName = reqTableHead.querySelectorAll('[id$=-text][class*=slds-truncate]')[0].textContent.trim()
                elementType = 'PLAIN_TEXT'
                columnType = 'HEADER_NAME'
            }
        } else {
            //if event in td element itself && not stacked
            if (e.nodeName.toLowerCase() == 'td' && e.children.length != 1)
                return undefined;
            var divEl = e.closest('div[class=slds-truncate]')
            if (e.nodeName.toLowerCase() == 'td' && !divEl)
                divEl = e.querySelectorAll('div[class=slds-truncate]')[0]
            if (!divEl) {
                var tdEl = e.closest('td')
                if (tdEl) {
                    console.log('inside non modal, selection row')
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
                console.log('inside non modal, non selection row')
                columnType = 'HEADER_NAME'
                var tdEl = divEl.parentNode;
                var tdIdx = Array.prototype.slice.call(tdEl.parentNode.children).indexOf(tdEl)
                var divIdx = Array.prototype.slice.call(divEl.parentNode.children).indexOf(divEl)
                var finalEl = divEl.querySelectorAll(contentElSelector)[0];
                if (!finalEl) {
                    finalEl = divEl.querySelectorAll('div');
                    finalEl = finalEl.length > 0 ? finalEl[finalEl.length - 1] : undefined;
                }
                if (!finalEl)
                    return;
                console.log('found final el')
                var nodeName = finalEl.nodeName.toLowerCase();
                var eType = finalEl.getAttribute('type');
                eType = eType ? eType.toLowerCase() : '';
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
                var reqDiv = reqTableHead.querySelectorAll('div[id$=-content]')[divIdx]
                columnName = reqDiv.querySelectorAll('[id$=-text]')[0].textContent.trim()
            }
        }
        tableRowData.elementType = elementType
        tableRowData.columnType = columnType
        tableRowData.expectedValue = innerText
        tableRowData.columnName = columnName
        console.log(JSON.stringify(tableRowData))
        return tableRowData;*/
    } catch(e) {
        console.error(e)
    }
    return undefined;
}

function table(e) {
    var tableRowData = buildReactTableRowData(e);
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

function id(e) {
    if (e.id) {
        return 'id=' + e.id
    }
    return null
}

function xpathIdRelative(e) {
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
}