<template>
  <div id="app" :data-collection="$store.state.currentNoteCollection.collectionJson.name">
    <splitpanes style="height: calc(100vh - 0px)" @resize="paneSize = $event[0].size">
      <pane :size="paneSize" id="navbar">
        <nav-bar></nav-bar>
      </pane>
      <pane :size="100-paneSize" style="overflow:hidden;">
        <router-tab
        lang="en"
        :tab-transition="{
          name: 'router-tab-slide',
          enterActiveClass: 'animate__animated animate__slideInLeft animate__faster',
          }"
        :page-transition="{
          name: 'router-page-slide',
          enterActiveClass: 'animate__animated animate__fadeIn animate__fast',
          }"
        append="next"
        >
            <template #start>
              <span class="router-tab__tabbar-left-space"></span>
            </template>
            <template #default="tab">
              <Popper
              :append-to-body="true"
              :options="{
                placement: 'bottom',
                modifiers: { offset: { offset: '0,10px' } }
                }">
                <div class="popper tabtip">
                  {{tab.tips}}
                </div>
                <span class="router-tab__item-wrapper" slot="reference" :class="tab.tabClass">
                  <Icon v-if="tab.icon" :name="tab.icon" class="router-tab__item-icon"
                  :style="{color: tab.data.iconColor || 'inherit', background: tab.data.iconBackground || 'none'}"
                  />

                  <span class="router-tab__item-title">
                    {{tab.title}}
                  </span>
                  <i
                  v-if="tab.closable"
                  class="router-tab__item-close"
                  @click.prevent="tab.close"
                  />
                </span>
              </Popper>
            </template>
            <template #end>
              <div class="router-tab__tabbar-right-space">
                <div class="currentNoteCollection" @click="collectionModal">
                  <Icon name="BookOpen" />
                  <span>{{$store.state.currentNoteCollection.collectionJson.name}}</span>
                </div>
              </div>
            </template>
          </router-tab>
        <div id="statusBar">
          <portal-target name="statusBarLeft" class="statusBarLeft" multiple />
          <portal-target name="statusBarRight" class="statusBarRight" multiple />
        </div>
        <portal to="statusBarLeft" :order="1">
          <span class="statusBarItem">{{$route.path}}</span>
        </portal>
      </pane>
    </splitpanes>

    <div id="modals">
      <select-list :items="cmdsToListItems(commands)" ref="commandPalette">
      </select-list>

      <select-list :items="openItems" :filter="openModalFilter" ref="openNote">
      </select-list>

      <select-list
      :items="$store.state.customSelectListItems"
      :filter="customSelectListFilter"
      ref="customSelectList"
      @close="$store.commit('closeCustomSelectList')"
      >
      </select-list>

      <text-prompt
      :message="customTextPromptProps.message"
      ref="customTextPrompt"
      :placeholder="customTextPromptProps.placeholder"
      :text="customTextPromptProps.text"
      :action="customTextPromptProps.action"
      :selection="customTextPromptProps.selection"
      :selectAll="customTextPromptProps.selectAll"
      :password="customTextPromptProps.password"
      @close="$store.commit('closeCustomTextPrompt')"
      >
      </text-prompt>

      <text-prompt
      message="Add existing Note Collection:"
      ref="addExistingCollection"
      placeholder="Path to Note Collection..."
      text=""
      :action="addExistingCollection"
      >
      </text-prompt>
    </div>

  </div>
</template>

<script>
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import NavBar from './components/NavBar.vue'
import Modal from './components/Modal.vue'
import SelectList from '@/components/SelectList.vue'
import TextPrompt from '@/components/TextPrompt.vue'
import "animate.css"
import Fuse from 'fuse.js'
import moment from 'moment'
import { ipcRenderer, shell } from 'electron'
import { bus } from './main'
import Icon from '@/components/Icon.vue'
import Popper from 'vue-popperjs';
import 'vue-popperjs/dist/vue-popper.css';

