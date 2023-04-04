<template>
  <div class="canvasPage" v-if="note && canvasObj">
    <div class="canvas-wrapper"
    @wheel="scrollCanvas"
    @mousedown="mouseDown"
    @mousemove="mouseMove"
    @mouseup="mouseUp"
    @click="canvasWrapperClick"
    :style="canvasWrapperStyle"
    ref="canvasWrapper"
    tabindex="10"
    @keydown="keymonitor"
    >
      <div class="canvas" :style="computedTransformStyle">
        <canvas-element
        v-for="element in visibleElements"
        :key="element.id"
        :canvasElementObj="element"
        @setFocusedElement="setFocusedElement"
        @setMode="setMode"
        @replaceCanvasElementObj="replaceCanvasElementObj"
        @focusCanvasWrapper="focusCanvasWrapper"
        :canvasBus="canvasBus"
        :isFocused="element.id == focusedElementId"
        :isSelected="selectedElementsIds.includes(element.id)"
        :scale="scale"
        :canvasMatrix="canvasMatrix"
        ref="elementItems"
        >
        </canvas-element>
        <div
        v-for="element in helperElements"
        :key="element.id"
        class="canvas-helper-element"
        :class="element.classes"
        :style="{width: `${element.width}px`, height: `${element.height}px`, transform: `translate(${element.x}px, ${element.y}px) rotate(${element.rotation || 0}deg)`}"
        ref="helperElementItems"
        >
        </div>
      </div>
    </div>
    <portal to="statusBarRight" :order="1" v-if="portalActive">
      <span class="keybuffer">{{fullKeybuffer}}</span>
      <span class="selectedElements statusBarItem" v-if="selectedElementsIds.length > 0" @click="selectedElementsIds = []"><Icon name="BoxSelect"/><span class="label">{{selectedElementsIds.length}}</span></span>
      <span class="zoom statusBarItem"><Icon name="ZoomIn"/><span>{{(this.scale * 100).toFixed(0)}}%</span></span>
      <span class="mode" :style="modes[mode].style"><Icon v-if="modes[mode].lucideIcon" :name="modes[mode].lucideIcon"/><span class="label">{{modes[mode].label || mode}}</span></span>
      <span class="statusBarItem"><Icon name="Files"/><span>{{canvasElements.length}}</span></span>
      <span class="debugInfo" v-if="statusBarDebugInfo">
        <span class="zoom statusBarItem"><Icon name="ZoomIn"/><span>{{this.scale}}</span></span>
        <span class="statusBarItem"><Icon name="MousePointer"/><span>{{toWorldPos(mouseposx,mouseposy)}}</span></span>
        <span class="statusBarItem"><Icon name="View"/><span>{{visibleElements.length}}</span></span>
      </span>
    </portal>
  </div>
</template>

<script>
import Vue from 'vue'
import { bus } from '@/main'
import * as tm from 'transformation-matrix'
import CanvasElement from '@/components/CanvasElement.vue'
import { v4 as uuidv4 } from 'uuid'
import Icon from '@/components/Icon.vue'

