<template>
  <div id="app">
    <div id="titlebar" @dblclick="minimizeWindow">
      <div class="title">
        {{title}}
      </div>
      <div class="uncommitedChanges" v-if="uncommitedChanges">
        <svg height="20" width="20">
          <circle cx="10" cy="10" r="5" stroke="none" stroke-width="3" fill="cornflowerblue" />
        </svg>
      </div>
    </div>
    <splitpanes style="height: calc(100vh - 22px)" @resize="paneSize = $event[0].size">
      <pane :size="paneSize" id="navbar">
        <nav-bar></nav-bar>
      </pane>
      <pane :size="100-paneSize" style="overflow:hidden;">
        <!-- <router-view :key="$route.fullPath"/> -->
        <router-tab lang="en"/>
        <div id="statusBar">
          <portal-target name="statusBarLeft" class="statusBarLeft" multiple />
          <portal-target name="statusBarRight" class="statusBarRight" multiple />
        </div>
      </pane>
    </splitpanes>

    <div id="modals">
      <select-list :items="cmdsToListItems(commands)" ref="commandPalette">
      </select-list>

      <select-list :items="allNotes" ref="openNote">
      </select-list>

      <select-list
      :items="$store.state.customSelectListItems"
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
import { ipcRenderer } from 'electron'
import { bus } from './main'

export default {
  components: {
    Splitpanes,
    Pane,
    NavBar,
    Modal,
    SelectList,
    TextPrompt,
  },
  data() {
    return {
      paneSize: 20,
      uncommitedChanges: false,
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
    allNotes() {
      var allNotes = []
      for (let n of this.$store.state.currentNoteCollection.allNotes) {
        allNotes.push({
          label: n.label,
          iconClasses: ['feather-icon', 'icon-file-text'],
          action: () => {
            this.$router.push(`/editor/${n.id}`).catch(err => {
              // Ignore the vuex err regarding  navigating to the page they are already on.
              if (
                err.name !== 'NavigationDuplicated' &&
                !err.message.includes('Avoided redundant navigation to current location')
              ) {
                // But print any other errors to the console
                console.error(err)
              }
            })
            // this.$nextTick(() => {
            //   bus.$emit('openNote', n)
            // })
          },
        })
      }
      return allNotes
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
      },
    })
    this.$store.commit('registerCommand', {
      name: 'main:quit',
      label: 'Quit',
      action: () => {
        ipcRenderer.send('quit')
      },
    })
    this.$store.commit('registerCommand', {
      name: 'editor:focus',
      label: 'Focus Editor',
      action: () => {
        bus.$emit('focusEditor')
      },
    })
    ipcRenderer.on('addExistingCollection' , (event, data) => {
      this.$refs.addExistingCollection.open()
    })
    ipcRenderer.send('updateColMenuItems', this.$global.config.get('collections', {}))
    ipcRenderer.on('changeCurrentNoteCollection' , (event, data) => {
      this.$store.commit('changeCurrentNoteCollection', new this.$global.pensieve.NoteCollection(data.path))
      this.$global.config.set('currentNoteCollection', data.path)
      bus.$emit('noteCollectionChanged')
    })
    ipcRenderer.on('openCommandPalette' , (event, data) => {
      this.$refs.commandPalette.open()
    })
    ipcRenderer.on('openNoteModal' , (event, data) => {
      this.$refs.openNote.open()
    })
    ipcRenderer.on('newNote' , (event, data) => {
      this.newNote()
    })
    ipcRenderer.on('closeTab' , (event, data) => {
      this.$tabs.close()
    })
    ipcRenderer.on('toggleNavBar' , (event, data) => {
      this.toggleNavBar()
    })
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('noteChange', this.updateRepoStatus)
    collection.events.on('noteAdd', this.updateRepoStatus)
    collection.events.on('noteDelete', this.updateRepoStatus)
    this.updateRepoStatus()
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('noteChange', this.updateRepoStatus)
    collection.events.removeListener('noteAdd', this.updateRepoStatus)
    collection.events.removeListener('noteDelete', this.updateRepoStatus)
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
    addExistingCollection(p) {
      console.log('Path: ', p)
      var config = this.$global.config
      try {
        var collection = new this.$global.pensieve.NoteCollection(p)
        var cols = config.get('collections', {})
        if(cols.hasOwnProperty(collection.path)) {
          console.error(`${collection.path} had already been added`)
        }
        else {
          cols[collection.path] = {
            name: collection.collectionJson.name,
            path: collection.path,
          }
          config.set('collections', cols)
        }
        ipcRenderer.send('updateColMenuItems', config.get('collections', {}))
      }
      catch (e) {
        console.error(e)
      }

    },
    newNote() {
      var collection = this.$store.state.currentNoteCollection
      var $this = this
      this.$store.commit('triggerCustomTextPrompt', {
        message: `What should be the label of your new note?`,
        action: (label) => {
          setTimeout(() => {
          this.$store.commit('triggerCustomTextPrompt', {
            message: `What should be the tags of your new note ${label}?`,
            action: (tags) => {
              setTimeout(() => {
              this.$store.commit('triggerCustomTextPrompt', {
                message: `What should be the category of your new note ${label}?`,
                action: (category) => {
                  var note = collection.newNote(label)
                  note.addTags(tags.split(',').filter(x => x != '').map(x => x.trim()))
                  note.save()
                  if (category) {
                    collection.categorize(note, category)
                  }
                  $this.$router.push(`/editor/${note.id}`).catch(err => {
                    // Ignore the vuex err regarding  navigating to the page they are already on.
                    if (
                      err.name !== 'NavigationDuplicated' &&
                      !err.message.includes('Avoided redundant navigation to current location')
                    ) {
                      // But print any other errors to the console
                      console.error(err)
                    }
                  })
                }
              })
            }, 50)
            }
          })
        }, 50)
        }
      })
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
@import '../node_modules/feather-webfont/dist/feather-icons.css';
$status-bar-height: 24px;

body {
  overflow: hidden;
  margin: 0;
}

#titlebar {
  -webkit-user-select: none;
  -webkit-app-region: drag;
  background-color: #1d1f21;
  color: #aaa;
  height: 22px;
  padding-left: 68px;
  padding-right: 68px;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: content-box;
  font-size: 13px;
  font-family: 'Lucida Grande';
  background-color: #292c2f;
  border-bottom: 1px solid rgba(0, 0, 0, 0.5);
  transition: margin-top 160ms;
  position: relative;
  .title {
    position: absolute;
    flex: 0 1 auto;
    left: 50%;
  }
  .uncommitedChanges {
    flex: 0 1 auto;
    margin-left: auto;
  }
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
  // padding-left: 11px;
  height: $status-bar-height;
}

.statusBarLeft {
  flex-grow: 1;
}

.statusBarLeft > * {
  margin-right: 5px;
}

.statusBarRight > * {
  margin-left: 5px;
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

.splitpanes__pane {
  overflow: scroll;
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
  // border-left:1px solid #eee;
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
  // border-top:1px solid #eee;
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
  background-color: rgba(42, 42, 42, 0.5);
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb:window-inactive,
::-webkit-scrollbar-thumb {
  background: rgba(92, 92, 92, 0.5);
  border-radius: 5px;
  box-shadow: 0 0 1px black inset;
}

::-webkit-scrollbar-corner {
  background-color: rgba(42, 42, 42, 0.5);
}

</style>
