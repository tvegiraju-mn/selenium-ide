/**
 * Created by Tvegiraju on 12/27/2019.
 */

export default function locatorBuilder_MN() {

}
const PREFERRED_ATTRIBUTES = [
    'comppath',
    'name',
    'type',
    'value',
    'action',
    'onclick'
];

const finderNamesToAddLocatorEvenIfElNotMatched = [
    'leftNav',
    'xpath:comppathRelative'
];

locatorBuilder_MN.updateAppSpecificOrder = function () {
    console.log('inside mn custom')
    LocatorBuilders.PREFERRED_ATTRIBUTES = PREFERRED_ATTRIBUTES;
    LocatorBuilders.finderNamesToAddLocatorEvenIfElNotMatched = finderNamesToAddLocatorEvenIfElNotMatched;
    LocatorBuilders.add('leftNav', leftNav);
    LocatorBuilders.add('table', table);
    LocatorBuilders.add('xpath:comppath', xpathComppath);
    LocatorBuilders.add('xpath:titleAndPopUp', generateXPathForTitleAndPopUp);
    LocatorBuilders.add('xpath:comppathRelative', xpathComppathRelative);
    LocatorBuilders.add('xpath:attributes', locatorBuilders.xpathAttr);
    var origDisplayNameFn = locatorBuilders.getDisplayName;
    locatorBuilders.getDisplayName = function(e, ignoreInnerText) {
        var displayName = origDisplayNameFn.apply(this, arguments);
        if (!displayName) {
            console.log('custom MN displayName');
            displayName = getCustomDisplayNameFn(e);
        }
        return displayName;
    };
};

function getXpathFromComppathAttr(nodeName, comppath) {
    var xpathCond = '[' + locatorBuilders.getXpathForAttribute('comppath', comppath) + ']';
    return '//' + locatorBuilders.xpathHtmlElement(nodeName.toLowerCase()) + xpathCond;
}

function getXpathOfAnElement(e, skipCases) {
    var elXpath = undefined;
    var comppath = e.getAttribute('comppath');
    if (comppath) {
        if (comppath.indexOf('spreadsheetContainer') > -1 && skipCases)
            return undefined;
        elXpath = locatorBuilders.preciseXPath('//' + locatorBuilders.xpathHtmlElement(e.nodeName.toLowerCase()) + '[@comppath=' + locatorBuilders.attributeValue(comppath) + ']', e);
        elXpath = elXpath.substring(6);
        return elXpath;
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

function getCustomDisplayNameFn(e) {
    var elXpath = getXpathOfAnElement(e, false);
    if (elXpath) {
        var labelXpath = elXpath + '/preceding::*[((local-name() = \'span\' and contains(@domattr,\'extField\')) or (local-name() = \'label\' and contains(@class,\'left\'))) and string-length(normalize-space(text())) > 1][1]';
        var labelEl = locatorBuilders.findElement(labelXpath);
        if (labelEl && labelEl.innerText) {
            var innerText = locatorBuilders.getInnerTextWithoutChildren(labelEl);
            if (innerText.length > 1)
                return innerText;
        }
    }
}

function table(e) {
    var elXpath = getXpathOfAnElement(e, true);
    if (elXpath) {
        var parXpath = elXpath + '/ancestor::tr[contains(@class,\'tableRow bodyRow bodyRow-\') or contains(@class,\'tableRow headerRow headerRow-\') ' +
            'or contains(@class,\'tableRow footerRow footerRow-\')]';
        var tdEl = this.findElement(parXpath);
        if (tdEl) {
            var rowType = 'data';
            if (tdEl.getAttribute('class').includes('headerRow-')) {
                rowType = 'header';
            } else if (tdEl.getAttribute('class').includes('footerRow-')) {
                rowType = 'footer';
            }
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

function xpathComppath(e) {
    var comppath = e.getAttribute('comppath');
    if (comppath) {
        let locator = getXpathFromComppathAttr(e.nodeName, comppath);
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
}

function generateXPathForTitleAndPopUp(e) {
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
}

function xpathComppathRelative(e) {
    let path = '';
    let current = e;
    while (current != null) {
        if (current.parentNode != null) {
            path = this.relativeXPathFromParent(current) + path;
            if (
                1 == current.parentNode.nodeType && // ELEMENT_NODE
                current.parentNode.getAttribute('comppath')
            ) {
                let locator = getXpathFromComppathAttr(current.parentNode.nodeName, current.parentNode.getAttribute('comppath'));
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
}

function name(e) {
    if (e.name) {
        var splitByNumber = e.name.split(/\d+/)
        if (splitByNumber.length == 1) {
            return 'name=' + e.name
        } else if (splitByNumber.length > 1) {
            return 'xpath=//' + this.xpathHtmlElement(e.nodeName.toLowerCase()) + '[' + this.getXpathForAttribute('name', e.name) + ']'
        }
    }
    return null
}

function leftNav(e) {
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
    return null;
}