export default {
  components: {
    Splitpanes,
    Pane,
    NavBar,
    Modal,
    SelectList,
    TextPrompt,
    Icon,
    Popper,
  },
  data() {
    return {
      paneSize: 0,
      allStacks: [],
    }
  },
  watch: {
    showCustomSelectList: function (val) {
      if (val) {
        this.$refs.customSelectList.open()
      }
    },
    showCustomTextPrompt: function (val) {
      if (val) {
        this.$refs.customTextPrompt.open()
      }
    },
    '$store.state.currentNoteCollection': function(oldCollection, newCollection) {
      oldCollection.events.removeListener('stacksItemAdd', this.updateAllStacks)
      oldCollection.events.removeListener('stacksItemChange', this.updateAllStacks)
      oldCollection.events.removeListener('stacksItemDelete', this.updateAllStacks)
      this.$store.state.currentNoteCollection.events.on('stacksItemAdd', this.updateAllStacks)
      this.$store.state.currentNoteCollection.events.on('stacksItemChange', this.updateAllStacks)
      this.$store.state.currentNoteCollection.events.on('stacksItemDelete', this.updateAllStacks)
      this.updateAllStacks()
    }
  },
  computed: {
    title() {
      return this.$store.state.title
    },
    commands() {
      return this.$store.state.commands
    },
    showCustomSelectList() {
      return this.$store.state.showCustomSelectList
    },
    showCustomTextPrompt() {
      return this.$store.state.showCustomTextPrompt
    },
    customTextPromptProps() {
      return this.$store.state.customTextPromptProps
    },
    customSelectListFilter() {
      return this.$store.state.customSelectListFilter
    },
    openItems() {
      return [{
        label: 'Inbox',
        lucideIcon: 'Inbox',
        type: 'inbox',
        action: () => {
          this.$router.push(`/inbox/`).catch(err => {
            // Ignore the vuex err regarding  navigating to the page they are already on.
            if (
              err.name !== 'NavigationDuplicated' &&
              !err.message.includes('Avoided redundant navigation to current location')
            ) {
              // But print any other errors to the console
              console.error(err)
            }
          })
        },
      }].concat(this.allStacks)
    },
  },
  mounted() {
    document.title = this.title
    this.$store.commit('registerCommand', {
      name: 'collection:commit',
      label: 'Commit',
      action: () => {
        this.$store.state.currentNoteCollection.commit().then(() => {
          this.updateRepoStatus()
        })
      },
    })
    this.$store.commit('registerCommand', {
      name: 'bag:empty',
      label: 'Empty bag',
      action: () => {
        this.$store.commit('emptyBag')
      },
    })
    this.$store.commit('registerCommand', {
      name: 'main:quit',
      label: 'Quit',
      action: () => {
        ipcRenderer.send('quit')
      },
    })

    ipcRenderer.on('addExistingCollection' , (event, data) => {
      this.$refs.addExistingCollection.open()
    })
    ipcRenderer.on('setAsDefaultCollection' , (event, data) => {
      this.$global.config.set('defaultNoteCollection', this.$global.config.get('currentNoteCollection'))
    })
    ipcRenderer.send('updateColMenuItems', this.$global.config.get('collections', {}))
    ipcRenderer.on('changeCurrentNoteCollection' , (event, data) => {
      var $this = this
      this.openNoteCollection((collection) => {
        $this.$store.commit('changeCurrentNoteCollection', collection)
        $this.$global.config.set('currentNoteCollection', data.path)
        bus.$emit('noteCollectionChanged')
      }, data.path)
    })
    ipcRenderer.on('openCommandPalette' , (event, data) => {
      this.$refs.commandPalette.open()
    })
    ipcRenderer.on('openNoteModal' , (event, data) => {
      this.$refs.openNote.open()
    })
    ipcRenderer.on('collectionModal' , (event, data) => {
      this.collectionModal()
    })
    ipcRenderer.on('closeTab' , (event, data) => {
      this.$tabs.close()
    })
    ipcRenderer.on('toggleNavBar' , (event, data) => {
      this.toggleNavBar()
    })
    ipcRenderer.on('openInbox' , (event, data) => {
      this.$router.push('/inbox').catch(err => {
        // Ignore the vuex err regarding  navigating to the page they are already on.
        if (
          err.name !== 'NavigationDuplicated' &&
          !err.message.includes('Avoided redundant navigation to current location')
        ) {
          // But print any other errors to the console
          console.error(err)
        }
      })
    })
    bus.$on('newNote', (content) => {
      this.newNote(content)
    })
    bus.$on('openRoute', (route) => {
      console.log(route)
      this.$router.push(route).catch(err => {
        // Ignore the vuex err regarding  navigating to the page they are already on.
        if (
          err.name !== 'NavigationDuplicated' &&
          !err.message.includes('Avoided redundant navigation to current location')
        ) {
          // But print any other errors to the console
          console.error(err)
        }
      })
    })
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('stacksItemAdd', this.updateAllStacks)
    collection.events.on('stacksItemChange', this.updateAllStacks)
    collection.events.on('stacksItemDelete', this.updateAllStacks)
    this.updateAllStacks()
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('stacksItemAdd', this.updateAllStacks)
    collection.events.removeListener('stacksItemChange', this.updateAllStacks)
    collection.events.removeListener('stacksItemDelete', this.updateAllStacks)
  },
  methods: {
    cmdsToListItems(cmds) {
      return cmds.map(c => {
        return {
          label: c.label,
          hover: c.name,
          action: c.action,
        }
      })
    },
    openModalFilter(context) {
        var $items = context.itemsWithIds
        var typeFilter = null
        var searchString = context.searchString.toLowerCase()
        if (searchString.startsWith('.')) {
          typeFilter = 'note'
          searchString = searchString.slice(1)
        }
        else if (searchString.startsWith('-')) {
          typeFilter = 'stack'
          searchString = searchString.slice(1)
        }
        else if (searchString.startsWith('#')) {
          typeFilter = 'tag'
          searchString = searchString.slice(1)
        }
        var itemsFiltered = $items.filter(item => (typeFilter && item.type != typeFilter) ? false : true)
        if (searchString.length == 0) {
          return itemsFiltered
        }
        var fuse = new Fuse(itemsFiltered, {keys: ['label']})
        itemsFiltered = fuse.search(searchString).map(i => i.item)
        return itemsFiltered
    },
    updateAllStacks() {
      var $this = this
      var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
      var stacksList = []
      var getSubItemsOfStack = function (stack) {
        var fleetingNotes = stack.getContent().filter(i => !i.isStack)
        var fnList = []
        for (let fn of fleetingNotes) {
          let numberOfLinks = fn.relations.length
          fnList.push({
            label: fn.abstract,
            lucideIcon: 'FileText',
            description: `${numberOfLinks} relations`,
            description: `${numberOfLinks > 0 ? numberOfLinks+' relations – ' : ''}${moment(fn.date).format('DD.MM.YYYY')}`,
            type: 'fleetingNote',
            action: () => {
              var encodedPath = fn.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
              $this.$router.push(`/fleetingNote/${encodedPath}`).catch(err => {
                // Ignore the vuex err regarding  navigating to the page they are already on.
                if (
                  err.name !== 'NavigationDuplicated' &&
                  !err.message.includes('Avoided redundant navigation to current location')
                ) {
                  // But print any other errors to the console
                  console.error(err)
                }
              })
            },
            getSubItems: () => {
              return {
                newItems: getSubItemsOfFleetingNote(fn),
                newMessage: fn.abstract,
              }
            },
          })
        }
        return fnList
      }
      var getSubItemsOfFleetingNote = function (parentFn) {
        var relations = parentFn.relations
        if (relations.length < 1) {
          return false
        }
        var fnList = []
        for (let relation of relations) {
          let fn = relation.fn
          let numberOfLinks = fn.relations.length
          fnList.push({
            label: fn.abstract,
            lucideIcon: 'FileText',
            description: `${fn.stack || 'Inbox'} –${numberOfLinks > 0 ? ' '+numberOfLinks+' relations –' : ''}  ${moment(fn.date).format('DD.MM.YYYY')}`,
            type: 'fleetingNote',
            action: () => {
              var encodedPath = fn.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
              $this.$router.push(`/fleetingNote/${encodedPath}`).catch(err => {
                // Ignore the vuex err regarding  navigating to the page they are already on.
                if (
                  err.name !== 'NavigationDuplicated' &&
                  !err.message.includes('Avoided redundant navigation to current location')
                ) {
                  // But print any other errors to the console
                  console.error(err)
                }
              })
            },
            getSubItems: () => {
              return {
                newItems: getSubItemsOfFleetingNote(fn),
                newMessage: fn.abstract,
              }
            },
          })
        }
        var myStack = parentFn.collection.stacks.getStackByPath(parentFn.stack)
        fnList.push({
          label: myStack.relativePath,
          lucideIcon: 'Layers',
          description: 'Stack',
          type: 'stack',
          action: () => {
            $this.$router.push(`/stacks/${myStack.relativePath}`).catch(err => {
              // Ignore the vuex err regarding  navigating to the page they are already on.
              if (
                err.name !== 'NavigationDuplicated' &&
                !err.message.includes('Avoided redundant navigation to current location')
              ) {
                // But print any other errors to the console
                console.error(err)
              }
            })
          },
          getSubItems: () => {
            return {
              newItems: getSubItemsOfStack(myStack),
              newMessage: myStack.relativePath,
            }
          },
        })
        return fnList
      }
      for (let s of stacks) {
        stacksList.push({
          label: s.relativePath,
          lucideIcon: 'Layers',
          description: 'Stack',
          type: 'stack',
          action: () => {
            $this.$router.push(`/stacks/${s.relativePath}`).catch(err => {
              // Ignore the vuex err regarding  navigating to the page they are already on.
              if (
                err.name !== 'NavigationDuplicated' &&
                !err.message.includes('Avoided redundant navigation to current location')
              ) {
                // But print any other errors to the console
                console.error(err)
              }
            })
          },
          getSubItems: () => {
            return {
            newItems: getSubItemsOfStack(s),
            newMessage: s.relativePath,
            }
          },
        })
      }
      this.allStacks = stacksList
    },
    addExistingCollection(p) {
      var config = this.$global.config
      try {
        var cols = config.get('collections', {})
        this.openNoteCollection((collection) => {
          if(cols.hasOwnProperty(p)) {
            console.error(`${p} had already been added`)
          }
          else {
            cols[collection.path] = {
              name: collection.collectionJson.name,
              path: p,
            }
            config.set('collections', cols)
          }
          ipcRenderer.send('updateColMenuItems', config.get('collections', {}))
        }, p)
      }
      catch (e) {
        console.error(e)
      }

    },
    openNoteCollection(callback, dir=process.cwd()) {
      var $this = this
      try {
        const NoteCollection = $this.$global.pensieve.NoteCollection
        var openLoop = function(myRes) {
          if (myRes.status == 'openNoteCollection') {
            callback(myRes.collection)
          }
          else if (myRes.status == 'passwordRequired') {
            $this.$store.commit('triggerCustomTextPrompt', {
              message: `Password required for collection:`,
              password: true,
              action: (inputText) => {
                NoteCollection.open(dir, {password: inputText}, (res) => {
                  $this.$nextTick(function () {
                    setTimeout(function () { // This is just a dirty hack so I can go to bed
                      openLoop(res)
                    }, 5)
                  })
                })
              }
            })
          }
          else if (myRes.status == 'passwordIncorrect') {
            $this.$store.commit('triggerCustomTextPrompt', {
              message: `Wrong password! Try again:`,
              password: true,
              action: (inputText) => {
                NoteCollection.open(dir, {password: inputText}, (res) => {
                  $this.$nextTick(function () {
                    setTimeout(function () { // This is just a dirty hack so I can go to bed
                      openLoop(res)
                    }, 5)
                  })
                })
              }
            })
          }
        }
        // The problem lies here
        NoteCollection.open(dir, {}, (res) => {
          openLoop(res)
        })
      }
      catch (e) {
        this.errorHandler(e)
      }
    },
    errorHandler(err) {
      var logger = function(message) {
        console.error('Error: '+message)
      }
      if (err.name == 'noCollectionJson') {
        logger(err.message)
      }
      else if (err.name == 'existantCollectionJson') {
        logger(err.message)
      }
    },
            }
        }
      })
    collectionModal() {
      var collections = this.$global.config.get('collections', {})
      var $this = this
      var items = []
      for (let c of Object.keys(collections)) {
        items.push({
          label: collections[c].name,
          lucideIcon: 'Book',
          description: 'Collection',
          action:() => {
            $this.$nextTick(function () {
              setTimeout(function () { // This is just a dirty hack so I can go to bed
                $this.openNoteCollection((collection) => {
                  $this.$store.commit('changeCurrentNoteCollection', collection)
                  $this.$global.config.set('currentNoteCollection', collections[c].path)
                  bus.$emit('noteCollectionChanged')
                }, collections[c].path)
              }, 5)
            })
          }
        })
      }
      items = items.filter(i => i.label != this.$store.state.currentNoteCollection.name)
      this.$store.commit('triggerCustomSelectList', {items})
    },
    },
    updateRepoStatus() {
      this.$store.state.currentNoteCollection.checkForChangesAsync().then(status => {
        this.uncommitedChanges = status.length > 0
      })
    },
    toggleNavBar() {
      if (this.paneSize < 1) {
        this.paneSize = 20
      }
      else {
        this.paneSize = 0
      }
    },
    minimizeWindow() {
      console.log('Minimize!')
      ipcRenderer.send('minimizeWindow')
    },
  },
}
</script>

