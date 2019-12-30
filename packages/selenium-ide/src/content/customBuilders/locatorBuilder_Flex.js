/**
 * Created by Tvegiraju on 12/27/2019.
 */

const PREFERRED_ATTRIBUTES = [
    'name',
    'id',
    'title',
    'type',
    'action',
    'value',
    'onclick'
]

export default function locatorBuilder_Flex() {

}

locatorBuilder_Flex.prototype.updateAppSpecificOrder = function () {
    LocatorBuilders.PREFERRED_ATTRIBUTES = PREFERRED_ATTRIBUTES;
    LocatorBuilders.add('table', table);
    LocatorBuilders.add('xpath:attributes', locatorBuilders.xpathAttr);
}

function getXpathOfAnElement(e) {
    var elXpath = undefined;
    if (e.getAttribute('title')) {
        elXpath = '//' + locatorBuilders.xpathHtmlElement(e.nodeName.toLowerCase()) + '[@title=' + locatorBuilders.attributeValue(e.getAttribute('title')) + ']';
        if (e == locatorBuilders.findElement('xpath=' + elXpath)) {
            return elXpath;
        }
    }
    if (e.id) {
        elXpath = '//' + locatorBuilders.xpathHtmlElement(e.nodeName.toLowerCase()) + '[@id=' + locatorBuilders.attributeValue(e.id) + ']';
        if (e == locatorBuilders.findElement('id=' + e.id)) {
            return elXpath;
        }
    }
    if (e.name) {
        elXpath = '//' + locatorBuilders.xpathHtmlElement(e.nodeName.toLowerCase()) + '[@name=' + locatorBuilders.attributeValue(e.name) + ']';
        if (e == locatorBuilders.findElement('name=' + e.name)) {
            return elXpath;
        } else {
            elXpath = locatorBuilders.preciseXPath(elXpath, e);
            elXpath = elXpath.substring(6);
            return elXpath;
        }
    }
    return undefined;
}

function table(e) {
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
}