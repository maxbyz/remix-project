import React, { useState, useEffect, useReducer, useRef, SyntheticEvent, MouseEvent } from 'react' // eslint-disable-line
import { useKeyPress } from './custom-hooks/useKeyPress' // eslint-disable-line
import { useWindowResize } from 'beautiful-react-hooks'
import { registerCommandAction, filterFnAction, registerLogScriptRunnerAction, registerInfoScriptRunnerAction, registerErrorScriptRunnerAction, registerWarnScriptRunnerAction, registerRemixWelcomeTextAction, listenOnNetworkAction, initListeningOnNetwork } from './actions/terminalAction'
import { initialState, registerCommandReducer, registerFilterReducer, addCommandHistoryReducer, registerScriptRunnerReducer, remixWelcomeTextReducer } from './reducers/terminalReducer'
import { remixWelcome } from './reducers/remixWelcom'
import { getKeyOf, getValueOf, Objectfilter, matched, find } from './utils/utils'
import {allCommands, allPrograms} from './commands' // eslint-disable-line
import { CopyToClipboard } from '@remix-ui/clipboard' // eslint-disable-line
import { ModalDialog } from '@remix-ui/modal-dialog'
// const TxLogger from '../../../apps/'
import vm from 'vm'
import javascriptserialize from 'javascript-serialize'
import jsbeautify from 'js-beautify'
import helper from '../../../../../apps/remix-ide/src/lib/helper'
import parse from 'html-react-parser'

import './remix-ui-terminal.css'
import { debug } from 'console'
import { eventNames } from 'process'

const remixLib = require('@remix-project/remix-lib')
var typeConversion = remixLib.execution.typeConversion

/* eslint-disable-next-line */
export interface RemixUiTerminalProps {
  propterties: any
  event: any
  autoCompletePopupEvent: any
  autoCompletePopup: any
  blockchain: any
  api: any
  options: any
  data: any
  cmdInterpreter: any
  command: any
  version: any
  config: any
  thisState: any
  vm: any
  commandHelp: any,
  _deps: any,
  fileImport: any,
  gistHandler: any,
  sourceHighlighter: any,
  registry: any,
  commands: any,
  txListener: any,
  eventsDecoder: any
}

export interface ClipboardEvent<T = Element> extends SyntheticEvent<T, any> {
  clipboardData: DataTransfer;
}

