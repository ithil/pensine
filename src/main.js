import Vue from 'vue'
import Vuex from 'vuex'
import pensieve from 'pensieve'
import App from './App.vue'
import router from './router'
import Store from 'electron-store'
import RouterTab from 'vue-router-tab'
import PortalVue from 'portal-vue'

Vue.use(Vuex)
Vue.use(RouterTab)
Vue.use(PortalVue)

const config = new Store()

Vue.config.productionTip = false
Vue.prototype.$global = {
  config: config,
  pensieve: pensieve,
}

const store = new Vuex.Store({
  state: {
    currentNoteCollection: new pensieve.NoteCollection(config.get('currentNoteCollection')),
    currentNote: null,
    commands: [],
  },
  mutations: {
    changeCurrentNoteCollection(state, nc) {
      state.currentNoteCollection = nc
    },
    setCurrentNote(state, note) {
      state.currentNote = note
    },
    registerCommand(state, cmd) {
      if (state.commands.findIndex(c => c.name == cmd.name) == -1) {
        state.commands.push(cmd)
      }
    }
  }
})

export const bus = new Vue()
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
