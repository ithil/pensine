<template>
  <div class="all-stacks">
    <table class="stacks-list">
      <thead>
        <tr>
          <th
          @click="sortBy('alphabetical', 'reverseAlphabetical')"
          :class="{ descending: sortOrder == 'alphabetical', ascending: sortOrder == 'reverseAlphabetical'}"
          class="clickable"
          >
            Stack Name
          </th>
          <th
          @click="sortBy('numberOfNotes', 'reverseNumberOfNotes')"
          :class="{ descending: sortOrder == 'numberOfNotes', ascending: sortOrder == 'reverseNumberOfNotes'}"
          class="clickable"
          >
            # of notes
          </th>
          <th
          @click="sortBy('lastAddedTo', 'reverseLastAddedTo')"
          :class="{ descending: sortOrder == 'lastAddedTo', ascending: sortOrder == 'reverseLastAddedTo'}"
          class="clickable"
          >
            Last added to
          </th>
          <th
          @click="sortBy('lastModified', 'reverseLastModified')"
          :class="{ descending: sortOrder == 'lastModified', ascending: sortOrder == 'reverseLastModified'}"
          class="clickable"
          >
            Last modified
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in processedStacks" :key="s.relativePath" :set="notecount = s.countOfNotes">
          <td>
            <span class="stackLink" @click="$router.push(`/stacks/${s.relativePath}`)">
              <Icon name="Layers" />{{s.relativePath}}
            </span>
          </td>
          <td :data-notecount="notecount">
            {{notecount}}
          </td>
          <td>
            {{formatDate(s.lastAddedTo)}}
          </td>
          <td>
            {{formatDate(s.lastModified)}}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td></td>
          <td>{{processedTotalCountOfNotes}}</td>
          <td></td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    <portal to="statusBarRight" :order="1" v-if="portalActive">
      <span class="statusBarItem">
        <Icon name="FileText" />
        {{totalCountOfNotes}}
      </span>
      <span class="statusBarItem">
        <Icon name="Layers" />
        {{stacks.length}}
      </span>
    </portal>
  </div>
</template>

<script>
import { bus } from '@/main'
import Icon from '@/components/Icon.vue'
import moment from 'moment'

export default {
  name: 'Stacks',
  components: {
    Icon,
  },
  data() {
    return {
      portalActive: true,
      stacks: [],
      sortOrder: '',
    }
  },
  methods: {
    updateStacks() {
      var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
      this.stacks = stacks.map(s => {
        return {
          stackObj: s,
          relativePath: s.relativePath,
          countOfNotes: s.getCountOfNotes(),
          lastAddedTo: s.lastAddedTo,
          lastModified: s.lastModified,
        }
      })
    },
    formatDate(d) {
      if (d instanceof Date) {
        return moment(d).fromNow()
      }
      else {
        return '-'
      }
    },
    sortBy(firstOrder, secondOrder) {
      if (this.sortOrder == firstOrder) {
        this.sortOrder = secondOrder
      }
      else {
        this.sortOrder = firstOrder
      }
    },
  },
  computed: {
    processedStacks() {
      var processedStacks = this.stacks
      if (this.sortOrder == 'alphabetical') {
        processedStacks = processedStacks.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
      }
      else if (this.sortOrder == 'reverseAlphabetical') {
        processedStacks = processedStacks.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
        processedStacks.reverse()
      }
      else if (this.sortOrder == 'numberOfNotes') {
        processedStacks = processedStacks.sort((a, b) => b.countOfNotes - a.countOfNotes)
      }
      else if (this.sortOrder == 'reverseNumberOfNotes') {
        processedStacks = processedStacks.sort((a, b) => a.countOfNotes - b.countOfNotes)
      }
      else if (this.sortOrder == 'lastAddedTo') {
        processedStacks = processedStacks.sort((a, b) => b.lastAddedTo - a.lastAddedTo)
      }
      else if (this.sortOrder == 'reverseLastAddedTo') {
        processedStacks = processedStacks.sort((a, b) => a.lastAddedTo - b.lastAddedTo)
      }
      else if (this.sortOrder == 'lastModified') {
        processedStacks = processedStacks.sort((a, b) => b.lastModified - a.lastModified)
      }
      else if (this.sortOrder == 'reverseLastModified') {
        processedStacks = processedStacks.sort((a, b) => a.lastModified - b.lastModified)
      }
      else if (this.sortOrder == 'random') {
        for (let i = processedStacks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = processedStacks[i];
          processedStacks[i] = processedStacks[j];
          processedStacks[j] = temp;
        }
      }
      return processedStacks
    },
    totalCountOfNotes() {
      return this.stacks.reduce((subtotal, s) => subtotal + s.countOfNotes, 0)
    },
    processedTotalCountOfNotes() {
      return this.processedStacks.reduce((subtotal, s) => subtotal + s.countOfNotes, 0)
    },
    routeTab() {
      return {
        title: 'All Stacks',
        tips: `${this.stacks.length} stacks – ${this.totalCountOfNotes} notes`,
      }
    },
  },
  mounted() {
    this.updateStacks()
  },
  unmounted() {
  },
  activated() {
    this.portalActive = true
  },
  deactivated() {
    this.portalActive = false
  },
}
</script>
<style scoped lang='scss'>
.all-stacks {
  background: radial-gradient(#ffffff36, #0000004a);
  min-height: -webkit-fill-available;
  table.stacks-list {
    margin: auto;
    width: 90%;
    // border-collapse: collapse;
    border-spacing: 0;
    .stackLink {
      background: black;
      color: white;
      border-radius: 5px;
      padding: 7px;
    }
    th, td {
      border: 1px solid #00000045;
      padding: 0.5rem;
    }
    td[data-notecount="0"] {
      background: repeating-linear-gradient(
45deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 10px, rgba(0, 0, 0, 0.08) 10px, rgba(0, 0, 0, 0.08) 20px);
    }
    th {
      position: sticky;
      top: 0; /* Don't forget this, required for the stickiness */
      color: white;
      background: linear-gradient(#5a5a5ac9, #737373ba);
      backdrop-filter: blur(4px);
      z-index: 1;
      &.clickable {
        cursor: pointer;
        user-select: none;
      }
      &.descending, &.ascending {
        background: #9b9b9b;
        &:before {
          font-size: smaller;
          color: white;
          background: black;
          padding: 2px;
          border-radius: 4px;
        }
      }
      &.descending:before {
        content: '↓';
      }
      &.ascending:before {
        content: '↑';
      }
    }
    tbody tr {
      counter-increment: rowNumber;
      position: relative;
      td:first-child:before {
        position: absolute;
        content: counter(rowNumber);
        min-width: 1em;
        left: -2em;
        font-size: 12px;
        text-align: right;
        font-family: 'Monaco', monospace;
      }
    }
    tbody tr:nth-child(odd) {
      background: #ffffffa6;
    }
    tfoot {
      background: #8f8f8fad;
      font-weight: bold;
    }
  }
}
</style>
