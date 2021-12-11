import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Stack from '../views/Stack.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'Home', // tab title
      icon: 'Home',
      // tabClass: 'custom-tab', // custom class, optional
      tips: 'Home', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    path: '/inbox',
    name: 'Inbox',
    meta: {
      title: 'Inbox',
      icon: 'Inbox',
      iconColor: '#fff',
      iconBackground: '#00abff',
      closable: true,
    },
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/Inbox.vue'),
  },
  {
    path: '/stacks/:name(.*)',
    name: 'Stack',
    component: Stack,
    meta: {
      title: 'Stack', // tab title
      icon: 'Layers',
      iconColor: '#fff',
      iconBackground: '#000',
      key: 'path',
      tips: 'Stack', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    meta: {
      key: 'path',
      tips: 'This is a tab', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    meta: {
      key: 'path',
      tips: 'This is a tab', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
]

const router = new VueRouter({
  routes
})

export default router
