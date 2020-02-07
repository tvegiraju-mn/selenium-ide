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
    //ignore if element is in dropdown menu/popover edits
    if (e.closest('div[class*=slds-dropdown_menu],div[class*=slds-popover]'))
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

function buildTableExpectedData(e, columnAttr, parentDivCell) {
    var elementType = '', innerText = '';
    var tableExpData = {};
    var elIdAttr = e.getAttribute('id') ? e.getAttribute('id') : '';
    var elClassAttr = e.getAttribute('class') ? e.getAttribute('class') : '';
    var elTypeAttr = e.getAttribute('type') ? e.getAttribute('type').toLowerCase() : '';
    //check if the action element is button or not
    var parButtonEl = e.closest('[class*=slds-button]')
    var childButtonEl = e.querySelectorAll('[class*=slds-button]')[0]
    var inlineEditDivEl = parentDivCell.querySelectorAll('[class*=slds-cell-edit]')[0]
    var inlineLockDivEl = parentDivCell.querySelectorAll('[class*=slds-cell-lock]')[0]
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
    } else if (e.closest('svg')||e.querySelectorAll('svg')[0]||e.closest('use')||e.querySelectorAll('use')[0]) {
        elementType = 'IMAGE'
    } else {
        var dataAttrSelector = '['+dataColumnAttr+'=\'' + columnAttr + '\']';
        var finalEl;
        //check if target itself has -content
        if (elIdAttr && elIdAttr.includes('-content'))
            finalEl = e;
        else {
            //get parent having -content
            finalEl = e.closest(contentElSelector + dataAttrSelector);
            //get child having -content
            if (!finalEl)
                finalEl = e.querySelectorAll(contentElSelector + dataAttrSelector)[0]
            //ECB validation button/research pad button
            if (!finalEl && e.tagName.toLowerCase() == 'div' && e.getAttribute('role') == 'button' && e.getAttribute(dataColumnAttr) == columnAttr) {
                tableExpData.elementType = 'BUTTON'
                tableExpData.expectedValue = e.textContent.trim();
                tableExpData.elementIndex = e.parentNode.children.length == 1 ? '1' : '2';
                return tableExpData;
            }
            if (!finalEl) {
                //inline edit in ECB
                var inlineEditSPANEl = parentDivCell.querySelectorAll('span' + dataAttrSelector)[0];
                //inline edit in Formulary
                var inlineEditPEl = parentDivCell.querySelectorAll('p' + dataAttrSelector)[0];
                //approval table, getting last div with that class
                var appRouteDataEl = parentDivCell.querySelectorAll('div:last-child[class*=slds-truncate]' + dataAttrSelector)[0];
                if ((inlineLockDivEl||inlineEditDivEl) && e.getAttribute('role') != 'button' && inlineEditSPANEl) {
                    console.log('handle ECB inline edit text field without id')
                    finalEl = inlineEditSPANEl
                } else if (inlineEditPEl) {
                    //This might change for other inline edits without -content id
                    console.log('handle other inline edits')
                    finalEl = inlineEditPEl
                } else if (appRouteDataEl) {
                    console.log('handle approval route')
                    finalEl = appRouteDataEl
                } else
                    console.log('not found from any of the custom handling')
            }
            if (!finalEl) {
                console.log('not able to find final element')
                return;
            }
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
    if (e.closest('th,div[class*=table-head-cell],div[class*=thead-row-selection],div[class*=slds-text-title_caps]')) {
        console.log('action on header, skipping table')
        return;
    }
    var isVirtualizedTable = e.closest('div[class*=ReactVirtualized__Grid]') ? true : false;
    var elClass = e.getAttribute('class') ? e.getAttribute('class') : '';
    var elId = e.getAttribute('id') ? e.getAttribute('id') : '';
    var isInsideModal = e.closest('div[data-id=modalContent]');
    var parentDivCellClass='slds-truncate', parentDivSelectionClass='tbody-row-selection';
    var nonVirtTableSearchChooser = 'table-search-chooser', nonVirtTableResultChooser = 'table-result-chooser';
    var parentDivChoserSelector = 'div[class='+parentDivCellClass+'][id*=\'-\'],div[class*='+parentDivSelectionClass+'],' +
        '[id*=\''+nonVirtTableSearchChooser+'\'],[id*=\''+nonVirtTableResultChooser+'\']';
    //Find parent Column div
    var parentDivCell = e.closest(parentDivChoserSelector);
    if (!parentDivCell) {
        //event itself is parent DIV
        if ((elClass == parentDivCellClass && elId.includes('-')) || elClass.includes(parentDivSelectionClass))
            parentDivCell = e;
        //if not, find child inside cell parent
        if (!parentDivCell)
            parentDivCell = e.querySelectorAll(parentDivChoserSelector)[0];
    }
    var isECBRowSelectionCell = false;
    if (!parentDivCell && !isInsideModal) {
        console.log('inside ECB parent div identifier')
        var parentElCheckbox = e.closest('[class*=slds-checkbox]')
        var parentContentNode = e.closest(contentElSelector)
        var childContentNode = e.querySelectorAll(contentElSelector)[0]
        var childElCheckbox = e.querySelectorAll('[class*=slds-checkbox]')[0]
        var inlineEditCellEl = e.closest('div[class*=slds-cell-edit],div[class*=slds-cell-lock]')
        var gridCellEl = e.closest('div[role=gridcell][class*='+parentDivCellClass+']')
        if (elClass.includes('slds-checkbox') || parentElCheckbox|| childElCheckbox) {
            parentDivCell = e.closest('[class=slds-form-element]')
            isECBRowSelectionCell = true;
        } else if (parentContentNode || childContentNode)
            parentDivCell = parentContentNode ? parentContentNode.parentNode : childContentNode.parentNode
        else if (inlineEditCellEl)
            parentDivCell = inlineEditCellEl.parentNode;
        else if (gridCellEl)
            parentDivCell = gridCellEl
    }
    var isModalNonSelectionColumn = false
    //Handle chooser modal
    if (!parentDivCell && isInsideModal) {
        console.log('inside modal parent div cell')
        isModalNonSelectionColumn = true;
        var tdCell = e.tagName.toLowerCase() == 'td' ? e : e.closest('td')
        if (tdCell.children.length == 1) {
            var checkboxEl = tdCell.querySelectorAll('input[type=checkbox]')[0]
            var radioEl = tdCell.querySelectorAll('input[type=radio]')[0]
            if (checkboxEl || radioEl) {
                isModalNonSelectionColumn = false;
                isECBRowSelectionCell = true;
                parentDivCell = tdCell;
            }
            if (tdCell.children[0].getAttribute(dataColumnAttr))
                parentDivCell = tdCell.children[0]
            else {
                var tdDataId = tdCell.getAttribute('data-id')
                var tdChildHavingDataId = tdCell.querySelectorAll('[data-id^=\'TableRowColumn-\']')[0]
                if (tdDataId && tdDataId.includes('TableRowColumn-'))
                    parentDivCell = tdCell
                else if (tdChildHavingDataId)
                    parentDivCell = tdChildHavingDataId
                else
                    console.log('not having data-id / data column attr field')
            }
        } else if (tdCell.children.length > 1) {
            var dataAttrCurrCol = e.getAttribute(dataColumnAttr) ? e.getAttribute(dataColumnAttr) : '';
            if (!dataAttrCurrCol) {
                if (e.parentNode == tdCell)
                    parentDivCell = e.parentNode
                else {
                    if (elId.endsWith('-content'))
                        parentDivCell = e;
                    else {
                        var parContentEl = e.closest(contentElSelector)
                        var childContentEl = e.querySelectorAll(contentElSelector)[0]
                        parentDivCell = parContentEl ? parContentEl : (childContentEl ? childContentEl : undefined)
                    }
                }
            } else {
                parentDivCell = tdCell.querySelectorAll('[' + dataColumnAttr + '=\'' + dataAttrCurrCol + '\']')[0]
            }
        }
    }
    //Added for approval route tab table case, need to check this can be merged in above insideModal block
    if (!parentDivCell && !isVirtualizedTable && !isInsideModal) {
        parentDivCell = e.tagName.toLowerCase() == 'td' ? e : e.closest('td')
        console.log('inside approval route case' + parentDivCell.tagName)
    }
    if (!parentDivCell) {
        console.log('unable to find parent div cell')
        return;
    }
    var parentDivClass = parentDivCell.getAttribute('class');
    parentDivClass = parentDivClass ? parentDivClass.trim() : '';
    var parentDivID = parentDivCell.getAttribute('id') ? parentDivCell.getAttribute('id') : '';
    var elementType = '', innerText = '', columnName = '', columnType = '', elementIndex = '1', isValidEl=false;
    var parentTableDivClass = 'div[class*=table-body]';
    if (!isVirtualizedTable)
        parentTableDivClass = 'table[class*=slds-table_fixed-layout]';
    var parentTableDiv = parentDivCell.closest(parentTableDivClass);
    if (isVirtualizedTable && !parentTableDiv) {
        console.log('inside finding virtualized parent table div')
        //Handle ECB Virtual parent Table
        var reactGridElParent = parentDivCell.closest('[class=ReactVirtualized__Grid]').parentNode;
        var parentGridElClass = reactGridElParent.getAttribute('class') ? reactGridElParent.getAttribute('class').trim() : '';
        if (parentGridElClass.includes('BottomLeftGrid_ScrollWrapper') || parentGridElClass.includes('TopRightGrid_ScrollWrapper'))
            reactGridElParent = reactGridElParent.parentNode;
        parentTableDiv = reactGridElParent.parentNode;
    }
    if (!parentTableDiv) {
        console.log('unable to find table parent Div')
        return;
    }
    console.log('parent div cell Class: ' + parentDivClass)
    //if first column, most of the cases header is checkbox and element will be checkbox in virtualized table
    if (parentDivClass.includes(parentDivSelectionClass) || isECBRowSelectionCell
        || (!isVirtualizedTable && (parentDivID.includes(nonVirtTableSearchChooser)||parentDivID.includes(nonVirtTableResultChooser)))) {
        console.log('inside selection column')
        var headerFirstColumnSelector = 'th,div[class*=thead-row-selection]'
        if (isECBRowSelectionCell)
            headerFirstColumnSelector = 'div[class*=tableHeaderColumn]';
        var headerFirstColumnEl = parentTableDiv.querySelectorAll(headerFirstColumnSelector)[0];
        var headerColumnNameEl = headerFirstColumnEl.querySelectorAll('[id$=-text]:not([class*=slds-assistive-text]),span:not([class*=slds-assistive-text])')[0]
        if (headerFirstColumnEl.querySelectorAll('input[type=checkbox]')[0])
            columnType = 'CHECKBOX_INDEX'
        else if (headerFirstColumnEl.querySelectorAll('input[type=radio]')[0])
            columnType = 'RADIO_INDEX'
        else if (headerColumnNameEl && headerColumnNameEl.textContent) {
            columnType = 'HEADER_NAME'
            columnName = headerColumnNameEl.textContent.trim();
        }
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
        console.log('inside non selection column')
        //if other column
        columnType = 'HEADER_NAME'
        var columnAttr = parentDivCell.getAttribute(dataColumnAttr);
        if (!columnAttr && parentDivCell.getAttribute('data-id'))
            columnAttr = parentDivCell.getAttribute('data-id').trim().replace('TableRowColumn-', '')
        if (!columnAttr) {
            console.log('data column attr is not defined')
            return;
        }
        columnAttr = columnAttr.trim();
        var headerCellSelector = '['+dataColumnAttr+'=\'' + columnAttr + '\'][id$=-text]:not([class*=slds-assistive-text])' +
            ',span['+dataColumnAttr+'=\'' + columnAttr + '\']:not([class*=slds-assistive-text])';
        var headerParentDiv = parentTableDiv.querySelectorAll(headerCellSelector)[0];
        if (headerParentDiv) {
            columnName = headerParentDiv.textContent.trim();
            var tableExpData = buildTableExpectedData(e, columnAttr, parentDivCell);
            if (tableExpData) {
                elementType = tableExpData.elementType;
                innerText = tableExpData.expectedValue;
                elementIndex = tableExpData.elementIndex ? tableExpData.elementIndex : '1';
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
        tableRowData.elementIndex = elementIndex
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
            this.additionalData = 'rowType=data|elementType=' + tableRowData.elementType + '|columnName=' + tableRowData.columnName + '|columnType=' + tableRowData.columnType + '|elementIndex=' + tableRowData.elementIndex;
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