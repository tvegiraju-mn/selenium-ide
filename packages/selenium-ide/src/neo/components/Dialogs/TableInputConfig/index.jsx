/*
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

import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import Modal from '../../Modal'
import LabelledInput from '../../LabelledInput'
import DialogContainer from '../Dialog'
import FlatButton from '../../FlatButton'
import UiState from '../../../stores/view/UiState'
import { focusRecordingWindow } from '../../../IO/SideeX/find-select'
import './style.css'

export default class TableInputConfigDialog extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool,
    cancel: PropTypes.func
  }

  render() {
    return (
      <Modal
        className={classNames('stripped', 'table-config-dialog')}
        isOpen={this.props.isOpen}
        onRequestClose={this.props.cancel}
      >
        <TableInput {...this.props} />
      </Modal>
    )
  }
}

class TableInput extends React.Component {
  static propTypes = {
    cancel: PropTypes.func.isRequired,
    command: PropTypes.object.isRequired
  }

  constructor(props) {
    super(props)
    this.handleUniqueColumnNameChange = this.handleUniqueColumnNameChange.bind(this)
    this.handleTableIndexChange = this.handleTableIndexChange.bind(this)
    this.handleHeaderRowIdxChange = this.handleHeaderRowIdxChange.bind(this)
    this.handleElemIdxChange = this.handleElemIdxChange.bind(this)
    this.isInvalidOption = this.isInvalidOption.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
    this.onCancel = this.onCancel.bind(this)
    this.state = {
      isInvalidName: false,
      options: {
        uniqueColumnName: props.command.tableInput.uniqueColumnName,
        rowType: props.command.tableInput.rowType,
        tableIndex: props.command.tableInput.tableIndex,
        headerRowIdx: props.command.tableInput.headerRowIdx,
        elementIdx: props.command.tableInput.elementIdx,
      },
    }
  }
  handleInputChange(type, value) {
    const result = { [type]: value }
    this.setState({
      ['options']: {
        ...this.state.options,
        ...result,
      },
    })
  }
  handleUniqueColumnNameChange(value) {
    this.isInvalidOption(value)
    this.handleInputChange('uniqueColumnName', value)
  }
  handleTableIndexChange(value) {
    this.handleInputChange('tableIndex', value)
  }
  handleHeaderRowIdxChange(value) {
    this.handleInputChange('headerRowIdx', value)
  }
  handleElemIdxChange(e) {
    this.handleInputChange('elementIdx', e.target.value)
  }
  isInvalidOption(value) {
    const isEmpty = value === ''
    const isInvalid = isEmpty
    const errorMessage = isInvalid
      ? isEmpty
        ? 'Column Name cannot be empty'
        : 'Name must be unique'
      : undefined
    this.setState({
      ...this.state,
      isInvalidName: isInvalid,
      errorMessage: errorMessage,
    })
  }
  onCancel() {
    this.props.cancel()
    focusRecordingWindow()
  }
  onSubmit() {
    var tableInput = {
      uniqueColumnName: this.state.options.uniqueColumnName,
      rowType: this.state.options.rowType,
      tableIndex: this.state.options.tableIndex,
      headerRowIdx: this.state.options.headerRowIdx,
      elementIdx: this.state.options.elementIdx
    }
    var lastRecCommand = UiState.lastRecordedCommand;
    if (this.props.command && this.props.command.hasTableInput && this.props.command.tableInput && this.props.command.tableInput.rowType) {
      this.props.command.setTableInput(tableInput)
      this.props.command.setHasTableInput(true)
    } else if (lastRecCommand && lastRecCommand.hasTableInput && lastRecCommand.tableInput && lastRecCommand.tableInput.rowType) {
      lastRecCommand.setTableInput(tableInput)
    }
    this.props.cancel()
    focusRecordingWindow()
    //UiState.selectNextCommand({from:this.props.command})
  }
  render() {
    return (
      <DialogContainer
        title="Table Configuration"
        type={this.state.isInvalidName ? 'warn' : 'info'}
        renderFooter={() => (
          <div className="right">
            <FlatButton onClick={this.props.cancel}>cancel</FlatButton>
            <FlatButton
              type="submit"
              disabled={
                this.state.isInvalidName || this.state.options.setColumnName === ''
              }
              onClick={this.onSubmit}
            >
              {'confirm'}
            </FlatButton>
          </div>
        )}
        onRequestClose={this.onCancel}
      >
        <p
          style={{
            whiteSpace: 'pre-line',
          }}
        >
          {`This command acts upon a Table element. Some additional information is needed.`}
        </p>
        <React.Fragment>
          <div className="properties">
          <p style={{
            whiteSpace: 'pre-line',
          }}>
          {`Select Table`}
          </p>
          <LabelledInput
            name="uniqueColumnName"
            label="Unique Column Name"
            value={this.state.options.uniqueColumnName}
            onChange={this.handleUniqueColumnNameChange}
            autoFocus
          />
          {this.state.isInvalidName && (
            <div className="message">* {this.state.errorMessage}</div>
          )}
          <LabelledInput
            name="tableIndex"
            label="Table Index"
            type="number"
            value={this.state.options.tableIndex}
            onChange={this.handleTableIndexChange}
          />
          </div>
          {this.state.options.rowType == 'header' ? (
          <div className="properties">
          <p style={{
            whiteSpace: 'pre-line',
          }}>
          {`Select Header`}
          </p>
          <LabelledInput
            name="headerRowIdx"
            label="Header Row Index"
            type="number"
            value={this.state.options.headerRowIdx}
            onChange={this.handleHeaderRowIdxChange}
          /></div>) : null }
          <div className="properties">
          <p style={{
            whiteSpace: 'pre-line',
          }}>
          {`Select Column`}
          </p>
          <LabelledInput
            name="columnName"
            label="Column Name"
            value={this.state.options.columnName}
            onChange={this.handleColumnNameChange}
            autoFocus
          />
          <div className="labelled-input">
            <label htmlFor="elementIdx">Target Element Index</label>
            <select id="elementIdx" onChange={this.handleElemIdxChange} value={this.state.options.elementIdx}>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
          </div>
        </React.Fragment>
      </DialogContainer>
    )
  }
}
*/
