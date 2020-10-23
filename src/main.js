import Vue from 'vue'
import pensieve from 'pensieve'
import App from './App.vue'
import router from './router'
import Store from 'electron-store'

const config = new Store()

Vue.config.productionTip = false
Vue.prototype.$global = {
  config: config,
  pensieve: pensieve,
  currentNoteCollection: new pensieve.NoteCollection(config.get('currentNoteCollection')),
}

export const bus = new Vue()
new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
