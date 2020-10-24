import Vue from 'vue'
import Vuex from 'vuex'
import pensieve from 'pensieve'
import App from './App.vue'
import router from './router'
import Store from 'electron-store'

Vue.use(Vuex)

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
  },
  mutations: {
    changeCurrentNoteCollection(state, nc) {
      state.currentNoteCollection = nc
    },
    setCurrentNote(state, note) {
      state.currentNote = note
    }
  }
})

export const bus = new Vue()
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
