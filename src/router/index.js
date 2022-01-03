import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Stack from '../views/Stack.vue'
import FleetingNotePage from '../views/FleetingNotePage.vue'
import NodeExplorer from '../views/NodeExplorer.vue'

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
    component: () => import(/* webpackChunkName: "inbox" */ '../views/Inbox.vue'),
  },
  {
    path: '/stacks',
    name: 'Stack',
    component: () => import(/* webpackChunkName: "inbox" */ '../views/Stacks.vue'),
    meta: {
      title: 'All Stacks', // tab title
      icon: 'Layers',
      iconColor: '#000',
      iconBackground: '#fff',
      key: 'path',
      tips: 'All Stacks', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
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
    path: '/fleetingnote/:name(.*)',
    name: 'Fleeting Note Page',
    alias: '/n/:name(.*)',
    component: FleetingNotePage,
    meta: {
      title: 'Fleeting Note Page', // tab title
      icon: 'FileText',
      iconColor: '#fff',
      iconBackground: 'darkseagreen',
      key: 'path',
      tips: 'Fleeting Note Page', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    path: '/nodeexplorer/:name(.*)',
    name: 'Node Explorer',
    component: NodeExplorer,
    meta: {
      title: 'Node Explorer', // tab title
      icon: 'LayoutList',
      iconColor: '#fff',
      iconBackground: 'orange',
      key: 'path',
      tips: 'Node Explorer', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
]

const router = new VueRouter({
  routes
})

export default router