<style lang="scss">
$status-bar-height: 24px;

body {
  overflow: hidden;
  margin: 0;
}

#statusBar {
  display: flex;
  bottom: 0px;
  z-index: 3;
  font-family: 'Lucida Grande';
  font-size: 12px;
  background-color: #222527;
  color: white;
  width: 100%;
  padding: 2px;
  height: $status-bar-height;
}

.statusBarLeft {
  flex-grow: 1;
  margin-left: 10px;
}

.statusBarRight {
  margin-right: 10px;
}

.statusBarLeft > * {
  margin-right: 5px;
}

.statusBarRight > * {
  margin-left: 5px;
}

.statusBarItem {
  margin-left: 5px;
  &.bold {
    font-weight: bold;
  }
  &.clickable {
    cursor: pointer;
    user-select: none;
  }
  &:hover {
    text-decoration: underline;
  }
}

#navbar {
  background-color: #222527;
}

.navbar-tree {
  padding-top: 16px;
  padding-right: 5px;
  width: 100%;

  h1 {
    color: white;
  }
}

@import "./styles/router-tab.scss";

.router-tab {
  height: calc(100% - #{$status-bar-height});
}

.router-tab__item-icon{
  padding: 2px;
  border-radius: 3px;
}

.router-tab__item {
  color: #949494;
}

.router-tab__item-title {
  display: block;
}

.router-tab-page {
  min-height: -webkit-fill-available;
}

.router-tab__header {
  border-bottom: none;
  background: #292c2f4f;
  -webkit-app-region: drag;
}

.router-tab__tabbar-left-space {
  margin-left: 70px;
}

.router-tab__tabbar-right-space {
  margin: 6px;
  margin-right: 14px;
  font-size: 13px;
  .currentNoteCollection {
    display: flex;
    gap: 4px;
    background: #5e5e5e94;;
    border: 1px solid #5e5e5eeb;
    border-radius: 5px;
    padding: 3px 4px;
    color: #ecebeb;
    cursor: pointer;
  }
}

.router-tab__item {
  -webkit-app-region: no-drag;
  background: #ddddddc4;
  border-bottom: none;
  color: black;
  cursor: default;
  border-right: none;
  border-radius: 8px 8px 0px 0px;
  margin-right: 2px;
  padding: 0 10px;
  transition-duration: 0.1s;
  height: calc(100% - 2px);
  align-self: flex-end;
  .router-tab__item-wrapper {
    display: flex;
    align-items: center;
  }
  &.is-active {
    background: #f4f3f2;
    color: black;
    height: 100%;
  }
  &:hover:not(.is-active) {
    color: white;
    background-color: #a8a7a770;
  }
  .router-tab__item-close {
    border-radius: 2px;
    &:hover {
      color: black;
      background: #b9b9b963;
      &::after {
        background-color: black;
      }
      &::before {
        background-color: black;
      }
    }
}
}

.splitpanes__pane {
  overflow: hidden;
}
.splitpanes__splitter{
  -ms-touch-action:none;
  touch-action:none
}
.splitpanes--vertical>.splitpanes__splitter{
  min-width:1px;
  cursor:col-resize
}
.splitpanes--horizontal>.splitpanes__splitter{
  min-height:1px;
  cursor:row-resize
}
.splitpanes__splitter{
  background-color: rgba(42, 42, 42, 0.5);
  -webkit-box-sizing:border-box;
  box-sizing:border-box;
  position:relative;
  -ms-flex-negative:0;
  flex-shrink:0
}
.splitpanes__splitter:after,.splitpanes.default-theme .splitpanes__splitter:before{
  content:"";
  position:absolute;
  top:50%;
  left:50%;
  background-color:rgba(0,0,0,.15);
  -webkit-transition:background-color .3s;
  transition:background-color .3s
}
.splitpanes__splitter:hover:after,.splitpanes.default-theme .splitpanes__splitter:hover:before{
  background-color:rgba(0,0,0,.25)
}
.splitpanes__splitter:first-child{
  cursor:auto
}
.splitpanes .splitpanes__splitter{
  z-index:1
}
.splitpanes--vertical>.splitpanes__splitter,.splitpanes--vertical>.splitpanes__splitter{
  width:7px;
  margin-left:-1px
}
.splitpanes--vertical>.splitpanes__splitter:after,.default-theme .splitpanes--vertical>.splitpanes__splitter:after,.splitpanes--vertical>.splitpanes__splitter:before,.splitpanes--vertical>.splitpanes__splitter:before{
  -webkit-transform:translateY(-50%);
  transform:translateY(-50%);
  width:1px;
  height:30px
}
.splitpanes--vertical>.splitpanes__splitter:before,.splitpanes--vertical>.splitpanes__splitter:before{
  margin-left:-2px
}
.splitpanes--vertical>.splitpanes__splitter:after,.splitpanes--vertical>.splitpanes__splitter:after{
  margin-left:1px
}
.splitpanes--horizontal>.splitpanes__splitter,.splitpanes--horizontal>.splitpanes__splitter{
  height:7px;
  margin-top:-1px
}
.splitpanes--horizontal>.splitpanes__splitter:after,.default-theme .splitpanes--horizontal>.splitpanes__splitter:after,.default-theme.splitpanes--horizontal>.splitpanes__splitter:before,.default-theme .splitpanes--horizontal>.splitpanes__splitter:before{
  -webkit-transform:translateX(-50%);
  transform:translateX(-50%);
  width:30px;
  height:1px
}
.splitpanes--horizontal>.splitpanes__splitter:before,.splitpanes--horizontal>.splitpanes__splitter:before{
  margin-top:-2px
}
.splitpanes--horizontal>.splitpanes__splitter:after,.splitpanes--horizontal>.splitpanes__splitter:after{
  margin-top:1px
}


::-webkit-scrollbar {
  background-color: #2a2a2a24;
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb:window-inactive,
::-webkit-scrollbar-thumb {
  background: rgb(96, 96, 96);
  border-radius: 5px;
}

::-webkit-scrollbar-corner {
  background-color: rgba(42, 42, 42, 0.5);
}

.popper.tabtip {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  color: white;
  font-family: 'Lucida Grande';
  padding: 10px;
  box-shadow: none;
  border-radius: 10px;
  border-color: rgba(255, 255, 255, 0.5);
  .popper__arrow {
    border-color: transparent transparent black transparent;
  }
}

</style>
