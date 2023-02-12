<template id='#item-template'>
  <transition name="fold">
  <div v-if="computedOptions.compact" class="fleetingNote compactFleetingNote" @keydown="keymonitor" @click="focusNote" :class="{ selected: selected }" ref="fleetingNote" key="compact">
    <span class="content">
      <span class="abstract" :class="{ title: fleetingNoteObj.title ? true : false }">
        {{fleetingNoteObj.abstract}}
      </span>
    </span>
  </div>
  <article v-else class="fleetingNote" @keydown="keymonitor" @click="focusNote" :class="{ selected: selected }" ref="fleetingNote" key="full">
    <div class="stackBadge" v-if="computedOptions.showStackBadge">
      <span v-if="fleetingNoteObj.stack" @click="$router.push(`/stacks/${fleetingNoteObj.stack}`)">
        <Icon name="Layers" /> {{fleetingNoteObj.stack}}
      </span>
    </div>
    <transition name="fade">
      <div class="rightHandRelations" v-if="computedOptions.showRightHandRelations && hasAnyLinks && isFocused">
        <ul>
          <collapse v-for="r in relations" :key="r.fn.relativePath">
            <template v-slot:header="slotProps">
              <li
              class="relation"
              :class="{ title: r.fn.title ? true : false }"
              :data-stack="r.fn.stack"
              @click="handleRelationClick(r, slotProps, $event)"
              >
              <Icon v-if="r.fn.stack && customRelationIcons[r.fn.stack.split('/')[0]]" :name="customRelationIcons[r.fn.stack.split('/')[0]]" />
              <Icon v-else-if="getCustomIcon(r.fn.stack)" :name="getCustomIcon(r.fn.stack)" />
              <Icon v-else name="FileText" />
              {{r.fn.abstract}}
            </li>
            </template>
            <template v-slot:body>
              <div class="miniview" v-html="r.fn.contentRendered">
              </div>
            </template>
          </collapse>
      </ul>
    </div>
  </transition>
    <header class="header">
      <span class="ago" @click="$router.push(`/fleetingnote/${encodedPath}`)">
        <Icon name="Clock" />
        {{ headerDate }}
        <span class="timestamp">{{ moment(fleetingNoteObj.date).format('ddd DD.MM.YYYY HH:mm:ss') }}</span>
      </span>
      <span class="links" v-if="hasAnyLinks">
        <span v-for="p in linksEdgeProperties" :key="p[0]" class="badge" :class="`badge-${p[0]}`">
          <span class="name">{{p[0]}}</span>
          <span class="amount">{{p[1]}}</span>
        </span>
        <span class="allLinks" @click="showLinks">
          <Icon name="Share2" />
          {{numberOfLinks}}
        </span>
      </span>
    </header>
    <div class="content" v-if="!editing">
      <div v-if="fleetingNoteObj.isText" v-html="renderedContentWithHighlights">
      </div>
      <div v-else-if="fleetingNoteObj.isImage">
        <img
        class="image"
        :src="`data:${fleetingNoteObj.mime};base64,${fleetingNoteObj.contentBase64}`"
        ></img>
      </div>
      <div v-else-if="fleetingNoteObj.isAudio">
        <audio
        controls
        :src="`data:${fleetingNoteObj.mime};base64,${fleetingNoteObj.contentBase64}`">
      </audio>
    </div>
      <div v-else class="miscFile">
        <div>
          <img class="icon" :src="icon"></img>
        </div>
        <div>
          <div class="filename">{{ fleetingNoteObj.filename }}</div>
          <div class="mime">{{ fleetingNoteObj.mime }}</div>
        </div>
      </div>
    </div>
    <div class="fleetingNoteEditor" v-if="editing"
    @keydown.meta.83="saveNote"
    @keydown.ctrl.67="cancelEditing"
    @keydown.meta.76="insertLink"
    @keydown.meta.75="insertDate"
    >
      <codemirror v-model="editorContent" :options="cmOptions" ref="cmEditor" @ready="onCmReady"/>
      <button @click="saveNote">Save</button>
      <button @click="cancelEditing">Cancel</button>
    </div>
    <footer>
      <ul class="actions">
        <li><a href="#" @click="deleteNote">delete</a></li>
        <li v-if="fleetingNoteObj.isText"><a href="#" @click="editNote">edit</a></li>
        <li><a href="#" @click="addToBag">bag</a></li>
        <li><a href="#" @click="linkNote">link</a></li>
        <li><a href="#" @click="unlinkNote">unlink</a></li>
        <li><a href="#" @click="showLinkToDatePrompt">date</a></li>
        <li><a href="#"
          @click="$router.push(`/nodeexplorer/${encodedPath}`)"
          >explore</a></li>
          <li><a href="#" @click="sendToPort">port</a></li>
          <li><a href="#" @click="addToStack">stack</a></li>
          <li><a href="#" @click="toggleSelectNote">select</a></li>
        </ul>
        <span class="moreActions"><a href="#" @click="showAllActions">...</a></span>
      </footer>
  </article>
  </transition>
</template>

