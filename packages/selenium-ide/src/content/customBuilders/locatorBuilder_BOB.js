/**
 * Created by Tvegiraju on 12/27/2019.
 */

const PREFERRED_ATTRIBUTES = [
    'id',
    'data-id',
    'name'
];

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
};

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

function buildTableExpectedData(e) {
    var elementType = '', innerText = '';
    var tableExpData = {};
    var elIdAttr = e.getAttribute('id') ? e.getAttribute('id') : '';
    var elClassAttr = e.getAttribute('class') ? e.getAttribute('class') : '';
    var elTypeAttr = e.getAttribute('type') ? e.getAttribute('type').toLowerCase() : '';
    //check if the action element is button or not
    if (elClassAttr.includes('slds-button') || e.closest('[class*=slds-button]') || e.querySelectorAll('[class*=slds-button]')[0])
        elementType = 'BUTTON';
    else if (elClassAttr.includes('slds-checkbox') || e.querySelectorAll('[class*=slds-checkbox]')[0]) {
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
            finalEl = e.closest('[id*=-content]');
            //get child having -content
            if (!finalEl)
                finalEl = e.querySelectorAll('[id*=-content]')[0]
            if (!finalEl)
                return undefined;
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
    //don't record for header rows
    if (e.closest('div[class*=table-head-cell],div[class*=thead-row-selection]'))
        return undefined;
    var parentDivCellClass='slds-truncate', parentDivSelectionClass='tbody-row-selection';
    //TODO: below attrname may change
    //Find parent Column div
    var parentDivCell = e.closest('div[class='+parentDivCellClass+'],div[class*='+parentDivSelectionClass+']');
    if (!parentDivCell) {
        var elClass = e.getAttribute('class');
        elClass = elClass ? elClass.trim() : '';
        if (elClass == parentDivCellClass || elClass.includes(parentDivSelectionClass))
            parentDivCell = e;
    }
    if (!parentDivCell)
        return undefined;
    var parentDivClass = parentDivCell.getAttribute('class');
    parentDivClass = parentDivClass ? parentDivClass.trim() : '';
    var elementType = '', innerText = '', columnName = '', columnType = '', isValidEl=false;
    if (parentDivClass.includes(parentDivSelectionClass)) {
        elementType = 'OTHER'
        columnType = 'CHECKBOX_INDEX'
        var checkBoxEl = parentDivCell.querySelectorAll('input[type=checkbox]')
        var isChecked = checkBoxEl[0].getAttribute('checked') || checkBoxEl[0].getAttribute('checked') == 'true'
        innerText = isChecked ? 'on' : 'off';
        isValidEl=true;
    } else if (parentDivClass.includes(parentDivCellClass)) {
        columnType = 'HEADER_NAME'
        //TODO: below will change
        var columnAttr = parentDivCell.getAttribute('id');
        if (!columnAttr)
            return undefined;
        columnAttr = columnAttr.split('-')[2];

        var parentTableDiv = parentDivCell.closest('div[class*=table-body]');
        if (!parentTableDiv)
            return undefined;
        var headerParentDiv = parentTableDiv.querySelectorAll('div[id*=-' + columnAttr + ']')[0];
        if (headerParentDiv) {
            //TODO: below selector will change
            columnName = headerParentDiv.querySelectorAll('[id*=-text][id*=-' + columnAttr + ']')[0].textContent.trim();
            var tableExpData = buildTableExpectedData(e);
            if (tableExpData) {
                elementType = tableExpData.elementType;
                innerText = tableExpData.expectedValue;
                isValidEl=true;
            }
        }
    }
    if (isValidEl) {
        var tableRowData = {};
        tableRowData.elementType = elementType
        tableRowData.columnType = columnType
        tableRowData.expectedValue = innerText
        tableRowData.columnName = columnName
        console.log(JSON.stringify(tableRowData))
        return tableRowData;
    }
    return undefined;
}

function buildReactTableRowData(e) {
    try {
        var virtualizedTable = e.closest('div[class*=ReactVirtualized__Grid]');
        if (virtualizedTable)
            return handleVirtualizedTableRecording(e);
        //Table check
        var closestTable = e.closest('table[id*=-body]');
        var tableInModal = false;
        if ((closestTable == null || closestTable == undefined) && e.closest('div[data-id=modalContent]')) {
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
                tdEl = e.closest('td')
            }
            var finalEl = tdEl.querySelectorAll('[id*=-content]')[0]
            if (finalEl == undefined || finalEl == null) {
                if (tdEl.querySelectorAll('button')[0])
                    elementType = 'BUTTON'
                else if (tdEl.querySelectorAll('input[type=radio],input[type=checkbox]')[0])
                    elementType = 'OTHER'
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
                var tdEl = e.closest('td')
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