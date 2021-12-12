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
    customTextPromptProps: {
      message: '',
      placeholder: '',
      text: '',
      action: function() { },
      selection: [0, 0],
      selectAll: false,
      password: false,
    },
    fleetingNoteForInsertion: null,
    bag: [],
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
    addToBag(state, fleetingNotePath) {
      state.bag.push(fleetingNotePath)
      state.bag = [...new Set(state.bag)]
    },
    removeFromBag(state, fleetingNotePath) {
      state.bag = state.bag.filter(i => i != fleetingNotePath)
    },
    emptyBag(state) {
      state.bag = []
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
      }
      state.showCustomTextPrompt = true
    },
    closeCustomTextPrompt(state) {
      state.showCustomTextPrompt = false
    },
    setFleetingNoteForInsertion(state, fleetingNote) {
      state.fleetingNoteForInsertion = fleetingNote
    },
  }
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

export { bus }

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
