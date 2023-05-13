<template>
  <div id="app" :data-collection="$store.state.currentNoteCollection.collectionJson.name">
    <router-tab
    lang="en"
    append="next"
    :tabs="tabs"
    page-scroller=".router-alive"
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
            :style="{color: tab.data.iconColor || 'inherit', background: tab.data.iconBackground || 'none', '--iconBackground': tab.data.iconBackground || 'none'}"
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
       <span class="statusBarItem" @click="writeToClipboard($route.path)">{{decodeURIComponent($route.path)}}</span>
     </portal>

    <div id="modals">
      <select-list :items="cmdsToListItems(commands)" ref="commandPalette">
      </select-list>

      <select-list :items="openItems" :filter="openModalFilter" ref="openNote">
      </select-list>

      <popover-list ref="popoverList" :items="popoverListItems" message="Jump to" :options="{hintMode: false}">
      </popover-list>

      <popover-list
      ref="customPopoverList"
      :items="$store.state.customPopoverListItems"
      :message="$store.state.customPopoverListMessage"
      :options="$store.state.customPopoverListOptions"
      @close="$store.commit('closeCustomPopoverList')"
      >
      </popover-list>

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
import Modal from './components/Modal.vue'
import SelectList from '@/components/SelectList.vue'
import TextPrompt from '@/components/TextPrompt.vue'
import PopoverList from '@/components/PopoverList.vue'
import "animate.css"
import fuzzysort from 'fuzzysort'
import moment from 'moment'
import { ipcRenderer, shell, clipboard } from 'electron'
import { bus } from './main'
import Icon from '@/components/Icon.vue'
import Popper from 'vue-popperjs';
import 'vue-popperjs/dist/vue-popper.css';
import fs from 'fs'
import path from 'path'

