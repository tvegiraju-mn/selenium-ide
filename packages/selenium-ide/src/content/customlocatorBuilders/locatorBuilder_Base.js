/*
 * Created by tvegiraju
*/
import finder from '@medv/finder'

export default function locatorBuilder_Base(locatorBuilders) {
    this.locatorBuilders = locatorBuilders;
}

locatorBuilder_Base.prototype.updateAppSpecificOrder = function () {
    console.log('inside base')
    LocatorBuilders.add('css:data-attr', cssDataAttr);
    LocatorBuilders.add('id', id);
    LocatorBuilders.add('linkText', linkText);
    LocatorBuilders.add('name', name);
    LocatorBuilders.add('css:finder', cssFinder);
    LocatorBuilders.add('xpath:link', xpathLink);
    LocatorBuilders.add('xpath:img', xpathImg);
    LocatorBuilders.add('xpath:attributes', this.locatorBuilders.xpathAttr);
    LocatorBuilders.add('xpath:idRelative', xpathIdRelative);
    LocatorBuilders.add('xpath:href', xpathHref);
    LocatorBuilders.add('xpath:position', xpathPosition);
    LocatorBuilders.add('xpath:innerText', xpathInnerText);
};

function cssDataAttr(e) {
    const dataAttributes = ['data-test', 'data-test-id']
    for (let i = 0; i < dataAttributes.length; i++) {
        const attr = dataAttributes[i]
        const value = e.getAttribute(attr)
        if (attr) {
            return `css=*[${attr}="${value}"]`
        }
    }
    return null
}

function id(e) {
    if (e.id) {
        return 'id=' + e.id
    }
    return null
}

function linkText(e) {
    if (e.nodeName == 'A') {
        let text = e.textContent
        if (!text.match(/^\s*$/)) {
            return (
                'linkText=' + text.replace(/\xA0/g, ' ').replace(/^\s*(.*?)\s*$/, '$1')
            )
        }
    }
    return null
}

function name(e) {
    if (e.name)
        return 'name=' + e.name
    return null
}

function cssFinder(e) {
 return 'css=' + finder(e)
}

function xpathLink(e) {
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
}

function xpathImg(e) {
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

function xpathHref(e) {
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
}

function xpathPosition(
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
}

function xpathInnerText(el) {
    if (el.innerText) {
        return `xpath=//${el.nodeName.toLowerCase()}[contains(.,'${el.innerText}')]`
    } else {
        return null
    }
}