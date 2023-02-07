<template>
  <div class="popoverList">
    <div class="modal__backdrop" @click="close()" v-if="active"/>
      <div class="menu" ref="menu" tabindex="23" v-if="active" v-show="show" @keydown="keymonitor" @wheel="onWheel" :style="positionStyle">
        <ul>
          <li class="header">
            <h1>{{message}}</h1>
          </li>
          <li class="item separator">
            <hr>
          </li>
          <li
          class="item"
          :class="[(i.id == selected) ? 'selected' : '', i.role == 'separator' ? 'separator' : '']"
          v-for="i in itemsWithIds"
          :key="i.id"
          :ref="i.id == 1 ? 'firstItem' : undefined"
          @mouseover="selected = i.id"
          @click="selected = i.id; runAction()"
          >
            <span v-if="i.role != 'separator'" class="icon">
              <Icon v-if="i.lucideIcon" :name="i.lucideIcon" />
            </span>
            <span v-if="i.label" class="title">{{i.label}}</span>
            <span v-if="i.key && !options.hintMode" class="key">{{renderKeystring(i.key)}}</span>
            <span v-if="options.hintMode && i.hint" class="hint">{{i.hint}}</span>
            <hr v-if="i.role == 'separator'">
          </li>
        </ul>
      </div>
      <portal to="statusBarRight" :order="1" v-if="portalActive">
        <span class="keybuffer">{{hintKeybuffer}}</span>
      </portal>
  </div>
</template>

