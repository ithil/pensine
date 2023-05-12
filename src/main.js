import { shell } from'electron'
import Vue from 'vue'
import Vuex from 'vuex'
import pensieve from 'pensieve'
import App from './App.vue'
import router from './router'
import Store from 'electron-store'
import RouterTab from 'vue-router-tab'
import PortalVue from 'portal-vue'
import {VueMasonryPlugin} from 'vue-masonry'
import $ from 'jquery'
import path from 'path'

Vue.use(Vuex)
Vue.use(RouterTab)
Vue.use(PortalVue)
Vue.use(VueMasonryPlugin)

import CodeMirror from 'codemirror'
CodeMirror.Vim.defineAction('insertHighlight', (cm, actionArgs) => {
  var selection = cm.getSelection()
  var color = actionArgs.color ? ` .${actionArgs.color}` : ''
  cm.replaceSelection(`[${selection}]{{.hl${color}}}`)
})
CodeMirror.Vim.mapCommand('ghh', 'action', 'insertHighlight')
CodeMirror.Vim.mapCommand('ghr', 'action', 'insertHighlight', {color: 'red'})
CodeMirror.Vim.mapCommand('ghg', 'action', 'insertHighlight', {color: 'green'})
CodeMirror.Vim.mapCommand('ghb', 'action', 'insertHighlight', {color: 'blue'})
CodeMirror.Vim.defineAction('surroundEvenlyWith', (cm, actionArgs) => {
  var selection = cm.getSelection()
  var delimiter = actionArgs.delimiter
  cm.replaceSelection(`${delimiter}${selection}${delimiter}`)
})
CodeMirror.Vim.mapCommand('gfi', 'action', 'surroundEvenlyWith', {delimiter: '*'})
CodeMirror.Vim.mapCommand('gfb', 'action', 'surroundEvenlyWith', {delimiter: '**'})
CodeMirror.Vim.mapCommand('gfe', 'action', 'surroundEvenlyWith', {delimiter: '***'})
CodeMirror.Vim.mapCommand('gfs', 'action', 'surroundEvenlyWith', {delimiter: '~~'})
CodeMirror.Vim.mapCommand('gfc', 'action', 'surroundEvenlyWith', {delimiter: '`'})

const config = new Store()
// Important TODO: Put config in main process

Vue.config.productionTip = false
Vue.prototype.$global = {
  config: config,
  pensieve: pensieve,
}

const store = new Vuex.Store({
  state: {
    currentNoteCollection: (function() {
      var col = new pensieve.NoteCollection(
        config.get('defaultNoteCollection') || config.get('currentNoteCollection')
      )
      col.watch()
      return col
    })(),
    commands: [],
    title: 'Pensine',
    customSelectListItems: [{label: 'A'}],
    customSelectListFilter: (context) => {
      var $items = context.itemsWithIds
      var itemsFiltered = $items.filter(item => {
        return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
      })
      return itemsFiltered
    },
    showCustomSelectList: false,
    showCustomTextPrompt: false,
    showCustomPopoverList: false,
    customTextPromptProps: {
      message: '',
      placeholder: '',
      text: '',
      action: function() { },
      selection: [0, 0],
      selectAll: false,
      password: false,
    },
    customPopoverListItems: [{label: 'Something is not working!'}],
    customPopoverListMessage: 'Message N/A',
    customPopoverListOptions: {
      hintMode: false,
    },
    bag: [],
    monthPageGoToDate: null,
    monthPageGoToDateAccessed: null,
  },
  mutations: {
    changeCurrentNoteCollection(state, nc) {
      state.currentNoteCollection.unwatch()
      state.currentNoteCollection = nc
      state.currentNoteCollection.watch()
    },
    registerCommand(state, cmd) {
      if (state.commands.findIndex(c => c.name == cmd.name) == -1) {
        state.commands.push(cmd)
      }
    },
    setTitle(state, title) {
      state.title = title
      document.title = title
    },
    addToBag(state, notePath) {
      state.bag.push(notePath)
      state.bag = [...new Set(state.bag)]
    },
    removeFromBag(state, notePath) {
      state.bag = state.bag.filter(i => i != notePath)
    },
    emptyBag(state) {
      state.bag = []
    },
    setMonthPageGoToDate(state, date) {
      state.monthPageGoToDate = date
      state.monthPageGoToDateAccessed = false
    },
    setMonthPageGoToDateAsAccessed(state) {
      state.monthPageGoToDateAccessed = true
    },
    resetTitle(state) {
      state.title = 'Pensine'
      document.title = 'Pensine'
    },
    triggerCustomSelectList(state, {items, filter}) {
      state.customSelectListItems = items
      state.customSelectListFilter = filter || function (context) {
        var $items = context.itemsWithIds
        var itemsFiltered = $items.filter(item => {
          return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
        })
        return itemsFiltered
      }
      state.showCustomSelectList = true
    },
    closeCustomSelectList(state) {
      state.showCustomSelectList = false
    },
    triggerCustomTextPrompt(state, props) {
      state.customTextPromptProps = {
        message: props.message || '',
        placeholder: props.placeholder || '',
        text: props.text || '',
        action: props.action || function() { },
        selection: props.selection || [0, 0],
        selectAll: props.selectAll || false,
        password: props.password || false,
      }
      state.showCustomTextPrompt = true
    },
    triggerCustomPopoverList(state, {items, message, options}) {
      state.customPopoverListItems = items
      state.customPopoverListMessage = message || ''
      state.customPopoverListOptions = options || {}
      state.showCustomPopoverList = true
    },
    closeCustomPopoverList(state) {
      state.showCustomPopoverList = false
    },
    closeCustomTextPrompt(state) {
      state.showCustomTextPrompt = false
    },
    closeCustomSelectList(state) {
      state.showCustomSelectList = false
    },
  },
  action: {

  },
})


const bus = new Vue()

$(document).on('click', 'a[href^="http"]', function(event) {
   event.preventDefault()
   shell.openExternal(this.href)
 })

$(document).on('click', 'a[href^="/"]', function(event) {
   event.preventDefault()
   var url = new URL(this.href)
   bus.$emit('openRoute', url.pathname)
 })

$(document).on('click', 'a[href^="special"]', function(event) {
   event.preventDefault()
   var url = new URL(this.href)
   var parsedPath = path.parse(url.pathname)
   if (parsedPath.dir == '//tag') {
     bus.$emit('filterTag', { tag: parsedPath.base })
   }
 })

$(document).on('mousemove', function(event) {
  globalThis.lastMousePosX = event.pageX
  globalThis.lastMousePosY = event.pageY
 })

export { bus }

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