<script>
  import moment from 'moment'
  import 'moment/locale/de'
  import fuzzysort from 'fuzzysort'
  import MarkdownIt from 'markdown-it'
  import hljs from 'highlight.js'
  import { codemirror } from 'vue-codemirror'
  import 'codemirror/lib/codemirror.css'
  import 'codemirror/mode/markdown/markdown.js'
  import 'codemirror/keymap/vim.js'
  import 'codemirror/addon/selection/active-line.js'
  import 'codemirror/addon/edit/trailingspace.js'
  import 'codemirror/theme/seti.css'
  import { bus } from '@/main'
  import { ipcRenderer } from 'electron'
  import Icon from '@/components/Icon.vue'
  import fs from 'fs'
  import Collapse from '@/components/Collapse.vue'

  moment.locale('de')

  export default {
    name: 'fleeting-note',
    props: {
      'fleetingNoteObj': Object,
      'searchString': String,
      'options': Object,
      'isFocused': Boolean,
    },
    components: {
      codemirror,
      Icon,
      Collapse,
    },
    data: function () {
      return {
        moment: moment,
        md: new MarkdownIt({
          linkify: true,
          html: true,
          highlight: function (str, lang) {
            if (lang && hljs.getLanguage(lang)) {
              try {
                return hljs.highlight(str, { language: lang }).value;
              } catch (__) {}
            }

            return ''; // use external default escaping
          },
        }),
        editing: false,
        selected: false,
        focused: false,
        editorContent: this.content,
        bus: bus,
        icon: null,
        customRelationIcons: {
          'tags': 'Tag',
          'bib': 'Library',
          'calendar': 'Calendar',
          'places': 'MapPin',
          'people': 'User',
          'groups': 'Users',
        },
        computedOptions: {
          showStackBadge: false,
          showRightHandRelations: false,
          compact: false,
        },
        cmOptions: {
          tabSize: 2,
          mode: 'text/x-markdown',
          theme: 'seti',
          matchBrackets: true,
          styleActiveLine: true,
          keyMap: 'vim',
          lineWrapping: true,
          lineNumbers: true,
          line: true,
          showTrailingSpace: true,
          highlightFormatting: true,
          // more CodeMirror options...
        },
      }
    },
    computed: {
      content() {
        return this.fleetingNoteObj.content
      },
      renderedContent() {
        return this.md.render(this.content)
      },
      renderedContentWithHighlights() {
        if (!this.searchString) return this.renderedContent
        if (this.searchString.length > 0) {
          return this.md.render(this.content.replace(
            new RegExp(this.searchString, 'gi'),
            '[$&]{{.match}}'
          ))
        }
        else {
          return this.renderedContent
        }
      },
      headerDate() {
        let date = moment(this.fleetingNoteObj.date)
        if (moment().diff(date, 'hours') < 24) {
          return moment(date).fromNow()
        }
        else {
          return moment(date).format('DD. MMMM YYYY')
        }
      },
      encodedPath() {
        return this.fleetingNoteObj.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
      },
      hasAnyLinks() {
        if (this.relations.length > 0) {
          return true
        }
      },
      numberOfLinks() {
        return this.relations.length
      },
      relations() {
        var relations = []
        var fn = this.fleetingNoteObj
        if (fn.hasMetadata) {
          var metadata = fn.getMetadata()
          if (metadata.links) {
            for (let link of metadata.links) {
              var [fnName, edgeProperties] = link
              var fn = this.fleetingNoteObj.collection.getFleetingNoteByPath(fnName)
              relations.push({fn: fn, properties: edgeProperties})
            }
          }
          if (metadata.backlinks) {
            for (let link of metadata.backlinks) {
              var [fnName, edgeProperties] = link
              var fn = this.fleetingNoteObj.collection.getFleetingNoteByPath(fnName)
              relations.push({fn: fn, properties: edgeProperties})
            }
          }
        }
        return relations
      },
      linksEdgeProperties() {
        // TODO: Use this.relations to be more efficient!
        var linksEdgeProperties = {}
        var fn = this.fleetingNoteObj
        if (fn.hasMetadata) {
          var metadata = fn.getMetadata()
          if (metadata.links) {
            for (let l of metadata.links) {
              if (l[1]) {
                for (let edgeProperty of l[1]) {
                  if (linksEdgeProperties.hasOwnProperty(edgeProperty)) {
                    linksEdgeProperties[edgeProperty] = linksEdgeProperties[edgeProperty] + 1
                  }
                  else {
                    linksEdgeProperties[edgeProperty] = 1
                  }
                }
              }
            }
          }
          if (metadata.backlinks) {
            for (let l of metadata.backlinks) {
              if (l[1]) {
                for (let edgeProperty of l[1]) {
                  if (linksEdgeProperties.hasOwnProperty(edgeProperty)) {
                    linksEdgeProperties[edgeProperty] = linksEdgeProperties[edgeProperty] + 1
                  }
                  else {
                    linksEdgeProperties[edgeProperty] = 1
                  }
                }
              }
            }
          }
        }
        return Object.entries(linksEdgeProperties)
      },
      showRightHandRelationsNow() {
        return this.computedOptions.showRightHandRelations && this.selected
      },
    },
  watch: {
    content: function (val) {
      this.editorContent = val
    },
  },
    methods: {
      keymonitor(event) {
        // Why do I need this?
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      setOption(opt, value) {
        this.computedOptions[opt] = value
      },
      getOption(opt) {
        return this.computedOptions[opt]
      },
      showAllActions() {

      },
      getCustomIcon(stackRelativePath) {
        var stackStyleProps = this.$store.state.currentNoteCollection.getStackStyleProps(stackRelativePath)
        return stackStyleProps['icon'] || null
      },
      handleRelationClick(relation, slotProps, event) {
        if (event.metaKey) {
          slotProps.toggle()
          event.preventDefault()
        }
        else {
          this.$router.push(`/fleetingnote/${encodeURIComponent(relation.fn.relativePath)}`)
        }
      },
      toggleCompactMode(state) {
        if (state != null) {
          this.computedOptions.compact = state
        }
        else {
          this.computedOptions.compact = !this.computedOptions.compact
        }
      },
      deleteNote(event) {
        this.$store.commit('triggerCustomTextPrompt', {
          message: `Are you sure you want to delete ${this.fleetingNoteObj.filename}?`,
          action: (text) => {
            if (['y', 'yes'].includes(text.trim())) {
              this.fleetingNoteObj.delete()
              this.$refs.fleetingNote.focus()
            }
          }
        })
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      editNote(event) {
        if (this.fleetingNoteObj.isText) {
          this.editing = !this.editing
          this.$nextTick(() => {
            this.$refs.cmEditor.codemirror.focus()
          })
        }
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      insertNote(event) {
        if (this.fleetingNoteObj.isText) {
          var $this = this
          this.$store.commit('setFleetingNoteForInsertion', this.fleetingNoteObj)
          var allNotes = this.fleetingNoteObj.collection.allNotes
          var items = allNotes.map(n => {
            return {
              label: n.name,
              action:() => {
                console.log(n)
                $this.$router.push(`/insert/${n.id}`).catch(err => {
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
            }
          })
          this.$store.commit('triggerCustomSelectList', {items})
        }
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      addToStack(event) {
        var $this = this
        var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
        var items = stacks.map(s => {
          return {
            label: s.relativePath,
            lucideIcon: 'Layers',
            action:() => {
              console.log(s.path)
              this.fleetingNoteObj.sendToStack(s.relativePath)
              this.$refs.fleetingNote.focus()
            }
          }
        })
        var filter = function (context) {
          var $items = context.itemsWithIds
          var itemsFiltered = $items.filter(item => {
            return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
          })
          itemsFiltered.push({
            id: context.getHighestId() + 1,
            lucideIcon: 'Plus',
            label: context.searchString.trim(),
            description: 'Create new stack',
            action: () => {
              $this.fleetingNoteObj.sendToStack(context.searchString.trim())
              $this.$refs.fleetingNote.focus()
            },
          })
          return itemsFiltered
        }
        this.$store.commit('triggerCustomSelectList', {items, filter})
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      addToBag() {
        this.$store.commit('addToBag', this.fleetingNoteObj.path)
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      linkNote() {
        var $this = this
        var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
        var items = []
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
                setTimeout(() => {
                  $this.$store.commit('triggerCustomTextPrompt', {
                    message: `Edge Properties (comma-separated)`,
                    action: (edgeProperties) => {
                      edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                      $this.fleetingNoteObj.addLink(fn.relativePath, edgeProperties)
                      $this.$refs.fleetingNote.focus()
                    }
                  })
                }, 50)
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
                setTimeout(() => {
                  $this.$store.commit('triggerCustomTextPrompt', {
                    message: `Edge Properties (comma-separated)`,
                    action: (edgeProperties) => {
                      edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                      $this.fleetingNoteObj.addLink(fn.relativePath, edgeProperties)
                      $this.$refs.fleetingNote.focus()
                    }
                  })
                }, 50)
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
          items.push({
            label: s.relativePath,
            lucideIcon: 'Layers',
            description: 'Stack',
            type: 'stack',
            getSubItems: () => {
              return {
                newItems: getSubItemsOfStack(s),
                newMessage: s.relativePath,
              }
            },
          })
        }
        var filter = function (context) {
          var $items = context.itemsWithIds
          var searchString = context.searchString.toLowerCase()
          if (searchString.length == 0) {
            return $items
          }
          var fuzzyResults = fuzzysort.go(searchString, $items, {key: 'label'}, {threshold: -10000})
          var itemsFiltered = fuzzyResults.map(i => {
            return {...i.obj, highlight: fuzzysort.highlight(i, '<span class="highlight">', '</span>')}
          })
          return itemsFiltered
        }
        this.$store.commit('triggerCustomSelectList', {items, filter})
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      linkNoteChoosingFromBag() {
        var $this = this
        var bag = this.$store.state.bag
        var items = bag.map(fnPath => {
          var fn = $this.fleetingNoteObj.collection.getFleetingNoteByPath(fnPath)
          if (fn) {
            return {
              label: fn.abstract,
              lucideIcon: 'File',
              action:() => {
                console.log(fn.path)
                setTimeout(() => {
                  this.$store.commit('triggerCustomTextPrompt', {
                    message: `Edge Properties (comma-separated)`,
                    action: (edgeProperties) => {
                      edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                      this.fleetingNoteObj.addLink(fn.relativePath, edgeProperties)
                      this.$refs.fleetingNote.focus()
                    }
                  })
                }, 50)
              }
            }
          }
        })
        var filter = function (context) {
          var $items = context.itemsWithIds
          var searchString = context.searchString.toLowerCase()
          var registers = $this.fleetingNoteObj.collection.registers
          var registerPath = null
          var registerName = null
          for (let r of registers) {
            if (searchString.startsWith(r.prefix)) {
              registerPath = r.path
              registerName = r.name
              searchString = searchString.slice(r.prefix.length)
              var searchStringNotLowercase = context.searchString.slice(r.prefix.length)
            }
          }
          if (registerPath) {
            var stack = $this.fleetingNoteObj.collection.stacks.getStackByPath(registerPath)
            var stackContent = stack.getContent()
            stackContent.sort((a,b) => b.numberOfRelations - a.numberOfRelations)
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
                    setTimeout(() => {
                      this.$store.commit('triggerCustomTextPrompt', {
                        message: `Edge Properties (comma-separated)`,
                        action: (edgeProperties) => {
                          edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                          $this.fleetingNoteObj.addLink(i.relativePath, edgeProperties)
                        }
                      })
                    }, 50)
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
            var newEntry = searchStringNotLowercase.trim()
            itemsFiltered.push({
              id: id + 1,
              lucideIcon: 'FilePlus',
              label: newEntry,
              description: 'Create new registry entry',
              action: () => {
                var newFnPath = stack.sendText(`# ${newEntry}`)
                var newFn = $this.$store.state.currentNoteCollection.getFleetingNoteByPath(newFnPath)
                var edgeProperties = []
                let n = $this.fleetingNoteObj
                if (n) {
                  n.addLink(newFn.relativePath, edgeProperties)
                }
              },
            })
            return itemsFiltered
          }
          var itemsFiltered = []
          if (searchString.length > 0) {
            var fuzzyResults = fuzzysort.go(searchString, $items, {key: 'label'}, {threshold: -10000})
            var itemsFiltered = fuzzyResults.map(i => {
              return {...i.obj, highlight: fuzzysort.highlight(i, '<span class="highlight">', '</span>')}
            })
          }
          else {
            itemsFiltered = [...$items]
            itemsFiltered.push({
              id: context.getHighestId() + 1,
              lucideIcon: 'Plus',
              label: 'Link all bagged notes',
              action: () => {
                for (let fnPath of bag) {
                  // this fnPath is absolute but needs to be relative!!!
                  $this.fleetingNoteObj.addLink(fnPath)
                }
              },
            })
          }
          return itemsFiltered
          }
        this.$store.commit('triggerCustomSelectList', {items, filter})
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      linkNoteChoosingFromStack() {
        var $this = this
        var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
        var items = []
        var filter = function (context) {
          var $items = context.itemsWithIds
          var searchString = context.searchString.toLowerCase()
          if (searchString.length == 0) {
            return $items
          }
          var fuzzyResults = fuzzysort.go(searchString, $items, {key: 'label'}, {threshold: -10000})
          fuzzyResults.sort((a, b) => {
            if (b.obj.type != 'fleetingNote') return 0
            if (Math.abs(a.score - b.score) > 10) return 0
            return b.obj.numberOfRelations - a.obj.numberOfRelations
          })
          var itemsFiltered = fuzzyResults.map(i => {
            return {...i.obj, highlight: fuzzysort.highlight(i, '<span class="highlight">', '</span>')}
          })
          return itemsFiltered
        }
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
              numberOfRelations: fn.numberOfRelations,
              type: 'fleetingNote',
              action: () => {
                $this.fleetingNoteObj.addLink(fn.relativePath, [])
                setTimeout(() => {
                  $this.$store.commit('triggerCustomSelectList', {items: getSubItemsOfStack($this.$store.state.currentNoteCollection.stacks.getStackByPath(fn.stack)), filter})
                }, 50)
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
              numberOfRelations: fn.numberOfRelations,
              type: 'fleetingNote',
              action: () => {
                setTimeout(() => {
                  $this.$store.commit('triggerCustomTextPrompt', {
                    message: `Edge Properties (comma-separated)`,
                    action: (edgeProperties) => {
                      edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                      $this.fleetingNoteObj.addLink(fn.relativePath, edgeProperties)
                      $this.$refs.fleetingNote.focus()
                    }
                  })
                }, 50)
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
          items.push({
            label: s.relativePath,
            lucideIcon: 'Layers',
            description: 'Stack',
            type: 'stack',
            getSubItems: () => {
              return {
                newItems: getSubItemsOfStack(s),
                newMessage: s.relativePath,
              }
            },
          })
        }
        this.$store.commit('triggerCustomSelectList', {items, filter})
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      unlinkNote() {
        var $this = this
        if (!$this.fleetingNoteObj.hasMetadata) {
          return false
        }
        var links = this.fleetingNoteObj.getMetadata().links || []
        var backlinks = this.fleetingNoteObj.getMetadata().backlinks || []
        var linksItems = links.map(link => {
          var [fnName, edgeProperties] = link
          var fn = $this.fleetingNoteObj.collection.getFleetingNoteByPath(fnName)
          if (fn) {
            return {
              label: fn.abstract,
              description: 'Link',
              lucideIcon: 'File',
              badges: (edgeProperties && edgeProperties.length > 0) ? edgeProperties : [],
              action:() => {
                console.log(fn.path)
                fn.removeBacklink($this.fleetingNoteObj.relativePath)
                $this.fleetingNoteObj.removeLink(fn.relativePath)
              }
            }
          }
        })
        var backlinksItems = backlinks.map(link => {
          var [fnName, edgeProperties] = link
          var fn = $this.fleetingNoteObj.collection.getFleetingNoteByPath(fnName)
          if (fn) {
            return {
              label: fn.abstract,
              description: 'Backlink',
              lucideIcon: 'File',
              badges: (edgeProperties && edgeProperties.length > 0) ? edgeProperties : [],
              action:() => {
                console.log(fn.path)
                $this.fleetingNoteObj.removeBacklink(fn.relativePath)
                fn.removeLink($this.fleetingNoteObj.relativePath)
              }
            }
          }
        })
        var items = [...linksItems, ...backlinksItems]
        var filter = function (context) {
          var $items = context.itemsWithIds
          var itemsFiltered = $items.filter(item => {
            return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
          })
          return itemsFiltered
        }
        if (items.length > 0) {
          // this.$store.commit('triggerCustomSelectList', {items, filter})
          this.$store.commit('triggerCustomPopoverList', {
            message: `Unlink relation`,
            items: items,
            options: {hintMode: true},
          })
        }
        else {
          console.log('There arent any here')
        }
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      showLinks() {
        var $this = this
        if (!$this.fleetingNoteObj.hasMetadata) {
          return false
        }
        var links = this.fleetingNoteObj.getMetadata().links || []
        var backlinks = this.fleetingNoteObj.getMetadata().backlinks || []
        var linksItems = links.map(link => {
          var fnName = link[0]
          var edgeProperties = link[1]
          var fn = $this.fleetingNoteObj.collection.getFleetingNoteByPath(fnName)
          if (fn) {
            return {
              label: fn.abstract,
              description: 'Link',
              lucideIcon: 'File',
              badges: (edgeProperties && edgeProperties.length > 0) ? edgeProperties : [],
              action:() => {
                console.log(fn.path)
                if (fn.stack == $this.fleetingNoteObj.stack) {
                  console.log('Yay! I let my partner shine! :)')
                  $this.$emit('focusNote', fn)
                  $this.$emit('scrollFocusedIntoView')
                }
                else {
                  console.log('My partner is in a different stack but thats no problemo :)')
                  var encodedPath = fn.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
                  $this.$router.push(`/fleetingnote/${encodedPath}`)
                }
              }
            }
          }
        })
        var backlinksItems = backlinks.map(link => {
          var fnName = link[0]
          var edgeProperties = link[1]
          var fn = $this.fleetingNoteObj.collection.getFleetingNoteByPath(fnName)
          if (fn) {
            return {
              label: fn.abstract,
              description: 'Backlink',
              lucideIcon: 'File',
              badges: (edgeProperties && edgeProperties.length > 0) ? edgeProperties : [],
              action:() => {
                console.log(fn.path)
                if ((fn.inInbox && $this.fleetingNoteObj.inInbox) || (fn.stack == $this.fleetingNoteObj.stack)) {
                  console.log('Yay! I let my partner shine! :)')
                  $this.$emit('focusNote', fn)
                  $this.$emit('scrollFocusedIntoView')
                }
                else {
                  console.log('My partner is in a different stack but thats no problemo :)')
                  let encodedPath = fn.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
                  $this.$router.push(`/fleetingnote/${encodedPath}`)
                }
              }
            }
          }
        })
        var items = [...linksItems, ...backlinksItems]
        var filter = function (context) {
          var $items = context.itemsWithIds
          var itemsFiltered = $items.filter(item => {
            return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
          })
          return itemsFiltered
        }
        if (items.length > 0) {
          this.$store.commit('triggerCustomSelectList', {items, filter})
        }
        else {
          console.log('There arent any here')
        }
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      showLinkToDatePrompt(event) {
        var $this = this
        var suggestedDate = moment().format('YYYY/MM/DD')
        this.$store.commit('triggerCustomTextPrompt', {
          message: `Link fleeting note to following date:`,
          text: suggestedDate,
          selection: [suggestedDate.length, suggestedDate.length],
          action: (date) => {
            var date = moment(date)
            console.log(date.format('YYYY_MM_DD'))
            var fn = $this.fleetingNoteObj.collection.createDateNode('calendar', date)
            $this.fleetingNoteObj.addLink(fn.relativePath, ['date'])
          }
        })
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      linkToDate(date) {
        var date = moment(date)
        console.log(date.format('YYYY_MM_DD'))
        var fn = this.fleetingNoteObj.collection.createDateNode('calendar', date)
        this.fleetingNoteObj.addLink(fn.relativePath, ['date'])
      },
      sendToPort(event) {
        var $this = this
        var ports = this.$global.pensieve.ports
        ports = ports.filter(p => p.collectionName != this.fleetingNoteObj.collection.name)
        var items = ports.map(p => {
          return {
            label: p.name,
            lucideIcon: 'Truck',
            description: p.collectionName,
            action:() => {
              console.log(p.id)
              p.sendToPort(this.fleetingNoteObj)
              this.$refs.fleetingNote.focus()
            }
          }
        })
        this.$store.commit('triggerCustomSelectList', {items})
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      exportAsHtml({ includeRelations = true } = {}) {
        var renderedContent = this.renderedContent
        var renderedRelations = ""
        if (includeRelations) {
          for (let r of this.relations) {
            if (['calendar', 'tags', 'courses'].some(str => r.fn.stack.includes(str))) continue
            let renderedRelation = this.md.render(r.fn.content)
            renderedRelations += `<div class="note relation">${renderedRelation}</div>\n`
          }
        }
        var css = `
          body {
            width: 210mm;
            margin: auto;
          }
          h1 {
            margin-top: 0;
          }
          .note {
            border: 2px solid #6495ed;
            padding: 20px;
            margin-bottom: 10px;
          }
          .note.relation {
            border-color: #97ca97;
          }
          body.relationsExcluded .note {
            border: none;
          }
          a {
            color: cornflowerblue;
          }
          .hl {
            background-color: #ffd97da1;
            padding: 1px;
            border-radius: 2px;
          }
          .hl.green {
            background-color: #0080005e;
          }
          .hl.red {
            background-color: #ff000061;
          }
          .hl.blue {
            background-color: #0000ff4f;
          }
          blockquote {
            border-left: 3px solid #cfdae6;
            padding-left: 5px;
            text-align: justify;
          }
          :not(pre) > code {
            background: #d7d5d5;
            border-radius: 4px;
            padding: 1px 3px;
            font-family: 'Monaco', monospace;
            font-size: 75%;
          }
          pre {
            white-space: pre-wrap;
            background: #000 e3;
            padding: 10px;
            border-radius: 5px;
            color: white;
            font-family: 'Code New Roman', monospace;
            font-size: 15px;
          }
          pre.prose {
            background: none;
            color: inherit;
            font-family: 'Georgia';
            font-size: 16px;
          }
          pre.prose code {
            font-family: 'Georgia';
          }
          table {
            font-size: 13px;
            border-collapse: collapse;
          }
          table td, table th {
            border: 1px solid #e5e3da;
            padding: 5px 3px;
          }
          table th {
            background-color: #e6e6e6;
            --border-color: #cbcbcb;
            border-right-color: var(--border-color);
            border-left-color: var(--border-color);
            border-top-color: var(--border-color);
            text-align: center !important;
          }
          table tr:nth-child(2n+1) td {
            background-color: #f2f2f2;
          }
          ul.infobox {
            background: #f1f1f1;
            border: 1px solid #a2a9b1;
            padding: 0.6em;
            list-style: none;
            width: 400px;
            font-size: 80%;
            font-family: "Helvetica";
            border-radius: 5px;
          }
          ul.infobox.right {
            width: 200px;
            float: right;
          }
          ul.infobox.left {
            width: 200px;
            float: left;
          }
          ul.infobox > li {
            font-weight: bold;
            display: flex;
            justify-content: space-between;
          }
          ul.infobox > li > img {
            max-height: 200px;
            margin: auto;
          }
          ul.infobox > li:not(:first-child) {
            margin-top: 4px;
          }
          ul.infobox > li.center {
            justify-content: center;
          }
          ul.infobox > li ul {
            list-style: none;
            padding-left: 0;
            flex-basis: 70%;
          }
          ul.infobox > li ul li {
            font-weight: normal;
          }
          `
        var dateString = moment(this.fleetingNoteObj.relatedDates[0] || this.fleetingNoteObj.date).format('YYYY-MM-DD')
        var title = `${dateString} ${this.fleetingNoteObj.title}`.replaceAll(':', '')
        var html = `
        <!DOCTYPE html>
        <html>
        <head>
        <title>${title}</title>
        <style>
        ${css}
        </style>
        </head>
        <body class="${includeRelations ? 'relationsIncluded' : 'relationsExcluded'}">
        <div id="mainContent">
        <div class="note">
        ${renderedContent}
        </div>
        </div>
        <div id="relatedContent">
        ${renderedRelations}
        </div>
        </body>
        </html>
        `;
        (async () => {
          var filePath = await ipcRenderer.invoke('saveDialog', {
            title: 'Export note and relations',
            defaultPath: `${title}.html`,
            properties: ['createDirectory', 'showOverwriteConfirmation'],
          })
          if (filePath) {
            fs.writeFileSync(filePath, html)
          }
        })()
      },
      toggleSelectNote(event) {
        this.selected = !this.selected
        if (this.selected) {
          this.$emit('selectNote', this.fleetingNoteObj)
        }
        else {
          this.$emit('unselectNote', this.fleetingNoteObj)
        }
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      focusNote(event) {
        this.focused = true
        this.$emit('focusNote', this.fleetingNoteObj, event)
      },
      saveNote(event) {
        this.fleetingNoteObj.setContent(this.editorContent)
        this.editing = !this.editing
        this.$emit('focusNote', this.fleetingNoteObj)
        event.preventDefault()
        event.stopPropagation()
      },
      cancelEditing(event) {
        this.editing = !this.editing
        this.$emit('focusNote', this.fleetingNoteObj)
        event.preventDefault()
        event.stopPropagation()
      },
      insertDate(event) {
        var dateString = moment().format('dddd, D. MMMM YYYY')
        var cm = this.$refs.cmEditor.codemirror
        var cursor = cm.getCursor()
        cm.replaceRange(dateString, cursor, cursor)
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      onCmReady(cm) {
        cm.setSize(null, '60vh')
      }
    },
    mounted() {
      var defaultLinkRender = this.md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      }
      this.md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
        var token = tokens[idx]
        if (token.markup == 'linkify') {
          var aIndex = tokens[idx].attrIndex('class')
          if (aIndex < 0) {
            tokens[idx].attrPush(['class', 'linkify']) // add new attribute
          } else {
            let classAttr = tokens[idx].attrs[aIndex][1]
            tokens[idx].attrs[aIndex][1] = `${classAttr} linkify` // replace value of existing attr
          }
        }
        // pass token to default renderer.
        return defaultLinkRender(tokens, idx, options, env, self)
      }
      this.md.use( require('markdown-it-bracketed-spans') )
      this.md.use( require('markdown-it-attrs'), {
        // optional, these are default options
        leftDelimiter: '{{',
        rightDelimiter: '}}',
        allowedAttributes: []  // empty array = all attributes are allowed
      })
      var stacksPath = this.fleetingNoteObj.collection.collectionJson.paths.stacks.split('/')[1]
      this.md.use( require('markdown-it-replace-link'), {
        replaceLink: function (link, env) {
          if (link.startsWith('/')) {
            let clearlink = decodeURIComponent(link)
            return `/n/${encodeURIComponent(stacksPath+clearlink+'.md')}`
          }
          else {
            return link
          }
        }
      })
      this.editorContent = this.content
      if (this.options) {
        for (let o of Object.keys(this.options)) {
          this.$set(this.computedOptions, o, this.options[o])
        }
      }
      var $this = this;

      (async () => {
        const icon = await ipcRenderer.invoke('getFileIcon', $this.fleetingNoteObj.path)
        $this.icon = icon
      })()
    }
  }
</script>

<style lang="scss">
.fleetingNoteList:focus {
  .fleetingNote.focused {
    box-shadow: 0 0 0 3px cornflowerblue;
  }
}
.fleetingNote {
  min-width: 100px;
  height: min-content;
  position: relative;
  border: 2px solid #ffd400;
  background-color: #FAFAFA;
  opacity: 0.96;
  color: black;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(181, 181, 181, 0.67);
  font-family: 'Lucida Grande', 'Segoe UI', 'Open Sans', sans-serif;
  &.focused {
    box-shadow: 0 0 0 3px #aabee3;
  }
  &.selected {
    background-color: #c9d6e0;
  }
  .stackBadge {
    position: absolute;
    transform: rotate(90deg) translateX(104%);
    transform-origin: bottom right;
    right: 0;
    font-size: 12px;
    cursor: pointer;
    background: black;
    color: white;
    padding: 5px;
    border-radius: 6px 6px 0px 0px;
  }
  .rightHandRelations {
    position: absolute;
    right: -230px;
    top: 40px;
    width: 200px;
    font-size: 12px;
    color: black;
    padding: 5px;
    border-radius: 6px;
    h1 {
      font-size: 14px;
      text-align: center;
      color: #696969;
    }
    ul {
      list-style: none;
      padding-inline-start: 0;
      .relation {
        border: 1px solid #bbbbbb;
        background: #d3d3d3;
        margin-top: 2px;
        padding: 2px;
        border-radius: 5px;
        cursor: pointer;
        &.title {
          font-weight: bold;
        }
        &[data-stack="tags"] {
          border-width: 2px;
          border-color: #599584;
        }
        &[data-stack="bib"] {
          border-width: 2px;
          border-color: #956459;
        }
        &[data-stack^="calendar"] {
        }
        &[data-stack="places"] {
          background: hsl(38, 97%, 76%);
          color: hsla(19, 30%, 35%, 1);
          border: 1.5px solid rgb(197, 166, 112);
          .svg-icon {
            color: #bf3516;
          }
        }
        &[data-stack="people"] {
          background: hsl(38, 97%, 76%);
          color: hsla(19, 30%, 35%, 1);
          border: 1.5px solid rgb(197, 166, 112);
        }
        &[data-stack="groups"] {
          background: hsl(38, 97%, 76%);
          color: hsla(19, 30%, 35%, 1);
          border: 1.5px solid rgb(197, 166, 112);
          .svg-icon {
            color: #428547;
          }
        }
      .miniview {
        border: 1px solid #bbbbbb;
        background: #e1e1e1;
        margin-top: 2px;
        padding: 2px;
        border-radius: 5px;
        word-break: break-all;
        font-family: 'Helvetica Neue';
        overflow-x: auto;
        overflow-y: auto;
        max-height: 200px;
        left: 10px;
        position: relative;
        width: 220px;
        h1:first-child {
          display: none;
        }
        h2, h3, h4 {
          font-size: 12px;
          font-family: 'Futura';
          text-align: center;
        }
        ul {
          list-style-type: disc;
          list-style-position: inside;
          padding-inline-start: 5px;
        }
        blockquote {
          margin-inline-start: 0px;
          border-left: 1px solid black;
          padding-inline-start: 10px;
          margin-inline-end: 0px;
        }
        hr {
          border: 1px solid black;
        }
        a {
          color: #175bd5;
        }
        img {
          max-width: 200px;
        }
        table {
          font-size: 10px;
          border-collapse: collapse;
          td, th {
            border: 1px solid #e5e3da;
            padding: 5px 3px;
          }
          th {
            min-width: 100px;
            background-color: #e6e6e6;
            --border-color: #cbcbcb;
            border-right-color: var(--border-color);
            border-left-color: var(--border-color);
            border-top-color: var(--border-color);
            text-align: center !important;
          }
          tr:nth-child(2n+1) td {
            background-color: #f2f2f2;
          }
        }
        .hl {
          --highlight-color: #ffd97da1;
          background-color: var(--highlight-color);
          padding: 1px;
          border-radius: 2px;
          &.green {
            --highlight-color: #0080005e;
          }
          &.red {
            --highlight-color: #ff000061;
          }
          &.blue {
            --highlight-color: #0000ff4f;
          }
        }
      }
    }
  }
}


@media screen and (max-width: 1100px) {
  .fleetingNote {
    .rightHandRelations {
      display: none;
    }
  }
}

.fleetingNote.compactFleetingNote {
  padding: 10px;
  background: #49499b;
  border: none;
  color: white;
  &.selected {
    background: #684b8f;
  }
  &.focused {
    box-shadow: 0 0 0 3px #dbb91b;
  }
  .content {
    margin: 0;
    padding: 0;
    .abstract {
      font-size: 14px;
      font-family: 'Georgia';
      margin-block-end: 0;
      color: #c3c3c3;
      &.title {
        font-size: 18px;
        color: white;
      }
    }
  }
}

@mixin favicon {
  background-size: 18px 18px;
  background-position: center center;
  display: inline-block;
  width: 18px;
  height: 18px;
  content:"";
  margin-right: 2px;
}

.fleetingNote .content {
  padding: 5px;
  font-family: 'Georgia';
  margin: 10px;
  word-break: break-word;
  &::after {
    // Clearfix
    content: "";
    clear: both;
    display: table;
  }
  blockquote:first-child, h1:first-child, h2:first-child, h3:first-child, ol:first-child, p:first-child, pre:first-child, ul:first-child {
    margin-top: 0;
  }
  .match {
    background: #000000;
    color: white;
    border-radius: 5px;
    padding: 2px;
  }
  blockquote {
    border-left: 3px solid #cfdae6;
    padding-left: 5px;
    text-align: justify;
  }
  :not(pre) > code {
    background: #d7d5d5;
    border-radius: 4px;
    padding: 1px 3px;
    font-family: 'Monaco', monospace;
    font-size: 13px;
  }
  pre {
    white-space: pre-wrap;
    background: #000000e3;
    padding: 10px;
    border-radius: 5px;
    color: white;
    font-family: 'Code New Roman', monospace;
    font-size: 15px;
    &.prose {
      background: none;
      color: inherit;
      font-family: 'Georgia';
      font-size: 16px;
      code {
        font-family: 'Georgia';
      }
    }
  }
  h1 {
    font-size: 24px;
  }
  h2 {
    font-size: 20px;
  }
  h3 {
    font-size: 17px;
  }
  h4 {
    font-size: 15px;
  }
  h5 {
    font-size: 13px;
  }
  h1, h2, h3, h4, h5 {
    font-family: 'Baskerville';
  }
  table {
    font-size: 13px;
    border-collapse: collapse;
    td, th {
      border: 1px solid #e5e3da;
      padding: 5px 3px;
    }
    th {
      background-color: #e6e6e6;
      --border-color: #cbcbcb;
      border-right-color: var(--border-color);
      border-left-color: var(--border-color);
      border-top-color: var(--border-color);
      text-align: center !important;
    }
    tr:nth-child(2n+1) td {
      background-color: #f2f2f2;
    }
  }
  .hl {
    --highlight-color: #ffd97da1;
    background-color: var(--highlight-color);
    padding: 1px;
    border-radius: 2px;
    &.green {
      --highlight-color: #0080005e;
    }
    &.red {
      --highlight-color: #ff000061;
    }
    &.blue {
      --highlight-color: #0000ff4f;
    }
    @mixin mark-highlight {
      position: relative;
      margin-left: 33px;
      &:before {
        background: var(--highlight-color);
        left: -34px;
        position: absolute;
        line-height: 90%;
        color: black;
        top: -1px;
        font-family: 'Arial Black';
        border: 4px solid #00000087;
      }
    }
    &.question {
      @include mark-highlight;
      &:before {
        content: '?';
        padding: 0px 6px;
        border-radius: 20px;
      }
    }
    &.exclamation {
      @include mark-highlight;
      &:before {
        content: '!';
        padding: 2px 8px;
        border-radius: 20px 20px 5px 5px;
      }
    }
    @mixin emoji-highlight {
      position: relative;
      margin-left: 27px;
      &:before {
        left: -29px;
        position: absolute;
        line-height: 100%;
        padding: 2px;
        border-radius: 10px;
        background: #0090f729;
        font-size: larger;
        top: -1px;
      }
    }
    &.thumbs-up {
      @include emoji-highlight;
      &:before {
        content: '👍';
      }
    }
    &.thumbs-down {
      @include emoji-highlight;
      &:before {
        content: '👎';
      }
    }
    &.yes {
      @include emoji-highlight;
      &:before {
        content: '✅';
      }
    }
    &.no {
      @include emoji-highlight;
      &:before {
        content: '❌';
      }
    }
    &.thoughts {
      @include emoji-highlight;
      &:before {
        content: '💭';
      }
    }
    &.lab {
      @include emoji-highlight;
      &:before {
        content: '🧪';
      }
    }
    &.search {
      @include emoji-highlight;
      &:before {
        content: '🔍';
      }
    }
    &.book {
      @include emoji-highlight;
      &:before {
        content: '📖';
      }
    }
    &.trash {
      @include emoji-highlight;
      &:before {
        content: '🗑️';
      }
    }
    &.link {
      @include emoji-highlight;
      &:before {
        content: '🔗';
      }
    }
    &.pointing {
      @include emoji-highlight;
      &:before {
        content: '👉';
      }
    }
    &.target {
      @include emoji-highlight;
      &:before {
        content: '🎯';
      }
    }
    &.idea {
      @include emoji-highlight;
      &:before {
        content: '💡';
      }
    }
    &[data-gloss] {
      position: relative;
      &:after {
        visibility: hidden;
        opacity: 0;
      }
      &:hover:after {
        content: attr(data-gloss);
        visibility: visible;
        opacity: 1;
        position: absolute;
        background: black;
        color: white;
        max-width: 400px;
        width: max-content;
        display: inline-block;
        font-family: 'Code New Roman';
        font-size: 13px;
        border-radius: 6px;
        padding: 5px;
        transition: visibility 0.2s linear,opacity 0.2s linear;
        bottom: 120%;
        left: 0%;
      }
    }
  }
  a {
    color: royalblue;
    word-break: break-all;
    position: relative;
  }
  a:after {
    visibility: hidden;
    opacity: 0;
  }
  a:hover:after {
    content: attr(href);
    visibility: visible;
    opacity: 1;
    position: absolute;
    background: black;
    color: white;
    white-space: nowrap;
    font-family: 'Code New Roman';
    font-size: 13px;
    border-radius: 6px;
    padding: 5px 1px;
    transition: visibility 0.2s linear,opacity 0.2s linear;
    bottom: 120%;
    left: 0%;
  }
  a[href$=".pdf"]:before {
    background-image: url('https://upload.wikimedia.org/wikipedia/commons/6/60/Adobe_Acrobat_Reader_icon_%282020%29.svg');
    @include favicon;
  }
  a[href*="wikipedia.org/"]:before {
    background-image: url('https://upload.wikimedia.org/wikipedia/commons/2/2c/Tango_style_Wikipedia_Icon.svg');
    @include favicon;
  }
  a[href*="youtube.com/"]:before, a[href*="youtu.be/"]:before {
    background-image: url('https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_play_button_icon_%282013%E2%80%932017%29.svg');
    @include favicon;
  }
  a[href*="facebook.com/"]:before {
    background-image: url('https://upload.wikimedia.org/wikipedia/commons/c/c2/F_icon.svg');
    @include favicon;
  }
  a[href*="reddit.com/"]:before {
    background-image: url('https://www.reddit.com/favicon.ico');
    @include favicon;
  }
  a[href*="instagram.com/"]:before {
    background-image: url('https://www.instagram.com/favicon.ico');
    @include favicon;
  }
  a[href*="wiktionary.org/"]:before {
    background-image: url('https://en.wiktionary.org/favicon.ico');
    @include favicon;
  }
  a[href*="github.com/"]:before {
    background-image: url('https://github.com/favicon.ico');
    @include favicon;
  }
  a[href*="spotify.com/"]:before {
    background-image: url('https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg');
    @include favicon;
  }
  a[href*="dwds.de/"]:before {
    background-image: url('https://www.dwds.de/favicon-32x32.png');
    @include favicon;
  }
  a[href*="disco.uni-muenster.de/"]:before {
    background-image: url('https://disco.uni-muenster.de/images/favicon.ico');
    @include favicon;
  }
  a[href*="imdb.com/"]:before {
    background-image: url('https://www.imdb.com/favicon.ico');
    @include favicon;
  }
  a[href*="/n/Stacks%2Fpeople%"] {
    background: hsl(38, 97%, 76%);
    color: hsla(19, 30%, 35%, 1);
    border-radius: 5px;
    font-weight: 700;
    border: 1.5px solid rgb(197, 166, 112);
    text-decoration: none;
    padding: 1px 5px;
    font-family: Helvetica;
    font-size: smaller;
    &:before {
      content: '\f203';
      font-family: "feather-icons";
      display: inline-block;
      line-height: 1;
      font-weight: 700;
      font-style: normal;
      speak: none;
      text-decoration: inherit;
      text-transform: none;
      text-rendering: auto;
      -webkit-font-smoothing: antialiased;
    }
  }
  a[href*="/n/Stacks%2Fgroups%"] {
    background: hsl(38, 97%, 76%);
    color: hsla(19, 30%, 35%, 1);
    border-radius: 5px;
    font-weight: 700;
    border: 1.5px solid rgb(197, 166, 112);
    text-decoration: none;
    padding: 1px 5px;
    font-family: Helvetica;
    font-size: smaller;
    &:before {
      content: '\f204';
      font-family: "feather-icons";
      display: inline-block;
      line-height: 1;
      font-weight: 700;
      font-style: normal;
      speak: none;
      text-decoration: inherit;
      text-transform: none;
      text-rendering: auto;
      -webkit-font-smoothing: antialiased;
    }
  }
  a[href*="/n/Stacks%2Fplaces%"] {
    background: hsl(38, 97%, 76%);
    color: hsla(19, 30%, 35%, 1);
    border-radius: 5px;
    font-weight: 700;
    border: 1.5px solid rgb(197, 166, 112);
    text-decoration: none;
    padding: 1px 5px;
    font-family: Helvetica;
    font-size: smaller;
    &:before {
      content: '\f194';
      font-family: "feather-icons";
      display: inline-block;
      line-height: 1;
      font-weight: 700;
      font-style: normal;
      speak: none;
      text-decoration: inherit;
      text-transform: none;
      text-rendering: auto;
      -webkit-font-smoothing: antialiased;
    }
  }
  ul.infobox {
    background: #f1f1f1;
    border: 1px solid #a2a9b1;
    padding: 0.6em;
    list-style: none;
    width: 400px;
    font-size: 80%;
    font-family: 'Helvetica';
    border-radius: 5px;
    &.right {
      width: 200px;
      float: right;
    }
    &.left {
      width: 200px;
      float: left;
    }
    & > li {
      & > img {
        max-height: 200px;
        margin: auto;
      }
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      &:not(:first-child) {
        margin-top: 4px;
      }
      &.center {
        justify-content: center;
      }
      ul {
        list-style: none;
        padding-left: 0;
        flex-basis: 70%;
        li {
          font-weight: normal;
        }
      }
    }
  }
  .tag {
    background-color: #dad8d8;
    padding: 3px;
    color: black;
    border-radius: 5px;
    text-decoration: none;
    border: 1px solid #b7b7b7;
    font-family: Alice;
}
  div p:last-child {
    margin-block-end: 0;
  }
  img {
    max-width: 500px;
  }
  .miscFile {
    display: flex;
    .icon {
      padding-right: 5px;
    }
    .filename {
      font-weight: bold;
    }
    .mime {
      font-size: 12px;
      font-style: italic;
    }
  }
}

.fleetingNote .fleetingNoteEditor {
  textarea {
    padding: 10px;
    margin: 10px;
    font-family: 'Georgia';
    word-break: break-word;
    font-size: 16px;
    height: 200px;
    background: none;
    border: 2px dashed #a5a5a5;
    &:focus {
      border-color: cornflowerblue;
      outline: none;
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
  button {
    margin-left: 15px;
    margin-bottom: 10px;
    background-color: #88adf1;
    color: white;
    border: none;
    padding: 8px;
    border-radius: 5px;
    font-size: 14px;
  }
}

.cm-fat-cursor .CodeMirror-cursor, .cm-animate-fat-cursor {
  width: 0.5em;
  background-color: #64bddd4f;
  border: 1px solid !important;
  border-color: #64bddd !important;
  visibility: visible;
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

.fleetingNote .header {
  font-size: 12px;
  color: rgb(17, 17, 17);
  padding: 10px 10px 5px;
  background-color: #5082ce12;
  border-bottom: 1px solid #6495ed3b;
  display: flex;
  justify-content: space-between;
  .links {
    transform: translate(0px, -2px);
    font-size: 14px;
  }
  .allLinks {
    cursor: pointer;
    font-weight: bold;
    background: #ffffffbd;
    border-radius: 5px;
    padding: 3px;
    border: 1.5px solid #0000004a;
  }
  .badge {
    display: none;
    padding: 3px;
    background: #cacaca;
    border-radius: 5px;
    width: fit-content;
    color: black;
    margin-right: 3px;
    border: 1px solid #6d6d6d;
    font-family: 'Lucida Grande';
    .name {
      display: none;
    }
    &.badge-conflicts {
      display: inline;
      color: #b50f0f;
      background: #d29b9b;
      border-color: #b50f0f;
      .amount:before {
        content: "✗";
        display: inline-block;
        line-height: 1;
        font-weight: normal;
        font-style: normal;
        speak: none;
        text-decoration: inherit;
        text-transform: none;
        text-rendering: auto;
        -webkit-font-smoothing: antialiased;
      }
    }
    &.badge-agrees {
      display: inline;
      color: #0d3e0d;
      background: #a9c3a9;
      border-color: #0d3e0d;
      .amount:before {
        content: "✓";
        display: inline-block;
        line-height: 1;
        font-weight: normal;
        font-style: normal;
        speak: none;
        text-decoration: inherit;
        text-transform: none;
        text-rendering: auto;
        -webkit-font-smoothing: antialiased;
      }
    }
  }
}

.fleetingNote .header .ago {
  padding-right: 5px;
  position: relative;
  cursor: pointer;
  .timestamp {
    visibility: hidden;
    opacity: 0;
    font-family: 'Code New Roman';
    font-size: 13px;
    width: 180px;
    background-color: black;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 5px 1px;
    transition: visibility 0.2s linear,opacity 0.2s linear;

    /* Position the tooltip */
    position: absolute;
    z-index: 1;
    bottom: 120%;
    left: 50%;
    margin-left: -90px;
    &:after {
      content: " ";
      position: absolute;
      top: 100%; /* At the bottom of the tooltip */
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: black transparent transparent transparent;
    }
  }
}

.fleetingNote .header .ago:hover .timestamp {
  visibility: visible;
  opacity: 1;
}


.fleetingNote footer {
  border-top: 1px solid #6495ed3b;
  background-color: #5082ce12;
  display: inline-flex;
  width: 100%;
  & > * {
    padding: 5px 10px 10px 10px;
  }
  a {
    color: #888;
    text-decoration: none;
    font-size: 12px;
  }
  ul.actions {
    flex-basis: 100%;
    padding-inline-start: 0;
    padding-left: 10px;
    margin: 0;
    li {
      display: inline-block;
      list-style: none;
      padding-right: 6px;
    }
  }
}
.fade-enter-active, .fade-leave-active {
  transition: opacity .2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
