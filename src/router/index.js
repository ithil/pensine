import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Stack from '../views/Stack.vue'
import NotePage from '../views/NotePage.vue'
import NodeExplorer from '../views/NodeExplorer.vue'
import Search from '../views/Search.vue'

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
    path: '/stacks',
    name: 'Stack',
    component: () => import(/* webpackChunkName: "stacks" */ '../views/Stacks.vue'),
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
    path: '/search',
    name: 'Search',
    component: Search,
    meta: {
      title: 'Search', // tab title
      icon: 'Search',
      iconColor: '#6495ed',
      key: 'path',
      tips: 'Search', // tab tooltip, optional. defaults to `meta.title`
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
    path: '/note/:name(.*)',
    name: 'Note Page',
    alias: '/n/:name(.*)',
    component: NotePage,
    meta: {
      title: 'Note Page', // tab title
      icon: 'FileText',
      iconColor: '#000',
      iconBackground: '#fbe1e1',
      key: 'path',
      tips: 'Note Page', // tab tooltip, optional. defaults to `meta.title`
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
