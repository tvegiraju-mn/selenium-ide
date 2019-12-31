/**
 * Created by Tvegiraju on 12/30/2019.
 */

import browser from 'webextension-polyfill';
import * as builders from './customBuilders';

let customBuilder, appType;

export default function customLocatorBuilders(locatorBuilders) {
    this.locatorBuilders = locatorBuilders;
    this.setPreferredOrderByAppTypeFirstTime();
}

customLocatorBuilders.prototype.updateAppType = function (appType) {
    this.appType = appType;
    customBuilder = builders[appType] || builders.Base;
    //Clean up locator builder
    this.locatorBuilders.cleanup();
    //update app specific methods
    customBuilder.updateAppSpecificOrder();
    console.log('LocatorBuilders length: ' + LocatorBuilders.order.length);
};

customLocatorBuilders.prototype.setPreferredOrderByAppTypeFirstTime = function () {
    var self = this;
    browser.runtime.sendMessage({type: "getAppType"}).then(function(response) {
        if (response && response.appType) {
            self.updateAppType(response.appType);
            console.log('Updated First time order for App Type: ' + response.appType);
        }
    });
};
