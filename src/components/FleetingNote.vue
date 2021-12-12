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
      <span v-else @click="$router.push(`/inbox/`)">
        <Icon name="Inbox" /> Inbox
      </span>
    </div>
    <transition name="fade">
      <div class="rightHandRelations" v-if="computedOptions.showRightHandRelations && hasAnyLinks && isFocused">
        <ul>
          <li v-for="r in relations" :key="r.fn.relativePath"
          class="relation"
          :class="{ title: r.fn.title ? true : false }"
          :data-stack="r.fn.stack"
          @click="$router.push(`/fleetingnote/${encodeURIComponent(r.fn.relativePath)}`)"
          >
          <Icon v-if="customRelationIcons[r.fn.stack.split('/')[0]]" :name="customRelationIcons[r.fn.stack.split('/')[0]]" />
          <Icon v-else name="FileText" />
          {{r.fn.abstract}}
        </li>
      </ul>
    </div>
  </transition>
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
    <ul class="actions">
      <li><a href="#" @click="deleteNote">delete</a></li>
      <li v-if="fleetingNoteObj.isText"><a href="#" @click="editNote">edit</a></li>
      <li><a href="#" @click="addToBag">bag</a></li>
      <li><a href="#" @click="linkNote">link</a></li>
      <li><a href="#" @click="unlinkNote">unlink</a></li>
      <li><a href="#" @click="showLinkToDatePrompt">date</a></li>
      <li><a href="#" @click="sendToPort">port</a></li>
      <li><a href="#" @click="addToStack">stack</a></li>
      <li><a href="#" @click="toggleSelectNote">select</a></li>
    </ul>
  </article>
  </transition>
</template>

<script>
  import moment from 'moment'
  import 'moment/locale/de'
  import MarkdownIt from 'markdown-it'
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
    },
    data: function () {
      return {
        moment: moment,
        md: new MarkdownIt({linkify: true}),
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
        var rendered = this.renderedContent
        if (this.searchString.length > 0) {
          return rendered.replace(
            new RegExp(this.searchString, 'gi'),
            '<span class="match">$&</span>'
          )
        }
        else {
          return rendered
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
        if (event.key === "Escape") {
          // this.closeModal()
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
      intoNewNote(event) {
        this.bus.$emit('newNote', this.fleetingNoteObj.content)
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
            }
          }
          if (registerPath) {
            var stack = $this.fleetingNoteObj.collection.stacks.getStackByPath(registerPath)
            var stackContent = stack.getContent()
            var items = []
            var id = 1
            for (let i of stackContent) {
              if (!i.isStack && i.content.toLowerCase().indexOf(searchString) > -1) {
                items.push({
                  id: id,
                  lucideIcon: 'AtSign',
                  label: i.abstract,
                  description: registerName,
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
            return items
          }
          var itemsFiltered = $items.filter(item => {
            return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
          })
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
          return itemsFiltered
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
                if ((fn.inInbox && $this.fleetingNoteObj.inInbox) || (fn.stack == $this.fleetingNoteObj.stack)) {
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
      },
      onCmReady(cm) {
        console.log(cm)
      }
    },
    mounted() {
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
    box-shadow: 0 0 0 3px cornflowerblue;
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


.fleetingNote .content {
  padding: 2px;
  font-family: 'Georgia';
  margin-top: 5px;
  margin-bottom: 5px;
  word-break: break-word;
  .match {
    background: #00000012;
    border: 1px solid #ababab;
    border-radius: 5px;
    padding: 2px;
  }
  blockquote {
    border-left: 3px solid #cfdae6;
    padding-left: 5px;
  }
  a {
    color: royalblue;
  }
  div p:last-child {
    margin-block-end: 0;
  }
  .image {
    max-height: 250px;
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
      height: 60vh;
      &.CodeMirror-focused {
        border-color: cornflowerblue;
        border-style: dashed;
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
  background: rgba(255, 255, 255, 0.1) !important;
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
  font-family: 'PT Mono';
}

.fleetingNote .header .ago {
  padding-right: 5px;
}

.fleetingNote .header .timestamp {
  font-size: 10px;
}

.fleetingNote ul.actions {
  padding-inline-start: 0;
  margin: 0;
  li {
    display: inline-block;
    list-style: none;
    padding-inline-start: 0;
    padding-right: 6px;
    a {
      color: #888;
      text-decoration: none;
      font-size: 12px;
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
