import { ArgTypes } from './ArgTypes'

export const TargetTypes = {
  NONE: 0,
  LOCATOR: 'locator',
  REGION: 'region',
}

export const Commands = [
  /*[
    'addStep',
    {
      name: 'add step',
      description: `Add a step for next set of actions.`,
      value: {
        name: 'step name',
        description: 'Step Name in Value field'
      },
      target: {
        name: 'step description',
        description: 'Step description in Description field'
      }
    },
  ],*/
  [
    'checkbox',
    {
      name: 'checkbox',
      type: TargetTypes.LOCATOR,
      description: `Check/Uncheck the checkbox`,
      target: ArgTypes.locator,
      value: {
        name: 'Checked state',
        description: 'Checked state as on/off value'
      },
      prefix: 'Check/Uncheck',
    },
  ],
  [
    'readDataFromUI',
    {
      name: 'read data',
      type: TargetTypes.LOCATOR,
      description: `Read data from the Target element`,
      target: ArgTypes.locator,
      prefix: 'Reading',
    },
  ],
  [
    'readElementPresence',
    {
      name: 'read element presence',
      type: TargetTypes.LOCATOR,
      description: `Read element presence of the Target element`,
      target: ArgTypes.locator,
      prefix: 'Reading',
    },
  ],
  [
    'readElementAttribute',
    {
      name: 'read element attribute',
      type: TargetTypes.LOCATOR,
      description: `Read Target element attribute`,
      target: ArgTypes.locator,
      prefix: 'Reading',
    },
  ],
  [
    'readElementStyle',
    {
      name: 'read element style',
      type: TargetTypes.LOCATOR,
      description: `Read Target element style`,
      target: ArgTypes.locator,
      prefix: 'Reading',
    },
  ],
  [
    'ComparisonOfTwoValues',
    {
      name: 'Assert Two Values',
      type: TargetTypes.LOCATOR,
      description: `Assert values`,
      target: ArgTypes.locator,
    },
  ],
  [
    'performWait',
    {
      name: 'perform wait',
      type: TargetTypes.LOCATOR,
      description: `Wait Until an expected state`,
      target: ArgTypes.locator,
      value: ArgTypes.variableName,
      prefix: 'Wait on',
    },
  ],
  [
    'click',
    {
      name: 'click',
      type: TargetTypes.LOCATOR,
      description: `Clicks on a target element (e.g., a link, button, checkbox, or radio button).`,
      target: ArgTypes.locator,
      prefix: 'Click on',
    },
  ],
  [
    'close',
    {
      name: 'close',
      description: `Closes the current window. There is no need to close the 
        initial window, IDE will re-use it; closing it may cause a performance 
        penalty on the test.`,
      prefix: 'Close Window',
    },
  ],
  [
    'jsclick',
    {
      name: 'JS Click',
      type: TargetTypes.LOCATOR,
      description: `Simulates a user hovering a mouse over the specified element.`,
      target: ArgTypes.locator,
      prefix: 'Click on',
    },
  ],
  [
    'open',
    {
      name: 'open',
      description: `Opens a URL and waits for the page to load before proceeding. 
        This accepts both relative and absolute URLs.`,
      target: ArgTypes.url,
      prefix: 'Open URL',
    },
  ],
  [
    'select',
    {
      name: 'select',
      type: TargetTypes.LOCATOR,
      description: `Select an element from a drop-down menu using an option 
        locator. Option locators provide different ways of specifying a select 
        element (e.g., label=, value=, id=, index=). If no option locator prefix 
        is provided, a match on the label will be attempted.`,
      target: ArgTypes.locator,
      value: ArgTypes.optionLocator,
      prefix: 'Selecting',
    },
  ],
  [
    'selectFrame',
    {
      name: 'select frame',
      type: TargetTypes.LOCATOR,
      description: `Selects a frame within the current window. You can select a
        frame by its 0-based index number (e.g., select the first frame with 
        "index=0", or the third frame with "index=2"). For nested frames you will
        need to invoke this command multiple times (once for each frame in the 
        tree until you reach your desired frame). You can select the parent 
        frame with "relative=parent". To return to the top of the page use 
        "relative=top".`,
      target: ArgTypes.locator,
    },
  ],
  [
    'selectWindow',
    {
      name: 'select window',
      description: `Selects a popup window using a window locator. Once a 
        popup window has been selected, all commands will go to that window. 
        Window locators use handles to select windows.`,
      target: ArgTypes.handle,
    },
  ],
  [
    'submit',
    {
      name: 'submit',
      type: TargetTypes.LOCATOR,
      description: `Submit the specified form. This is particularly useful for 
        forms without submit buttons, e.g. single-input "Search" forms.`,
      target: ArgTypes.formLocator,
    },
  ],
  [
    'type',
    {
      name: 'type',
      type: TargetTypes.LOCATOR,
      description: `Sets the value of an input field, as though you typed it 
        in. Can also be used to set the value of combo boxes, check boxes, etc. 
        In these cases, value should be the value of the option selected, not 
        the visible text.  Chrome only: If a file path is given it will be 
        uploaded to the input (for type=file), NOTE: XPath locators are not 
        supported.`,
      target: ArgTypes.locator,
      value: ArgTypes.value,
      prefix: 'Entering',
    },
  ],
  [
    'setWindowSize',
    {
      name: 'set window size',
      description:
          "Set the browser's window size, including the browser's interface.",
      target: ArgTypes.resolution,
    },
  ],
  [
    'dragAndDropToObject',
    {
      name: 'drag and drop to object',
      type: TargetTypes.LOCATOR,
      description: 'Drags an element and drops it on another element.',
      target: ArgTypes.locator,
      value: ArgTypes.value,
    },
  ],
]
