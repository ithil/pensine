import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Editor from '../views/Editor.vue'
import Stack from '../views/Stack.vue'
import Insert from '../views/Insert.vue'
import NewNote from '../views/NewNote.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'Home', // tab title
      icon: 'icon-home',
      // tabClass: 'custom-tab', // custom class, optional
      tips: 'This is a tab', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    path: '/editor/:id',
    name: 'Editor',
    component: Editor,
    meta: {
      title: 'Editor', // tab title
      icon: 'icon-file-text',
      key: 'path',
      tips: 'This is a tab', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    path: '/inbox',
    name: 'Inbox',
    meta: {
      title: 'Inbox',
      icon: 'icon-inbox',
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
      icon: 'icon-layers',
      key: 'path',
      tips: 'This is a tab', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    path: '/insert/:id',
    name: 'Insert',
    component: Insert,
    meta: {
      title: 'Insert', // tab title
      icon: 'icon-download',
      key: 'path',
      tips: 'This is a tab', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    path: '/new-note/:label',
    name: 'New Note',
    component: NewNote,
    meta: {
      title: 'New Note', // tab title
      icon: 'icon-file-plus',
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
