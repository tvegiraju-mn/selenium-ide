import browser from 'webextension-polyfill'
import { reaction } from 'mobx'
import UiState from '../stores/view/UiState'

reaction(
  () => UiState.isRecording,
  isRecording => {
    isRecording ? createContextMenus() : destroyContextMenus()
  }
)

function createContextMenus() {
  /*browser.contextMenus.create({
    id: 'addStep',
    title: 'Create Step',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })*/
  browser.contextMenus.create({
    id: 'jsclick',
    title: 'JS Click',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })
  browser.contextMenus.create({
    id: 'mouseOver',
    title: 'Mouse Over',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })
  browser.contextMenus.create({
    id: 'readDataFromUI',
    title: 'Read Data',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })
  browser.contextMenus.create({
    id: 'readElementPresence',
    title: 'Read Element Presence',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })
  browser.contextMenus.create({
    id: 'readElementAttribute',
    title: 'Read Element Attribute',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })
  browser.contextMenus.create({
    id: 'readElementStyle',
    title: 'Read Element Style',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })
  browser.contextMenus.create({
    id: 'ComparisonOfTwoValues',
    title: 'Add Assert Action',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })
  browser.contextMenus.create({
    id: 'performWait',
    title: 'Wait Action',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })
  browser.contextMenus.create({
    id: 'reactTableRowData',
    title: 'Add to React Table Row Critieria',
    documentUrlPatterns: ['<all_urls>'],
    contexts: ['all'],
  })
}

function destroyContextMenus() {
  browser.contextMenus.removeAll()
}