export default {
  name: 'canvas-page',
  components: {
    CanvasElement,
    Icon,
  },
  data() {
    return {
      note: this.$store.state.currentNoteCollection.getNoteByPath(
        this.$route.params.name.split('/').map(c => decodeURIComponent(c)).join('/')
      ),
      canvasObj: null,
      decodedPath: this.$route.params.name.split('/').map(c => decodeURIComponent(c)).join('/'),
      previouslyFocusedElement: null,
      canvasBus: new Vue(),
      isMounted: false,
      portalActive: true,
      statusBarDebugInfo: false,
      mode: 'normal',
      modes: {
        'normal': {
          label: 'Normal',
          lucideIcon: 'Circle',
          style: {
            background: '#3e6e51',
            color: '#fff',
          },
        },
        'move': {
          label: 'Move',
          lucideIcon: 'Move',
        },
        'edit': {
          label: 'Edit',
          lucideIcon: 'Edit2',
          style: {
            background: '#4F99D3',
            color: '#fff',
          },
        },
      },
      fullKeybuffer: '',
      keybuffer: '',
      keybufferCount: null,
      keybufferRegister: null,
      focusedElementId: null,
      selectedElementsIds: [],
      selectRectBeingDrawn: false,
      scale: 1,
      originX: 0,
      originY: 0,
      mouseposx: null,
      mouseposy: null,
      zoomIntensity: 1.025,
      canvasMatrix: {
        a: 1, c: 0, e: 0,
        b: 0, d: 1, f: 0
      },
      visibleElements: [],
      canvasElements: [],
      helperElements: [],
      moveOrigins: {},
      savedViews: [],
    }
  },
  methods: {
    scrollCanvas(event) {
      var canvasMatrix = this.canvasMatrix
      const mousex = (event.clientX - event.target.offsetLeft)
      const mousey = (event.clientY - event.target.offsetTop)
      if (this.mode != 'move') {
        // Allow scrolling of a focused element
        for (let el of event.path) {
          if (el.classList?.contains('canvas-element') && el.classList?.contains('focused') && !el.querySelector('[data-element-type="container"]')) {
            return true
          }
        }
      }
      // Zoom into point under cursor
      if (event.ctrlKey || event.metaKey) {
        // Normalize mouse wheel movement to +1 or -1 to avoid unusual jumps.
        const wheel = event.deltaY < 0 ? 1 : -1
        // Compute zoom factor.
        var zoom = 1
        if (wheel == 1) zoom = this.zoomIntensity
        if (wheel == -1) zoom = 1/this.zoomIntensity

        var scalechange = (this.scale*zoom) - this.scale
        this.scale *= zoom
        var [mouseWorldOldX, mouseWorldOldY] = this.toWorldPos(mousex, mousey)
        if (this.scale >= 0.2 && this.scale <= 6) {
          canvasMatrix = tm.compose(
            canvasMatrix,
            tm.scale(zoom, zoom),
          )
          var [mouseWorldNewX, mouseWorldNewY] = this.toWorldPos(mousex, mousey, canvasMatrix)
          canvasMatrix = tm.compose(
            canvasMatrix,
            tm.translate(mouseWorldNewX - mouseWorldOldX, mouseWorldNewY - mouseWorldOldY),
          )
        }
        else if (this.scale < 0.2) {
          this.scale = 0.2
        }
        else {
          this.scale = 6
        }
      }
      else {
      // Pan canvas
        canvasMatrix = tm.compose(
          canvasMatrix,
          tm.translate(event.deltaX, event.deltaY)
        )
      }


      // redraw
      this.setCanvasMatrix(canvasMatrix)
      if (this.mode == 'move') {
        this.handleMoveElements()
      }
      event.preventDefault()
    },
    toWorldPos(x, y, canvasMatrix) {
      canvasMatrix = canvasMatrix || this.canvasMatrix
      return [
        (x - canvasMatrix.e) / canvasMatrix.a,
        (y - canvasMatrix.f) / canvasMatrix.d,
      ]
    },
    setCanvasMatrix(newCanvasMatrix) {
      for (let p in this.canvasMatrix) {
        this.canvasMatrix[p] = newCanvasMatrix[p]
      }
    },
    setScale(newScale) {
      if (isNaN(newScale)) return false
      this.scale = newScale
      this.canvasMatrix.a = newScale
      this.canvasMatrix.d = newScale
    },
    getElementsFullyEnclosed({x, y, width, height}) {
      let enclosedElements = []
      let highestX = x + width
      let highestY = y + height
      for (let el of this.canvasElements) {
        let bottomrightX = el.x + el.width
        let bottomrightY = el.y + el.height
        if (el.x >= x && el.y >= y && bottomrightX <= highestX && bottomrightY <= highestY) {
          enclosedElements.push(el)
        }
      }
      return enclosedElements
    },
    handleMoveElements() {
      let affectedIds = this.getElementIdsToBeAffected()
      for (let id of affectedIds) {
        let elementIndex = this.canvasElements.findIndex(e => e.id == id)
        let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
        let xdelta = x - this.moveOrigins.cursor[0]
        let ydelta = y - this.moveOrigins.cursor[1]
        this.canvasElements[elementIndex].x = xdelta + this.moveOrigins[this.canvasElements[elementIndex].id][0]
        this.canvasElements[elementIndex].y = ydelta + this.moveOrigins[this.canvasElements[elementIndex].id][1]
      }
    },
    mouseMove(event) {
      const boundingClientRect = this.$refs.canvasWrapper.getBoundingClientRect()
      const mouseposx = event.clientX - boundingClientRect.left
      const mouseposy = event.clientY - boundingClientRect.top
      this.mouseposx = mouseposx
      this.mouseposy = mouseposy
      this.canvasBus.$emit('canvasWrapperMouseMove', {event, mouseposx, mouseposy})
      if (this.mode == 'move') {
        this.handleMoveElements()
      }
      if (this.selectRectBeingDrawn) {
        let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
        let helperElementIndex = this.helperElements.findIndex(el => el.type == 'select-rect')
        let helperElement = this.helperElements[helperElementIndex]
        if ((x > helperElement.originalX) && (y > helperElement.originalY)) { // Bottom right
          this.helperElements[helperElementIndex].x = helperElement.originalX
          this.helperElements[helperElementIndex].y = helperElement.originalY
          this.helperElements[helperElementIndex].height = y - helperElement.originalY
          this.helperElements[helperElementIndex].width = x - helperElement.originalX
        }
        else if ((x > helperElement.originalX) && (y < helperElement.originalY)) { // Top right
          this.helperElements[helperElementIndex].x = helperElement.originalX
          this.helperElements[helperElementIndex].y = y
          this.helperElements[helperElementIndex].height = helperElement.originalY - y
          this.helperElements[helperElementIndex].width = x - helperElement.originalX
        }
        else if ((x < helperElement.originalX) && (y < helperElement.originalY)) { // Top left
          this.helperElements[helperElementIndex].x = x
          this.helperElements[helperElementIndex].y = y
          this.helperElements[helperElementIndex].height = helperElement.originalY - y
          this.helperElements[helperElementIndex].width = helperElement.originalX - x
        }
        else if ((x < helperElement.originalX) && (y > helperElement.originalY)) { // Bottom left
          this.helperElements[helperElementIndex].x = x
          this.helperElements[helperElementIndex].y = helperElement.originalY
          this.helperElements[helperElementIndex].height = y - helperElement.originalY
          this.helperElements[helperElementIndex].width = helperElement.originalX - x
        }
      }
    },
    mouseUp(event) {
      this.canvasBus.$emit('canvasWrapperMouseUp', {event})
      if (this.selectRectBeingDrawn) {
        this.selectRectBeingDrawn = false
        var helperElementIndex = this.helperElements.findIndex(el => el.type == 'select-rect')
        var helperElement = this.helperElements[helperElementIndex]
        var selectRect = this.calculateRectanglePoints(helperElement.x, helperElement.y, helperElement.width, helperElement.height)
        for (let el of this.canvasElements) {
          if (el.id == helperElement.startedInContainer) continue
          if (this.checkOverlap(
            this.calculateRectanglePoints(el.x, el.y, el.width, el.height),
            selectRect
          )) {
            if (event.shiftKey) {
              this.selectedElementsIds = this.selectedElementsIds.filter(id => id != el.id)
            }
            else {
              this.selectedElementsIds.push(el.id)
            }
          }
        }
        this.focusedElementId = null
        this.helperElements = this.helperElements.filter(el => !(el.type == 'select-rect'))
      }
    },
    mouseDown(event) {
      if (this.mode == 'move') {
        this.setMode('normal')
        event.preventDefault()
        event.stopPropagation()
        return false
      }
      if (event.target == this.$refs.canvasWrapper || event.target.dataset.elementType == 'container') {
        this.canvasBus.$emit('canvasWrapperMouseDown', {event})
        this.selectRectBeingDrawn = true
        var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
        this.helperElements.push({
          id: uuidv4(),
          type: 'select-rect',
          classes: ['selectRect'],
          x,
          y,
          originalX: x,
          originalY: y,
          height: 0,
          width: 0,
          ...(event.target.dataset.elementType == 'container' && {startedInContainer: event.target.dataset.elementId}),
        })
      }
    },
    canvasWrapperClick(event) {
      if (this.mode == 'move') {
        this.setMode('normal')
        event.preventDefault()
        event.stopPropagation()
        return false
      }
      if (event.target == this.$refs.canvasWrapper) {
        this.canvasBus.$emit('canvasBackgroundClick', {event})
        this.focusedElementId = null
      }
      this.canvasBus.$emit('canvasWrapperClick', {event})
    },
    calculateRectanglePoints(x, y, width, height) {
      return {
        'topleft': [x, y],
        'bottomleft': [x, y+height],
        'topright': [x+width, y],
        'bottomright': [x+width, y+height],
      }
    },
    checkOverlap(rect1, rect2) {
      // If one is above the other
      if (rect2.bottomleft[1] < rect1.topright[1] || rect1.bottomleft[1] < rect2.topright[1]) return false

      // If one rectangle is on left side of other
      if (rect1.topleft[0] > rect2.bottomright[0] || rect2.topleft[0] > rect1.bottomright[0]) return false

      // Otherwise it overlaps
      return true
    },
    calculateVisibleElements() {
      var elements = []
      var canvasWidth = this.$refs?.canvasWrapper?.offsetWidth || 0
      var canvasHeight = this.$refs?.canvasWrapper?.offsetHeight || 0
      var canvasRectangle = this.calculateRectanglePoints(0, 0, canvasWidth, canvasHeight)
      var canvasRectangleAdjusted = Object.fromEntries(Object.entries(canvasRectangle).map(i => [i[0], this.toWorldPos(...i[1])]))
      for (let el of this.canvasElements) {
        if (this.checkOverlap(
          this.calculateRectanglePoints(el.x, el.y, el.width, el.height),
          canvasRectangleAdjusted
        )) {
          elements.push(el)
        }
      }
      this.visibleElements = elements
    },
    setFocusedElement(id) {
      this.focusedElementId = id
    },
    setMode(newmode) {
      if (!Object.keys(this.modes).includes(newmode)) {
        this.modes[newmode] = {}
      }
      this.mode = newmode
    },
    getFocusedElementItem() {
      return this.$refs.elementItems?.find(e => e.isFocused)
    },
    replaceCanvasElementObj(newCanvasElementObj) {
      var index = this.canvasElements.findIndex(e => e.id == newCanvasElementObj.id)
      if (index > -1) {
        for (let o of Object.keys(newCanvasElementObj)) {
          this.$set(this.canvasElements[index], o, newCanvasElementObj[o])
        }
      }
    },
    focusCanvasWrapper() {
      this.$refs.canvasWrapper.focus()
    },
    getElementIdsToBeAffected() {
      if (this.selectedElementsIds.length > 0) {
        return this.selectedElementsIds
      }
      else {
        return [this.focusedElementId]
      }
    },
    getElementsToBeAffected() {
      let ids = this.getElementIdsToBeAffected()
      return this.canvasElements.filter(el => ids.includes(el.id))
    },
    addNewMarkdownElement({
      x = 0,
      y = 0,
      width = 100,
      height = 100,
      text = 'Write here',
    } = {}) {
      var newElement = {
        id: uuidv4(),
        type: 'markdown',
        text,
        x,
        y,
        width,
        height,
        creationDate: new Date(),
        modificationDate: new Date(),
    addNewElement(elementProps) {
      var newElement = {
        id: uuidv4(),
        type: 'markdown',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        creationDate: new Date(),
        modificationDate: new Date(),
        ...elementProps,
      }
      this.canvasElements.push(newElement)
      return newElement
    },
    addNewFittedMarkdownElement({
      x = 0,
      y = 0,
      width = 200,
      height = 100,
      text = 'Write here',
    } = {}) {
      var newElement = {
        id: uuidv4(),
        type: 'markdown',
        text,
        x,
        y,
        width,
        height,
        fitText: true,
        creationDate: new Date(),
        modificationDate: new Date(),
      }
      this.canvasElements.push(newElement)
    },
    addNewLucideIcon({
      x = 0,
      y = 0,
      width = 200,
      height = 200,
      lucideIcon = 'FileQuestion',
    } = {}) {
      this.$store.commit('triggerCustomTextPrompt', {
        message: 'Please Lucide Icon name:',
        action: (lucideIcon) => {
          var newElement = {
            id: uuidv4(),
            type: 'lucideIcon',
            lucideIcon,
            x,
            y,
            width,
            height,
            fitText: true,
            creationDate: new Date(),
            modificationDate: new Date(),
          }
          this.canvasElements.push(newElement)
        }
      })
    },
    addNewFile({
      x = 0,
      y = 0,
      width = 200,
      height = 200,
      path = '',
    } = {}) {
      this.$store.commit('triggerCustomTextPrompt', {
        message: 'Please enter path:',
        action: (path) => {
          var newElement = {
            id: uuidv4(),
            type: 'file',
            path,
            x,
            y,
            width,
            height,
            creationDate: new Date(),
            modificationDate: new Date(),
          }
          this.canvasElements.push(newElement)
        }
      })
    },
    addNewImage({
      x = 0,
      y = 0,
      width = 100,
      height = 100,
    } = {}) {
      var $this = this
      this.$store.commit('triggerCustomTextPrompt', {
        message: 'Please enter image url:',
        action: (url) => {
          // TODO: Check here if URL is valid
          var img = new Image()
          img.onload = () => {
            width = img.naturalWidth
            height = img.naturalHeight
            var newElement = {
              id: uuidv4(),
              type: 'image',
              src: url,
              x,
              y,
              width,
              height,
              creationDate: new Date(),
              modificationDate: new Date(),
            }
            $this.canvasElements.push(newElement)
          }
          img.src = url
        }
      })
    },
    addNewFrame({
      x = 0,
      y = 0,
      width = 100,
      height = 100,
    } = {}) {
      this.$store.commit('triggerCustomTextPrompt', {
        message: 'Please enter frame url:',
        action: (url) => {
          // TODO: Check here if URL is valid
          var newElement = {
            id: uuidv4(),
            type: 'iframe',
            url,
            x,
            y,
            width,
            height,
            creationDate: new Date(),
            modificationDate: new Date(),
          }
          this.canvasElements.push(newElement)
        }
      })
    },
    addNewNote({
      x = 0,
      y = 0,
      width = 630,
      height = 300,
    } = {}) {
      var $this = this
      var bag = this.$store.state.bag
      var items = bag.map(notePath => {
        var note = $this.$store.state.currentNoteCollection.getNoteByPath(notePath)
        if (note) {
          return {
            label: note.abstract,
            lucideIcon: 'File',
            action:() => {
              var newElement = {
                id: uuidv4(),
                type: 'note',
                path: note.relativePath,
                x,
                y,
                width,
                height,
                creationDate: new Date(),
                modificationDate: new Date(),
              }
              this.canvasElements.push(newElement)
            }
          }
        }
      })
      this.$store.commit('triggerCustomSelectList', {items})
    },
    saveCanvas() {
      var oldCanvas = this.canvasObj
      var newCanvas = {...oldCanvas}
      newCanvas.elements = this.canvasElements
      newCanvas.savedViews = this.savedViews
      newCanvas.title = this.canvasObj.title
      newCanvas.background = this.canvasObj.background
      this.note.setContent(JSON.stringify(newCanvas, null, 2))
      this.canvasObj = newCanvas
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
      if (!(['INPUT', 'TEXTAREA'].includes(tagName)) && !classes.includes('editor')) {
        if (event.key === "Escape") {
          if (this.selectRectBeingDrawn) {
            this.selectRectBeingDrawn = false
            this.helperElements = this.helperElements.filter(el => !(el.type == 'select-rect'))
          }
          if (this.mode == 'move') {
            for (let id in this.moveOrigins) {
              if (id == 'cursor') continue
              let index = this.canvasElements.findIndex(el => el.id == id)
              if (index < -1) continue
              this.canvasElements[index].x = this.moveOrigins[id][0]
              this.canvasElements[index].y = this.moveOrigins[id][1]
            }
          }
          this.setMode('normal')
          this.fullKeybuffer = ''
        }
        else if (event.key == 's' && event.metaKey) {
          this.saveCanvas()
        }
        else if (event.key.length == 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
          this.fullKeybuffer += event.key
          var match = this.fullKeybuffer.match(/(\d+)?("([a-zA-Z0-9+]))?(.+)/)
          this.keybufferCount = match[1]
          this.keybufferRegister = match[3]
          this.keybuffer = match[4]
          event.stopPropagation()
          event.preventDefault()
          if (this.mode == 'normal') {
            // Might not need the first helper function here
            var doesRangeContainAnother = (r1, r2) => ((r1[0] <= r2[0]) && (r1[1] >= r2[1])) || ((r2[0] <= r1[0]) && (r2[1] >= r1[1]))
            var doRangesOverlap = (r1, r2) => (r1[1] - r2[0] >= 0) && (r2[1] - r1[0] >= 0)
            if (this.keybuffer == "e")
            {
              this.getFocusedElementItem()?.editElement()
              this.setMode('edit')
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "x")
            {
              // this.canvasElements = this.canvasElements.filter(e => e.id != this.focusedElementId)
              let affectedIds = this.getElementIdsToBeAffected()
              let affectedElements = this.getElementsToBeAffected()
              let newCanvasElements = this.canvasElements.filter(e => !affectedIds.includes(e.id))
              for (let el of affectedElements) {
                if (el.type == 'note' && !(newCanvasElements.some(e => e.path == el.path))) {
                  this.note.removeLink(el.path)
                }
              }
              this.edges = this.edges.filter(ed => !affectedIds.includes(ed.fromElement) && !affectedIds.includes(ed.toElement))
              this.canvasElements = newCanvasElements
              this.focusedElementId = null
              this.selectedElementsIds = []
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == " ")
            {
              let focusedElementId = this.focusedElementId
              if (this.selectedElementsIds.includes(focusedElementId)) {
                this.selectedElementsIds = this.selectedElementsIds.filter(id => id != focusedElementId)
              }
              else {
                this.selectedElementsIds.push(focusedElementId)
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "sn")
            {
              this.selectedElementsIds = []
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "sv")
            {
              this.selectedElementsIds = this.visibleElements.map(el => el.id)
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "z0")
            {
              this.setScale(1)
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",d")
            {
              this.statusBarDebugInfo = !this.statusBarDebugInfo
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "l")
            {
              let focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              let range1 = [focusedElement.y, focusedElement.y + focusedElement.height]
              if (focusedElement) {
                let leftmostX = focusedElement.x
                let nextElX = null
                let nextElY = null
                let nextElId = null
                for (let el of this.canvasElements) {
                  let range2 = [el.y, el.y + el.height]
                  if (!doRangesOverlap(range1, range2)) continue
                  if (el.x > leftmostX && !nextElId) {
                    nextElX = el.x
                    nextElY = el.y
                    nextElId = el.id
                  }
                  else if (el.x > leftmostX && el.x < nextElX) {
                    nextElX = el.x
                    nextElY = el.y
                    nextElId = el.id
                  }
                }
                if (nextElId) {
                  this.focusedElementId = nextElId
                }
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "h")
            {
              let focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              let range1 = [focusedElement.y, focusedElement.y + focusedElement.height]
              if (focusedElement) {
                let leftmostX = focusedElement.x
                let rightmostX = focusedElement.x + focusedElement.width
                let nextElX = null
                let nextElY = null
                let nextElId = null
                for (let el of this.canvasElements) {
                  let range2 = [el.y, el.y + el.height]
                  if (!doRangesOverlap(range1, range2)) continue
                  if ((el.x + el.width) < rightmostX && !nextElId) {
                    nextElX = el.x + el.width
                    nextElY = el.y
                    nextElId = el.id
                  }
                  else if ((el.x + el.width) < rightmostX && (el.x + el.width) > nextElX) {
                    nextElX = el.x
                    nextElY = el.y
                    nextElId = el.id
                  }
                }
                if (nextElId) {
                  this.focusedElementId = nextElId
                }
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "j")
            {
              let focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              let range1 = [focusedElement.x, focusedElement.x + focusedElement.width]
              if (focusedElement) {
                let bottommostY = focusedElement.y + focusedElement.height
                let topmostY = focusedElement.y
                let nextElX = null
                let nextElY = null
                let nextElId = null
                for (let el of this.canvasElements) {
                  let range2 = [el.x, el.x + el.width]
                  if (!doRangesOverlap(range1, range2)) continue
                  if (el.y > topmostY && !nextElId) {
                    nextElX = el.x
                    nextElY = el.y
                    nextElId = el.id
                  }
                  else if (el.y > topmostY && el.y < nextElY) {
                    nextElX = el.x
                    nextElY = el.y
                    nextElId = el.id
                  }
                }
                if (nextElId) {
                  this.focusedElementId = nextElId
                }
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "k")
            {
              let focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              let range1 = [focusedElement.x, focusedElement.x + focusedElement.width]
              if (focusedElement) {
                let bottommostY = focusedElement.y + focusedElement.height
                let nextElX = null
                let nextElY = null
                let nextElId = null
                for (let el of this.canvasElements) {
                  let range2 = [el.x, el.x + el.width]
                  if (!doRangesOverlap(range1, range2)) continue
                  if ((el.y + el.height) < bottommostY && !nextElId) {
                    nextElX = el.x
                    nextElY = el.y + el.height
                    nextElId = el.id
                  }
                  else if ((el.y + el.height) < bottommostY && (el.y + el.height) > nextElY) {
                    nextElX = el.x
                    nextElY = el.y
                    nextElId = el.id
                  }
                }
                if (nextElId) {
                  this.focusedElementId = nextElId
                }
              }
              this.fullKeybuffer = ''
            }
            else if (/^m[a-zA-Z0-9]/.test(this.keybuffer))
            {
              // Set jump mark
              let mark = this.keybuffer[1]
              let canvasMatrix = this.canvasMatrix
              let centerX = canvasMatrix.e + ((this.$refs.canvasWrapper.clientWidth  / 2 ) / canvasMatrix.a)
              let centerY = canvasMatrix.f + ((this.$refs.canvasWrapper.clientHeight / 2 ) / canvasMatrix.d)
              let markObj = {
                type: 'mark',
                key: mark,
                focusedElementId: this.focusedElementId || null,
                scale: this.scale,
                centerX,
                centerY,
              }
              console.log(markObj)
              let i = this.savedViews.findIndex(v => v.key == mark)
              if (i > -1) {
                this.savedViews[i] = markObj
              }
              else {
                this.savedViews.push(markObj)
              }
              this.fullKeybuffer = ''
            }
            else if (/^'[a-zA-Z0-9]/.test(this.keybuffer))
            {
              // Jump to jump mark
              let mark = this.keybuffer[1]
              let i = this.savedViews.findIndex(v => v.key == mark)
              if (i > -1) {
                let markObj = this.savedViews[i]
                this.setScale(markObj.scale ?? this.scale)
                this.canvasMatrix.e = markObj.centerX - ((this.$refs.canvasWrapper.clientWidth  / 2 ) / this.canvasMatrix.a)
                this.canvasMatrix.f = markObj.centerY - ((this.$refs.canvasWrapper.clientHeight / 2 ) / this.canvasMatrix.d)
                this.focusedElementId = markObj.focusedElementId ?? this.focusedElementId
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "nt")
            {
              var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              this.addNewMarkdownElement({x, y})
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "nh")
            {
              var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              this.addNewFittedMarkdownElement({x, y})
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "nl")
            {
              var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              this.addNewLucideIcon({x, y})
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "ni")
            {
              var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              this.addNewImage({x, y})
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "nf")
            {
              var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              this.addNewFrame({x, y})
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "nn")
            {
              var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              this.addNewNote({x, y})
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "nc")
            {
              let affectedElements = this.getElementsToBeAffected()
              if (affectedElements.length > 0) {
                let boundingRect = this.getBoundingRectCoveringGivenElements(affectedElements)
                var {x, y, width, height} = boundingRect
                let padding = 20
                x -= padding
                y -= padding
                width += padding * 2
                height += padding * 2
              }
              else {
                var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
                var width = 200
                var height = 200
              }
              this.addNewElement({x, y, width, height, type: 'container'})
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "nC")
            {
              let affectedElements = this.getElementsToBeAffected()
              let affectedIds = this.getElementIdsToBeAffected()
              if (affectedElements.length > 0) {
                let boundingRect = this.getBoundingRectCoveringGivenElements(affectedElements)
                var {x, y, width, height} = boundingRect
                let padding = 20
                x -= padding
                y -= padding
                width += padding * 2
                height += padding * 2
              }
              else {
                var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
                var width = 200
                var height = 200
              }
              let newElement = this.addNewElement({x, y, width, height, type: 'container'})
              for (let ed of this.edges) {
                if (affectedIds.includes(ed.fromElement) && !affectedIds.includes(ed.toElement)) {
                  ed.fromElement = newElement.id
                }
                else if (affectedIds.includes(ed.toElement) && !affectedIds.includes(ed.fromElement)) {
                  ed.toElement = newElement.id
                }
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "nF")
            {
              var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              this.addNewFile({x, y})
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "ct")
            {
              this.$store.commit('triggerCustomTextPrompt', {
                message: 'Change canvas title',
                text: this.canvasObj.title,
                action: (title) => {
                  this.canvasObj.title = title
                }
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "cb")
            {
              this.$store.commit('triggerCustomTextPrompt', {
                message: 'Change canvas background',
                text: this.canvasObj.background || '',
                action: (background) => {
                  this.$set(this.canvasObj, 'background', background)
                }
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "g")
            {
              let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              this.moveOrigins = {}
              this.$set(this.moveOrigins, 'cursor', [x, y])
              var focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              let affectedElements = this.getElementsToBeAffected()
              for (let con of affectedElements.filter(el => el.type == 'container')) {
                let additionalElements = this.getElementsFullyEnclosed({x, y, width, height} = con)
                affectedElements = affectedElements.concat(additionalElements)
              }
              for (let el of affectedElements) {
                this.$set(this.moveOrigins, el.id, [el.x, el.y])
              }
              this.setMode('move')
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "cc")
            {
              var items = []
              let colors = {
                'Grey': 1,
                'Red': 2,
                'Green': 3,
                'Yellow': 4,
                'Cyan': 5,
                'Blue': 6,
                'Purple': 7,
                'Pink': 8,
                'Black': 9,
              }
              for (let [color, number] of Object.entries(colors)) {
                items.push({
                  label: color,
                  lucideIcon: 'Palette',
                  action: () => {
                    var affectedIds = this.getElementIdsToBeAffected()
                    for (let id of affectedIds) {
                      var elementIndex = this.canvasElements.findIndex(e => e.id == id)
                      var focusedElement = this.canvasElements[elementIndex]
                      if (number == 9) {
                        focusedElement.color = '0, 0, 0'
                        this.$set(this.canvasElements[elementIndex], 'color', '0, 0, 0')
                      }
                      else {
                        this.$set(this.canvasElements[elementIndex], 'color', `var(--canvas-color-${number})`)
                      }
                    }
                  },
                })
              }
              items = items.concat([
                {role: 'separator'},
                {
                  label: 'Custom color',
                  lucideIcon: 'Palette',
                  action: () => {
                    var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
                    var focusedElement = this.canvasElements[focusedElementIndex]
                    this.$store.commit('triggerCustomTextPrompt', {
                      message: 'Set custom color for element in RGB (R, G, B):',
                      text: focusedElement.color || '0, 0, 0',
                      action: (color) => {
                        if (/\d{1,3},\s?\d{1,3},\s?\d{1,3}/.test(color)) {
                          var affectedIds = this.getElementIdsToBeAffected()
                          for (let id of affectedIds) {
                            var elementIndex = this.canvasElements.findIndex(e => e.id == id)
                            this.$set(this.canvasElements[elementIndex], 'color', color)
                          }
                        }
                      }
                    })
                  },
                },
              ])
              this.$store.commit('triggerCustomPopoverList', {
                message: `Set element color`,
                items: items,
                options: {hintMode: true},
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "cg")
            {
              this.setMode('grow')
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "cr")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              this.$set(this.canvasElements[focusedElementIndex], 'rotation', this.keybufferCount || 0)
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "qq")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              if (focusedElementIndex > -1) {
                var focusedElement = this.canvasElements[focusedElementIndex]
                if (focusedElement.type == 'image') {
                  if (!focusedElement.imageFilters) {
                    this.$set(this.canvasElements[focusedElementIndex], 'imageFilters', {})
                  }
                  var items = [
                    {
                      label: 'Grayscale',
                      key: 'g',
                      action: () => {
                        this.$store.commit('triggerCustomTextPrompt', {
                          message: 'Enter Grayscale value (0 = 0%; 1 = 100%):',
                          text: '1',
                          action: (value) => {
                            value = parseFloat(value) || 1
                            this.$set(this.canvasElements[focusedElementIndex].imageFilters, 'grayscale', value)
                          }
                        })
                      },
                    },
                    {
                      label: 'Brightness',
                      key: 'b',
                      action: () => {
                        this.$store.commit('triggerCustomTextPrompt', {
                          message: 'Enter Brightness value (1 = no change; <1 darker; >1 brighter):',
                          text: '1',
                          action: (value) => {
                            value = parseFloat(value) || 1
                            this.$set(this.canvasElements[focusedElementIndex].imageFilters, 'brightness', value)
                          }
                        })
                      },
                    },
                    {
                      label: 'Contrast',
                      key: 'c',
                      action: () => {
                        this.$store.commit('triggerCustomTextPrompt', {
                          message: 'Enter Contrast value (1 = no change; <1 less; >1 more):',
                          text: '1',
                          action: (value) => {
                            value = parseFloat(value) || 1
                            this.$set(this.canvasElements[focusedElementIndex].imageFilters, 'contrast', value)
                          }
                        })
                      },
                    },
                    {
                      label: 'Saturation',
                      key: 's',
                      action: () => {
                        this.$store.commit('triggerCustomTextPrompt', {
                          message: 'Enter Saturation value (1 = no change; <1 less; >1 more):',
                          text: '1',
                          action: (value) => {
                            value = parseFloat(value) || 1
                            this.$set(this.canvasElements[focusedElementIndex].imageFilters, 'saturate', value)
                          }
                        })
                      },
                    },
                    {
                      label: 'Sepia',
                      action: () => {
                        this.$store.commit('triggerCustomTextPrompt', {
                          message: 'Enter Saturation value (0 = no change; 1 = full sepia):',
                          text: '1',
                          action: (value) => {
                            value = parseFloat(value) || 1
                            this.$set(this.canvasElements[focusedElementIndex].imageFilters, 'sepia', value)
                          }
                        })
                      },
                    },
                    {
                      label: 'Invert',
                      action: () => {
                        this.$store.commit('triggerCustomTextPrompt', {
                          message: 'Enter Invert value (0 = no change; 1 = 100% change):',
                          text: '1',
                          action: (value) => {
                            value = parseFloat(value) || 1
                            this.$set(this.canvasElements[focusedElementIndex].imageFilters, 'invert', value)
                          }
                        })
                      },
                    },
                    {
                      label: 'Blur',
                      key: 'b',
                      action: () => {
                        this.$store.commit('triggerCustomTextPrompt', {
                          message: 'Enter Blur value (in pixels):',
                          text: '1',
                          action: (value) => {
                            value = parseFloat(value) || 1
                            this.$set(this.canvasElements[focusedElementIndex].imageFilters, 'blur', value)
                          }
                        })
                      },
                    },
                    {
                      label: 'Flip X',
                      action: () => {
                        this.$set(this.canvasElements[focusedElementIndex].imageFilters, 'flipX', true)
                      },
                    },
                    {
                      label: 'Flip Y',
                      action: () => {
                        this.$set(this.canvasElements[focusedElementIndex].imageFilters, 'flipY', true)
                      },
                    },
                    { role: 'separator' },
                    {
                      label: 'Remove all filters',
                      action: () => {
                        this.$delete(this.canvasElements[focusedElementIndex], 'imageFilters')
                      },
                    },
                  ]
                  this.$store.commit('triggerCustomPopoverList', {
                    message: `Add image effect`,
                    items: items,
                    options: {hintMode: false},
                  })
                }
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "qc")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              if (focusedElementIndex > -1) {
                var focusedElement = this.canvasElements[focusedElementIndex]
                  if (!focusedElement.cssClasses) {
                    this.$set(this.canvasElements[focusedElementIndex], 'cssClasses', [])
                  }
                  var cssClasses = [
                    {
                      label: 'Element color = text color',
                      className: 'textColorFromElementColor',
                    },
                    {
                      label: 'Blur background',
                      className: 'blurBackground',
                    },
                    {
                      label: 'Content only',
                      className: 'contentOnly',
                    },
                    {
                      label: 'Center Headings',
                      className: 'centerHeadings',
                    },
                  ]
                  var items = []
                  for (let c of cssClasses) {
                    items.push({
                      label: c.label,
                      lucideIcon: focusedElement.cssClasses.includes(c.className) ? 'CheckCircle2' : 'Circle',
                      action: () => {
                        if (!focusedElement.cssClasses.includes(c.className)) {
                          this.canvasElements[focusedElementIndex].cssClasses.push(c.className)
                        }
                        else {
                          this.canvasElements[focusedElementIndex].cssClasses = this.canvasElements[focusedElementIndex].cssClasses.filter(cl => cl !== c.className)
                        }
                      },
                    })
                  }
                  items = items.concat([
                    { role: 'separator' },
                    {
                      label: 'Remove all classes',
                      action: () => {
                        this.$delete(this.canvasElements[focusedElementIndex], 'cssClasses')
                      },
                    },
                  ])
                  this.$store.commit('triggerCustomPopoverList', {
                    message: 'Add CSS class',
                    items: items,
                    options: {hintMode: false},
                  })
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "cf")
            {
              // Fit to viewport // doesn't quite work yet
              const calculateAspectRatioFit = (srcWidth, srcHeight, maxWidth, maxHeight) => {
                var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
                return { width: srcWidth*ratio, height: srcHeight*ratio }
              }
              let viewportCoordinates = this.viewportCoordinates
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              let {width, height} = calculateAspectRatioFit(
                this.canvasElements[focusedElementIndex].width,
                this.canvasElements[focusedElementIndex].height,
                viewportCoordinates.topright[0] - viewportCoordinates.topleft[0],
                viewportCoordinates.bottomleft[1] - viewportCoordinates.topleft[1],
              )
              this.$set(this.canvasElements[focusedElementIndex], 'width', width)
              this.$set(this.canvasElements[focusedElementIndex], 'height', height)
              this.$set(this.canvasElements[focusedElementIndex], 'x', viewportCoordinates.topleft[0])
              this.$set(this.canvasElements[focusedElementIndex], 'y', viewportCoordinates.topleft[1])
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "zz")
            {
              // Center on focused element
              var focusedElement= this.canvasElements.find(e => e.id == this.focusedElementId)
              if (focusedElement) {
                let {x, y, width, height} = focusedElement
                let canvasWidth = this.$refs.canvasWrapper.clientWidth
                let canvasHeight = this.$refs.canvasWrapper.clientHeight
                let newCenterX = x + (width/2)
                let newCenterY = y + (height/2)
                let newCanvasX = -newCenterX + ((canvasWidth  / 2 ) / this.canvasMatrix.a)
                let newCanvasY = -newCenterY + ((canvasHeight / 2 ) / this.canvasMatrix.d)
            else if (this.keybuffer == "qx")
            {
              // Grow height of element until there is no more overflow (scrollbar)
              var focusedElementItem = this.getFocusedElementItem()
              if (focusedElementItem) {
                focusedElementItem.growDownUntilNoOverflow()
              }
              this.fullKeybuffer = ''
            }
                this.canvasMatrix.e = newCanvasX
                this.canvasMatrix.f = newCanvasY
              }
              this.fullKeybuffer = ''
            }
          }
          else if (this.mode == 'move') {
            if (this.keybuffer == "j")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              this.canvasElements[focusedElementIndex].y += this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "k")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              this.canvasElements[focusedElementIndex].y -= this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "l")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              this.canvasElements[focusedElementIndex].x += this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "h")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              this.canvasElements[focusedElementIndex].x -= this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "t")
            {
              let affectedIds = this.getElementIdsToBeAffected()
              for (let id of affectedIds) {
                let elIndex = this.canvasElements.findIndex(el => el.id == id)
                let el = this.canvasElements[elIndex]
                let highestZ = el.zIndex ?? 0
                for (let ele of this.canvasElements) {
                  if (ele.id == el.id) continue
                  if (this.checkOverlap(
                    this.calculateRectanglePoints(el.x, el.y, el.width, el.height),
                    this.calculateRectanglePoints(ele.x, ele.y, ele.width, ele.height),
                  )) {
                    highestZ = (ele.zIndex > highestZ) ? ele.zIndex : highestZ
                  }
                }
                let newZ = highestZ + 1
                if (newZ == 0 && this.canvasElements[elIndex].hasOwnProperty('zIndex')) {
                  this.$delete(this.canvasElements[elIndex], 'zIndex')
                }
                else {
                  this.$set(this.canvasElements[elIndex], 'zIndex', newZ)
                }
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "b")
            {
              let affectedIds = this.getElementIdsToBeAffected()
              for (let id of affectedIds) {
                let elIndex = this.canvasElements.findIndex(el => el.id == id)
                let el = this.canvasElements[elIndex]
                let lowestZ = el.zIndex ?? 0
                for (let ele of this.canvasElements) {
                  if (ele.id == el.id) continue
                  if (this.checkOverlap(
                    this.calculateRectanglePoints(el.x, el.y, el.width, el.height),
                    this.calculateRectanglePoints(ele.x, ele.y, ele.width, ele.height),
                  )) {
                    lowestZ = (ele.zIndex < lowestZ) ? ele.zIndex : lowestZ
                  }
                }
                let newZ = lowestZ - 1
                if (newZ == 0 && this.canvasElements[elIndex].hasOwnProperty('zIndex')) {
                  this.$delete(this.canvasElements[elIndex], 'zIndex')
                }
                else {
                  this.$set(this.canvasElements[elIndex], 'zIndex', newZ)
                }
              }
              this.fullKeybuffer = ''
            }
          }
          else if (this.mode == 'grow') {
            if (this.keybuffer == "j")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              this.canvasElements[focusedElementIndex].height += this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "k")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              this.canvasElements[focusedElementIndex].height += this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.canvasElements[focusedElementIndex].y -= this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "l")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              this.canvasElements[focusedElementIndex].width += this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "h")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              this.canvasElements[focusedElementIndex].width += this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.canvasElements[focusedElementIndex].x -= this.keybufferCount ? parseInt(this.keybufferCount) : 20
              this.fullKeybuffer = ''
            }
          }
        }
      }
    },
  },
  computed: {
    title() {
      return this.canvasObj.title
    },
    stack() {
      if (this.note) {
        return this.$store.state.currentNoteCollection.stacks.getStackByPath(this.note.stack)
      }
    },
    routeTab() {
      if (this.note && this.canvasObj) {
        var routeTabData = {
          title: this.title || 'Canvas Page',
        }
        return routeTabData
      }
    },
    computedTransformStyle() {
      return `transform: ${tm.toCSS(this.canvasMatrix)}; transform-origin: top left;`
    },
    canvasWrapperStyle() {
      if (this.canvasObj.background) {
        var background = this.canvasObj.background
      }
      return {
        background,
        '--inverse-scale': 1/this.scale,
      }
    },
    viewportCoordinates() {
      let width = this.$refs.canvasWrapper.offsetWidth
      let height = this.$refs.canvasWrapper.offsetHeight
      let toWorldPos = this.toWorldPos
      return {
        topleft: toWorldPos(0, 0),
        topright: toWorldPos(width, 0),
        bottomleft: toWorldPos(0, height),
        bottomright: toWorldPos(width, height),
      }
    },
  },
  watch: {
    canvasMatrix: {
      handler() {
        this.calculateVisibleElements()
      },
      deep: true,
    },
    canvasElements: {
      handler() {
        this.calculateVisibleElements()
      },
      deep: false,
    },
  },
  mounted() {
    this.canvasObj = JSON.parse(this.note.content)
    this.canvasElements = this.canvasObj.elements
    this.savedViews = this.canvasObj.savedViews || []
    this.isMounted = true
    this.setCanvasMatrix({
      a: this.scale, c: 0, e: this.originX,
      b: 0, d: this.scale, f: this.originY
    })
    setTimeout(() => {
      this.calculateVisibleElements()
      this.$refs.canvasWrapper.focus()
    }, 50)
  },
  unmounted() {
  },
  activated() {
    this.portalActive = true
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
    }
  },
  deactivated() {
    this.portalActive = false
    this.previouslyFocusedElement = document.activeElement
  },
}
</script>

<style lang='scss'>
.canvasPage {
  position: relative;
  --focus-color: cornflowerblue;
  --canvas-background: #ebebeb;
  --canvas-color-1: 192, 192, 192; // Grey
  --canvas-color-2: 233, 49, 71; // Red
  --canvas-color-3: 8, 185, 78; // Green
  --canvas-color-4: 224, 172, 0; // Yellow
  --canvas-color-5: 0, 191, 188; // Cyan
  --canvas-color-6: 8, 109, 221; // Blue
  --canvas-color-7: 120, 82, 238; // Purple
  --canvas-color-8: 213, 57, 132; // Pink
  --canvas-color: var(--canvas-color-1);
}
.canvas-wrapper {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: var(--canvas-background);
  overflow: hidden;
  contain: strict;
  touch-action: none;
  user-select: none;
  outline: none;
}
.canvas {
  .selectRect {
    border: 1px dashed black;
    background: rgba(256, 256, 256, 0.15);
  }
  .CodeMirror-cursors,
  .CodeMirror-measure:nth-child(2) + div{
    transform:scale(var(--inverse-scale));
    transform-origin: 0 0;
  }
}
</style>