export const RemixUiTerminal = (props: RemixUiTerminalProps) => {
  const [toggleDownUp, setToggleDownUp] = useState('fa-angle-double-down')
  const [inserted, setInserted] = useState(false)
  const [_cmdIndex, setCmdIndex] = useState(-1)
  const [_cmdTemp, setCmdTemp] = useState('')
  const [_cmdHistory, setCmdHistory] = useState([])
  const [windowHeight, setWindowHeight] = useState(window.innerHeight)
  // dragable state
  const [leftHeight, setLeftHeight] = useState<undefined | number>(undefined)
  const [separatorYPosition, setSeparatorYPosition] = useState<undefined | number>(undefined)
  const [dragging, setDragging] = useState(false)

  const [newstate, dispatch] = useReducer(registerCommandReducer, initialState)
  const [filterState, filterDispatch] = useReducer(registerFilterReducer, initialState)
  const [cmdHistory, cmdHistoryDispatch] = useReducer(addCommandHistoryReducer, initialState)
  const [scriptRunnserState, scriptRunnerDispatch] = useReducer(registerScriptRunnerReducer, initialState)
  const [welcomeTextState, welcomTextDispath] = useReducer(remixWelcomeTextReducer, initialState)
  const [isListeningOnNetwork, setIsListeningOnNetwork] = useState(false)
  const [autoCompletState, setAutoCompleteState] = useState({
    activeSuggestion: 0,
    data: {
      _options: []
    },
    _startingElement: 0,
    autoCompleteSelectedItem: {},
    _elementToShow: 4,
    _selectedElement: 0,
    filteredCommands: [],
    filteredPrograms: [],
    showSuggestions: false,
    text: '',
    userInput: '',
    extraCommands: [],
    commandHistoryIndex: 0
  })

  const [searchInput, setSearchInput] = useState('')
  // const [showTableDetails, setShowTableDetails] = useState([])
  const [showTableDetails, setShowTableDetails] = useState(null)

  useWindowResize(() => {
    setWindowHeight(window.innerHeight)
  })

  // terminal inputRef
  const inputEl = useRef(null)
  // events
  useEffect(() => {
    initListeningOnNetwork(props, scriptRunnerDispatch)
    // registerRemixWelcomeTextAction(remixWelcome, welcomTextDispath)
    registerLogScriptRunnerAction(props.thisState, 'log', newstate.commands, scriptRunnerDispatch)
    registerInfoScriptRunnerAction(props.thisState, 'info', newstate.commands, scriptRunnerDispatch)
    registerWarnScriptRunnerAction(props.thisState, 'warn', newstate.commands, scriptRunnerDispatch)
    registerErrorScriptRunnerAction(props.thisState, 'error', newstate.commands, scriptRunnerDispatch)
    registerCommandAction('html', _blocksRenderer('html'), { activate: true }, dispatch)
    registerCommandAction('log', _blocksRenderer('log'), { activate: true }, dispatch)
    registerCommandAction('info', _blocksRenderer('info'), { activate: true }, dispatch)
    registerCommandAction('warn', _blocksRenderer('warn'), { activate: true }, dispatch)
    registerCommandAction('error', _blocksRenderer('error'), { activate: true }, dispatch)

    registerCommandAction('script', function execute (args, scopedCommands, append) {
      var script = String(args[0])
      console.log({ script })
      console.log({ scopedCommands })

      _shell(script, scopedCommands, function (error, output) {
        if (error) scriptRunnerDispatch({ type: 'error', payload: { message: error } })
        if (output) scriptRunnerDispatch({ type: 'script', payload: { message: '5' } })
      })
    }, { activate: true }, dispatch)

    filterFnAction('log', basicFilter, filterDispatch)
    filterFnAction('info', basicFilter, filterDispatch)
    filterFnAction('warn', basicFilter, filterDispatch)
    filterFnAction('error', basicFilter, filterDispatch)
    filterFnAction('script', basicFilter, filterDispatch)
    registerLogScriptRunnerAction(props.thisState, 'log', newstate.commands, scriptRunnerDispatch)
    registerInfoScriptRunnerAction(props.thisState, 'info', newstate.commands, scriptRunnerDispatch)
    registerWarnScriptRunnerAction(props.thisState, 'warn', newstate.commands, scriptRunnerDispatch)
    registerErrorScriptRunnerAction(props.thisState, 'error', newstate.commands, scriptRunnerDispatch)
    // console.log({ htmlresullt }, { logresult })
    // dispatch({ type: 'html', payload: { commands: htmlresullt.commands } })
    // dispatch({ type: 'log', payload: { _commands: logresult._commands } })
    // registerCommand('log', _blocksRenderer('log'), { activate: true })
  }, [props.thisState.autoCompletePopup, autoCompletState.text])

  const placeCaretAtEnd = (el) => {
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  const domTerminalFeatures = () => {
    return {
      remix: props.cmdInterpreter
    }
  }

  function exeCurrent (cb) {
    return execute(undefined, cb)
  }

  function execute (file, cb) {
    function _execute (content, cb) {
      if (!content) {
      //  toolTip('no content to execute')
        if (cb) cb()
        return
      }

      newstate.commands.script(content)
    }

    if (typeof file === 'undefined') {
      var content = props._deps.editor.currentContent()
      _execute(content, cb)
      return
    }

    var provider = props._deps.fileManager.fileProviderOf(file)

    if (!provider) {
      // toolTip(`provider for path ${file} not found`)
      if (cb) cb()
      return
    }

    provider.get(file, (error, content) => {
      if (error) {
        // toolTip(error)
        // TODO: pop up
        if (cb) cb()
        return
      }

      _execute(content, cb)
    })
  }

  const _shell = async (script, scopedCommands, done) => { // default shell
    if (script.indexOf('remix:') === 0) {
      return done(null, 'This type of command has been deprecated and is not functionning anymore. Please run remix.help() to list available commands.')
    }

    if (script.indexOf('remix.') === 0) {
      // we keep the old feature. This will basically only be called when the command is querying the "remix" object.
      // for all the other case, we use the Code Executor plugin
      var context = domTerminalFeatures()
      try {
        const cmds = vm.createContext(context)
        // const result
        let result = vm.runInContext(script, cmds)
        if (script === 'remix.exeCurrent()') {
          result = exeCurrent(undefined)
        } else {
          if (result === {}) {
            for (const k in result) {
              result = +`<div> {k}: ${result[k]}</div> <br>`
            }
          }
        }

        console.log(result === {}, ' is result === object')
        console.log({ result })
        return done(null, '')
      } catch (error) {
        return done(error.message)
      }
    }
    try {
      let result: any
      if (script.trim().startsWith('git')) {
        // result = await this.call('git', 'execute', script)
      } else {
        result = await props.thisState.call('scriptRunner', 'execute', script)
      }
      console.log({ result })
      done()
    } catch (error) {
      done(error.message || error)
    }
  }

  // handle events
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    // Do something
    const selection = window.getSelection()
    if (!selection.rangeCount) return false
    event.preventDefault()
    event.stopPropagation()
    const clipboard = (event.clipboardData) // || window.clipboardData
    let text = clipboard.getData('text/plain')
    text = text.replace(/[^\x20-\xFF]/gi, '') // remove non-UTF-8 characters
    const temp = document.createElement('div')
    temp.innerHTML = text
    const textnode = document.createTextNode(temp.textContent)
    selection.getRangeAt(0).insertNode(textnode)
    selection.empty()
    // self.scroll2bottom()
    placeCaretAtEnd(event.currentTarget)
  }

  const handleMinimizeTerminal = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (toggleDownUp === 'fa-angle-double-down') {
      console.log('clikced down')
      setToggleDownUp('fa-angle-double-up')
      props.event.trigger('resize', [])
    } else {
      const terminalTopOffset = props.config.config.get('terminal-top-offset')
      props.event.trigger('resize', [terminalTopOffset])
      setToggleDownUp('fa-angle-double-down')
    }
  }

  const _appendItem = (item: any) => {
    let { _JOURNAL, _jobs, data } = state
    const self = props
    const { el, gidx } = item
    _JOURNAL[gidx] = item
    if (!_jobs.length) {
      // requestAnimationFrame(function updateTerminal () {
      //   self._jobs.forEach(el => self._view.journal.appendChild(el))
      //   self.scroll2bottom()
      _jobs = []
    }
    if (data.activeFilters.commands[item.cmd]) _jobs.push(el)
  }

  const focusinput = () => {
    inputEl.current.focus()
  }

  const wrapScript = (script) => {
    const isKnownScript = ['remix.', 'git'].some(prefix => script.trim().startsWith(prefix))
    if (isKnownScript) return script
    return `
        try {
          const ret = ${script};
          if (ret instanceof Promise) {
            ret.then((result) => { console.log(result) }).catch((error) => { console.log(error) })
          } else {
            console.log(ret)
          }   
        } catch (e) {
          console.log(e.message)
        }
        `
  }

  const handleKeyDown = (event) => {
    const suggestionCount = autoCompletState.activeSuggestion
    if (autoCompletState.userInput !== '' && (event.which === 27 || event.which === 8 || event.which === 46)) {
      console.log(' enter esc and delete')
      // backspace or any key that should remove the autocompletion
      setAutoCompleteState(prevState => ({ ...prevState, showSuggestions: false }))
    }
    if (autoCompletState.showSuggestions && (event.which === 13 || event.which === 9)) {
      if (autoCompletState.userInput.length === 1) {
        setAutoCompleteState(prevState => ({ ...prevState, showSuggestions: false, userInput: Object.keys(autoCompletState.data._options[0]).toString() }))
      } else {
        setAutoCompleteState(prevState => ({ ...prevState, showSuggestions: false, userInput: autoCompletState.userInput }))
      }
    }
    if (event.which === 13 && !autoCompletState.showSuggestions) {
      if (event.ctrlKey) { // <ctrl+enter>
        // on enter, append the value in the cli input to the journal
        inputEl.current.focus()
      } else { // <enter>
        event.preventDefault()
        console.log('hit enter')
        setCmdIndex(-1)
        setCmdTemp('')
        const script = autoCompletState.userInput.trim() // inputEl.current.innerText.trim()
        if (script.length) {
          cmdHistoryDispatch({ type: 'cmdHistory', payload: { script } })
          newstate.commands.script(wrapScript(script))
        }
        setAutoCompleteState(prevState => ({ ...prevState, userInput: '' }))
        inputEl.current.innerText = ''
        inputEl.current.focus()
        setAutoCompleteState(prevState => ({ ...prevState, showSuggestions: false }))
      }
    } else if (newstate._commandHistory.length && event.which === 38 && !autoCompletState.showSuggestions && (autoCompletState.userInput === '')) {
      console.log('previous command up')
      // if (autoCompletState.commandHistoryIndex < 1) {
      event.preventDefault()
      console.log(newstate._commandHistory[0], ' up value')
      setAutoCompleteState(prevState => ({ ...prevState, userInput: newstate._commandHistory[0] }))

      // }
      // else if (newstate._commandHistory.length < autoCompletState.commandHistoryIndex) {
      //   setAutoCompleteState(prevState => ({ ...prevState, commandHistoryIndex: --autoCompletState.commandHistoryIndex }))
      //   console.log(newstate._commandHistory[newstate._commandHistory.length > 1 ? autoCompletState.commandHistoryIndex-- : newstate._commandHistory.length + 1], ' up value')
      // } else if (newstate._commandHistory.length === autoCompletState.commandHistoryIndex) {
      //   console.log(newstate._commandHistory.length === autoCompletState.commandHistoryIndex, ' up value middle')
      //   setAutoCompleteState(prevState => ({ ...prevState, commandHistoryIndex: autoCompletState.commandHistoryIndex - 2, userInput: newstate._commandHistory[autoCompletState.commandHistoryIndex] }))
      // } else {
      //   setAutoCompleteState(prevState => ({ ...prevState, commandHistoryIndex: autoCompletState.commandHistoryIndex - 1, userInput: newstate._commandHistory[autoCompletState.commandHistoryIndex] }))
      //   console.log(newstate._commandHistory[newstate._commandHistory.length - 1], ' up value last')
      // }
      // if (newstate._commandHistory.length === 0) {
      //   setAutoCompleteState(prevState => ({ ...prevState, userInput: newstate[0] }))
      // }
      // setAutoCompleteState(prevState => ({ ...prevState, userInput: newstate[autoCompletState.commandHistoryIndex] }))
      // TODO: giving error => need to work on the logic
    // // } else if (newstate._commandHistory.length && event.which === 40 && !autoCompletState.showSuggestions && (autoCompletState.userInput !== '')) {
    // //   console.log('previous command down')
    // //   if (autoCompletState.commandHistoryIndex < newstate._commandHistory.length) {
    // //     setAutoCompleteState(prevState => ({ ...prevState, commandHistoryIndex: autoCompletState.commandHistoryIndex + 1, userInput: newstate._commandHistory[autoCompletState.commandHistoryIndex + 1] }))
    // //     console.log(newstate._commandHistory[newstate._commandHistory.length > 1 ? autoCompletState.commandHistoryIndex++ : newstate._commandHistory.length - 1], ' down ++ value')
    // //   } else {
    // //     console.log(newstate._commandHistory[newstate._commandHistory.length - 1], ' down value last')
    // //     setAutoCompleteState(prevState => ({ ...prevState, commandHistoryIndex: newstate._commandHistory.length - 1, userInput: newstate._commandHistory[newstate._commandHistory.length - 1] }))
    // //   }
    // //   // if (autoCompletState.commandHistoryIndex === newstate._commandHistory.length) {
    // //   //   return
    // //   // }
      // setAutoCompleteState(prevState => ({ ...prevState, userInput: newstate[autoCompletState.commandHistoryIndex] + 1 }))
    } else if (event.which === 38 && autoCompletState.showSuggestions) {
      event.preventDefault()
      if (autoCompletState.activeSuggestion === 0) {
        return
      }
      setAutoCompleteState(prevState => ({ ...prevState, activeSuggestion: suggestionCount - 1, userInput: Object.keys(autoCompletState.data._options[autoCompletState.activeSuggestion - 1]).toString() }))
      console.log('disable up an down key in input box')
    } else if (event.which === 38 && !autoCompletState.showSuggestions) { // <arrowUp>
      const len = _cmdHistory.length
      if (len === 0) event.preventDefault()
      if (_cmdHistory.length - 1 > _cmdIndex) {
        setCmdIndex(prevState => prevState++)
      }
      inputEl.current.innerText = _cmdHistory[_cmdIndex]
      inputEl.current.focus()
    } else if (event.which === 40 && autoCompletState.showSuggestions) {
      event.preventDefault()
      if ((autoCompletState.activeSuggestion + 1) === autoCompletState.data._options.length) {
        return
      }
      setAutoCompleteState(prevState => ({ ...prevState, activeSuggestion: suggestionCount + 1, userInput: Object.keys(autoCompletState.data._options[autoCompletState.activeSuggestion + 1]).toString() }))
      console.log('disable up an down key in input box')
    } else if (event.which === 40 && !autoCompletState.showSuggestions) {
      if (_cmdIndex > -1) {
        setCmdIndex(prevState => prevState--)
      }
      inputEl.current.innerText = _cmdIndex >= 0 ? _cmdHistory[_cmdIndex] : _cmdTemp
      inputEl.current.focus()
    } else {
      setCmdTemp(inputEl.current.innerText)
    }
    console.log({ autoCompletState })
  }

  const moveGhostbar = (event) => {
    return props.api.getPosition(event) + 'px'
  }

  const removeGhostbar = (event) => {
    if (toggleDownUp === 'fa-angle-double-up') {
      console.log('remove event')
      setToggleDownUp('fa-angle-double-down')
    }
    const value = props.event.get('resize')
    console.log({ value })
    props.event.trigger('resize', [value])
  }

  /* start of mouse events */

  const mousedown = (event: MouseEvent) => {
    setSeparatorYPosition(event.clientY)
    setDragging(true)
  }

  const onMouseMove: any = (e: MouseEvent) => {
    e.preventDefault()
    if (dragging && leftHeight && separatorYPosition) {
      const newEditorHeight = leftHeight - e.clientY + separatorYPosition
      const newLeftHeight = leftHeight + separatorYPosition - e.clientY
      setSeparatorYPosition(e.clientY)
      setLeftHeight(newLeftHeight)
      props.event.trigger('resize', [newLeftHeight + 32])
      console.log({ newLeftHeight })
    }
  }

  const onMouseUp = () => {
    setDragging(false)
  }

  /* end of mouse event */

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  })

  React.useEffect(() => {
    const leftRef = document.getElementById('terminal-view')
    const editorRef = document.getElementById('mainPanelPluginsContainer-id')
    if (leftRef) {
      if (!leftHeight) {
        setLeftHeight(leftRef.offsetHeight)
        return
      }
      leftRef.style.height = `${leftHeight}px`
    }
  }, [leftHeight, setLeftHeight, inputEl])

  /* block contents that gets rendered from scriptRunner */

  const _blocksRenderer = (mode) => {
    if (mode === 'html') {
      return function logger (args) {
        console.log({ args })
        if (args.length) {
          return args[0]
        }
      }
    }
    mode = {
      log: 'text-log',
      info: 'text-info',
      warn: 'text-warning',
      error: 'text-danger'
    }[mode] // defaults

    if (mode) {
      const filterUndefined = (el) => el !== undefined && el !== null
      return function logger (args) {
        var types = args.filter(filterUndefined).map(type => type)
        var values = javascriptserialize.apply(null, args.filter(filterUndefined)).map(function (val, idx) {
          if (typeof args[idx] === 'string') {
            const el = document.createElement('div')
            el.innerHTML = args[idx].replace(/(\r\n|\n|\r)/gm, '<br>')
            val = el.children.length === 0 ? el.firstChild : el
          }
          if (types[idx] === 'element') val = jsbeautify.html(val)
          return val
        })
        if (values.length) {
          console.log({ values })
          return `<span class="${mode}" >${values}</span>`
        }
      }
    } else {
      throw new Error('mode is not supported')
    }
  }

  function basicFilter (value, query) { try { return value.indexOf(query) !== -1 } catch (e) { return false } }

  const registerCommand = (name, command, opts) => {
    // setState((prevState) => ({ ...prevState, _commands[name]: command }))
  }

  /* end of block content that gets rendered from script Runner */

  const handleClearConsole = () => {
    dispatch({ type: 'clearconsole', payload: [] })
    inputEl.current.focus()
  }
  /* start of autoComplete */

  const listenOnNetwork = (event: any) => {
    const isListening = event.target.checked
    setIsListeningOnNetwork(isListening)
    listenOnNetworkAction(props, isListening)
  }

  const onChange = (event: any) => {
    event.preventDefault()
    const inputString = event.target.value
    if (matched(allPrograms, inputString) || inputString.includes('.')) {
      setAutoCompleteState(prevState => ({ ...prevState, showSuggestions: true, userInput: inputString }))
      const textList = inputString.split('.')
      if (textList.length === 1) {
        setAutoCompleteState(prevState => ({ ...prevState, data: { _options: [] } }))
        const result = Objectfilter(allPrograms, autoCompletState.userInput)
        setAutoCompleteState(prevState => ({ ...prevState, data: { _options: result } }))
      } else {
        setAutoCompleteState(prevState => ({ ...prevState, data: { _options: [] } }))
        const result = Objectfilter(allCommands, autoCompletState.userInput)
        setAutoCompleteState(prevState => ({ ...prevState, data: { _options: result } }))
      }
    } else {
      setAutoCompleteState(prevState => ({ ...prevState, showSuggestions: false, userInput: inputString }))
    }
  }

  const handleSelect = (event) => {
    const suggestionCount = autoCompletState.activeSuggestion
    if (event.keyCode === 38) {
      if (autoCompletState.activeSuggestion === 0) {
        return
      }
      setAutoCompleteState(prevState => ({ ...prevState, activeSuggestion: suggestionCount - 1 }))
    } else if (event.keyCode === 40) {
      if (autoCompletState.activeSuggestion - 1 === autoCompletState.data._options.length) {
        return
      }
      setAutoCompleteState(prevState => ({ ...prevState, activeSuggestion: suggestionCount + 1 }))
    }
    // props.thisState.event.trigger('handleSelect', [text])
  }

  const checkTxStatus = (tx, type) => {
    if (tx.status === '0x1' || tx.status === true) {
      return (<i className='txStatus succeeded fas fa-check-circle'></i>)
    }
    if (type === 'call' || type === 'unknownCall' || type === 'unknown') {
      return (<i className='txStatus call'>call</i>)
    } else if (tx.status === '0x0' || tx.status === false) {
      return (<i className='txStatus failed fas fa-times-circle'></i>)
    } else {
      return (<i className='txStatus notavailable fas fa-circle-thin' title='Status not available' ></i>)
    }
  }

  const context = (opts, blockchain) => {
    const data = opts.tx || ''
    const from = opts.from ? helper.shortenHexData(opts.from) : ''
    let to = opts.to
    if (data.to) to = to + ' ' + helper.shortenHexData(data.to)
    const val = data.value
    let hash = data.hash ? helper.shortenHexData(data.hash) : ''
    const input = data.input ? helper.shortenHexData(data.input) : ''
    const logs = data.logs && data.logs.decoded && data.logs.decoded.length ? data.logs.decoded.length : 0
    const block = data.receipt ? data.receipt.blockNumber : data.blockNumber || ''
    const i = data ? data.transactionIndex : data.transactionIndex
    const value = val ? typeConversion.toInt(val) : 0

    if (blockchain.getProvider() === 'vm') {
      return (
        <div>
          <span className='txLog_7Xiho'>
            <span className='tx'>[{vm}]</span>
            <div className='txItem'><span className='txItemTitle'>from:</span> {from}</div>
            <div className='txItem'><span className='txItemTitle'>to:</span> {to}</div>
            <div className='txItem'><span className='txItemTitle'>value:</span> {value} wei</div>
            <div className='txItem'><span className='txItemTitle'>data:</span> {input}</div>
            <div className='txItem'><span className='txItemTitle'>logs:</span> {logs}</div>
            <div className='txItem'><span className='txItemTitle'>hash:</span> {hash}</div>
          </span>
        </div>)
    } else if (blockchain.getProvider() !== 'vm' && data.resolvedData) {
      return (
        <div>
          <span className='txLog_7Xiho'>
            <span className='tx'>[block:${block} txIndex:${i}]</span>
            <div className='txItem'><span className='txItemTitle'>from:</span> {from}</div>
            <div className='txItem'><span className='txItemTitle'>to:</span> {to}</div>
            <div className='txItem'><span className='txItemTitle'>value:</span> {value} wei</div>
            <div className='txItem'><span className='txItemTitle'>data:</span> {input}</div>
            <div className='txItem'><span className='txItemTitle'>logs:</span> {logs}</div>
            <div className='txItem'><span className='txItemTitle'>hash:</span> {hash}</div>
          </span>
        </div>)
    } else {
      to = helper.shortenHexData(to)
      hash = helper.shortenHexData(data.blockHash)
      return (
        <div>
          <span className='txLog'>
            <span className='tx'>[block:${block} txIndex:${i}]</span>
            <div className='txItem'><span className='txItemTitle'>from:</span> {from}</div>
            <div className='txItem'><span className='txItemTitle'>to:</span> {to}</div>
            <div className='txItem'><span className='txItemTitle'>value:</span> {value} wei</div>
          </span>
        </div>)
    }
  }

  const txDetails = (event, tx, obj) => {
    if (showTableDetails === null) {
      setShowTableDetails(true)
      console.log({tx: tx.hash})
    } else {
      setShowTableDetails(null)
    }
    // if (showTableDetails.length === 0) {
    //   setShowTableDetails([{ hash: tx.hash, show: true }])
    // }
    // const id = showTableDetails.filter(x => x.hash !== tx.hash)
    // if ((showTableDetails.length !== 0) && (id[0] === tx.hash)) {
    //   setShowTableDetails(currentState => ([...currentState, { hash: tx.hash, show: false }]))
    // }
    // console.log((showTableDetails.length !== 0) && (id[0] === tx.hash))
    // console.log({ showTableDetails }, ' clicked button')
  }

  const showTable = (opts) => {
    let msg = ''
    let toHash
    const data = opts.data // opts.data = data.tx
    if (data.to) {
      toHash = opts.to + ' ' + data.to
    } else {
      toHash = opts.to
    }
    let callWarning = ''
    if (opts.isCall) {
      callWarning = '(Cost only applies when called by a contract)'
    }
    if (!opts.isCall) {
      if (opts.status !== undefined && opts.status !== null) {
        if (opts.status === '0x0' || opts.status === false) {
          msg = ' Transaction mined but execution failed'
        } else if (opts.status === '0x1' || opts.status === true) {
          msg = ' Transaction mined and execution succeed'
        }
      } else {
        msg = ' Status not available at the moment'
      }
    }

    let stringified = ' - '
    if (opts.logs && opts.logs.decoded) {
      stringified = typeConversion.stringify(opts.logs.decoded)
    }
    const val = opts.val != null ? typeConversion.toInt(opts.val) : 0
    return (
      <table className='txTable' id='txTable' data-id={`txLoggerTable${opts.hash}`}>
        <tr className='tr'>
          <td className='td' data-shared={`key_${opts.hash}`}> status </td>
          <td className='td' data-id={`txLoggerTableStatus${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts.status}{msg}</td>
        </tr>
        <tr className='tr'>
          <td className='td' data-shared={`key_${opts.hash}`}> transaction hash </td>
          <td className='td' data-id={`txLoggerTableHash${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts.hash}
            <CopyToClipboard content={opts.hash}/>
          </td>
        </tr>
        {
          opts.contractAddress && (
            <tr className='tr'>
              <td className='td' data-shared={`key_${opts.hash}`}> contract address </td>
              <td className='td' data-id={`txLoggerTableContractAddress${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts.contractAddress}
                <CopyToClipboard content={opts.contractAddress}/>
              </td>
            </tr>
          )
        }
        {
          opts.from && (
            <tr className='tr'>
              <td className='td tableTitle' data-shared={`key_${opts.hash}`}> from </td>
              <td className='td' data-id={`txLoggerTableFrom${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts.from}
                <CopyToClipboard content={opts.from}/>
              </td>
            </tr>
          )
        }
        {
          opts.to && (
            <tr className='tr'>
              <td className='td' data-shared={`key_${opts.hash}`}> to </td>
              <td className='td' data-id={`txLoggerTableTo${opts.hash}`} data-shared={`pair_${opts.hash}`}>{toHash}
                <CopyToClipboard content={data.to ? data.to : toHash}/>
              </td>
            </tr>
          )
        }
        {
          opts.gas && (
            <tr className='tr'>
              <td className='td' data-shared={`key_${opts.hash}`}> gas </td>
              <td className='td' data-id={`txLoggerTableGas${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts.gas} gas
                <CopyToClipboard content={opts.gas}/>
              </td>
            </tr>
          )
        }
        {
          opts.transactionCost && (
            <tr className='tr'>
              <td className='td' data-shared={`key_${opts.hash}`}> transaction cost </td>
              <td className='td' data-id={`txLoggerTableTransactionCost${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts.transactionCost} gas {callWarning}
                <CopyToClipboard content={opts.transactionCost}/>
              </td>
            </tr>
          )
        }
        {
          opts.executionCost && (
            <tr className='tr'>
              <td className='td' data-shared={`key_${opts.hash}`}> execution cost </td>
              <td className='td' data-id={`txLoggerTableExecutionHash${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts.executionCost} gas {callWarning}
                <CopyToClipboard content={opts.executionCost}/>
              </td>
            </tr>
          )
        }
        {opts.hash && (
          <tr className='tr'>
            <td className='td' data-shared={`key_${opts.hash}`}> hash </td>
            <td className='td' data-id={`txLoggerTableHash${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts.hash}
              <CopyToClipboard content={opts.hash}/>
            </td>
          </tr>
        )}
        {opts.input && (
          <tr className='tr'>
            <td className='td' data-shared={`key_${opts.hash}`}> input </td>
            <td className='td' data-id={`txLoggerTableHash${opts.hash}`} data-shared={`pair_${opts.hash}`}>{helper.shortenHexData(opts.input)}
              <CopyToClipboard content={opts.input}/>
            </td>
          </tr>
        )}
        {opts['decoded input'] && (
          <tr className='tr'>
            <td className='td' data-shared={`key_${opts.hash}`}> decode input </td>
            <td className='td' data-id={`txLoggerTableHash${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts['decoded input']}
              <CopyToClipboard content={opts['decoded input']}/>
            </td>
          </tr>
        )}
        {opts['decoded output'] && (
          <tr className='tr'>
            <td className='td' data-shared={`key_${opts.hash}`}> decode output </td>
            <td className='td' data-id={`txLoggerTableHash${opts.hash}`} data-shared={`pair_${opts.hash}`}>{opts['decoded output']}
              <CopyToClipboard content={opts['decoded output']}/>
            </td>
          </tr>
        )}
        {opts.logs && (
          <tr className='tr'>
            <td className='td' data-shared={`key_${opts.hash}`}> logs </td>
            <td className='td' data-id={`txLoggerTableHash${opts.hash}`} data-shared={`pair_${opts.hash}`}>
              {JSON.stringify(stringified, null, '\t')}
              <CopyToClipboard content={JSON.stringify(stringified, null, '\t')}/>
              <CopyToClipboard content={JSON.stringify(opts.logs.raw || '0')}/>
            </td>
          </tr>
        )}
        {opts.val && (
          <tr className='tr'>
            <td className='td' data-shared={`key_${opts.hash}`}> val </td>
            <td className='td' data-id={`txLoggerTableHash${opts.hash}`} data-shared={`pair_${opts.hash}`}>{val} wei
              <CopyToClipboard content={`${val} wei`}/>
            </td>
          </tr>
        )}
      </table>
    )
  }

  const debug = (event, tx) => {
    event.stopPropagation()
    if (tx.isCall && tx.envMode !== 'vm') {
      console.log('start debugging')
      return (<ModalDialog
        hide={false}
        handleHide={() => {} }
        message="Cannot debug this call. Debugging calls is only possible in JavaScript VM mode."
      />)
    } else {
      props.event.trigger('debuggingRequested', [tx.hash])
      console.log('trigger ', { tx: props.event.trigger })
    }
  }

  const renderKnownTransactions = (tx, receipt, index) => {
    const from = tx.from
    const to = tx.to
    const obj = { from, to }
    const showDetails = showTableDetails === tx.from
    const txType = 'unknown' + (tx.isCall ? 'Call' : 'Tx')
    return (
      <span id={`tx${tx.hash}`} key={index}>
        <div className="log" onClick={(event) => txDetails(event, tx, obj)}>
          {/* onClick={e => txDetails(e, tx, data, obj)} */}
          {checkTxStatus(receipt || tx, txType)}
          {context({ from, to, tx }, props.blockchain)}
          <div className='buttons'>
            <div className='debug btn btn-primary btn-sm' onClick={(event) => debug(event, tx)}>Debug</div>
          </div>
          <i className = {`arrow fas ${(showDetails) ? 'fa-angle-up' : 'fa-angle-down'}`}></i>
        </div>
        {showTableDetails ? showTable({
          hash: tx.hash,
          status: receipt !== null ? receipt.status : null,
          isCall: tx.isCall,
          contractAddress: tx.contractAddress,
          data: tx,
          from,
          to,
          gas: tx.gas,
          input: tx.input,
          'decoded input': tx.resolvedData && tx.resolvedData.params ? JSON.stringify(typeConversion.stringify(tx.resoparams), null, '\t') : ' - ',
          'decoded output': tx.resolvedData && tx.resolvedData.decodedReturnValue ? JSON.stringify(typeConversion.stringify(tx.resolvedData.decodedReturnValue), null, '\t') : ' - ',
          logs: tx.logs,
          val: tx.value,
          transactionCost: tx.transactionCost,
          executionCost: tx.executionCost
        }) : null}
      </span>
    )
  }

  const handleAutoComplete = () => (
    <div className='popup alert alert-secondary' style={{ display: autoCompletState.showSuggestions && autoCompletState.userInput !== '' ? 'block' : 'none' }}>
      <div>
        {autoCompletState.data._options.map((item, index) => {
          return (
            <div key={index} data-id="autoCompletePopUpAutoCompleteItem" className={`autoCompleteItem listHandlerShow item ${autoCompletState.data._options[autoCompletState.activeSuggestion] === item ? 'border border-primary selectedOptions' : ''}`} onKeyDown={ handleSelect }>
              <div>
                {getKeyOf(item)}
              </div>
              <div>
                {getValueOf(item)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
  /* end of autoComplete */

  return (
    <div style={{ height: '323px', flexGrow: 1 }} className='panel_2A0YE0'>
      {console.log({ newstate })}
      {console.log({ props })}
      <div className="bar_2A0YE0">
        {/* ${self._view.dragbar} */}
        <div className="dragbarHorizontal" onMouseDown={mousedown} id='dragId'></div>
        <div className="menu_2A0YE0 border-top border-dark bg-light" data-id="terminalToggleMenu">
          {/* ${self._view.icon} */}
          <i className={`mx-2 toggleTerminal_2A0YE0 fas ${toggleDownUp}`} data-id="terminalToggleIcon" onClick={ handleMinimizeTerminal }></i>
          <div className="mx-2 console" id="clearConsole" data-id="terminalClearConsole" onClick={handleClearConsole} >
            <i className="fas fa-ban" aria-hidden="true" title="Clear console"
            ></i>
          </div>
          {/* ${self._view.pendingTxCount} */}
          <div className="mx-2" title='Pending Transactions'>0</div>
          <div className="verticalLine_2A0YE0"></div>
          <div className="pt-1 h-80 mx-3 align-items-center listenOnNetwork_2A0YE0 custom-control custom-checkbox">
            <input
              className="custom-control-input"
              id="listenNetworkCheck"
              onChange={listenOnNetwork}
              type="checkbox"
              title="If checked Remix will listen on all transactions mined in the current environment and not only transactions created by you"
            />
            <label
              className="pt-1 form-check-label custom-control-label text-nowrap"
              title="If checked Remix will listen on all transactions mined in the current environment and not only transactions created by you"
              htmlFor="listenNetworkCheck"
            >
              listen on network
            </label>
          </div>
          <div className="search_2A0YE0">
            <i className="fas fa-search searchIcon_2A0YE0 bg-light" aria-hidden="true"></i>
            {/* ${self._view.inputSearch} */}
            <input
              // spellcheck = "false"
              onChange={(event) => setSearchInput(event.target.value) }
              type="text"
              className="border filter_2A0YE0 form-control"
              id="searchInput"
              // onkeydown=${filter}
              placeholder="Search with transaction hash or address"
              data-id="terminalInputSearch" />
          </div>
        </div>
      </div>
      <div tabIndex={-1} className="terminal_container_2A0YE0" data-id="terminalContainer" >
        {
          handleAutoComplete()
        }
        <div data-id="terminalContainerDisplay" style = {{
          position: 'absolute',
          height: '100',
          width: '100',
          opacity: '0.1',
          zIndex: -1
        }}></div>
        <div className="terminal_2A0YE0">
          <div id="journal" className="journal_2A0YE0" data-id="terminalJournal">
            {newstate.journalBlocks && newstate.journalBlocks.map((x, index) => {
              if (x.name === 'emptyBlock') {
                return (
                  <div className="px-4 block_2A0YE0" data-id="block_null" key={index}>
                    <span className='txLog'>
                      <span className='tx'><div className='txItem'>[<span className='txItemTitle'>block:{x.message} - </span> 0 {'transactions'} ] </div></span></span>
                  </div>
                )
              } else if (x.name === 'unknownTransaction' || x.name === 'knownTransaction') {
                return x.message.filter(x => x.tx.hash.includes(searchInput) || x.tx.from.includes(searchInput) || x.tx.to.includes(searchInput)).map((trans) => {
                  return (<div className='px-4 block_2A0YE0' data-id={`block_tx${trans.tx.hash}`}> {renderKnownTransactions(trans.tx, trans.receipt, index)} </div>)
                })
              } else {
                return (
                  <div className="px-4 block_2A0YE0" data-id="block_null" key={index}>
                    <span className={x.style}>{x.message}</span>
                  </div>
                )
              }
            })}
            <div className="anchor">
              {/* ${background} */}
              <div className="overlay background"></div>
              {/* ${text} */}
              <div className="overlay text"></div>
            </div>
          </div>
          <div id="terminalCli" data-id="terminalCli" className="cli_2A0YE0" onClick={focusinput}>
            <span className="prompt_2A0YE0">{'>'}</span>
            <input className="input_2A0YE0" ref={inputEl} spellCheck="false" contentEditable="true" id="terminalCliInput" data-id="terminalCliInput" onChange={(event) => onChange(event)} onKeyDown={(event) => handleKeyDown(event) } value={autoCompletState.userInput}></input>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RemixUiTerminal