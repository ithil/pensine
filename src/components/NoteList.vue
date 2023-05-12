<template>
  <div class="noteList" tabindex="10" @keydown="keymonitor" ref="noteList">
    <div class="stackFilterBox" v-if="enableStackFilterBox && notes.length > 0" >
      <span class="clearStackFilter" @click="clearStackFilter"><Icon name="XOctagon" /></span>
      <span
      v-for="[stack, number] in stackDistribution"
      :key="stack"
      @click="handleStackFilter(stack, $event)"
      :class="{ included: filter.includeStacks.includes(stack), excluded: filter.excludeStacks.includes(stack)}"
      >
        <span class="stack">
          <Icon name="Layers" />
          {{stack}}
        </span>
        <span class="number">{{number}}</span>
      </span>
    </div>
    <div class="leftHandBox" ref="leftHandBox" v-if="showLeftHandBox" >
      <collapse v-if="starredNotes.length > 0" :collapsed="false">
        <template v-slot:header="slotProps">
          <h2 @click="slotProps.toggle()">Starred notes</h2>
        </template>
        <template v-slot:body>
          <ul>
            <li v-for="n in starredNotes" :key="n.relativePath"
            class="relation"
            :class="{ title: n.title ? true : false }"
            :data-stack="n.stack"
            @click="focusNote(n);scrollFocusedIntoView()"
            >
              <Icon name="Star" />
              <span class="abstract">{{n.abstract}}</span>
            </li>
          </ul>
        </template>
      </collapse>
      <collapse :collapsed="!outlineOpen" ref="outline">
        <template v-slot:header="slotProps">
          <h2 @click="slotProps.toggle()">Note list outline</h2>
        </template>
        <template v-slot:body>
          <ul>
            <li v-for="n in processedNotes" :key="n.relativePath"
            class="relation"
            :class="{ title: n.title ? true : false, focused: focusedNotePath == n.path, selected: selectedNotes.some(i => i.path == n.path) }"
            :ref="focusedNotePath == n.path ? 'focusedInOutline' : undefined"
            @click="focusNote(n);scrollFocusedIntoView()"
            >
              <span class="abstract">{{n.abstract}}</span>
            </li>
          </ul>
        </template>
      </collapse>
      <collapse class="filterByDate" v-if="Object.keys(calendarDistribution).length > 0">
        <template v-slot:header="slotProps">
          <h2 @click="slotProps.toggle()">Filter by date</h2>
        </template>
        <template v-slot:body>
          <ul>
            <collapse v-for="(yearItem, year) in calendarDistribution" :key="year">
              <template v-slot:header="slotPropsYear">
                <li class="tree-row">
                  <span class="tree-toggle" @click.stop="slotPropsYear.toggle()">
                    <span v-if="!slotPropsYear.isCollapsed">
                      <Icon name="ChevronDown" />
                    </span>
                    <span v-else>
                      <Icon name="ChevronRight" />
                    </span>
                  </span>
                  <span class="tree-element year" @click="slotPropsYear.toggle()">
                    <Icon name="Calendar" />
                    <span class="label">{{year}}</span>
                    <span class="amount">{{yearItem.amount}}</span>
                  </span>
              </li>
            </template>
            <template v-slot:body>
              <div class="tree-child">
              <collapse v-for="(monthItem, month) in yearItem" :key="`${year}_${month}`">
                <template v-slot:header="slotPropsMonth">
                  <li class="tree-row">
                    <span class="tree-toggle" @click.stop="slotPropsMonth.toggle()">
                      <span v-if="!slotPropsMonth.isCollapsed">
                        <Icon name="ChevronDown" />
                      </span>
                      <span v-else>
                        <Icon name="ChevronRight" />
                      </span>
                    </span>
                    <span class="tree-element month" @click="slotPropsMonth.toggle()">
                      <Icon name="CalendarDays" />
                      <span class="label">{{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month]}} {{year}}</span>
                      <span class="amount">{{monthItem.amount}}</span>
                    </span>
                  </li>
                </template>
                <template v-slot:body>
                  <div class="tree-child">
                  <collapse v-for="(dayItem, day) in monthItem" :key="`${year}_${month}_${day}`">
                    <template v-slot:header="slotPropsDay">
                      <li class="tree-row">
                        <span class="tree-toggle" @click.stop="slotPropsDay.toggle()">
                          <span v-if="!slotPropsDay.isCollapsed">
                            <Icon name="ChevronDown" />
                          </span>
                          <span v-else>
                            <Icon name="ChevronRight" />
                          </span>
                        </span>
                        <span class="tree-element day" @click="slotPropsDay.toggle()">
                          <Icon name="CalendarX" />
                          <span class="label">{{day}} {{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month]}} {{year}}</span>
                          <span class="amount">{{dayItem.length}}</span>
                        </span>
                      </li>
                    </template>
                    <template v-slot:body>
                      <div class="tree-child">
                      <li v-for="n in dayItem" key="n.relativePath"
                      class="relation tree-row"
                      :class="{ title: n.title ? true : false }"
                      :data-stack="n.stack"
                      @click="focusNote(n);scrollFocusedIntoView()"
                      >
                        {{n.abstract}}
                      </li>
                      </div>
                    </template>
                  </collapse>
                  </div>
                </template>
              </collapse>
              </div>
            </template>
          </collapse>
        </ul>
        </template>
      </collapse>
      <collapse>
        <template v-slot:header="slotProps">
          <h2 @click="slotProps.toggle()">Filter by relations</h2>
        </template>
        <template v-slot:body>
          <a class="clearRelationFilterButton" @click="clearRelationFilter">Clear filter</a>
          <input type="checkbox" id="relationsFilterTagsOnly" v-model="relationsFilterTagsOnly">
          <label for="relationsFilterTagsOnly">Tags only</label>
          <ul>
            <li v-for="r in relationDistribution" :key="r.note.relativePath"
            class="relation"
            :class="{ title: r.note.title ? true : false, included: filter.includeRelations.map(n => n.relativePath).includes(r.note.relativePath), excluded: filter.excludeRelations.map(n => n.relativePath).includes(r.note.relativePath) }"
            @click="handleRelationFilter(r.note, $event)"
            :data-stack="r.note.stack"
            >
              <Icon v-if="getCustomIcon(r.note.stack)" :name="getCustomIcon(r.note.stack)" />
              <Icon v-else name="FileText" />
              <span class="abstract">{{r.note.abstract}}</span>
              <span class="amount">{{r.amount}}</span>
            </li>
          </ul>
        </template>
      </collapse>
    </div>
    <div class="notes">
      <div v-for="f in processedNotes" :key="f.filename">
        <note
        :noteObj="f"
        :options="noteOptions"
        @selectNote="selectNote"
        @unselectNote="unselectNote"
        @focusNote="focusNote"
        @scrollFocusedIntoView="scrollFocusedIntoView"
        @markNote="markNote"
        @gotoMark="gotoMark"
        :class="checkFocus(f) ? 'focused' : ''"
        :isFocused="checkFocus(f)"
        :searchString="searchString"
        ref="noteItems"
        >
        </note>
      </div>
    </div>
    <div class="searchBar" v-if="searchBarVisible">
      <span class="statusBarItem">Search for:</span>
      <span class="statusBarItem">
        <input
        v-model="searchString"
        ref="searchInput"
        @keydown="searchKeymonitor"
        ></input>
    </span>
    </div>
  <div class="overview_modal">
    <div class="overview_modal_backdrop" @click="showOverviewModal=false" v-if="showOverviewModal"/>
      <div class="overview_modal_dialog" ref="overviewModalDialog" tabindex="42" v-if="showOverviewModal" @keydown="overviewModalKeymonitor" @click="clickOnOverviewBackground($event)">
        <div class="overview_grid">
          <div
          class="note"
          :class="{ concise: overviewMode == 'concise' }"
          v-for="f in processedNotes"
          :key="f.filename"
          @click="clickOnOverviewNote($event, f)"
          :title="moment(f.date).format('ddd DD. MMMM YYYY HH:mm:ss')"
          >
            <div v-if="['title', 'date'].includes(overviewMode)">
              <h1 v-if="f.title">{{f.title}}</h1>
              <span v-else>{{f.abstract}}</span>
              <div class="date" v-if="overviewMode=='date'">
                <Icon name="Calendar" />
                {{moment(f.date).format('ddd DD. MMM YYYY')}}
              </div>
            </div>
            <div v-else v-html="f.contentRendered">
            </div>
          </div>
        </div>
      </div>
  </div>
    <portal to="statusBarLeft" :order="1" v-if="enableStatusBar && portalActive">
      <span v-if="selectedNotes.length > 0" class="statusBarSection">
        <span class="statusBarItem bold">{{selectedNotes.length}} selected</span>
        <span class="statusBarItem">➝</span>
        <span class="statusBarItem clickable" @click="deleteSelectedNotes">
          <Icon name="Trash" />
          delete
        </span>
        <span class="statusBarItem clickable" @click="addSelectedToStack">
          <Icon name="Layers" />
          stack
        </span>
        <span class="statusBarItem clickable" @click="sendSelectedToPort">
          <Icon name="Truck" />
          port
        </span>
        <span class="statusBarItem clickable" @click="linkSelectedNotes">
          <Icon name="Link" />
          link
        </span>
        <span class="statusBarItem clickable">
          <Icon name="GitMerge" />
          merge
        </span>
      </span>
    </portal>
    <portal to="statusBarRight" :order="1" v-if="enableStatusBar && portalActive">
      <span class="keybuffer">{{fullKeybuffer}}</span>
      <span v-if="$store.state.bag.length > 0" @click="showBag" class="statusBarItem clickable">
        <Icon name="Pocket" /> {{$store.state.bag.length}}
      </span>
      <span v-if="focusedNoteIndex != null" class="statusBarItem focusedNoteIndex">{{focusedNoteIndex + 1}}</span>
      <span class="statusBarItem">
        <Icon name="FileText" />
        <span v-if="processedNotes.length != notes.length" class="filteredItemCount"> {{processedNotes.length}} /</span> {{notes.length}}
      </span>
    </portal>
  </div>