<script>
import Icon from '@/components/Icon.vue'

  export default {
    name: 'popover-list',
    components: {
      Icon,
    },
    props: {
      items: Array,
      message: String,
      options: Object,
    },
    data: function () {
      return {
        active: false,
        show: true,
        portalActive: true,
        previouslyFocusedElement: null,
        topPos: 0,
        bottomPos: 0,
        leftPos: 0,
        currentMessage: '',
        itemsWithIds: [],
        currentItems: [],
        selected: null,
        itemsHistory: [],
        registeredKeys: {},
        hintKeybuffer: '',
        hintGenerator: null,
        computedOptions: {
          hintMode: false,
        },
      }
    },
    methods: {
      close(cb) {
        this.active = false
        this.show = true
        this.portalActive = false
        this.hintKeybuffer = ''
        document.querySelector("body").classList.remove("overflow-hidden")
        if(cb) {
          cb()
        }
        this.$emit('close')
        if(this.previouslyFocusedElement) {
          this.previouslyFocusedElement.focus()
        }
      },
      open(cb) {
        this.previouslyFocusedElement = document.activeElement
        this.active = true
        this.portalActive = true
        document.querySelector("body").classList.add("overflow-hidden")
        if (this.options.hintMode) {
          this.hintGenerator = this.makeHintGenerator(this.items.length+1, "fghjklasdq")
        }
        this.currentItems = this.items
        this.itemsHistory = []
        this.currentMessage = this.message || ''
        this.computedOptions = {
          hintMode: false,
        }
        if (this.options) {
          for (let o of Object.keys(this.options)) {
            this.$set(this.computedOptions, o, this.options[o])
          }
        }
        this.$nextTick(() => {
          let height = this.$refs.menu.offsetHeight || 0
          let width = this.$refs.menu.offsetWidth || 0
          let firstItemOffset = this.$refs.firstItem?.[0]?.offsetTop || 0
          if (globalThis.lastMousePosY + height > window.innerHeight) {
            this.bottomPos = window.innerHeight - globalThis.lastMousePosY
            if (this.bottomPos + height > window.innerHeight) {
              this.bottomPos = this.bottomPos - ((this.bottomPos + height) - window.innerHeight)
            }
            this.topPos = null
          }
          else {
            this.topPos = Math.max(globalThis.lastMousePosY - firstItemOffset - 5, 0) // The 5px are to avoid positioning the cursor on the border
            this.bottomPos = null
          }
          this.leftPos = Math.max(globalThis.lastMousePosX - 5, 0) // The 5px are to avoid positioning the cursor on the border
          this.show = true
          if (this.itemsWithIds[0] && this.itemsWithIds[0].id) {
            this.selected = this.itemsWithIds[0].id
          }
          this.$refs.menu.focus()
          if(cb) {
            cb()
          }
        })
        this.$emit('open')
      },
      addItem(item) {
        var newId = this.getHighestId() + 1
        this.itemsWithIds.push({
          id: newId,
          ...((this.options.hintMode && (item.role != 'separator')) && {hint: this.hintGenerator.next().value}),
          ...item
        })
        if (item.key) {
          this.registerKey(item.key, item.action, newId)
        }
      },
      addItems(items) {
        for (let i of items) {
          this.addItem(i)
        }
      },
      getHighestId() {
        if (this.itemsWithIds.length < 1) {
          return 0
        }
        var ids = this.itemsWithIds.map(c => c.id).filter(id => id)
        return Math.max.apply(null, ids)
      },
      runAction() {
        if (this.selected) {
          var item = this.itemsWithIds.find(i => i.id == this.selected)
          if (item && item.action) {
            item.action()
            this.close()
          }
        }
        else {
          console.log('Nothing selected!')
        }
      },
      selectNext(amount = 1) {
        var index = this.itemsWithIds.findIndex(i => i.id == this.selected)
        var len = this.itemsWithIds.length
        if (index > -1) {
          if (index + amount >= len) {
            let diff = (index + amount) - len
            this.selected = this.itemsWithIds[0 + diff]?.id || len
          }
          else if (index + amount < 0) {
            let diff = Math.abs(index + amount)
            this.selected = this.itemsWithIds[Math.min(len - diff, 0)]?.id || 0
          }
          else {
            this.selected = this.itemsWithIds[index + 1]?.id || len
          }
          var newItem = this.itemsWithIds.find(i => i.id == this.selected)
          if (newItem.role == 'separator') {
            this.selectNext()
          }
        }
      },
      selectPrev() {
        var index = this.itemsWithIds.findIndex(i => i.id == this.selected)
        var len = this.itemsWithIds.length
        if (index > -1) {
          if (index - 1 < 0) {
            this.selected = this.itemsWithIds[len - 1].id
          }
          else {
            this.selected = this.itemsWithIds[index - 1].id
          }
          var newItem = this.itemsWithIds.find(i => i.id == this.selected)
          if (newItem.role == 'separator') {
            this.selectPrev()
          }
        }
      },
      renderKeystring(keystring = '') {
        if (keystring.length == 1) {
          return keystring.toUpperCase()
        }
        else if (keystring.length > 1) {
          let keys = keystring.split('+')
          let modifier = keys[0].toLowerCase()
          let modifierSymbols = {
            shift: '⇧',
            ctrl: '^',
            cmd: '⌘',
            alt: '⌥',
          }
          return `${modifierSymbols[modifier] ? modifierSymbols[modifier] : ''}${keys[1].toUpperCase()}`
        }
      },
      registerKey(keystring = '', callback = () => console.log(`No callback set for ${keystring}`), id) {
        if (keystring.length == 1) {
          if (!this.registeredKeys['noModifiers']) {
            this.registeredKeys['noModifiers'] = {}
          }
          let $this = this
          this.registeredKeys['noModifiers'][keystring.toUpperCase()] = () => {
            if (id !== undefined) {
              $this.selected = id
            }
            callback()
          }
        }
        else if (keystring.length > 1) {
          let keys = keystring.split('+')
          let modifier = keys[0]
          for (let m of ['Shift', 'Cmd', 'Ctrl']) {
            if (modifier.toLowerCase() == m.toLowerCase()) {
              if (!this.registeredKeys[m]) {
                this.registeredKeys[m] = {}
              }
              let $this = this
              this.registeredKeys[m][keys[1].toUpperCase()] = () => {
                if (id !== undefined) {
                  $this.selected = id
                }
                callback()
              }
              break
            }
          }
        }
      },
      makeHintGenerator: function* (maxNumber, chars) {
        var base = chars.length
        var maxDimension = parseInt(Math.log(maxNumber)/Math.log(base)) // Calculates max dimension for given number
        var currentNum = 1
        var currentDimension = 0
        while (currentNum < maxNumber) {
          let base = chars.length
          let dimension = parseInt(Math.log(currentNum)/Math.log(base)) // Calculates max dimension for given number
          let q = base**dimension
          let rest = currentNum
          let convNum = []
          while (dimension > -1) {
            let q = base**dimension
            let u = parseInt(rest / q)
            rest = rest - ((base**dimension)*u)
            dimension = dimension - 1
            convNum.push(chars[u])
          }
          yield convNum.join('').padStart(maxDimension+1, chars[0])
          currentNum = currentNum + 1
        }
      },
      keymonitor(event) {
        if (event.key === "Escape") {
          this.close()
          event.preventDefault()
          event.stopPropagation()
        }
        else if (event.key === "ArrowUp") {
          this.selectPrev()
        }
        else if (event.key === "ArrowDown") {
          this.selectNext()
        }
        else if (event.key === "Enter") {
          this.runAction()
        }
        else if (event.key === "Backspace") {
          this.hintKeybuffer = this.hintKeybuffer.substr(0, this.hintKeybuffer-1)
        }
        else {
          if (this.options.hintMode) {
            if (event.key.length == 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
              this.hintKeybuffer += event.key
              let index = this.itemsWithIds.findIndex(i => i.hint == this.hintKeybuffer)
              if (index > -1) {
                let foundItem = this.itemsWithIds[index]
                if (foundItem.action) {
                  this.selected = foundItem.id
                  setTimeout(() => {
                    this.close()
                    foundItem.action()
                  }, 100)
                }
              }
            }
          }
          else {
            let modifier = 'noModifiers'
            if (event.shiftKey) modifier = 'Shift'
            if (event.metaKey) modifier = 'Cmd'
            if (event.ctrlKey) modifier = 'Ctrl'
            let associatedCallback = this.registeredKeys[modifier]?.[event.key.toUpperCase()]
            if (associatedCallback) {
              associatedCallback()
              setTimeout(() => {
                this.close()
              }, 100)
            }
          }
        }
      },
      onWheel(event) {
        // this.selectNext(event.deltaX)
      },
      setOption(opt, value) {
        this.computedOptions[opt] = value
      },
      getOption(opt) {
        return this.computedOptions[opt]
      },
    },
    computed: {
      positionStyle() {
        return {
          top: this.topPos !== null ? `${this.topPos}px` : undefined,
          bottom: this.bottomPos !== null ? `${this.bottomPos}px` : undefined,
          left: this.leftPos !== null ? `${this.leftPos}px` : undefined,
        }
      },
      isOverflowing() {
        var {clientHeight, scrollHeight} = this.$refs.menu
        return scrollHeight > clientHeight
      },
    },
    watch: {
      // items: function (inputItems) {
      //   this.currentItems = inputItems
      // },
      currentItems: function (inputItems) {
        this.itemsWithIds = []
        this.registeredKeys = {}
        if (this.options.hintMode) {
          this.hintGenerator = this.makeHintGenerator(this.items.length+1, "fghjklasdq")
        }
        this.addItems(inputItems)
      },
    },
    mounted() {
    },
  }
