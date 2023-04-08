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
        <svg class="canvas-edges">
        <g
        v-for="edge in visibleEdges"
        :key="edge.id"
        class="canvas-edge"
        :class="{focused: edge.id == focusedEdgeId}"
        >
          <defs>
            <path :id="edge.id" :d="edge.pathD" />
            <marker
            v-if="edge.toEnd == 'arrow' || edge.fromEnd == 'arrow'"
            :id="`arrow_${edge.id}`"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
            :style="{fill: edge.color ? `rgb(${edge.color})` : null}"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          <use xmlns:xlink="http://www.w3.org/1999/xlink"
          :xlink:href="`#${edge.id}`"
          class="edge-outline"
          @click="setFocusedEdge(edge.id)"
          :style="{stroke: edge.color ? `rgba(${edge.color}, 0.11)` : null}"
          ></use>
          <use xmlns:xlink="http://www.w3.org/1999/xlink"
          :xlink:href="`#${edge.id}`"
          class="edge"
          :marker-end="edge.toEnd == 'arrow' ? `url(#arrow_${edge.id})` : null"
          :marker-start="edge.fromEnd == 'arrow' ? `url(#arrow_${edge.id})` : null"
          @click="setFocusedEdge(edge.id)"
          :style="{stroke: edge.color ? `rgb(${edge.color})` : null}"
          ></use>
          <text style="font-size: 24px;" dy="-10px" v-if="edge.label" :style="{fill: edge.color ? `rgb(${edge.color})` : null}">
            <textPath :xlink:href="`#${edge.id}`" startOffset="50%" text-anchor="middle">{{edge.label}}</textPath>
          </text>
        </g>
        </svg>
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
        :style="{width: element.width ? `${element.width}px` : null, height: element.height ? `${element.height}px` : null, transform: `translate(${element.x}px, ${element.y}px) rotate(${element.rotation || 0}deg)`}"
        @[element.click?`click`:null]="element.click"
        ref="helperElementItems"
        >
        </div>
      </div>
    </div>
    <portal to="statusBarRight" :order="1" v-if="portalActive">
      <span class="keybuffer">{{fullKeybuffer}}</span>
      <span class="edgeArrowMode" @click="nextEdgeArrowMode"><Icon :name="edgeArrowModeIcon"/></span>
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
        'edge-create': {
          label: 'Edge Create',
          lucideIcon: 'GitBranchPlus',
        },
      },
      fullKeybuffer: '',
      keybuffer: '',
      keybufferCount: null,
      keybufferRegister: null,
      focusedElementId: null,
      focusedEdgeId: null,
      edgeArrowMode: 'none',
      selectedElementsIds: [],
      activatedEdgeInitiators: [],
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
      edges: [],
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
        this.focusedEdgeId = null
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
    calculatEdgeCreateHelpers() {
      this.helperElements = []
      for (let el of this.visibleElements) {
        let elementMeasurements = {
          top: {x: el.x + (el.width / 2), y: el.y},
          right: {x: el.x + el.width, y: el.y + (el.height / 2)},
          bottom: {x: el.x + (el.width / 2 ), y: el.y + el.height},
          left: {x: el.x, y: el.y + (el.height / 2 )},
        }
        for (let side of Object.keys(elementMeasurements)) {
          let {x, y} = elementMeasurements[side]
          let isActivated = this.activatedEdgeInitiators.some(ei => ((ei.elementId == el.id) && (ei.side == side)))
          this.helperElements.push({
            id: uuidv4(),
            elementId: el.id,
            type: 'edge-initiator',
            classes: ['edge-initiator', `edge-initiator-${side}`, isActivated ? 'activated' : null].filter(i => i !== null),
            side: side,
            x,
            y,
            click: () => {
              console.log(`Clicked: ${el.id} at ${side}`)
              this.activatedEdgeInitiators.push({
                elementId: el.id,
                side: side,
              })
              this.calculatEdgeCreateHelpers()
            },
          })
        }
      }
    },
    setFocusedElement(id) {
      this.focusedElementId = id
      this.focusedEdgeId = null
    },
    setFocusedEdge(id) {
      this.focusedEdgeId = id
      this.focusedElementId = null
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
      width = 120,
      height = 60,
      text = 'Text',
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
        cssClasses: ['centerEverything'],
      }
      this.canvasElements.push(newElement)
      return newElement
    },
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
      width = 120,
      height = 60,
      text = 'Fitted text',
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
      return newElement
    },
    addNewLucideIcon({
      x = 0,
      y = 0,
      width = 200,
      height = 200,
      lucideIcon = 'FileQuestion',
    } = {}, callback) {
      let ComponentClass = Vue.extend(Icon)
      let iconInstance = new ComponentClass()
      let listofAllIcons = iconInstance.getListOfAllIcons()
      var items = listofAllIcons.map(lucideIcon => {
        return {
          label: lucideIcon,
          lucideIcon,
          action:() => {
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
            callback(newElement)
          }
        }
      })
      this.$store.commit('triggerCustomSelectList', {items})
    },
    addNewFile({
      x = 0,
      y = 0,
      width = 355,
      height = 155,
      path = '',
    } = {}, callback) {
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
          callback(newElement)
        }
      })
    },
    addNewImage({
      x = 0,
      y = 0,
      width = 100,
      height = 100,
    } = {}, callback) {
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
            callback(newElement)
          }
          img.src = url
        }
      })
    },
    addNewFrame({
      x = 0,
      y = 0,
      width = 560,
      height = 320,
    } = {}, callback) {
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
          callback(newElement)
        }
      })
    },
    addNewNote({
      x = 0,
      y = 0,
      width = 630,
      height = 300,
    } = {}, callback) {
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
                path: note.noteLink,
                x,
                y,
                width,
                height,
                creationDate: new Date(),
                modificationDate: new Date(),
              }
              this.canvasElements.push(newElement)
              this.note.addLink(note.relativePath, 'canvas-element')
              callback(newElement)
            }
          }
        }
        return null
      })
      items = items.filter(i => i !== null)
      this.$store.commit('triggerCustomSelectList', {items})
    },
    nextEdgeArrowMode() {
      let currentEdgeArrowMode = this.edgeArrowMode
      let edgeArrowModes = ['none', 'to', 'from', 'bidirectional']
      let index = edgeArrowModes.findIndex(m => m == currentEdgeArrowMode)
      if (index > -1) {
        index++
        if (index >= edgeArrowModes.length) index = 0
        this.edgeArrowMode = edgeArrowModes[index]
      }
    },
    splitEdgeWithElement(edgeId, splitElement) {
      let edgeToBeSplit = this.edges.find(ed => ed.id == edgeId)
      let {toElement, fromElement, fromSide, toSide} = edgeToBeSplit
      toElement = this.canvasElements.find(el => el.id == toElement)
      fromElement = this.canvasElements.find(el => el.id == fromElement)
      let splitElementMeasurements = {
        top: {x: splitElement.x + (splitElement.width / 2), y: splitElement.y},
        right: {x: splitElement.x + splitElement.width, y: splitElement.y + (splitElement.height / 2)},
        bottom: {x: splitElement.x + (splitElement.width / 2 ), y: splitElement.y + splitElement.height},
        left: {x: splitElement.x, y: splitElement.y + (splitElement.height / 2 )},
      }
      let toElementMeasurements = {
        top: {x: toElement.x + (toElement.width / 2), y: toElement.y},
        right: {x: toElement.x + toElement.width, y: toElement.y + (toElement.height / 2)},
        bottom: {x: toElement.x + (toElement.width / 2 ), y: toElement.y + toElement.height},
        left: {x: toElement.x, y: toElement.y + (toElement.height / 2 )},
      }
      let fromElementMeasurements = {
        top: {x: fromElement.x + (fromElement.width / 2), y: fromElement.y},
        right: {x: fromElement.x + fromElement.width, y: fromElement.y + (fromElement.height / 2)},
        bottom: {x: fromElement.x + (fromElement.width / 2 ), y: fromElement.y + fromElement.height},
        left: {x: fromElement.x, y: fromElement.y + (fromElement.height / 2 )},
      }
      let sideDistancesToElement = []
      for (let fromSide of Object.keys(splitElementMeasurements)) {
        sideDistancesToElement.push({
          toSide,
          fromSide,
          distance: Math.sqrt((splitElementMeasurements[fromSide].x - toElementMeasurements[toSide].x)**2 + (splitElementMeasurements[fromSide].y - toElementMeasurements[toSide].y)**2),
        })
      }
      let shortestDistanceToElement = sideDistancesToElement.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr)
      this.edges.push({
        ...edgeToBeSplit,
        id: uuidv4(),
        fromElement: splitElement.id,
        fromSide: shortestDistanceToElement.fromSide,
        toElement: toElement.id,
        toSide: toSide,
      })
      let sideDistancesFromElement = []
      for (let toSide of Object.keys(splitElementMeasurements)) {
        sideDistancesFromElement.push({
          toSide,
          fromSide,
          distance: Math.sqrt((fromElementMeasurements[fromSide].x - splitElementMeasurements[toSide].x)**2 + (fromElementMeasurements[fromSide].y - splitElementMeasurements[toSide].y)**2),
        })
      }
      let shortestDistanceFromElement = sideDistancesFromElement.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr)
      this.edges.push({
        ...edgeToBeSplit,
        id: uuidv4(),
        toElement: splitElement.id,
        toSide: shortestDistanceFromElement.toSide,
        fromElement: fromElement.id,
        fromSide: fromSide,
      })
      this.focusedEdgeId = null
      this.edges = this.edges.filter(ed => ed.id != edgeToBeSplit.id)
    },
    saveCanvas() {
      var oldCanvas = this.canvasObj
      var newCanvas = {...oldCanvas}
      newCanvas.elements = this.canvasElements
      newCanvas.savedViews = this.savedViews
      newCanvas.title = this.canvasObj.title
      newCanvas.background = this.canvasObj.background
      newCanvas.edges = this.edges
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
          if (this.mode == 'edge-create') {
            this.helperElements = this.helperElements.filter(el => !(el.type == 'edge-initiator'))
            this.activatedEdgeInitiators = []
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
            if (this.focusedEdgeId) {
              if (this.keybuffer == "d") {
                // Create dot between for focused edge on mouse position
                let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
                let newDot = this.addNewElement({x, y, width: 20, height: 20, type: 'dot'})
                this.splitEdgeWithElement(this.focusedEdgeId, newDot)
                this.focusedElementId = newDot.id
                this.fullKeybuffer = ''
                return
              }
              else if (this.keybuffer == "a") {
                let focusedEdge = this.edges.find(ed => ed.id == this.focusedEdgeId)
                var items = [
                  {
                    label: 'Nondirectional',
                    lucideIcon: 'Minus',
                    action: () => {
                      this.$delete(focusedEdge, 'toEnd')
                      this.$delete(focusedEdge, 'fromEnd')
                    },
                  },
                  {
                    label: 'Unidirectional',
                    lucideIcon: 'ArrowRight',
                    action: () => {
                      this.$set(focusedEdge, 'toEnd', 'arrow')
                      this.$delete(focusedEdge, 'fromEnd')
                    },
                  },
                  {
                    label: 'Bidirectional',
                    lucideIcon: 'MoveHorizontal',
                    action: () => {
                      this.$set(focusedEdge, 'toEnd', 'arrow')
                      this.$set(focusedEdge, 'fromEnd', 'arrow')
                    },
                  },
                ]
                this.$store.commit('triggerCustomPopoverList', {
                  message: `Arrow`,
                  items: items,
                  options: {hintMode: false},
                })
                this.fullKeybuffer = ''
                return
              }
              else if (this.keybuffer == "r") {
                let focusedEdge = this.edges.find(ed => ed.id == this.focusedEdgeId)
                let {toElement, fromElement, toSide, fromSide, toEnd, fromEnd} = focusedEdge
                this.$set(focusedEdge, 'toElement', fromElement)
                this.$set(focusedEdge, 'fromElement', toElement)
                this.$set(focusedEdge, 'toEnd', fromEnd)
                this.$set(focusedEdge, 'fromEnd', toEnd)
                this.$set(focusedEdge, 'toSide', fromSide)
                this.$set(focusedEdge, 'fromSide', toSide)
                this.fullKeybuffer = ''
                return
              }
              else if (this.keybuffer == "s") {
                let focusedEdge = this.edges.find(ed => ed.id == this.focusedEdgeId)
                let {toElement, fromElement, toSide, fromSide, toEnd, fromEnd} = focusedEdge
                this.$set(focusedEdge, 'toEnd', fromEnd)
                this.$set(focusedEdge, 'fromEnd', toEnd)
                this.fullKeybuffer = ''
                return
              }
            }
            if (this.keybuffer == "e")
            {
              this.getFocusedElementItem()?.editElement()
              this.setMode('edit')
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "x")
            {
              if (this.focusedEdgeId) {
                this.edges = this.edges.filter(ed => ed.id != this.focusedEdgeId)
                this.focusedEdgeId = null
              }
              else {
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
              }
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
            else if (this.keybuffer == "sc")
            {
              let affectedIds = this.getElementIdsToBeAffected()
              let processedElementIds = []
              let addToSelection = (id) => {
                if (!this.selectedElementsIds.includes(id)) {
                  this.selectedElementsIds.push(id)
                }
              }
              let addConnectedToSelection = (id) => {
                if (processedElementIds.includes(id)) return
                let connectedIds = this.edges.filter(ed => ed.fromElement == id || ed.toElement == id).map(ed => [ed.toElement, ed.fromElement]).flat()
                connectedIds = [...new Set(connectedIds)]
                connectedIds.forEach((id) => addToSelection(id))
                processedElementIds.push(id)
                connectedIds.forEach((id) => addConnectedToSelection(id))
              }
              affectedIds.forEach((id) => addConnectedToSelection(id))
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
              if (focusedElement) {
                let rightEdgeElements = this.edges.filter(ed => (ed.fromElement == focusedElement.id && ed.fromSide == 'right') || (ed.toElement == focusedElement.id && ed.toSide == 'right')).map(ed => {
                  if (ed.fromElement == focusedElement.id) {
                    var elementId = ed.toElement
                  }
                  else {
                    var elementId = ed.fromElement
                  }
                  return this.canvasElements.find(el => el.id == elementId)
                })
                if (rightEdgeElements.length > 0) {
                  this.focusedElementId = rightEdgeElements[0].id
                }
                else {
                  let range1 = [focusedElement.y, focusedElement.y + focusedElement.height]
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
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "h")
            {
              let focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              if (focusedElement) {
                let leftEdgeElements = this.edges.filter(ed => (ed.fromElement == focusedElement.id && ed.fromSide == 'left') || (ed.toElement == focusedElement.id && ed.toSide == 'left')).map(ed => {
                  if (ed.fromElement == focusedElement.id) {
                    var elementId = ed.toElement
                  }
                  else {
                    var elementId = ed.fromElement
                  }
                  return this.canvasElements.find(el => el.id == elementId)
                })
                if (leftEdgeElements.length > 0) {
                  this.focusedElementId = leftEdgeElements[0].id
                }
                else {
                  let range1 = [focusedElement.y, focusedElement.y + focusedElement.height]
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
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "j")
            {
              let focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              if (focusedElement) {
                let bottomEdgeElements = this.edges.filter(ed => (ed.fromElement == focusedElement.id && ed.fromSide == 'bottom') || (ed.toElement == focusedElement.id && ed.toSide == 'bottom')).map(ed => {
                  if (ed.fromElement == focusedElement.id) {
                    var elementId = ed.toElement
                  }
                  else {
                    var elementId = ed.fromElement
                  }
                  return this.canvasElements.find(el => el.id == elementId)
                })
                if (bottomEdgeElements.length > 0) {
                  this.focusedElementId = bottomEdgeElements[0].id
                }
                else {
                  let range1 = [focusedElement.x, focusedElement.x + focusedElement.width]
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
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "k")
            {
              let focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              if (focusedElement) {
                let topEdgeElements = this.edges.filter(ed => (ed.fromElement == focusedElement.id && ed.fromSide == 'top') || (ed.toElement == focusedElement.id && ed.toSide == 'top')).map(ed => {
                  if (ed.fromElement == focusedElement.id) {
                    var elementId = ed.toElement
                  }
                  else {
                    var elementId = ed.fromElement
                  }
                  return this.canvasElements.find(el => el.id == elementId)
                })
                if (topEdgeElements.length > 0) {
                  this.focusedElementId = topEdgeElements[0].id
                }
                else {
                  let range1 = [focusedElement.x, focusedElement.x + focusedElement.width]
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
            else if (this.keybuffer == "i") {
              let focusedEdge = this.edges.find(ed => ed.id == this.focusedEdgeId)
              var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              var insertElement = (insertFunc) => {
                let newElement = insertFunc(x, y)
                if (newElement && focusedEdge) {
                  this.splitEdgeWithElement(focusedEdge.id, newElement)
                }
                this.focusedElementId = newElement ? newElement.id : this.focusedElementId
              }
              var insertElementCallback = (newElement) => {
                if (newElement && focusedEdge) {
                  this.splitEdgeWithElement(focusedEdge.id, newElement)
                }
                this.focusedElementId = newElement ? newElement.id : this.focusedElementId
              }
              var items = [
                {
                  label: 'Markdown',
                  lucideIcon: 'Type',
                  key: 't',
                  action: () => {
                    insertElement((x, y) => {
                      let width = 120
                      let height = 60
                      let newElement = this.addNewMarkdownElement({x: x - (width/2), y: y - (height/2), width, height})
                      return newElement
                    })
                  },
                },
                {
                  label: 'Note',
                  lucideIcon: 'FileText',
                  key: 'n',
                  action: () => {
                    this.addNewNote({x, y}, insertElementCallback)
                  },
                },
                {
                  label: 'Fitted Text',
                  lucideIcon: 'Type',
                  key: 'h',
                  action: () => {
                    insertElement((x, y) => {
                      let width = 120
                      let height = 60
                      let newElement = this.addNewFittedMarkdownElement({x: x - (width/2), y: y - (height/2), width, height})
                      return newElement
                    })
                  },
                },
                { role: 'separator' },
                {
                  label: 'Image',
                  lucideIcon: 'Image',
                  key: 'i',
                  action: () => {
                    this.addNewImage({x, y}, insertElementCallback)
                  },
                },
                {
                  label: 'File',
                  lucideIcon: 'File',
                  key: 'f',
                  action: () => {
                    this.addNewFile({x, y}, insertElementCallback)
                  },
                },
                {
                  label: 'Lucide Icon',
                  lucideIcon: 'Boxes',
                  key: 'l',
                  action: () => {
                    this.addNewLucideIcon({x, y}, insertElementCallback)
                  },
                },
                {
                  label: 'Iframe',
                  lucideIcon: 'Globe2',
                  key: 'w',
                  action: () => {
                    this.addNewFrame({x, y}, insertElementCallback)
                  },
                },
                { role: 'separator' },
                {
                  label: 'Container',
                  lucideIcon: 'Frame',
                  key: 'c',
                  action: () => {
                    insertElement((x, y) => {
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
                        var width = 200
                        var height = 200
                      }
                      return this.addNewElement({x, y, width, height, type: 'container'})
                    })
                  },
                },
                {
                  label: 'Container (adopting edges)',
                  lucideIcon: 'Frame',
                  key: 'Shift+c',
                  action: () => {
                    insertElement((x, y) => {
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
                      return newElement
                    })
                  },
                },
                { role: 'separator' },
                {
                  label: 'Dot',
                  lucideIcon: 'Circle',
                  key: 'd',
                  action: () => {
                    insertElement((x, y) => {
                      let newDot = this.addNewElement({x, y, width: 20, height: 20, type: 'dot'})
                      return newDot
                    })
                  },
                },
              ]
              this.$store.commit('triggerCustomPopoverList', {
                message: `Insert element`,
                items: items,
                options: {hintMode: false},
              })
              this.fullKeybuffer = ''
            }
            else if (/o[hjkl]/.test(this.keybuffer))
            {
              let side = {h: 'left', j: 'bottom', k: 'top', l: 'right'}[this.keybuffer.match(/o([hjkl])/)[1]]
              let focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              if (!focusedElement) return
              let {x, y} = focusedElement
              let width = 120
              let height = 60
              let offset = 40
              let calculateCoordinates = {
                top: () => ({x: (x + (focusedElement.width / 2) - width / 2), y: (y - offset - height)}),
                bottom: () => ({x: (x + (focusedElement.width / 2) - width / 2), y: (y + focusedElement.height + offset)}),
                left: () => ({x: (x - offset - width), y: (y + (focusedElement.height / 2) - height / 2)}),
                right: () => ({x: (x + focusedElement.width + offset), y: (y + (focusedElement.height / 2) - height / 2)}),
              }
              let newElement = this.addNewMarkdownElement({
                ...calculateCoordinates[side](),
                width,
                height,
              })
              this.focusedElementId = newElement.id
              let oppositeSide = {left: 'right', right: 'left', top: 'bottom', bottom: 'top'}
              this.edges.push({
                id: uuidv4(),
                fromElement: focusedElement.id,
                fromSide: side,
                toElement: newElement.id,
                toSide: oppositeSide[side],
                ...((this.edgeArrowMode == 'from' || this.edgeArrowMode == 'bidirectional') && {fromEnd: 'arrow'}),
                ...((this.edgeArrowMode == 'to' || this.edgeArrowMode == 'bidirectional') && {toEnd: 'arrow'}),
              })
              this.fullKeybuffer = ''
            }
            {
                }
                }
              }
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
            else if (this.keybuffer == "ae") {
              this.setMode('edge-create')
              this.calculatEdgeCreateHelpers()
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "<")
            {
              this.nextEdgeArrowMode()
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "cl")
            {
              var focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              if (focusedElement) {
                this.$store.commit('triggerCustomTextPrompt', {
                  message: 'Change label of canvas element',
                  text: focusedElement.label || '',
                  selectAll: true,
                  action: (label) => {
                    if (label.trim()) {
                      this.$set(focusedElement, 'label', label)
                    }
                    else {
                      this.$delete(focusedElement, 'label')
                    }
                  }
                })
              }
              else if (this.focusedEdgeId) {
                var edgeIndex = this.edges.findIndex(ed => ed.id == this.focusedEdgeId)
                this.$store.commit('triggerCustomTextPrompt', {
                  message: 'Change label of edge',
                  text: this.edges[edgeIndex].label || '',
                  selectAll: true,
                  action: (label) => {
                    if (label.trim()) {
                      this.$set(this.edges[edgeIndex], 'label', label)
                    }
                    else {
                      this.$delete(this.edges[edgeIndex], 'label')
                    }
                  }
                })
              }
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
                    if (affectedIds.length == 0 && this.focusedEdgeId) {
                      var edgeIndex = this.edges.findIndex(ed => ed.id == this.focusedEdgeId)
                      if (number == 9) {
                        this.$set(this.edges[edgeIndex], 'color', '0, 0, 0')
                      }
                      else {
                        this.$set(this.edges[edgeIndex], 'color', `var(--canvas-color-${number})`)
                      }
                      return
                    }
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
                          if (affectedIds.length == 0 && this.focusedEdgeId) {
                            var edgeIndex = this.edges.findIndex(ed => ed.id == this.focusedEdgeId)
                            this.$set(this.edges[edgeIndex], 'color', color)
                            return
                          }
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
            else if (this.keybuffer == "ce")
            {
              if (this.focusedElementId && this.selectedElementsIds.length == 1 && this.focusedElementId != this.selectedElementsIds[0]) {
                let fromElementId = this.focusedElementId
                let toElementId = this.selectedElementsIds[0]
                let fromElement = this.canvasElements.find(el => el.id == fromElementId)
                let toElement = this.canvasElements.find(el => el.id == toElementId)
                let fromElementMeasurements = {
                  top: {x: fromElement.x + (fromElement.width / 2), y: fromElement.y},
                  right: {x: fromElement.x + fromElement.width, y: fromElement.y + (fromElement.height / 2)},
                  bottom: {x: fromElement.x + (fromElement.width / 2 ), y: fromElement.y + fromElement.height},
                  left: {x: fromElement.x, y: fromElement.y + (fromElement.height / 2 )},
                }
                let toElementMeasurements = {
                  top: {x: toElement.x + (toElement.width / 2), y: toElement.y},
                  right: {x: toElement.x + toElement.width, y: toElement.y + (toElement.height / 2)},
                  bottom: {x: toElement.x + (toElement.width / 2 ), y: toElement.y + toElement.height},
                  left: {x: toElement.x, y: toElement.y + (toElement.height / 2 )},
                }
                let sideDistances = []
                for (let fromSide of Object.keys(fromElementMeasurements)) {
                  for (let toSide of Object.keys(toElementMeasurements)) {
                    sideDistances.push({
                      toSide,
                      fromSide,
                      distance: Math.sqrt((fromElementMeasurements[fromSide].x - toElementMeasurements[toSide].x)**2 + (fromElementMeasurements[fromSide].y - toElementMeasurements[toSide].y)**2),
                    })
                  }
                }
                let shortestDistance = sideDistances.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr)
                this.edges.push({
                  id: uuidv4(),
                  fromElement: fromElementId,
                  fromSide: shortestDistance.fromSide,
                  toElement: toElementId,
                  toSide: shortestDistance.toSide,
                  ...((this.edgeArrowMode == 'from' || this.edgeArrowMode == 'bidirectional') && {fromEnd: 'arrow'}),
                  ...((this.edgeArrowMode == 'to' || this.edgeArrowMode == 'bidirectional') && {toEnd: 'arrow'}),
                })
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "cE")
            {
              if (this.focusedElementId && this.selectedElementsIds.length == 1 && this.focusedElementId != this.selectedElementsIds[0]) {
                let fromElementId = this.focusedElementId
                let toElementId = this.selectedElementsIds[0]
                var items = []
                for (let fromSide of ['right', 'left', 'top', 'bottom']) {
                  for (let toSide of ['right', 'left', 'top', 'bottom']) {
                    items.push({
                      label: `${fromSide} to ${toSide}`,
                      action: () => {
                        this.edges.push({
                          id: uuidv4(),
                          fromElement: fromElementId,
                          fromSide,
                          toElement: toElementId,
                          toSide,
                          ...((this.edgeArrowMode == 'from' || this.edgeArrowMode == 'bidirectional') && {fromEnd: 'arrow'}),
                          ...((this.edgeArrowMode == 'to' || this.edgeArrowMode == 'bidirectional') && {toEnd: 'arrow'}),
                        })
                      },
                    })
                  }
                }
                this.$store.commit('triggerCustomPopoverList', {
                  message: 'Set sides',
                  items: items,
                  options: {hintMode: true},
                })
              }
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
    computedEdges() {
      var edges = []
      for (let ed of this.edges) {
        let fromElement = this.canvasElements.find(el => el.id == ed.fromElement)
        let toElement = this.canvasElements.find(el => el.id == ed.toElement)
        let toElementOffset = (ed.toEnd == 'arrow') ? 9 : 0
        let fromElementOffset = (ed.fromEnd == 'arrow') ? 9 : 0
        let fromElementMeasurements = {
          top: {x: fromElement.x + (fromElement.width / 2), y: fromElement.y - fromElementOffset},
          right: {x: fromElement.x + fromElement.width + fromElementOffset, y: fromElement.y + (fromElement.height / 2)},
          bottom: {x: fromElement.x + (fromElement.width / 2 ), y: fromElement.y + fromElement.height + fromElementOffset},
          left: {x: fromElement.x - fromElementOffset, y: fromElement.y + (fromElement.height / 2 )},
        }
        let toElementMeasurements = {
          top: {x: toElement.x + (toElement.width / 2), y: toElement.y - toElementOffset},
          right: {x: toElement.x + toElement.width + toElementOffset, y: toElement.y + (toElement.height / 2)},
          bottom: {x: toElement.x + (toElement.width / 2 ), y: toElement.y + toElement.height + toElementOffset},
          left: {x: toElement.x - toElementOffset, y: toElement.y + (toElement.height / 2 )},
        }
        ed.fromElementMeasurements = fromElementMeasurements
        ed.toElementMeasurements = toElementMeasurements
        let halfpointX = (fromElementMeasurements[ed.fromSide].x + toElementMeasurements[ed.toSide].x) / 2
        let pointDiffX = Math.abs(fromElementMeasurements[ed.fromSide].x - toElementMeasurements[ed.toSide].x)
        let pointDiffY = Math.abs(fromElementMeasurements[ed.fromSide].y - toElementMeasurements[ed.toSide].y)
        let controlPointDiffFromX = (pointDiffX / 2)
        let controlPointDiffToX = (pointDiffX / 2)
        let controlPointDiffFromY = (pointDiffY / 2)
        let controlPointDiffToY = (pointDiffY / 2)
        var calculateControlPoint = (side, point, controlPointDiffX, controlPointDiffY) => {
          if (side == 'right') {
            return {
              x: point.x + controlPointDiffX,
              y: point.y,
            }
          }
          else if (side == 'left') {
            return {
              x: point.x - controlPointDiffX,
              y: point.y,
            }
          }
          else if (side == 'top') {
            return {
              x: point.x,
              y: point.y - controlPointDiffY,
            }
          }
          else if (side == 'bottom') {
            return {
              x: point.x,
              y: point.y + controlPointDiffY,
            }
          }
        }
        let controlPointFrom = calculateControlPoint(ed.fromSide, fromElementMeasurements[ed.fromSide], controlPointDiffFromX, controlPointDiffFromY)
        let controlPointTo = calculateControlPoint(ed.toSide, toElementMeasurements[ed.toSide], controlPointDiffToX, controlPointDiffToY)
        ed.pathD = `M ${fromElementMeasurements[ed.fromSide].x}, ${fromElementMeasurements[ed.fromSide].y} C ${controlPointFrom.x}, ${controlPointFrom.y} ${controlPointTo.x}, ${controlPointTo.y} ${toElementMeasurements[ed.toSide].x}, ${toElementMeasurements[ed.toSide].y}`
        edges.push(ed)
      }
      return edges
    },
    visibleEdges() {
      var visibleElementIds = this.visibleElements.map(el => el.id)
      return this.computedEdges.filter(ed => visibleElementIds.includes(ed.fromElement) || visibleElementIds.includes(ed.toElement))
    },
    edgeArrowModeIcon() {
      return {none: 'Minus', bidirectional: 'MoveHorizontal', to: 'ArrowRight', from: 'ArrowLeft'}[this.edgeArrowMode]
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
    visibleElements: {
      handler() {
        if (this.mode == 'edge-create') {
          this.calculatEdgeCreateHelpers()
        }
      },
      deep: false,
    },
    activatedEdgeInitiators: {
      handler(newValue, oldValue) {
        if (newValue.length == 2) {
          this.edges.push({
            id: uuidv4(),
            fromElement: newValue[0].elementId,
            fromSide: newValue[0].side,
            toElement: newValue[1].elementId,
            toSide: newValue[1].side,
            ...((this.edgeArrowMode == 'from' || this.edgeArrowMode == 'bidirectional') && {fromEnd: 'arrow'}),
            ...((this.edgeArrowMode == 'to' || this.edgeArrowMode == 'bidirectional') && {toEnd: 'arrow'}),
          })
          this.activatedEdgeInitiators = []
          this.calculatEdgeCreateHelpers()
        }
      },
      deep: false,
    },
  },
  mounted() {
    this.canvasObj = JSON.parse(this.note.content)
    this.canvasElements = this.canvasObj.elements
    this.savedViews = this.canvasObj.savedViews || []
    this.edges = this.canvasObj.edges || []
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
  .canvas-helper-element {
    position: absolute;
  }
  .selectRect {
    border: 1px dashed black;
    background: rgba(256, 256, 256, 0.15);
    z-index: 100;
  }
  .edge-initiator {
    height: 10px;
    width: 10px;
    background: #ff8181;
    border: 1px solid #812f2f;
    border-radius: 10px;
    cursor: pointer;
    top: -6px;
    left: -6px;
    z-index: 100;
    &.activated {
      background: yellow;
    }
  }
  svg.canvas-edges {
    position: absolute;
    overflow: visible;
    .canvas-edge {
      .edge {
        stroke-width: 3px;
        stroke: black;
        fill: none;
      }
      .edge-outline {
        stroke-width: 15px;
        fill: none;
      }
      &:not(.focused) {
        .edge-outline {
          stroke: transparent !important;
        }
      }
      &.focused {
        .edge-outline {
          stroke: #0000001c;
        }
      }
    }
  }
  .CodeMirror-cursors,
  .CodeMirror-measure:nth-child(2) + div{
    transform:scale(var(--inverse-scale));
    transform-origin: 0 0;
  }
}
</style>