</template>

<script>
import Vue from 'vue'
import fs from 'fs'
import path from 'path'
import sanitizeFilename from 'sanitize-filename'
import fuzzysort from 'fuzzysort'
import moment from 'moment'
import 'moment/locale/de'
import Note from '@/components/Note.vue'
import MarkdownIt from 'markdown-it'
import { clipboard, shell, nativeImage } from 'electron'
import Icon from '@/components/Icon.vue'
import Collapse from '@/components/Collapse.vue'

function* arrIterator(arr) {
  var len = arr.length
  var i = 0
  var dir = 1
  while (true) {
    dir = yield arr[i]
    dir = dir || 1
    i = i + dir
    if (i < 0) {
      i = len + i
    }
    else if (i >= len) {
      i = 0 + (len - i)
    }
  }
}

export default {
  name: 'note-list',
  props: {
    'notes': Array,
    'noteOptions': {
      type: Object,
      default() {
        return {}
      },
    },
    'filterTerm': {
      type: String,
      default: '',
    },
    'sortOrder': {
      type: String,
      default: 'oldestFirst',
    },
    'stack': Object,
    'enableStatusBar': {
      type: Boolean,
      default: true,
    },
    'enableStackFilterBox': {
      type: Boolean,
      default: false,
    },
    'showLeftHandBox': {
      type: Boolean,
      default: false,
    },
    'outlineOpen': {
      type: Boolean,
      default: false,
    },
  },
  components: {
    Note,
    Icon,
    Collapse,
  },
  data() {
    return {
      selectedNotes: [],
      markedNotes: {},
      focusedNotePath: '',
      md: new MarkdownIt({linkify: true}),
      portalActive: true,
      fullKeybuffer: '',
      keybuffer: '',
      keybufferCount: null,
      keybufferRegister: null,
      isMounted: false,
      searchString: '',
      searchBarVisible: false,
      foundItems: [],
      resultsIt: null,
      filter: {
        includeStacks: [],
        excludeStacks: [],
        includeRelations: [],
        excludeRelations: [],
      },
      scrollToFocusedNoteOnNextUpdate: false,
      showOverviewModal: false,
      overviewMode: 'title',
      relationsFilterTagsOnly: false,
      previouslyFocusedElement: null,
      moment: moment,
    }
  },
  methods: {
    updateNotes() {
      this.$emit('updateNotes')
    },
    setFocusToFirstNote() {
      this.$nextTick(() => {
        this.focusedNotePath = this.processedNotes[0] ? this.processedNotes[0].path : ''
      })
    },
    selectNote(noteObj) {
      this.selectedNotes.push(noteObj)
    },
    unselectNote(noteObj) {
      var index = this.selectedNotes.findIndex(n => n.path == noteObj.path)
      this.selectedNotes.splice(index, 1)
    },
    markNote(noteObj, mark) {
      this.markedNotes[mark] = noteObj
    },
    gotoMark(mark) {
      if (this.markedNotes[mark]) {
        this.focusNote(this.markedNotes[mark])
        this.scrollFocusedIntoView()
      }
    },
    getCustomIcon(stackRelativePath) {
      var stackStyleProps = this.$store.state.currentNoteCollection.getStackStyleProps(stackRelativePath)
      return stackStyleProps['icon'] || null
    },
    chooseNoteModal() {
      var $this = this
      var processedNotes = this.processedNotes
      var items = processedNotes.map(note => {
        let numberOfLinks = note.relations.length
        return {
          label: note.abstract,
          lucideIcon: 'FileText',
          description: `${numberOfLinks > 0 ? numberOfLinks+' relations – ' : ''}${moment(note.date).format('DD.MM.YYYY')}`,
          action:() => {
            $this.focusNote(note)
            $this.scrollFocusedIntoView()
          }
        }
      })
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
    toggleOutline() {
      this.$refs.outline.toggle()
    },
    stackFilter(mode) {
      var $this = this
      var notes = this.notes
      var stackList = [...new Set(notes.map(note => note.stack))]
      var items = stackList.map(s => {
        return {
          label: s,
          lucideIcon: 'Layers',
          description: 'Stack',
          action:() => {
            if (!mode || (mode == 'include')) {
              if (!Array.isArray(this.filter.includeStacks)) {
                this.filter.includeStacks = []
              }
              this.filter.includeStacks.push(s)
            }
            else if (mode == 'exclude') {
              if (!Array.isArray(this.filter.excludeStacks)) {
                this.filter.excludeStacks = []
              }
              this.filter.excludeStacks.push(s)
            }
          }
        }
      })
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
    clearStackFilter() {
      this.filter.includeStacks = []
      this.filter.excludeStacks = []
    },
    relationFilter(mode) {
      var $this = this
      var items = this.relationDistribution.map(r => {
        return {
          label: r.note.abstract,
          lucideIcon: 'FileText',
          description: `${r.amount} notes`,
          action:() => {
            if (!mode || (mode == 'include')) {
              if (!Array.isArray(this.filter.includeRelations)) {
                this.filter.includeRelations = []
              }
              this.filter.includeRelations.push(r.note)
            }
            else if (mode == 'exclude') {
              if (!Array.isArray(this.filter.excludeRelations)) {
                this.filter.excludeRelations = []
              }
              this.filter.excludeRelations.push(r.note)
            }
          }
        }
      })
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
    clearRelationFilter() {
      this.filter.includeRelations = []
      this.filter.excludeRelations = []
    },
    handleStackFilter(stack, event) {
      if (event.shiftKey) {
        if (!Array.isArray(this.filter.excludeStacks)) {
          this.filter.excludeStacks = []
        }
        this.filter.excludeStacks.push(stack)
      }
      else {
        this.filter.includeStacks = [stack]
      }
    },
    handleRelationFilter(relation, event) {
      if (event.shiftKey) {
        if (!Array.isArray(this.filter.excludeRelations)) {
          this.filter.excludeRelations = []
        }
        this.filter.excludeRelations.push(relation)
      }
      else {
        this.filter.includeRelations = [relation]
      }
      event.preventDefault()
    },
    checkFocus(f) {
      if (f && f.path && this.focusedNotePath) {
        return f.path == this.focusedNotePath
      }
      return false
    },
    showBag() {
      var $this = this
      var bag = this.$store.state.bag
      var items = bag.map(notePath => {
        var note = $this.$store.state.currentNoteCollection.getNoteByPath(notePath)
        if (note) {
          return {
            label: note.abstract,
            lucideIcon: 'File',
            description: note.stack,
            action:() => {
              console.log(note.path)
              this.$store.commit('removeFromBag', note.path)
            }
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
          lucideIcon: 'Delete',
          label: 'Empty Bag',
          action: () => {
            this.$store.commit('emptyBag')
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
    deleteSelectedNotes(event) {
      var $this = this
      this.$store.commit('triggerCustomTextPrompt', {
        message: `Are you sure you want to delete ${this.selectedNotes.length} notes?`,
        action: (text) => {
          if (['y', 'yes'].includes(text.trim())) {
            for (let n of $this.selectedNotes) {
              n.delete()
            }
            $this.selectedNotes = []
          }
        }
      })
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    linkSelectedNotes() {
      var $this = this
      var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
      var items = []
      var getSubItemsOfStack = function (stack) {
        var notes = stack.getContent().filter(i => !i.isStack)
        var noteList = []
        for (let note of notes) {
          let numberOfLinks = note.relations.length
          noteList.push({
            label: note.abstract,
            lucideIcon: 'FileText',
            description: `${numberOfLinks} relations`,
            description: `${numberOfLinks > 0 ? numberOfLinks+' relations – ' : ''}${moment(note.date).format('DD.MM.YYYY')}`,
            type: 'note',
            action: () => {
              setTimeout(() => {
                $this.$store.commit('triggerCustomTextPrompt', {
                  message: `Edge Properties (comma-separated)`,
                  action: (edgeProperties) => {
                    edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                    for (let n of $this.selectedNotes) {
                      n.addLink(note.relativePath, edgeProperties)
                    }
                    $this.selectedNotes = []
                    for (let n of $this.$refs.noteItems) {
                      n.selected = false
                    }
                    $this.$refs.noteList.focus()
                  }
                })
              }, 50)
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
              setTimeout(() => {
                $this.$store.commit('triggerCustomTextPrompt', {
                  message: `Edge Properties (comma-separated)`,
                  action: (edgeProperties) => {
                    edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                    for (let n of $this.selectedNotes) {
                      n.addLink(note.relativePath, edgeProperties)
                    }
                    $this.selectedNotes = []
                    for (let n of $this.$refs.noteItems) {
                      n.selected = false
                    }
                    $this.$refs.noteList.focus()
                  }
                })
              }, 50)
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
    linkSelectedNotesChoosingFromBag() {
      var $this = this
      var bag = this.$store.state.bag
      var items = bag.map(notePath => {
        var note = $this.$store.state.currentNoteCollection.getNoteByPath(notePath)
        if (note) {
          return {
            label: note.abstract,
            lucideIcon: 'File',
            action:() => {
              setTimeout(() => {
                this.$store.commit('triggerCustomTextPrompt', {
                  message: `Edge Properties (comma-separated)`,
                  action: (edgeProperties) => {
                    edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                    for (let n of $this.selectedNotes) {
                      n.addLink(note.relativePath, edgeProperties)
                    }
                    $this.selectedNotes = []
                    for (let n of this.$refs.noteItems) {
                      n.selected = false
                    }
                    this.$refs.noteList.focus()
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
        var registers = $this.$store.state.currentNoteCollection.registers
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
          var stack = $this.$store.state.currentNoteCollection.stacks.getStackByPath(registerPath)
          var stackContent = stack.getContent()
          stackContent.sort((a,b) => b.numberOfRelations - a.numberOfRelations)
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
                        for (let n of $this.selectedNotes) {
                          n.addLink(i.relativePath, edgeProperties)
                        }
                        $this.selectedNotes = []
                        for (let n of $this.$refs.noteItems) {
                          n.selected = false
                        }
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
          lucideIcon: 'FilePlus',
          label: 'Link all bagged notes',
          action: () => {
            for (let notePath of bag) {
              for (let n of $this.selectedNotes) {
                // this notePath is absoulte but needs to be relative!!!
                n.addLink(notePath)
              }
              $this.selectedNotes = []
              for (let n of $this.$refs.noteItems) {
                n.selected = false
              }
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
    tagSelectedNotes() {
      var $this = this
      var stacksPath = $this.$store.state.currentNoteCollection.paths.stacks
      var tagStackPath = path.join(stacksPath, 'tags')
      if (!fs.existsSync(tagStackPath)) {
        fs.mkdirSync(tagStackPath, { recursive: true })
      }
      var stack = $this.$store.state.currentNoteCollection.stacks.getStackByPath('tags')
      var stackContent = stack.getContent()
      var items = []
      var filter = function (context) {
        var $items = context.itemsWithIds
        var searchString = context.searchString.toLowerCase()
        var items = []
        var id = 1
        for (let i of stackContent) {
          if (!i.isStack && i.content.toLowerCase().indexOf(searchString) > -1) {
            items.push({
              id: id,
              lucideIcon: 'Tag',
              label: i.abstract,
              action: () => {
                var edgeProperties = ['tag']
                if ($this.selectedNotes.length > 0) {
                  for (let n of $this.selectedNotes) {
                    n.addLink(i.relativePath, edgeProperties)
                  }
                  $this.selectedNotes = []
                  for (let n of $this.$refs.noteItems) {
                    n.selected = false
                  }
                }
                else {
                  let n = $this.getFocusedNoteItem().noteObj
                  if (n) {
                    n.addLink(i.relativePath, edgeProperties)
                  }
                }
              },
            })
          }
          id++
        }
        var newTag = context.searchString.trim()
        items.push({
          id: id + 1,
          lucideIcon: 'FilePlus',
          label: newTag,
          description: 'Create new tag',
          action: () => {
            var newNotePath = path.join(tagStackPath, `${sanitizeFilename(newTag)}.md`)
            fs.writeFileSync(newNotePath, `# ${newTag}`, 'utf8')
            var newNote = $this.$store.state.currentNoteCollection.getNoteByPath(newNotePath)
            var edgeProperties = ['tag']
            if ($this.selectedNotes.length > 0) {
              for (let n of $this.selectedNotes) {
                n.addLink(newNote.relativePath, edgeProperties)
              }
              $this.selectedNotes = []
              for (let n of $this.$refs.noteItems) {
                n.selected = false
              }
            }
            else {
              let n = $this.getFocusedNoteItem().noteObj
              if (n) {
                n.addLink(newNote.relativePath, edgeProperties)
              }
            }
          },
        })
        return items
      }
      this.$store.commit('triggerCustomSelectList', {items, filter})
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    addSelectedToStack(event) {
      var $this = this
      var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
      var items = stacks.map(s => {
        return {
          label: s.relativePath,
          lucideIcon: 'Layers',
          action:() => {
            for (let n of $this.selectedNotes) {
              n.sendToStack(s.relativePath)
            }
            $this.selectedNotes = []
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
            for (let n of $this.selectedNotes) {
              n.sendToStack(context.searchString.trim())
            }
            $this.selectedNotes = []
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
    sendSelectedToPort(event) {
      var $this = this
      var ports = this.$global.pensieve.ports
      ports = ports.filter(p => p.collectionName != this.$store.state.currentNoteCollection.name)
      var items = ports.map(p => {
        return {
          label: p.name,
          lucideIcon: 'Truck',
          description: p.collectionName,
          action:() => {
            for (let n of $this.selectedNotes) {
              p.sendToPort(n)
            }
            $this.selectedNotes = []
            this.$refs.noteList.focus()
          }
        }
      })
      this.$store.commit('triggerCustomSelectList', {items})
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    focusNote(noteObj, event) {
      this.focusedNotePath = noteObj.path
      if (event) {
        var el = event.target
        var classes = []
        while (el) {
          if (el.classList) {
            classes = [...classes, ...el.classList.values()]
          }
          el = el.parentNode
        }
        if (!classes.includes('noteEditor')) {
          this.$refs.noteList.focus()
        }
      }
      else {
        this.$refs.noteList.focus()
      }
    },
    focusNext(c = 1) {
      var index = this.processedNotes.findIndex(i => i.path == this.focusedNotePath)
      var len = this.processedNotes.length
      if (index > -1) {
        if (index + c >= len) {
          let diff = (index + c) - len
          this.focusedNotePath = this.processedNotes[0 + diff].path
        }
        else if (index + c < 0) {
          let diff = Math.abs(index + c)
          this.focusedNotePath = this.processedNotes[len - diff].path
        }
        else {
          this.focusedNotePath = this.processedNotes[index + c].path
        }
        this.scrollFocusedIntoView()
      }
    },
    scrollFocusedIntoView(behavior='smooth') {
      this.$nextTick(function () {
        var $this = this
        setTimeout(function () { // This is just a dirty hack so I can go to bed
          var focusedItem = $this.getFocusedNoteItem()
          if (focusedItem) {
            var focusedInOutline = $this.$refs.focusedInOutline
            if (focusedInOutline && focusedInOutline.length > 0) {
              focusedInOutline[0].scrollIntoView({ behavior: 'auto', block: 'center' })
            }
            focusedItem.$el.scrollIntoView({ behavior: behavior, block: 'start' })
          }
        }, 5)
      })
    },
    setFocusedNotePath(notePath) {
      this.focusedNotePath = notePath
    },
    getFocusedNoteItem() {
      return this.$refs.noteItems?.find(n => n.$el.classList.contains('focused'))
    },
    getSelectedNotesItems() {
      return this.$refs.noteItems?.filter(n => n.$el.classList.contains('selected')) || []
    },
    preventDefaultFix(event) {
      var tagName = event.target.tagName
      if (!(['INPUT', 'TEXTAREA'].includes(tagName))) {
        if (event.keyCode == 32) {
          event.stopPropagation()
          event.preventDefault()
        }
      }
    },
    enterOverview(mode) {
      this.previouslyFocusedElement = document.activeElement
      this.overviewMode = mode || 'full'
      this.showOverviewModal = true
      var $this = this
      this.$nextTick(function () {
        setTimeout(function () { // This is just a dirty hack so I can go to bed
          $this.$refs.overviewModalDialog.focus()
        }, 5)
      })
    },
    overviewModalKeymonitor(event) {
        if (event.key === "Escape") {
          this.showOverviewModal = false
          if (this.previouslyFocusedElement) {
            this.previouslyFocusedElement.focus()
          }
        }
        else if (event.key == 'j') {
          this.$refs.overviewModalDialog.scrollBy(0, 200)
        }
        else if (event.key == 'k') {
          this.$refs.overviewModalDialog.scrollBy(0, -200)
        }
        else if (event.key == 'g' && event.shiftKey) {
          this.$refs.overviewModalDialog.scrollTop = this.$refs.overviewModalDialog.scrollHeight
        }
        else if (event.key == 'g') {
          this.$refs.overviewModalDialog.scrollTop = 0
        }
        event.stopPropagation()
        event.preventDefault()
    },
    clickOnOverviewBackground(event) {
      if (event.target == event.currentTarget) {
        this.showOverviewModal = false
        if (this.previouslyFocusedElement) {
          this.previouslyFocusedElement.focus()
        }
      }
    },
    clickOnOverviewNote(event, note) {
      this.showOverviewModal = false
      this.focusNote(note)
      this.scrollFocusedIntoView()
      event.stopPropagation()
      event.preventDefault()
    },
    keymonitor(event) {
      var tagName = event.target.tagName
      var el = event.target
      var classes = []
      while (el) {
        if (el.classList) {
          classes = [...classes, ...el.classList.values()]
        }
        el = el.parentNode
      }
      if (!(['INPUT', 'TEXTAREA'].includes(tagName)) && !classes.includes('noteEditor')) {
        if (event.key === "Escape") {
          this.fullKeybuffer = ''
        }
        else if (event.key === 'Enter') {
          let note = this.getFocusedNoteItem().noteObj
          this.$router.push(`/note/${encodeURIComponent(note.relativePath)}`)
        }
        else if (event.metaKey && event.key=='f') {
          this.$emit('focusFilterInput')
        }
        else if (event.metaKey && event.key=='r') {
          this.chooseNoteModal()
        }
        else if (!event.ctrlKey && event.key === 'Tab' && event.shiftKey) {
          this.$emit('tabLeft')
          event.preventDefault()
          event.stopPropagation()
        }
        else if (!event.ctrlKey && event.key === 'Tab') {
          this.$emit('tabRight')
          event.preventDefault()
          event.stopPropagation()
        }
        else if (event.key.length == 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
          this.fullKeybuffer += event.key
          var match = this.fullKeybuffer.match(/(\d+)?("([a-zA-Z0-9+]))?(.+)/)
          this.keybufferCount = match[1]
          this.keybufferRegister = match[3]
          this.keybuffer = match[4]
          event.stopPropagation()
          event.preventDefault()
          if (this.keybuffer == "j")
          {
            // Focus next item down
            this.focusNext(1 * (this.keybufferCount || 1))
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "k")
          {
            // Focus next item up
            this.focusNext(-1 * (this.keybufferCount || 1))
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gg")
          {
            if (this.keybufferCount) {
              // Focus nth item in list
              let index = this.keybufferCount - 1
              if (0 <= index && index < this.processedNotes.length) {
                this.focusedNotePath = this.processedNotes[index].path
              }
            }
            else {
              // Focus first item in list
              this.focusedNotePath = this.processedNotes[0].path
            }
            this.scrollFocusedIntoView()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "G")
          {
            // Focus last item in list
            var len = this.processedNotes.length
            this.focusedNotePath = this.processedNotes[len - 1].path
            this.scrollFocusedIntoView()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zz")
          {
            // Scroll to center of focused item
            var $this = this
            setTimeout(function () { // This is just a dirty hack so I can go to bed
              var focusedItem = $this.getFocusedNoteItem()
              if (focusedItem) {
                focusedItem.$el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }, 5)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zt")
          {
            // Scroll to top of focused item
            var $this = this
            setTimeout(function () { // This is just a dirty hack so I can go to bed
              var focusedItem = $this.getFocusedNoteItem()
              if (focusedItem) {
                focusedItem.$el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }, 5)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zb")
          {
            // Scroll to bottom of focused item
            var $this = this
            setTimeout(function () { // This is just a dirty hack so I can go to bed
              var focusedItem = $this.getFocusedNoteItem()
              if (focusedItem) {
                focusedItem.$el.scrollIntoView({ behavior: 'smooth', block: 'end' })
              }
            }, 5)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "za")
          {
            // Toggle compact mode (fold) of focused item
            if (this.selectedNotes.length > 0) {
              let selectedNotesItems = this.getSelectedNotesItems()
              for (let n of selectedNotesItems) {
                n.toggleCompactMode()
              }
            }
            else {
              this.getFocusedNoteItem().toggleCompactMode()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zo")
          {
            // Disable compact mode (open fold) of focused item
            if (this.selectedNotes.length > 0) {
              let selectedNotesItems = this.getSelectedNotesItems()
              for (let n of selectedNotesItems) {
                n.toggleCompactMode(false)
              }
            }
            else {
              this.getFocusedNoteItem().toggleCompactMode(false)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zO")
          {
            // Disable compact mode (open fold) for all items
            let allNotesItems = this.$refs.noteItems
            for (let n of allNotesItems) {
              n.toggleCompactMode(false)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zc")
          {
            // Enable compact mode (close fold) of focused item
            if (this.selectedNotes.length > 0) {
              let selectedNotesItems = this.getSelectedNotesItems()
              for (let n of selectedNotesItems) {
                n.toggleCompactMode(true)
              }
            }
            else {
              this.getFocusedNoteItem().toggleCompactMode(true)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zC")
          {
            // Enable compact mode (close fold) for all items
            let allNotesItems = this.$refs.noteItems
            for (let n of allNotesItems) {
              n.toggleCompactMode(true)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "r")
          {
            // Refresh note list
            this.updateNotes()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == " ")
          {
            // Toggle selection of focused item
            this.getFocusedNoteItem().toggleSelectNote()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "t")
          {
            // Move all selected items OR focused item to stack
            if (this.selectedNotes.length > 0) {
              this.addSelectedToStack()
            }
            else {
              this.getFocusedNoteItem().addToStack()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",p")
          {
            // Send all selected items OR focused item to port
            if (this.selectedNotes.length > 0) {
              this.sendSelectedToPort()
            }
            else {
              this.getFocusedNoteItem().sendToPort()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "x")
          {
            // Delete all selected items OR focused item
            if (this.selectedNotes.length > 0) {
              this.deleteSelectedNotes()
            }
            else {
              this.getFocusedNoteItem().deleteNote()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "e")
          {
            // Edit focused note
            this.getFocusedNoteItem().editNote()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "ll")
          {
            // Show links of focused note
            this.getFocusedNoteItem().showLinks()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "la")
          {
            // Add links to all selected notes OR focused note
            if (this.selectedNotes.length > 0) {
              this.linkSelectedNotes()
            }
            else {
              this.getFocusedNoteItem().linkNote()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "lb")
          {
            // Add links to all selected notes OR focused note choosing from the bag
            if (this.selectedNotes.length > 0) {
              this.linkSelectedNotesChoosingFromBag()
            }
            else {
              this.getFocusedNoteItem().linkNoteChoosingFromBag()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "ls")
          {
            // Add multiple links to all selected notes OR focused note choosing from one stack
            if (this.selectedNotes.length > 0) {
            }
            else {
              this.getFocusedNoteItem().linkNoteChoosingFromStack()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "lu")
          {
            // Remove a link from selected note
            this.getFocusedNoteItem().unlinkNote()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "lt")
          {
            // Add tag to all selected notes OR focused note
            this.tagSelectedNotes()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "b")
          {
            // Add focused note to bag
            let note = this.getFocusedNoteItem().noteObj
            this.$store.commit('addToBag', note.path)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "B")
          {
            this.showBag()
            this.fullKeybuffer = ''
          }
          else if (/^m[a-zA-Z0-9]/.test(this.keybuffer))
          {
            // Set jump mark for focused note
            let mark = this.keybuffer[1]
            this.markNote(this.getFocusedNoteItem().noteObj, mark)
            this.fullKeybuffer = ''
          }
          else if (/^'[a-zA-Z0-9]/.test(this.keybuffer))
          {
            // Jump to jump mark
            let mark = this.keybuffer[1]
            this.gotoMark(mark)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "''")
          {
            var items = []
            var marks = this.markedNotes
            if (Object.keys(marks).length == 0) {
              items.push({
                label: 'No marks yet',
              })
            }
            else {
              for (let [mark, note] of Object.entries(marks)) {
                items.push({
                  label: note.abstract,
                  key: mark,
                  lucideIcon: 'Pin',
                  action: () => {
                    this.gotoMark(mark)
                  },
                })
              }
            }
            this.$store.commit('triggerCustomPopoverList', {
              message: `Marks`,
              items: items,
              options: {hintMode: false},
            })
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "fsi")
          {
            // Add to include stack filter
            this.stackFilter('include')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "fse")
          {
            // Add to exclude stack filter
            this.stackFilter('exclude')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "fsc")
          {
            // Clear stack filter
            this.clearStackFilter()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "fri")
          {
            // Add to include relation filter
            this.relationFilter('include')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "fre")
          {
            // Add to exclude relation filter
            this.relationFilter('exclude')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "frc")
          {
            // Clear relation filter
            this.clearRelationFilter()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "fc")
          {
            // Clear relation filter
            this.clearRelationFilter()
            this.clearStackFilter()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yr")
          {
            // Copy note as markdown (raw) to clipboard
            var noteItem = this.getFocusedNoteItem()
            var noteObj = noteItem.noteObj
            if (noteObj.isText) {
              var content = noteObj.content
              clipboard.writeText(content)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yh")
          {
            // Copy note as HTML to clipboard
            var noteItem = this.getFocusedNoteItem()
            var noteObj = noteItem.noteObj
            if (noteObj.isText) {
              var content = noteItem.renderedContent
              clipboard.writeHTML(content)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yi")
          {
            // Copy image to clipboard if note is image
            var noteObj = this.getFocusedNoteItem().noteObj
            if (noteObj.isImage) {
              let dataURL = `data:${noteObj.mime};base64,${noteObj.contentBase64}`
              let img = nativeImage.createFromDataURL(dataURL)
              clipboard.writeImage(img)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yl")
          {
            // Copy note's nth link to clipboard
            var count = this.keybufferCount || 1
            var noteObj = this.getFocusedNoteItem().noteObj
            if (noteObj.webLinks[count - 1]) {
              clipboard.writeText(noteObj.webLinks[count - 1])
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yp")
          {
            // Copy note's path (.md) to clipboard
            var noteObj = this.getFocusedNoteItem().noteObj
            clipboard.writeText(noteObj.path)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yt")
          {
            // Copy note's title to clipboard
            var noteObj = this.getFocusedNoteItem().noteObj
            clipboard.writeText(noteObj.abstract)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yuu")
          {
            // Copy note's last (ultimate) line as markdown
            var noteItem = this.getFocusedNoteItem()
            var noteObj = noteItem.noteObj
            if (noteObj.isText) {
              var lines = noteObj.content.split('\n')
              var lastLine = lines[lines.length -1]
              clipboard.writeText(lastLine)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yf")
          {
            // Copy note's first line as markdown
            var noteItem = this.getFocusedNoteItem()
            var noteObj = noteItem.noteObj
            if (noteObj.isText) {
              var lines = noteObj.content.split('\n')
              var firstLine = lines[0]
              clipboard.writeText(firstLine)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "pp")
          {
            // Create new note from clipboard content
            var text = clipboard.readText() || ''
            this.$emit('sendNewNote', text, {scrollIntoView: true})
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "pq")
          {
            // Create new note from clipboard content wrapped in blockquote
            var text = clipboard.readText() || ''
            var lines = text.split('\n')
            lines = lines.map(l => l.length > 0 ? `> ${l}` : '>')
            text = lines.join('\n')
            this.$emit('sendNewNote', text, {scrollIntoView: true})
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "pl")
          {
            // Create new note from clipboard content as bullet list
            var text = clipboard.readText() || ''
            var lines = text.split('\n')
            lines = lines.map(l => `* ${l}`)
            text = lines.join('\n')
            this.$emit('sendNewNote', text, {scrollIntoView: true})
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "ph")
          {
            // Create new note from clipboard content; first line as headline
            var text = clipboard.readText() || ''
            var lines = text.split('\n')
            lines[0] = `# ${lines[0]}`
            text = lines.join('\n')
            this.$emit('sendNewNote', text, {scrollIntoView: true})
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gd")
          {
            // Go to month page around this note's associated date note
            let relatedDates = this.getFocusedNoteItem().noteObj.relatedDates
            if (relatedDates.length > 0) {
              this.$store.commit('setMonthPageGoToDate', relatedDates[0])
              this.$router.push(`/calendar/month/`)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gf")
          {
            // Reveal note in finder
            var notePath = this.getFocusedNoteItem().noteObj.path
            shell.showItemInFolder(notePath)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "go")
          {
            // Open note (.md file or other) in default App
            var notePath = this.getFocusedNoteItem().noteObj.path
            shell.openPath(notePath)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gl")
          {
            // Open nth weblink of note
            var count = this.keybufferCount || 1
            var noteObj = this.getFocusedNoteItem().noteObj
            if (noteObj.webLinks[count - 1]) {
              shell.openExternal(noteObj.webLinks[count - 1])
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gi")
          {
            // Focus send box
            this.$emit('focusSendBox')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gx")
          {
            // Export note as html
            let items = [
              {
                label: '...only note',
                key: 'N',
                action: () => {
                  this.getFocusedNoteItem().exportAsHtml({ includeRelations: false })
                },
              },
              {
                label: '...with relations',
                key: 'R',
                action: () => {
                  this.getFocusedNoteItem().exportAsHtml({ includeRelations: true })
                },
              },
            ]
            this.$store.commit('triggerCustomPopoverList', {
              message: `Export as HTML`,
              items: items,
              options: {hintMode: false},
            })
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "ap")
          {
            // Add appendix note
            var noteObj = this.getFocusedNoteItem().noteObj
            var filepath = noteObj.addAppendixNote()
            var col = this.$store.state.currentNoteCollection
            var note = col.getNoteByPath(filepath)
            var encodedPath = note.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
            this.$router.push(`/note/${encodedPath}`)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",yp")
          {
            // Copy note's metadata path (.json) to clipboard
            var noteObj = this.getFocusedNoteItem().noteObj
            clipboard.writeText(noteObj.metadataPath)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",ym")
          {
            // Copy note's metadata (.json) to clipboard
            var noteObj = this.getFocusedNoteItem().noteObj
            var metadata = noteObj.getMetadata()
            if (metadata) {
              clipboard.writeText(JSON.stringify(metadata, null, 2))
            }
            else {
              clipboard.writeText(`The note "${noteObj.path}" has no metadata.`)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "sa")
          {
            // Select all notes
            this.selectedNotes = []
            for (let n of this.$refs.noteItems) {
              n.selected = true
              this.selectedNotes.push(n.noteObj)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "sn")
          {
            // Unselect all notes
            this.selectedNotes = []
            for (let n of this.$refs.noteItems) {
              n.selected = false
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "si")
          {
            // Inverse note selection
            for (let n of this.$refs.noteItems) {
              n.toggleSelectNote()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "sg")
          {
            // Select all notes above and including the focused one
            var noteObj = this.getFocusedNoteItem().noteObj
            for (let n of this.$refs.noteItems) {
              n.selected = true
              this.selectedNotes.push(n.noteObj)
              if (n.noteObj.relativePath == noteObj.relativePath) break
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "sG")
          {
            // Select all notes below and including the focused one
            var noteObj = this.getFocusedNoteItem().noteObj
            var beyondFocusedNote = false
            for (let n of this.$refs.noteItems) {
              if (n.noteObj.relativePath == noteObj.relativePath) beyondFocusedNote = true
              if (!beyondFocusedNote) continue
              n.selected = true
              this.selectedNotes.push(n.noteObj)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "sj")
          {
            // Select given number of notes below and including focused one
            var noteObj = this.getFocusedNoteItem().noteObj
            var beyondFocusedNote = false
            var count = this.keybufferCount || 1
            var counter = 0
            for (let n of this.$refs.noteItems) {
              if (n.noteObj.relativePath == noteObj.relativePath) beyondFocusedNote = true
              if (!beyondFocusedNote) continue
              if (counter > count) break
              n.selected = true
              this.selectedNotes.push(n.noteObj)
              counter++
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "sk")
          {
            // Select given number of notes above and including focused one
            var noteObj = this.getFocusedNoteItem().noteObj
            var noteItems = [...this.$refs.noteItems].reverse()
            var beyondFocusedNote = false
            var count = this.keybufferCount || 1
            var counter = 0
            for (let n of noteItems) {
              if (n.noteObj.relativePath == noteObj.relativePath) beyondFocusedNote = true
              if (!beyondFocusedNote) continue
              if (counter > count) break
              n.selected = true
              this.selectedNotes.push(n.noteObj)
              counter++
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "/")
          {
            // Search for string in notes
            this.searchBarVisible = true
            var $this = this
            this.$nextTick(function () {
              setTimeout(function () { // This is just a dirty hack so I can go to bed
                $this.$refs.searchInput.focus()
                $this.searchString = ''
              }, 5)
            })
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",c")
          {
            // Clear search
            var $this = this
            $this.searchString = ''
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "n")
          {
            // Jump to next search result
            this.fullKeybuffer = ''
            if (!(this.resultsIt && this.resultsIt.next)) {
              return
            }
            var count = this.keybufferCount || 1
            var iteration = this.resultsIt.next(1 * count)
            if (!iteration.done && iteration.value) {
              this.focusedNotePath = iteration.value.noteObj.path
              this.scrollFocusedIntoView()
            }
          }
          else if (this.keybuffer == "N")
          {
            // Jump to previous search result
            this.fullKeybuffer = ''
            if (!(this.resultsIt && this.resultsIt.next)) {
              return
            }
            var count = this.keybufferCount || 1
            var iteration = this.resultsIt.next(-1 * count)
            if (!iteration.done && iteration.value) {
              this.focusedNotePath = iteration.value.noteObj.path
              this.scrollFocusedIntoView()
            }
          }
          else if (this.keybuffer == ",s")
          {
            // Change sort order
            let items = [
              {
                label: 'Newest First',
                key: 'N',
                action: () => {
                  this.$emit('changeSortOrder', 'newestFirst')
                },
              },
              {
                label: 'Oldest First',
                key: 'O',
                action: () => {
                  this.$emit('changeSortOrder', 'oldestFirst')
                },
              },
              {
                label: 'Cal: Newest First',
                key: 'Shift+N',
                action: () => {
                  this.$emit('changeSortOrder', 'relatedDateNewestFirst')
                },
              },
              {
                label: 'Cal: Oldest First',
                key: 'Shift+O',
                action: () => {
                  this.$emit('changeSortOrder', 'relatedDateOldestFirst')
                },
              },
              {
                label: 'Mod: Newest First',
                key: 'M',
                action: () => {
                  this.$emit('changeSortOrder', 'modificationNewestFirst')
                },
              },
              {
                label: 'Mod: Oldest First',
                key: 'Shift+M',
                action: () => {
                  this.$emit('changeSortOrder', 'modificationOldestFirst')
                },
              },
              { role: 'separator' },
              {
                label: 'Most Relations',
                key: 'L',
                action: () => {
                  this.$emit('changeSortOrder', 'mostRelationsFirst')
                },
              },
              {
                label: 'Fewest Relations',
                key: 'Shift+L',
                action: () => {
                  this.$emit('changeSortOrder', 'fewestRelationsFirst')
                },
              },
              { role: 'separator' },
              {
                label: 'Alphabetical',
                key: 'A',
                action: () => {
                  this.$emit('changeSortOrder', 'alphabetical')
                },
              },
              { role: 'separator' },
              {
                label: 'Longest First',
                key: 'S',
                action: () => {
                  this.$emit('changeSortOrder', 'shortestFirst')
                },
              },
              {
                label: 'Shortest First',
                key: 'Shift+S',
                action: () => {
                  this.$emit('changeSortOrder', 'shortestFirst')
                },
              },
              { role: 'separator' },
              {
                label: 'Random',
                key: 'R',
                action: () => {
                  this.$emit('changeSortOrder', 'random')
                },
              },
              {
                label: 'Inherit',
                key: 'I',
                action: () => {
                  this.$emit('changeSortOrder', 'inherit')
                },
              },
              { role: 'separator' },
              {
                label: 'Set as Default',
                action: () => {
                  this.stack.metadata.set('sortOrder', this.sortOrder)
                  this.stack.metadata.save()
                },
              },
            ]
            this.$store.commit('triggerCustomPopoverList', {
              message: `Sort`,
              items: items,
              options: {hintMode: false},
            })
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",di")
          {
            let title = this.getFocusedNoteItem().noteObj.title
            if (title) {
              let parsedDate = moment(title, 'LLL', 'DE')
              let newDate = parsedDate.add(1, 'd')
              let content = `# ${newDate.format('dddd, D. MMMM YYYY')}`
              let notePath = this.stack.sendText(content)
              let col = this.$store.state.currentNoteCollection
              let note = col.getNoteByPath(notePath)
              var dateNote = col.createDateNode('calendar', newDate)
              note.addLink(dateNote.relativePath, ['date'])
              this.scrollToFocusedNoteOnNextUpdate = true
              this.setFocusedNotePath(notePath)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dd")
          {
            // Link note to a calendar date
            this.getFocusedNoteItem().showLinkToDatePrompt()
            this.scrollToFocusedNoteOnNextUpdate = true
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dn")
          {
            // Link note to calendar date that equals creation date
            let note = this.getFocusedNoteItem()
            note.linkToDate(note.noteObj.date)
            this.scrollToFocusedNoteOnNextUpdate = true
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dt")
          {
            // Link note to today's or nth day after today's calendar date
            this.getFocusedNoteItem().linkToDate(moment().add(this.keybufferCount || 0, 'day'))
            this.scrollToFocusedNoteOnNextUpdate = true
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dy")
          {
            // Link note to yesterday's calendar date
            this.getFocusedNoteItem().linkToDate(moment().subtract(this.keybufferCount || 1, 'day'))
            this.scrollToFocusedNoteOnNextUpdate = true
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dw")
          {
            // Link note to calendar date of last weekday X
            let today = moment()
            let count = this.keybufferCount
            count = count > 6 ? 0 : count
            this.getFocusedNoteItem().linkToDate(today.day(today.day() >= count ? count : count-7))
            this.scrollToFocusedNoteOnNextUpdate = true
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gs")
          {
            if (this.stack) {
              var starredNotes = this.stack.metadata.get('starredNotes') || []
              if (this.selectedNotes.length > 0) {
                for (let n of this.selectedNotes) {
                  if (!starredNotes.includes(n.filename)) {
                    starredNotes.push(n.filename)
                  }
                  else {
                    starredNotes = starredNotes.filter(i => i != n.filename)
                  }
                }
              }
              else {
                var focusedNote = this.getFocusedNoteItem()
                if (focusedNote) {
                  if (!starredNotes.includes(focusedNote.noteObj.filename)) {
                    starredNotes.push(focusedNote.noteObj.filename)
                  }
                  else {
                    starredNotes = starredNotes.filter(i => i != focusedNote.noteObj.filename)
                  }
                }
              }
              this.stack.metadata.set('starredNotes', starredNotes)
              this.stack.metadata.save()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gb")
          {
            var focusedNote = this.getFocusedNoteItem()
            focusedNote.noteObj.setAsBookmark()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",bg")
          {
            if (this.stack) {
              var $this = this
              this.$store.commit('triggerCustomTextPrompt', {
                message: `Enter custom background css for this stack`,
                action: (text) => {
                  this.stack.metadata.set('style.background', text.trim())
                  this.stack.metadata.save()
                }
              })
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",ii")
          {
            if (this.stack) {
              let ComponentClass = Vue.extend(Icon)
              let iconInstance = new ComponentClass()
              let listofAllIcons = iconInstance.getListOfAllIcons()
              var items = listofAllIcons.map(lucideIcon => {
                return {
                  label: lucideIcon,
                  lucideIcon,
                  action:() => {
                    this.stack.metadata.set('style.icon', lucideIcon)
                    this.stack.metadata.save()
                  }
                }
              })
              this.$store.commit('triggerCustomSelectList', {items})
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",ic")
          {
            if (this.stack) {
              var $this = this
              this.$store.commit('triggerCustomTextPrompt', {
                message: `Enter icon color for this stack`,
                action: (text) => {
                  this.stack.metadata.set('style.iconColor', text.trim())
                  this.stack.metadata.save()
                }
              })
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",ib")
          {
            if (this.stack) {
              var $this = this
              this.$store.commit('triggerCustomTextPrompt', {
                message: `Enter icon background color for this stack`,
                action: (text) => {
                  this.stack.metadata.set('style.iconBackground', text.trim())
                  this.stack.metadata.save()
                }
              })
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",nc")
          {
            if (this.stack) {
              var $this = this
              this.$store.commit('triggerCustomTextPrompt', {
                message: `Enter canvas title`,
                action: (text) => {
                  var filepath = this.stack.createCanvas({title: text})
                  this.scrollToFocusedNoteOnNextUpdate = true
                  this.setFocusedNotePath(filepath)
                }
              })
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "vt")
          {
            this.enterOverview('title')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "vd")
          {
            this.enterOverview('date')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "vf")
          {
            this.enterOverview('full')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "vc")
          {
            this.enterOverview('concise')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",o")
          {
            this.toggleOutline()
            this.fullKeybuffer = ''
          }
        }
      }
    },
    searchKeymonitor(event) {
      if (event.key === "Escape") {
        this.searchBarVisible = false
        this.searchString = ''
        this.$refs.noteList.focus()
      }
      else if (event.key === "Enter") {
        this.searchBarVisible = false
        this.$refs.noteList.focus()
      }
      else if (event.key === 'Tab' && event.shiftKey) {
        var iteration = this.resultsIt.next(-1)
        if (!iteration.done && iteration.value) {
          this.focusedNotePath = iteration.value.noteObj.path
          this.scrollFocusedIntoView()
        }
        event.preventDefault()
        event.stopPropagation()
      }
      else if (event.key === 'Tab') {
        var iteration = this.resultsIt.next(1)
        if (!iteration.done && iteration.value) {
          this.focusedNotePath = iteration.value.noteObj.path
          this.scrollFocusedIntoView()
        }
        event.preventDefault()
        event.stopPropagation()
      }
      else if (this.searchString.length > 0) {
        var index = this.$refs.noteItems.findIndex(n => n.$el.classList.contains('focused'))
        var noteItems = this.$refs.noteItems.slice(index)
          .concat(this.$refs.noteItems.slice(0,index))
        this.foundItems = noteItems
          .filter(n => n.noteObj.isText && (new RegExp(this.searchString, 'i')).test(n.content))
        this.resultsIt = arrIterator(this.foundItems)
        this.resultsIt.next()
        if (this.foundItems[0]) {
          this.focusedNotePath = this.foundItems[0].noteObj.path
          this.scrollFocusedIntoView()
        }
      }
    },
  },
  computed: {
    processedNotes() {
      var processedNotes = []
      if (this.filterTerm && this.filterTerm.length > 0) {
        processedNotes = this.notes.filter(item => {
          return item.content.toLowerCase().indexOf(this.filterTerm.toLowerCase()) > -1
        })
      }
      else {
        processedNotes = this.notes
      }
      if (this.filter.includeStacks.length > 0 || this.filter.excludeStacks.length > 0) {
        processedNotes = processedNotes.filter(item => {
          if ((this.filter.includeStacks.length > 0) && !(this.filter.excludeStacks.length > 0)) {
            return (this.filter.includeStacks.indexOf(item.stack) > -1)
          }
          if ((this.filter.includeStacks.length > 0) && (this.filter.excludeStacks.length > 0)) {
            return ((this.filter.includeStacks.indexOf(item.stack) > -1) && !(this.filter.excludeStacks.indexOf(item.stack) > -1))
          }
          if (this.filter.excludeStacks.length > 0) {
            return !(this.filter.excludeStacks.indexOf(item.stack) > -1)
          }
          return true
        })
      }
      if (this.filter.includeRelations.length > 0 || this.filter.excludeRelations.length > 0) {
        processedNotes = processedNotes.filter(item => {
          if ((this.filter.includeRelations.length > 0) && !(this.filter.excludeRelations.length > 0)) {
            return (this.filter.includeRelations.some(rn => item.rawRelations.map(i => i.notePath).includes(rn.relativePath)))
          }
          if ((this.filter.includeRelations.length > 0) && (this.filter.excludeRelations.length > 0)) {
            return (this.filter.includeRelations.some(rn => item.rawRelations.map(i => i.notePath).includes(rn.relativePath))) && !(this.filter.excludeRelations.some(rn => item.rawRelations.map(i => i.notePath).includes(rn.relativePath)))
          }
          if (this.filter.excludeRelations.length > 0) {
            return !(this.filter.excludeRelations.some(rn => item.rawRelations.map(i => i.notePath).includes(rn.relativePath)))
          }
          return true
        })
      }
      if (this.sortOrder == 'newestFirst') {
        processedNotes = processedNotes.sort((a, b) => b.date - a.date)
      }
      else if (this.sortOrder == 'oldestFirst') {
        processedNotes = processedNotes.sort((a, b) => a.date - b.date)
      }
      if (this.sortOrder == 'modificationNewestFirst') {
        processedNotes = processedNotes.sort((a, b) => b.mtime - a.mtime)
      }
      else if (this.sortOrder == 'modificationOldestFirst') {
        processedNotes = processedNotes.sort((a, b) => a.date - b.mtime)
      }
      else if (this.sortOrder == 'relatedDateNewestFirst') {
        processedNotes = processedNotes.sort((a, b) => {
          if (!a.relatedDates.length && !b.relatedDates.length) {
            return 0
          }
          if (!a.relatedDates.length) {
            return 1
          }
          if (!b.relatedDates.length) {
            return -1
          }
          var newestDateA = new Date(Math.max(...a.relatedDates))
          var newestDateB = new Date(Math.max(...b.relatedDates))
          return newestDateB - newestDateA
        })
      }
      else if (this.sortOrder == 'relatedDateOldestFirst') {
        processedNotes = processedNotes.sort((a, b) => {
          if (!a.relatedDates.length && !b.relatedDates.length) {
            return 0
          }
          if (!a.relatedDates.length) {
            return 1
          }
          if (!b.relatedDates.length) {
            return -1
          }
          var newestDateA = new Date(Math.max(...a.relatedDates))
          var newestDateB = new Date(Math.max(...b.relatedDates))
          return newestDateA - newestDateB
        })
      }
      else if (this.sortOrder == 'mostRelationsFirst') {
        processedNotes = processedNotes.sort((a, b) => b.numberOfRelations - a.numberOfRelations)
      }
      else if (this.sortOrder == 'fewestRelationsFirst') {
        processedNotes = processedNotes.sort((a, b) => a.numberOfRelations - b.numberOfRelations)
      }
      else if (this.sortOrder == 'alphabetical') {
        processedNotes = processedNotes.sort((a, b) => a.abstract.localeCompare(b.abstract))
      }
      else if (this.sortOrder == 'shortestFirst') {
        processedNotes = processedNotes.sort((a, b) => a.content.length - b.content.length)
      }
      else if (this.sortOrder == 'longestFirst') {
        processedNotes = processedNotes.sort((a, b) => b.content.length - a.content.length)
      }
      else if (this.sortOrder == 'inherit') {
        processedNotes = processedNotes
      }
      else if (this.sortOrder == 'random') {
        for (let i = processedNotes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = processedNotes[i];
          processedNotes[i] = processedNotes[j];
          processedNotes[j] = temp;
        }
      }
      return processedNotes
    },
    stackDistribution() {
      var stacks = this.notes.map(n => n.stack)
      stacks = stacks.filter(s => s !== undefined)
      var distribution = stacks.reduce(function(prev, cur) {
        prev[cur] = (prev[cur] || 0) + 1;
        return prev;
      }, {});
      var distributionArr = Object.entries(distribution)
      distributionArr.sort((a, b) => b[1] - a[1])
      return distributionArr
    },
    calendarDistribution() {
      var calendarDistribution = {}
      for (let n of this.notes) {
        for (let rd of n.relatedDates) {
          let year = rd.getFullYear()
          let month = rd.getMonth()
          let dayOfMonth = rd.getDate()
          if (calendarDistribution[year] === undefined) {
            calendarDistribution[year] = {}
            Object.defineProperty(calendarDistribution[year], "amount", {
              enumerable: false,
              writable: true
            })
            calendarDistribution[year].amount = 0
          }
          if (calendarDistribution[year][month] === undefined) {
            calendarDistribution[year][month] = {}
            Object.defineProperty(calendarDistribution[year][month], "amount", {
              enumerable: false,
              writable: true
            })
            calendarDistribution[year][month].amount = 0
          }
          calendarDistribution[year][month][dayOfMonth] = calendarDistribution[year][month][dayOfMonth] || []
          calendarDistribution[year].amount++
          calendarDistribution[year][month].amount++
          calendarDistribution[year][month][dayOfMonth].push(n)
        }
      }
      return calendarDistribution
    },
    relationDistribution() {
      var allRelations = []
      for (let n of this.notes) {
        for (let r of n.rawRelations) {
          allRelations.push(r.notePath)
        }
      }
      var distribution = allRelations.reduce(function(prev, cur) {
        prev[cur] = (prev[cur] || 0) + 1;
        return prev;
      }, {});
      var distributionArr = []
      for (const [noteRelativePath, amount] of Object.entries(distribution)) {
        if (this.relationsFilterTagsOnly && !noteRelativePath.split('/')[1].startsWith('tags')) continue
        distributionArr.push({
          noteRelativePath: noteRelativePath,
          note: this.$store.state.currentNoteCollection.getNoteByPath(noteRelativePath),
          amount: amount,
        })
      }
      distributionArr.sort((a, b) => b.amount - a.amount)
      return distributionArr
    },
    starredNotes() {
      if (this.stack) {
        var starredNotes = this.stack.metadata.get('starredNotes')
        if (starredNotes) {
          var $this = this
          var stackPath = this.stack.path
          starredNotes = starredNotes.map(n => {
            let notePath = `${stackPath}/${n}`
            return $this.$store.state.currentNoteCollection.getNoteByPath(notePath)
          })
          return starredNotes
        }
      }
      return []
    },
    focusedNoteIndex() {
      var index = this.processedNotes.findIndex(i => i.path == this.focusedNotePath)
      if (index == -1) return null
      return index
    },
  },
  watch: {
    notes: {
      handler: function (val, oldVal) {
        if (this.scrollToFocusedNoteOnNextUpdate) {
          this.scrollFocusedIntoView()
          this.scrollToFocusedNoteOnNextUpdate = false
        }
      },
      deep: false
    }
  },
  mounted() {
    this.isMounted = true
    this.focusedNotePath = this.processedNotes[0] ? this.processedNotes[0].path : ''
    this.$refs.noteList.focus()
  },
  unmounted() {
    this.isMounted = false
  },
  activated() {
    this.portalActive = true
    this.scrollFocusedIntoView('auto')
  },
  deactivated() {
    this.portalActive = false
  },
}
</script>
<style lang='scss'>
.noteList {
  outline: none;
  .stackFilterBox {
    &::-webkit-scrollbar {
      display: none;
    }
    display: inline-flex;
    user-select: none;
    font-family: 'Helvetica';
    font-size: 15px;
    margin-bottom: 15px;
    width: 100%;
    overflow-x: auto;
    white-space: nowrap;
    align-items: center;
    .clearStackFilter {
      cursor: pointer;
      padding-top: 10px;
    }
    span {
      padding: 3px;
      padding-top: 5px;
      padding-bottom: 5px;
    }
    .stack {
      color: white;
      background: black;
      border-top-left-radius: 5px;
      border-bottom-left-radius: 5px;
    }
    .number {
      background: #6e6e6e;
      color: white;
      border-top-right-radius: 5px;
      border-bottom-right-radius: 5px;
      padding-left: 8px;
      padding-right: 8px;
    }
    .included {
      .stack {
        border: 2px solid #000;
        border-right: none;
        background: white;
        color: black;
      }
      .number {
        border: 2px solid #000;
        border-left: none;
        background: #d9d9d9;
        color: black;
      }
    }
    .excluded {
      opacity: 0.4;
    }
  }
}

.leftHandBox {
    position: fixed;
    // left: 0;
    width: 250px;
    margin-left: 15px;
    font-size: 12px;
    color: black;
    padding: 5px;
    // opacity: 0.2;
    transition: opacity 0.1s;
    overflow-y: scroll;
    height: 85.5vh;
    &::-webkit-scrollbar {
      display: none;
    }
    &:hover {
      opacity: 1;
    }
    h2 {
      font-size: 14px;
      text-align: center;
      color: #696969;
      font-variant: small-caps;
      user-select: none;
      cursor: pointer;
    }
    .clearRelationFilterButton {
      cursor: pointer;
      user-select: none;
      font-size: 10px;
      color: grey;
    }
    label[for=relationsFilterTagsOnly] {
      font-size: 10px;
      color: grey;
      user-select: none;
    }
    ul {
      list-style: none;
      padding-inline-start: 0;
      .amount {
        border-radius: 5px;
        padding: 2px;
        padding-right: 5px;
        padding-left: 5px;
        background: #646464;
        color: #ffff;
        font-size: 10px;
        // height: 12px;
        align-self: center;
        font-family: sans-serif;
      }
      .relation {
        border: 1px solid #bbbbbb;
        background: #d3d3d3;
        margin-top: 2px;
        padding: 2px;
        border-radius: 5px;
        display: flex;
        cursor: pointer;
        user-select: none;
        .svg-icon {
          align-self: auto;
        }
        .abstract {
          flex-grow: 1;
          padding-left: 2px;
        }
        &.focused {
          box-shadow: 0 0 0 3px cornflowerblue;
        }
        &.selected {
          background: bisque;
        }
        &.included {
          box-shadow: 0 0 0 3px cornflowerblue;
        }
        &.excluded {
          opacity: 0.5;
        }
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
        &[data-stack="journal"] {
          background: #4f739e;
          border-color: #1959a5;
          color: white;
        }
      }
    }
    .filterByDate {
      .tree-row {
        margin-bottom: 7px;
      }
      .tree-element {
        border: 1px solid #7c7c7c;
        background: #bbbbbb;
        color: #3e3e3e;
        font-family: 'Source Code Pro';
        font-size: 13px;
        padding: 2px;
        border-radius: 5px;
        cursor: pointer;
        user-select: none;
        font-weight: bold;
        .label {
          margin-left: 2px;
        }
        .amount {
          margin-left: 10px;
        }
      }
      .tree-child {
        margin-left: 10px;
        .relation {
          margin-left: 10px;
        }
      }
    }
}

.notes {
  .note {
    margin-bottom: 10px;
  }
}

.searchBar {
  display: flex;
  bottom: 43px;
  z-index: 3;
  font-family: 'Lucida Grande';
  font-size: 13px;
  background-color: #e9e9e9;
  color: #000;
  width: 600px;
  padding: 3px;
  padding-left: 20px;
  height: 28px;
  position: fixed;
  margin-left: 10px;
  align-items: center;
  box-shadow: 0px 0px 7px #207a52;
  input {
    background: #ffffff;
    color: black;
    border: 1px solid grey;
    border-radius: 3px;
    outline: none;
    font-family: 'Lucida Grande';
    font-size: 13px;
  }
}

.statusBarItem {
  .filteredItemCount {
    font-weight: bold;
    color: #ffbf00;
  }
  &.focusedNoteIndex {
    background: white;
    color: black;
    padding: 2px;
    font-weight: bold;
    border-radius: 5px;
    font-size: 13px;
    padding-left: 5px;
    padding-right: 5px;
    &:before {
      content: '#';
    }
  }
}

.overview_modal_backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  width: 100%;
  height: 100%;
  background: #000000cc;
}
.overview_modal_dialog {
  overflow-y: overlay;
  position: fixed;
  top: 0px;
  z-index: 100;
  padding: 10px;
  padding-left: 7%;
  padding-right: 7%;
  padding-top: 45px;
  backdrop-filter: blur(5px);
  color: #000;
  left: 0;
  width: 86%;
  height: 93%;
  margin: auto;
  border-radius: 10px;
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  font-family: 'Lucida Grande', 'Segoe UI', 'Open Sans', sans-serif;
  ::-webkit-scrollbar {
    background-color: #0000002b;
    width: 5px;
    height: 8px;
  }

  ::-webkit-scrollbar-thumb:window-inactive,
  ::-webkit-scrollbar-thumb {
    background: #1a6cd29e;
    box-shadow: none;
    border-radius: 0px;
  }

  ::-webkit-scrollbar-corner {
    background-color: rgba(42, 42, 42, 0.5);
  }
  outline: none;
}
.overview_grid {
  font-size: 12px;
  column-width: 200px;
  // list-style-type: none;
  .note {
    // background: #cdd7e7;
    background: #c9b9b9;
    padding: 5px;
    padding-top: 0;
    margin-bottom: 7px;
    word-break: break-all;
    border-radius: 5px;
    border: 1px solid white;
    font-family: 'Helvetica Neue';
    overflow-x: scroll;
    &.concise {
      max-height: 200px;
      overflow-y: scroll;
    }
    h1 {
      font-size: 14px;
      font-family: 'Futura';
      margin-block-start: 2px;
      margin-block-end: 0px;
      text-align: center;
    }
    div > :first-child {
      padding-top: 2px;
    }
    h1:first-child {
      background: #000000;
      color: white;
      padding-bottom: 3px;
      padding-top: 2px;
      margin-left: -5px;
      margin-right: -5px;
      margin-top: 0;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      word-break: break-word;
    }
    .date {
      border: 2px solid black;
      border-radius: 4px;
      padding: 1px;
      font-family: 'PT Mono';
      font-weight: bold;
      margin-top: 4px;
    }
    h2, h3, h4 {
      font-size: 12px;
      font-family: 'Futura';
      text-align: center;
    }
    ul {
      padding-inline-start: 20px;
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
  h1 {
    font-size: 13px;
  }
}
</style>
