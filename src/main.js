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

const config = new Store()

Vue.config.productionTip = false
Vue.prototype.$global = {
  config: config,
  pensieve: pensieve,
}

const store = new Vuex.Store({
  state: {
    currentNoteCollection: (function() {
      var col = new pensieve.NoteCollection(config.get('currentNoteCollection'))
      col.watch()
      return col
    })(),
    currentNote: null,
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
    },
    fleetingNoteForInsertion: null,
  },
  mutations: {
    changeCurrentNoteCollection(state, nc) {
      state.currentNoteCollection.unwatch()
      state.currentNoteCollection = nc
      state.currentNoteCollection.watch()
    },
    setCurrentNote(state, note) {
      state.currentNote = note
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
