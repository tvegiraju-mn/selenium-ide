// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import generate from 'project-name-generator'
import { CommandsArray } from '../models/Command'
import Command from '../models/Command'
import UiState from './view/UiState'
import browser from 'webextension-polyfill'

export default function seed(store, numberOfSuites = 0) {
    function getUrl(store) {
      let url = ''
      browser.runtime.sendMessage({type: "geturl"}).then(function (response) {
            if (response && response.url) {
                url = response.url
                store.setUrl(url)
                store.addUrl(url)
                UiState.saved()
            }
        });
        return url;
    }
    let url = getUrl(store);
    store.setUrl(url)
    //store.addUrl(url)

    const newTest = store.createTestCase('New Recording')
    //newTest.createCommand(undefined, 'open', '/')

    const suiteAll = store.createSuite('all tests')
    suiteAll.addTestCase(newTest)

    UiState.changeView('Tests')
    UiState.selectTest(newTest, suiteAll)

    store.changeName('RTS')
    UiState.saved()
    return store
}