</script>

<style lang="scss">
.modal__backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
}
.menu {
  overflow-x: hidden;
  overflow-y: auto;
  position: fixed;
  z-index: 100;
  max-width: 300px;
  max-height: 96vh;
  height: min-content;
  padding-left: 5px;
  padding-right: 5px;
  border: 1px solid #242424;
  background: #181818;
  color: #fff;
  border-radius: 5px;
  border-top: none;
  box-shadow: 0px 0px 10px #000;
  font-family: 'Lucida Grande', 'Segoe UI', 'Open Sans', sans-serif;
  font-size: 12px;
  ul {
    list-style: none;
    padding-inline: 0;
    li {
      padding-left: 5px;
      padding-right: 5px;
      cursor: default;
      &.item.separator + li.item {
        border-top: none;
      }
      &.item {
        display: flex;
        border-radius: 2px;
        padding-top: 2px;
        padding-bottom: 2px;
        border-top: 1px solid #242424;
        .title {
          flex-grow: 1;
          word-break: break-all;
        }
        .key {
          color: #808080;
          margin-left: 10px;
        }
        .hint {
          text-transform: uppercase;
          color: #784b1a;
          font-weight: bold;
          font-size: 14px;
          font-family: 'PT Mono';
          background: #f1e211;
          border: 1px solid #a56f2a;
          padding: 1px;
          border-radius: 2px;
          align-self: center;
          margin-left: 10px;
        }
        &.selected {
          background: #3973b8;
          .key {
            color: #bfbfbf;
          }
        }
        &.separator {
          padding: 0;
          display: block;
          border-top: none;
          hr {
            border-style: solid;
            border-width: 1px;
            border-bottom: none;
          }
        }
      }
    }
  }
  .icon {
    width: 14px;
    display: inline-block;
    align-self: center;
  }
  .header {
    h1 {
      font-size: 12px;
      color: #808080;
      text-align: center;
    }
  }
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
.modal__input {
  color: #000;
  background-color: #ffffffb3;
  border: 1px solid #000;
  box-shadow: none;
  border-radius: 2px;
  padding-left: 5px;
  font-size: 14px;
  font-family: 'Code New Roman', sans-serif;
  width: 98%;
}
.modal__input:focus {
  outline-color: #4f99d3;
}
</style>
