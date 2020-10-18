import Vue from 'vue'
import pensieve from 'pensieve'
import App from './App.vue'
import router from './router'

Vue.config.productionTip = false
Vue.prototype.$pensieve = pensieve
Vue.prototype.$noteCollection = new pensieve.NoteCollection('/Users/janus/Coding/projects/pensieve/NoteCollection')

export const bus = new Vue()
new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