export default {
  components: {
    Modal,
    SelectList,
    TextPrompt,
    PopoverList,
    Icon,
    Popper,
  },
  data() {
    return {
      allStacks: [],
      tabs: [
        '/',
      ],
    }
  },
  watch: {
    showCustomSelectList: function (val) {
      if (val) {
        var $this = this
        setTimeout(function () {
          $this.$refs.customSelectList.open()
        }, 5)
      }
    },
    showCustomTextPrompt: function (val) {
      if (val) {
        var $this = this
        setTimeout(function () {
          $this.$refs.customTextPrompt.open()
        }, 5)
      }
    },
    showCustomPopoverList: function (val) {
      if (val) {
        var $this = this
        setTimeout(function () {
          $this.$refs.customPopoverList.open()
        }, 5)
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
    showCustomPopoverList() {
      return this.$store.state.showCustomPopoverList
    },
    customTextPromptProps() {
      return this.$store.state.customTextPromptProps
    },
    customSelectListFilter() {
      return this.$store.state.customSelectListFilter
    },
    openItems() {
      return this.allStacks
    },
    popoverListItems() {
      return [
        {
          label: 'Inbox',
          lucideIcon: 'Inbox',
          key: 'I',
          action: () => {
            var inbox = this.$store.state.currentNoteCollection.stacks.getSpecialStack('inbox')
            this.$router.push(`/stacks/${inbox.relativePath}`).catch(err => {
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
        },
        {
          label: 'Stacks',
          lucideIcon: 'Layers',
          key: 'S',
          action: () => {
            var $this = this
            setTimeout(() => {
              var items = this.allStacks.filter(s => !s.label.startsWith('calendar'))
              this.$store.commit('triggerCustomPopoverList', {
                message: 'Stacks',
                items: items,
                options: {hintMode: true},
              })
            }, 50)
            return {returnFocus: false}
          },
        },
        {
          label: 'Bookmarks',
          lucideIcon: 'Bookmark',
          key: 'M',
          action: () => {
            var $this = this
            setTimeout(() => {
              var stacksPath = this.$store.state.currentNoteCollection.paths.stacks
              var bookmarksNote = this.$store.state.currentNoteCollection.getNoteByPath(`${stacksPath}/.internal/bookmarks.md`)
              var items = []
              if (bookmarksNote) {
                var notes = bookmarksNote.relations.map(r => r.note)
                for (let n of notes) {
                  items.push({
                    label: `${n.abstract}`,
                    lucideIcon: 'Bookmark',
                    action: () => {
                      var encodedPath = n.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
                      $this.$router.push(`/note/${encodedPath}`).catch(err => {
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
                  })
                }
              }
              items = items.concat([
                { role: 'separator' },
                {
                  label: 'Manage Bookmakrs',
                  action: () => {
                    var encodedPath = bookmarksNote.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
                    $this.$router.push(`/nodeexplorer/${encodedPath}`).catch(err => {
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
                },
              ])
              this.$store.commit('triggerCustomPopoverList', {
                message: `Bookmarks`,
                items: items,
                options: {hintMode: true},
              })
            }, 50)
            return {returnFocus: false}
          },
        },
        {
          label: 'Calendar',
          lucideIcon: 'Calendar',
          key: 'C',
          action: () => {
            var $this = this
            setTimeout(() => {
              var stack = this.$store.state.currentNoteCollection.stacks.getStackByPath('calendar')
              var content = stack.getContent()
              var substacks = content.filter(i => i.isStack)
              var items = []
              if (stack) {
                for (let s of substacks) {
                  items.push({
                    label: `${s.name}`,
                    lucideIcon: 'Calendar',
                    action: () => {
                      setTimeout(() => {
                        var yearContent = s.getContent()
                        var monthStacks = yearContent.filter(i => i.isStack)
                        var monthItems = []
                        for (let m of monthStacks) {
                          let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                          monthItems.push({
                            label: isNaN(m.name) ? m.name : months[m.name-1],
                            lucideIcon: 'CalendarDays',
                            action: () => {
                              setTimeout(() => {
                                var monthContent = m.getContent()
                                var dayNotes = monthContent.filter(i => !i.isStack)
                                var dayItems = []
                                for (let n of dayNotes) {
                                  dayItems.push({
                                    label: `${n.abstract}`,
                                    action: () => {
                                      var encodedPath = n.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
                                      $this.$router.push(`/note/${encodedPath}`).catch(err => {
                                        // Ignore the vuex err regarding  navigating to the page they are already on.
                                        if (
                                          err.name !== 'NavigationDuplicated' &&
                                          !err.message.includes('Avoided redundant navigation to current location')
                                        ) {
                                          // But print any other errors to the console
                                          console.error(err)
                                        }
                                      })
                                      return {returnFocus: false}
                                    },
                                  })
                                  $this.$store.commit('triggerCustomPopoverList', {
                                    message: `${isNaN(m.name) ? m.name : months[m.name-1]} ${s.name}`,
                                    items: dayItems,
                                    options: {hintMode: true},
                                  })
                                }
                              }, 50)
                              return {returnFocus: false}
                            },
                          })
                        }
                        $this.$store.commit('triggerCustomPopoverList', {
                          message: `${s.name}`,
                          items: monthItems,
                          options: {hintMode: true},
                        })
                      }, 50)
                      return {returnFocus: false}
                    },
                  })
                }
              }
              this.$store.commit('triggerCustomPopoverList', {
                message: `Years`,
                items: items,
                options: {hintMode: true},
              })
            }, 50)
            return {returnFocus: false}
          },
        },
        {
          label: 'Tags',
          lucideIcon: 'Tags',
          key: 'T',
          action: () => {
            var $this = this
            setTimeout(() => {
              var stack = this.$store.state.currentNoteCollection.stacks.getStackByPath('tags')
              var items = []
              if (stack) {
                var notes = stack.getContent().filter(i => !i.isStack).sort((a,b) => b.numberOfRelations - a.numberOfRelations)
                for (let n of notes) {
                  items.push({
                    label: `${n.abstract} (${n.numberOfRelations})`,
                    lucideIcon: 'Tag',
                    action: () => {
                      var encodedPath = n.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
                      $this.$router.push(`/note/${encodedPath}`).catch(err => {
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
                  })
                }
              }
              this.$store.commit('triggerCustomPopoverList', {
                message: `Tags`,
                items: items,
                options: {hintMode: true},
              })
            }, 50)
            return {returnFocus: false}
          },
        },
        {
          label: 'Find',
          lucideIcon: 'Search',
          key: 'F',
          action: () => {
            this.$router.push(`/search/`).catch(err => {
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
        },
        {
          label: 'Bag',
          lucideIcon: 'ShoppingBag',
          key: 'B',
          action: () => {
            var $this = this
            var bag = this.$store.state.bag
            setTimeout(() => {
              var endowItemsWithAction = function (callback) {
                return $this.$store.state.bag.map(notePath => {
                  var note = $this.$store.state.currentNoteCollection.getNoteByPath(notePath)
                  if (note) {
                    return {
                      label: note.abstract,
                      lucideIcon: 'File',
                      description: note.stack,
                      action:() => {
                        callback(note)
                        return {returnFocus: false}
                      }
                    }
                  }
                })
              }
              // this.$store.commit('removeFromBag', note.path)
              var items = endowItemsWithAction((n) => {
                var encodedPath = n.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
                $this.$router.push(`/note/${encodedPath}`).catch(err => {
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
              items = items.concat([
                { role: 'separator' },
                {
                  label: 'Remove from Bag',
                  action: () => {
                    var removeFromBag = function() {
                      setTimeout(() => {
                        var newItems = endowItemsWithAction((n) => {
                          $this.$store.commit('removeFromBag', n.path)
                          removeFromBag()
                        })
                        $this.$store.commit('triggerCustomPopoverList', {
                          message: `Remove from Bag`,
                          items: newItems,
                          options: {hintMode: true},
                        })
                      }, 50)
                    }
                    removeFromBag()
                    return {returnFocus: false}
                  },
                },
                {
                  label: 'Empty Bag',
                  action: () => {
                    $this.$store.commit('emptyBag')
                  },
                },
              ])
              this.$store.commit('triggerCustomPopoverList', {
                message: `Bag`,
                items: items,
                options: {hintMode: true},
              })
            }, 50)
            return {returnFocus: false}
          },
        },
        {
          label: 'All Stacks',
          lucideIcon: 'Layers',
          key: 'Shift+S',
          action: () => {
            this.$router.push(`/stacks/`).catch(err => {
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
        },
        {
          role: 'separator',
        },
        {
          label: 'Recently changed notes',
          lucideIcon: 'History',
          key: 'R',
          action: () => {
            var $this = this
            setTimeout(() => {
              var collection = this.$store.state.currentNoteCollection
              var items = []
              collection.getMostRecentlyChangedNotes(20).then(notes => {
                for (let n of notes) {
                  items.push({
                    label: `${n.abstract}`,
                    action: () => {
                      var encodedPath = n.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
                      $this.$router.push(`/note/${encodedPath}`).catch(err => {
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
                  })
                }
                this.$store.commit('triggerCustomPopoverList', {
                  message: 'Recently changed notes',
                  items: items,
                  options: {hintMode: true},
                })
              })
            }, 50)
            return {returnFocus: false}
          },
        },
        {
          role: 'separator',
        },
        {
          label: "Restore last session's tabs",
          lucideIcon: 'Undo',
          key: 'Shift+T',
          action: () => {
            var $this = this
            setTimeout(() => {
              var tabsCachePath = path.join($this.$store.state.currentNoteCollection.path, '.tabsCache.json')
              if (fs.existsSync(tabsCachePath)) {
                var content = fs.readFileSync(tabsCachePath, 'utf8')
                try {
                  var lastSessionsTabs = JSON.parse(content)
                  for (let t of lastSessionsTabs) {
                    setTimeout(() => {
                      // $this.$tabs.open(t.to)
                      $this.$router.push(t.to).catch(err => {
                        // Ignore the vuex err regarding  navigating to the page they are already on.
                        if (
                          err.name !== 'NavigationDuplicated' &&
                          !err.message.includes('Avoided redundant navigation to current location')
                        ) {
                          // But print any other errors to the console
                          console.error(err)
                        }
                      })
                    }, 50)
                  }
                  setTimeout(() => {
                    $this.$router.push(lastSessionsTabs.find(t => t.active).to).catch(err => {
                      // Ignore the vuex err regarding  navigating to the page they are already on.
                      if (
                        err.name !== 'NavigationDuplicated' &&
                        !err.message.includes('Avoided redundant navigation to current location')
                      ) {
                        // But print any other errors to the console
                        console.error(err)
                      }
                    })
                  }, 50)
                }
                catch (e) {
                  if (!(e instanceof SyntaxError)) {
                    console.error(e.name);
                  }
                }
              }
            }, 50)
          },
        },
        // {
        //   role: 'separator',
        // },
        // {
        //   label: 'New Popover',
        //   lucideIcon: 'PlusCircle',
        //   key: 'Ctrl+N',
        //   action: () => {
        //     setTimeout(() => {
        //       var items = []
        //       for (let i = 1; i <= 30; i++) {
        //         items.push({
        //           label: `Items ${i}`,
        //           action: () => {
        //             console.log(`This is item ${i}`)
        //           },
        //         })
        //       }
        //       this.$store.commit('triggerCustomPopoverList', {
        //         message: `Mooore`,
        //         items: items,
        //         options: {hintMode: true},
        //       })
        //     }, 50)
        //   },
        // },
      ]
    },
  },
  mounted() {
    document.title = this.title
    this.$store.commit('registerCommand', {
      name: 'collection:search',
      label: 'Search',
      action: () => {
          this.$router.push(`/search/`).catch(err => {
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
    })
    this.$store.commit('registerCommand', {
      name: 'calendar:month',
      label: 'Calendar Month Page',
      action: () => {
          this.$router.push(`/calendar/month/`).catch(err => {
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
    })
    this.$store.commit('registerCommand', {
      name: 'collection:stacks',
      label: 'Show all stacks',
      action: () => {
          this.$router.push(`/stacks/`).catch(err => {
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
    })
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

    var $this = this
    ipcRenderer.on('beforeQuit' , (event, data) => {
      console.log('Running beforeQuit')
      var openTabs = $this.$tabs.items.map(t => ({ to: t.to }))
      openTabs[$this.$tabs.activeTabIndex].active = true
      var tabsCachePath = path.join($this.$store.state.currentNoteCollection.path, '.tabsCache.json')
      fs.writeFileSync(tabsCachePath, JSON.stringify(openTabs), 'utf8')
      ipcRenderer.send('beforeQuitDone')
    })
    ipcRenderer.on('addExistingCollection' , (event, data) => {
      this.$refs.addExistingCollection.open()
    })
    ipcRenderer.on('setAsDefaultCollection' , (event, data) => {
      this.$global.config.set('defaultNoteCollection', this.$global.config.get('currentNoteCollection'))
    })
    ipcRenderer.send('updateColMenuItems', this.$global.config.get('collections', {}))
    ipcRenderer.on('changeCurrentNoteCollection' , (event, data) => {
      this.openNoteCollection((collection) => {
        $this.$tabs.reset()
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
    ipcRenderer.on('popoverList' , (event, data) => {
      this.$refs.popoverList.open()
    })
    ipcRenderer.on('closeTab' , (event, data) => {
      this.$tabs.close()
    })
    ipcRenderer.on('nextTab' , (event, data) => {
      var activeTabIndex = this.$tabs.activeTabIndex
      var tabs = this.$tabs.items
      if (activeTabIndex + 1 < tabs.length) {
        var nextTabTo = tabs[activeTabIndex + 1].to
      }
      else {
        var nextTabTo = tabs[0].to
      }
      this.$router.push(nextTabTo).catch(err => {
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
    ipcRenderer.on('previousTab' , (event, data) => {
      var activeTabIndex = this.$tabs.activeTabIndex
      var tabs = this.$tabs.items
      if (activeTabIndex - 1 > -1) {
        var nextTabTo = tabs[activeTabIndex - 1].to
      }
      else {
        var nextTabTo = tabs[tabs.length - 1].to
      }
      this.$router.push(nextTabTo).catch(err => {
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
    ipcRenderer.on('switchToTab' , (event, tabIndex) => {
      var tabs = this.$tabs.items
      if (tabs[tabIndex]) {
        var nextTabTo = tabs[tabIndex].to
        this.$router.push(nextTabTo).catch(err => {
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
    ipcRenderer.on('lastTab' , (event, data) => {
      var tabs = this.$tabs.items
      if (tabs.length > 1) {
        var nextTabTo = tabs[tabs.length - 1].to
        this.$router.push(nextTabTo).catch(err => {
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
    ipcRenderer.on('openInbox', (event, data) => {
      var inbox = this.$store.state.currentNoteCollection.stacks.getSpecialStack('inbox')
      this.$router.push(`/stacks/${inbox.relativePath}`).catch(err => {
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
        var searchString = context.searchString.toLowerCase()
        var registers = this.$store.state.currentNoteCollection.registers
        var registerPath = null
        var registerName = null
        var registerCache = {}
        var getRegisterContent = (rPath) => {
          if (registerCache[rPath]) return registerCache[rPath]
          let stack = this.$store.state.currentNoteCollection.stacks.getStackByPath(rPath)
          let stackContent = stack.getContent()
          stackContent.sort((a,b) => b.numberOfRelations - a.numberOfRelations)
          registerCache[rPath] = stackContent
          return stackContent
        }
        for (let r of registers) {
          if (searchString.startsWith(r.prefix)) {
            registerPath = r.path
            registerName = r.name
            searchString = searchString.slice(r.prefix.length)
            var searchStringNotLowercase = context.searchString.slice(r.prefix.length)
          }
        }
        if (registerPath) {
          var stackContent = getRegisterContent(registerPath)
          var items = []
          var id = 1
          for (let i of stackContent) {
            if (!i.isStack) {
              items.push({
                id: id,
                lucideIcon: 'AtSign',
                label: i.abstract,
                description: registerName,
                numberOfRelations: i.numberOfRelations,
                action: () => {
                  var encodedPath = i.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
                  this.$router.push(`/note/${encodedPath}`).catch(err => {
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
              })
              id++
            }
          }
          if (searchString.length < 1) {
            return items
          }
          var fuzzyResults = fuzzysort.go(searchString, items || [], {key: 'label'}, {threshold: -10000})
          fuzzyResults.sort((a, b) => {
            if (Math.abs(a.score - b.score) > 10) return 0
            return b.obj.numberOfRelations - a.obj.numberOfRelations
          })
          var itemsFiltered = fuzzyResults.map(i => {
            return {...i.obj, highlight: fuzzysort.highlight(i, '<span class="highlight">', '</span>')}
          })
          return itemsFiltered
        }
        var itemsFiltered = $items
        if (searchString.length == 0) {
          return itemsFiltered
        }
        var fuzzyResults = fuzzysort.go(searchString, itemsFiltered, {key: 'label'}, {threshold: -10000})
        itemsFiltered = fuzzyResults.map(i => {
          return {...i.obj, highlight: fuzzysort.highlight(i, '<span class="highlight">', '</span>')}
        })
        return itemsFiltered
    },
    updateAllStacks() {
      var $this = this
      var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
      var stacksList = []
      var getSubItemsOfStack = function (stack) {
        var notes = stack.getContent().filter(i => !i.isStack)
        notes.sort((a, b) => b.date - a.date)
        var noteList = []
        for (let note of notes) {
          let numberOfLinks = note.relations.length
          noteList.push({
            label: note.abstract,
            lucideIcon: 'FileText',
            description: `${numberOfLinks > 0 ? numberOfLinks+' relations – ' : ''}${moment(note.date).format('DD.MM.YYYY')}`,
            type: 'note',
            action: () => {
              var encodedPath = note.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
              $this.$router.push(`/note/${encodedPath}`).catch(err => {
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
                newItems: getSubItemsOfNote(note),
                newMessage: note.abstract,
              }
            },
          })
        }
        return noteList
      }
      var getSubItemsOfNote = function (parentNote) {
        var relations = parentNote.relations
        if (relations.length < 1) {
          return false
        }
        var noteList = []
        for (let relation of relations) {
          let note = relation.note
          let numberOfLinks = note.relations.length
          noteList.push({
            label: note.abstract,
            lucideIcon: 'FileText',
            description: `${note.stack} –${numberOfLinks > 0 ? ' '+numberOfLinks+' relations –' : ''}  ${moment(note.date).format('DD.MM.YYYY')}`,
            type: 'note',
            action: () => {
              var encodedPath = note.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
              $this.$router.push(`/note/${encodedPath}`).catch(err => {
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
                newItems: getSubItemsOfNote(note),
                newMessage: note.abstract,
              }
            },
          })
        }
        var myStack = parentNote.collection.stacks.getStackByPath(parentNote.stack)
        noteList.push({
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
        return noteList
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
      else {
        logger(err.message)
      }
    },
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
                  var openTabs = $this.$tabs.items.map(t => ({ to: t.to }))
                  openTabs[$this.$tabs.activeTabIndex].active = true
                  var tabsCachePath = path.join($this.$store.state.currentNoteCollection.path, '.tabsCache.json')
                  fs.writeFileSync(tabsCachePath, JSON.stringify(openTabs), 'utf8')
                  $this.$tabs.reset()
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
    updateRepoStatus() {
      this.$store.state.currentNoteCollection.checkForChangesAsync().then(status => {
        this.uncommitedChanges = status.length > 0
      })
    },
    minimizeWindow() {
      console.log('Minimize!')
      ipcRenderer.send('minimizeWindow')
    },
    writeToClipboard(text) {
      clipboard.writeText(text)
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

#app {
  height: 100vh;
  overflow: clip; // To avoid page being "loose" and scrolling a little bit on programmatical scroll actions
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
  height: $status-bar-height;
  .mode {
    background: white;
    color: black;
    padding: 7px;
    display: inline-flex;
    justify-content: space-around;
    .svg-icon {
      margin-right: 3px;
    }
  }
  .debugInfo {
    padding: 7px;
    background: #5c3a3a;
  }
}

.statusBarLeft, .statusBarRight {
  display: flex;
  align-items: center;
}

.statusBarLeft {
  flex-grow: 1;
  margin-left: 10px;
}

.statusBarRight {
  margin-right: 15px;
}

.statusBarLeft > * {
  margin-right: 5px;
}

.statusBarRight > * {
  margin-left: 5px;
}

.statusBarItem {
  margin-left: 5px;
  vertical-align: middle;
  display: inline-flex;
  gap: 3px;
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
  .router-tab__item-title {
    display: block;
    max-width: 200px;
    min-width: 5px;
  }
  &:hover .router-tab__item-title {
    max-width: none;
  }
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
  margin-left: 80px;
}

.router-tab__tabbar-right-space {
  margin: 4px;
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
    user-select: none;
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
  &.stack {
    .router-tab__item-icon::after {
      content: '';
      border-top: 2px solid;
      border-bottom: 1px solid;
      width: 24px;
      position: absolute;
      bottom: 1px;
      left: 8px;
      border-color: var(--iconBackground);
      height: 1px
    }
  }
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

.vue-codemirror {
  padding: 10px;
  .CodeMirror {
    font-size: 15px;
    font-family: 'Code New Roman', monospace;
    border: 3px solid #a5a5a5;
    &.CodeMirror-focused {
      border-color: cornflowerblue;
      border-style: dashed;
    }
    &.cm-s-seti {
      background: #ededed !important;
      color: #000 !important;
      .CodeMirror-gutters {
        background-color: #dddddd;
      }
      .CodeMirror-linenumber {
        color: #8d8d8d;
      }
      .CodeMirror-lines {
        margin-bottom: 20px;
      }
      .CodeMirror-cursor {
        border-left: solid thin #000000;
      }
      &.cm-fat-cursor .CodeMirror-cursor, .cm-animate-fat-cursor {
        width: 0.5em;
        background-color: #64bddd4f;
        border: 1px solid !important;
        border-color: #64bddd !important;
        visibility: visible;
      }

      .CodeMirror-matchingbracket {
        color: #fff !important;
        background: #000;
      }
      .CodeMirror-selected {
        background: rgba(106, 163, 231, 0.32) !important;
      }
      span.cm-comment {
        background: #c9c9c99c;
        border-radius: 4px;
        padding: 1px 3px;
      }
      span.cm-variable-2 {
        color: #56039b;
      }
      span.cm-variable-3 {
        color: #5b8d09;
      }
      span.cm-keyword {
        color: #af9b36;
      }
      span.cm-quote {
        &.cm-quote-1 {
          color: #cb4646;
        }
        &.cm-quote-2 {
          color: #ab3f3f;
        }
        &.cm-quote-3 {
          color: #976464;
        }
        &.cm-quote-4 {
          color: #7e5e5e;
        }
        &.cm-quote-5 {
          color: #7e5e5e;
        }
      }
      span.cm-link {
        color: #3069d1 !important;
      }
      span.cm-string.cm-url {
        color: #4899b9;
      }
      span.cm-hr {
        background: linear-gradient(
        180deg, rgba(0,0,0,0) calc(50% - 1px), rgb(0,0,0) calc(50%), rgba(0,0,0,0) 50%);
        padding-right: 45%;
        padding-left: 45%;
        color: #000;
        font-weight: bold;
        margin-left: 3%;
      }
      span.cm-tab {
        width: 15px;
        &:before {
          content: '⇥';
          color: grey;
          font-size: 13px;
          font-family: 'Helvetica';
        }
      }
    }
    .CodeMirror-dialog.CodeMirror-dialog-bottom {
      z-index: 4;
      position: relative;
      background: #d7d7d7b5;
      backdrop-filter: blur(2px);
      padding: 4px;
      padding-left: 30px;
      top: -30px;
    }
  }
}

.CodeMirror-activeline-background {
  background: #ffffff73 !important;
  border-bottom: 1px solid;
  border-bottom-color: #E3CB51;
}

.cm-header-1 { font-size: 150%; }
.cm-header-2 { font-size: 130%; }
.cm-header-3 { font-size: 120%; }
.cm-header-4 { font-size: 110%; }
.cm-header-5 { font-size: 100%; }
.cm-header-6 { font-size: 90%; }

.cm-trailingspace {
  position: relative;
  &:after {
    content: '•';
    position: absolute;
    left: 30%;
    top: 5%;
    color: grey;
    font-size: 70%
  }
}

</style>
