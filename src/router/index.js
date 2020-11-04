import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Editor from '../views/Editor.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'Home', // tab title
      // icon: 'icon-user', // tab icon, optional
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
      key: 'path',
      tips: 'This is a tab', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    path: '/editor',
    name: 'Editor',
    component: Editor,
    meta: {
      title: 'Editor', // tab title
      tips: 'This is a tab', // tab tooltip, optional. defaults to `meta.title`
      closable: true // is tab closable, defaults to `true`
    },
  },
  {
    path: '/inbox',
    name: 'Inbox',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/Inbox.vue'),
  }
]

const router = new VueRouter({
  routes
})

export default router
