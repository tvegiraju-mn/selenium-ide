/**
 * Created by Tvegiraju on 12/27/2019.
 */

export default function locatorBuilder_BOB() {

}

locatorBuilder_BOB.updateAppSpecificOrder = function () {
    console.log('inside React custom')
    locatorBuilders.buildReactTableRowData = buildReactTableRowData;
    locatorBuilders.isElementEligibleForRecording = isElementEligibleForRecordingCustom;
    locatorBuilders.isElementFoundByLocatorNotMatchedEligibleForRecording = isElementFoundByLocatorNotMatchedEligibleForRecordingCustom;
    LocatorBuilders.add('table', table);
    LocatorBuilders.add('id', id);
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

function buildReactTableRowData(e) {
    try {
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