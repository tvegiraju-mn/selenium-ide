/**
 * Created by Tvegiraju on 12/30/2019.
 */

import * as builders from './customBuilders'

let customBuilder;

export default function customLocatorBuilders(locatorBuilders) {
    this.locatorBuilders = locatorBuilders;
}

customLocatorBuilders.prototype.updateAppType = function (appType) {
    customBuilder = builders[appType] || builders.Base;
    //Clean up locator builder
    this.locatorBuilders.cleanup();
    //update app specific methods
    //TODO: Remove prototype in below method call
    customBuilder.prototype.updateAppSpecificOrder();
};