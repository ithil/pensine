<template>
  <div class="canvasPage" v-if="note && canvasObj">
    <div class="canvas-wrapper"
    @wheel="scrollCanvas"
    @mousedown="mouseDown"
    @mousemove="mouseMove"
    @mouseup="mouseUp"
    @click="canvasWrapperClick"
    @drop="dropFile"
    @dragenter.prevent
    @dragover.prevent
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
            <path :id="`edge_${edge.id}`" :d="edge.pathD" />
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
          <use
          :href="`#edge_${edge.id}`"
          class="edge-outline"
          @click="setFocusedEdge(edge.id)"
          :style="{stroke: edge.color ? `rgba(${edge.color}, 0.11)` : null}"
          ></use>
          <use
          :href="`#edge_${edge.id}`"
          class="edge"
          :marker-end="edge.toEnd == 'arrow' ? `url(#arrow_${edge.id})` : null"
          :marker-start="edge.fromEnd == 'arrow' ? `url(#arrow_${edge.id})` : null"
          @click="setFocusedEdge(edge.id)"
          :style="{stroke: edge.color ? `rgb(${edge.color}) !important` : null, fill: 'none !important'}"
          ></use>
          <text class="edge-label" style="font-size: 24px;" dy="-10px" v-if="edge.label" :style="{fill: edge.color ? `rgb(${edge.color})` : null}">
            <textPath :href="`#edge_${edge.id}`" startOffset="50%" text-anchor="middle">{{edge.label}}</textPath>
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
        :style="{width: element.width ? `${element.width}px` : null, height: element.height ? `${element.height}px` : null, transform: `translate(${element.x}px, ${element.y}px) rotate(${element.rotation || 0}deg)`, color: element.color}"
        @[element.click?`click`:null]="element.click"
        ref="helperElementItems"
        >
        <svg v-if="element.renderType == 'svg'">
        <g
        :style="{stroke: element.color ? `rgb(${element.color})` : null, fill: element.color ? `rgb(${element.color})` : null}"
        >
            <path :d="element.svgPathD" />
        </g>
        </svg>
        </div>
      </div>
    </div>
    <div class="popoverEditor" v-if="showPopoverEditor"
      @keydown.meta.83="savePopoverEditor"
      @keydown.ctrl.67="cancelPopoverEditor"
    >
        <codemirror v-model="popoverEditorContent" :options="cmOptions" ref="popoverCmEditor"/>
    </div>
    <div class="settings-panel" v-if="showSettingsPanel">
      <label for="title">Canvas Title</label>
      <input name="title" v-model="canvasObj.title"></input>
      <label for="primaryBackgroundColor">Canvas Primary Background Color</label>
      <input name="primaryBackgroundColor" type="color" v-model="settingsColors.primaryBackgroundColor"></input>
      <label for="primaryForegroundColor">Canvas Primary Foreground Color</label>
      <input name="primaryForegroundColor" type="color" v-model="settingsColors.primaryForegroundColor"></input>
      <label for="canvasBackground">Canvas Background</label>
      <input name="canvasBackground" v-model="canvasObj.style.background"></input>
      <label for="canvasColor1">Canvas Color 1</label>
      <input name="canvasColor1" type="color" v-model="settingsColors.canvasColor1"></input>
      <label for="canvasColor2">Canvas Color 2</label>
      <input name="canvasColor2" type="color" v-model="settingsColors.canvasColor2"></input>
      <label for="canvasColor3">Canvas Color 3</label>
      <input name="canvasColor3" type="color" v-model="settingsColors.canvasColor3"></input>
      <label for="canvasColor4">Canvas Color 4</label>
      <input name="canvasColor4" type="color" v-model="settingsColors.canvasColor4"></input>
      <label for="canvasColor5">Canvas Color 5</label>
      <input name="canvasColor5" type="color" v-model="settingsColors.canvasColor5"></input>
      <label for="canvasColor6">Canvas Color 6</label>
      <input name="canvasColor6" type="color" v-model="settingsColors.canvasColor6"></input>
      <label for="canvasColor7">Canvas Color 7</label>
      <input name="canvasColor7" type="color" v-model="settingsColors.canvasColor7"></input>
      <label for="canvasColor8">Canvas Color 7</label>
      <input name="canvasColor8" type="color" v-model="settingsColors.canvasColor8"></input>
    </div>
    <div class="note-feeder" v-if="showNoteFeeder">
      <div class="feeder-source" @click="chooseFeederSourceModal">
        <Icon v-if="feederSource.type == 'stack'" name="Layers"/>
        <Icon v-if="feederSource.type == 'filter'" name="Filter"/>
        <span class="label">{{feederSource.label}}</span>
      </div>
      <input type="checkbox" id="feederHideAddedNotes" v-model="feederHideAddedNotes">
      <label for="feederHideAddedNotes">Hide added notes</label>
      <div v-for="note in feederNotes" class="note" draggable="true" @dragstart="dragstartFeederNote($event, note.noteLink)">
        {{note.abstract}}
      </div>
    </div>
    <div class="minimap" v-if="minimapEnabled">
      <canvas ref="minimap"></canvas>
    </div>
    <portal to="statusBarRight" :order="1" v-if="portalActive">
      <span class="keybuffer">{{fullKeybuffer}}</span>
      <span><input name="workingColor" type="color" v-model="workingColor"></input></span>
      <span v-if="elasticFrame" class="elasticFrame" @click="elasticFrame = !elasticFrame"><Icon name="SquareDashedBottom"/></span>
      <span class="panLockXAxis" :class="{locked: panLockXAxis}" @click="panLockXAxis = !panLockXAxis"><Icon :name="panLockXAxis ? 'Lock' : 'Unlock'"/> X</span>
      <span class="panLockYAxis" :class="{locked: panLockYAxis}" @click="panLockYAxis = !panLockYAxis"><Icon :name="panLockYAxis ? 'Lock' : 'Unlock'"/> Y</span>
      <span class="edgeArrowMode" @click="nextEdgeArrowMode"><Icon :name="edgeArrowModeIcon"/></span>
      <span class="selectedElements statusBarItem" v-if="selectedElementsIds.length > 0" @click="selectedElementsIds = []"><Icon name="BoxSelect"/><span class="label">{{selectedElementsIds.length}}</span></span>
      <span class="zoom statusBarItem"><Icon name="ZoomIn"/><span>{{(this.scale * 100).toFixed(0)}}%</span></span>
      <span class="mode" :style="modes[mode].style"><Icon v-if="modes[mode].lucideIcon" :name="modes[mode].lucideIcon"/><span class="label">{{modes[mode].label || mode}}</span></span>
      <span class="statusBarItem" @click="chooseElementModal"><Icon name="Files"/><span>{{canvasElements.length}}</span></span>
      <span class="debugInfo" v-if="statusBarDebugInfo">
        <span class="statusBarItem" @click="debugFunctionsPopover"><Icon name="Menu"/></span>
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
import { getStroke } from 'perfect-freehand'
import moment from 'moment'
import fuzzysort from 'fuzzysort'
import * as htmlToImage from 'html-to-image'
import { codemirror } from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/markdown/markdown.js'
import 'codemirror/keymap/vim.js'
import 'codemirror/addon/selection/active-line.js'
import 'codemirror/addon/edit/trailingspace.js'
import 'codemirror/theme/seti.css'

export default {
  name: 'canvas-page',
  components: {
    CanvasElement,
    Icon,
    codemirror,
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
      showSettingsPanel: false,
      showNoteFeeder: false,
      settingsColors: {primaryBackgroundColor: '', primaryForegroundColor: '', canvasColor1: '', canvasColor2: '', canvasColor3: '', canvasColor4: '', canvasColor5: '', canvasColor6: '', canvasColor7: '', canvasColor8: '',},
      workingColor: '#000000',
      feederSource: {label: 'None', type: 'none', feederFunc: () => {return []}},
      feederNotes: [],
      feederHideAddedNotes: true,
      statusBarDebugInfo: false,
      minimapEnabled: false,
      undoList: [],
      undoLimit: 15,
      flyToIntervalId: null,
      autoSavePosIntervalId: null,
      autoSavePosDebounceTimestamp: 0,
      autoSavedPositions: [],
      autoSavedPosJumpIndex: null,
      brushRadius: 40,
      snapToGrid: true,
      gridSize: 10,
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
        'rotate': {
          label: 'Rotate',
          lucideIcon: 'RefreshCw',
        },
        'brush': {
          label: 'Brush',
          lucideIcon: 'Paintbrush',
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
        'draw': {
          label: 'Draw',
          lucideIcon: 'Brush',
          style: {
            background: '#5f4fd3',
            color: '#fff',
          },
        },
      },
      fullKeybuffer: '',
      keybuffer: '',
      keybufferCount: null,
      keybufferRegister: null,
      focusedElementId: null,
      focusedEdgeId: null,
      edgeArrowMode: 'to',
      selectedElementsIds: [],
      activatedEdgeInitiators: [],
      selectRectBeingDrawn: false,
      brushBeingPressed: false,
      strokeBeingDrawn: false,
      drawnStrokePoints: [],
      scale: 1,
      minScale: 0.1,
      maxScale: 6,
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
      rotateOrigins: {},
      constrainMoveToX: false,
      constrainMoveToY: false,
      panLockXAxis: false,
      panLockYAxis: false,
      elasticFrame: false,
      savedViews: [],
      unsavedChanges: false,
      showPopoverEditor: false,
      popoverEditorContent: '',
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
      if (this.mode == 'brush' && event.altKey) {
        const wheel = event.deltaY < 0 ? 1 : -1
        this.brushRadius += wheel
        return false
      }
      // Zoom into point under cursor
      if (event.ctrlKey || event.metaKey) {
        // Normalize mouse wheel movement to +1 or -1 to avoid unusual jumps.
        const wheel = event.deltaY < 0 ? 1 : -1
        // Compute zoom factor.
        var zoom = 1
        if (wheel == 1) zoom = this.zoomIntensity
        if (wheel == -1) zoom = 1/this.zoomIntensity

        // var scalechange = (this.scale*zoom) - this.scale
        this.scale *= zoom
        var [mouseWorldOldX, mouseWorldOldY] = this.toWorldPos(mousex, mousey)
        var {minScale, maxScale} = this
        if (this.scale >= minScale && this.scale <= maxScale) {
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
        else if (this.scale < minScale) {
          this.setScale(minScale)
        }
        else {
          this.setScale(maxScale)
        }
      }
      else {
        // Pan canvas
        canvasMatrix = tm.compose(
          canvasMatrix,
          tm.translate(!this.panLockXAxis ? event.deltaX : 0, !this.panLockYAxis ? event.deltaY : 0)
        )
        if (this.elasticFrame) {
          const clamp = (num, min, max) => Math.min(Math.max(num, min), max)
          let {x, y, width, height} = this.getBoundingRectCoveringGivenElements(this.canvasElements)
          let canvasWidth = this.$refs.canvasWrapper.clientWidth
          let canvasHeight = this.$refs.canvasWrapper.clientHeight
          let padding = 10
          canvasMatrix.e = clamp(canvasMatrix.e, ((-(width+x) - padding) * this.scale) + canvasWidth, (-x + padding)*this.scale)
          canvasMatrix.f = clamp(canvasMatrix.f, ((-(height+y) - padding) * this.scale) + canvasHeight, (-y + padding)*this.scale)
          // canvasMatrix.e = clamp(canvasMatrix.e, -(width+x)+canvasWidth, -x)
          // canvasMatrix.f = clamp(canvasMatrix.f, -(height+y)+canvasHeight, -y)
                // let newCanvasY = ((-y - height - 10) * this.scale) + canvasHeight
        }
      }


      // redraw
      this.setCanvasMatrix(canvasMatrix)
      if (this.mode == 'move') {
        this.handleMoveElements()
      }
      event.preventDefault()
    },
    log(obj) {
      console.log(obj)
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
    getBoundingRectCoveringGivenElements(elements = []) {
      var lowestX = 0
      var lowestY = 0
      var highestX = 0
      var highestY = 0
      if (elements.length > 0) {
        lowestX = elements[0].x
        lowestY = elements[0].y
        highestX = elements[0].x + elements[0].width
        highestY = elements[0].y + elements[0].height
        for (let el of elements) {
          lowestX = el.x < lowestX ? el.x : lowestX
          lowestY = el.y < lowestY ? el.y : lowestY
          highestX = (el.x + el.width) > highestX ? (el.x + el.width) : highestX
          highestY = (el.y + el.height) > highestY ? (el.y + el.height) : highestY
        }
      }
      return {
        'topleft': [lowestX, lowestY],
        'bottomleft': [lowestX, highestY],
        'topright': [highestX, lowestY],
        'bottomright': [highestX, highestY],
        'width': highestX - lowestX,
        'height': highestY - lowestY,
        'x': lowestX,
        'y': lowestY,
        'center': [lowestX + (highestX - lowestX)/2, lowestY + (highestY - lowestY)/2],
      }
    },
    getBoundingRectCoveringAllElements() {
      return this.getBoundingRectCoveringGivenElements(this.canvasElements)
    },
    zoomToFitBoundingRect(boundingRect, zoomPadding = 0.95) {
      let {topright, topleft, bottomleft, bottomright} = boundingRect
      let xDistance = topright[0] - topleft[0]
      let yDistance = bottomleft[1] - topright[1]
      let canvasWidth = this.$refs.canvasWrapper.clientWidth
      let canvasHeight = this.$refs.canvasWrapper.clientHeight
      let xScale = Math.abs(canvasWidth / xDistance)
      let yScale = Math.abs(canvasHeight / yDistance)
      let newScale = Math.min(xScale, yScale) * zoomPadding
      this.setScale(newScale)
      let newCanvasX = -newScale * (topleft[0] - (canvasWidth*(1/newScale) - xDistance) / 2)
      let newCanvasY = -newScale * (topleft[1] - (canvasHeight*(1/newScale) - yDistance) / 2)
      // this.canvasMatrix.e = newCanvasX
      // this.canvasMatrix.f = newCanvasY
      this.flyTo({
        x: newCanvasX,
        y: newCanvasY,
      })
    },
    centerOnElement(elementId = this.focusedElementId) {
      var element = this.canvasElements.find(e => e.id == elementId)
      if (element) {
        let {x, y, width, height} = element
        let canvasWidth = this.$refs.canvasWrapper.clientWidth
        let canvasHeight = this.$refs.canvasWrapper.clientHeight
        let newCenterX = x + (width/2)
        let newCenterY = y + (height/2)
        let newCanvasX = (-newCenterX * this.scale) + canvasWidth  / 2
        let newCanvasY = (-newCenterY * this.scale) + canvasHeight / 2
        // this.canvasMatrix.e = newCanvasX
        // this.canvasMatrix.f = newCanvasY
        this.flyTo({
          x: newCanvasX,
          y: newCanvasY,
        })
      }
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
    hexToRgb(hex) {
      return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
      ,(m, r, g, b) => '#' + r + r + g + g + b + b)
      .substring(1).match(/.{2}/g)
      .map(x => parseInt(x, 16))
    },
    getSvgPathFromStroke(points, closed = true) {
      let average = (a, b) => (a + b) / 2
      const len = points.length

      if (len < 4) {
        return ``
      }

      let a = points[0]
      let b = points[1]
      const c = points[2]

      let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(
        2
      )} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`

      for (let i = 2, max = len - 1; i < max; i++) {
        a = points[i]
        b = points[i + 1]
        result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `
      }

      if (closed) {
        result += 'Z'
      }

      return result
    },
    changeValuesGradually (variables, duration, easeFunction, onUpdate, onComplete) {
      const startTime = Date.now()
      const intervalTime = 16 // 60 frames per second

      const intervalId = setInterval(() => {
        const currentTime = Date.now()
        const elapsed = currentTime - startTime
        const progress = Math.min(1, elapsed / duration)

        // Update each variable
        const interpolatedValues = {}
        for (const key in variables) {
          if (variables.hasOwnProperty(key)) {
            const initialValue = variables[key].initialValue
            const targetValue = variables[key].targetValue
            const easedProgress = easeFunction(progress)
            const interpolatedValue = initialValue + (targetValue - initialValue) * easedProgress
            interpolatedValues[key] = interpolatedValue
          }
        }

        onUpdate(interpolatedValues)

        if (progress >= 1) {
          clearInterval(intervalId)
          if (onComplete) {
            onComplete()
          }
        }
      }, intervalTime)
      return intervalId
    },
    flyTo({x, y, scale, duration = 500}) {
      var valuesToChange = {}
      if (x && x != this.canvasMatrix.e) {
        valuesToChange['x'] = {
          initialValue: this.canvasMatrix.e,
          targetValue: x,
        }
      }
      if (y && y != this.canvasMatrix.f) {
        valuesToChange['y'] = {
          initialValue: this.canvasMatrix.f,
          targetValue: y,
        }
      }
      if (scale && scale != this.scale) {
        valuesToChange['scale'] = {
          initialValue: this.scale,
          targetValue: scale,
        }
      }
      if (this.flyToIntervalId) {
        clearTimeout(this.flyToIntervalId)
      }
      this.flyToIntervalId = this.changeValuesGradually(
      valuesToChange,
      duration,
      (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      (newValues) => {
        if (newValues.x) {
          this.canvasMatrix.e = newValues.x
        }
        if (newValues.y) {
          this.canvasMatrix.f = newValues.y
        }
        if (newValues.scale) {
          this.setScale(newValues.scale)
        }
      },
      () => {
      }
    )
    },
    goToHomeView() {
      let startAtView = this.savedViews.find(v => v.key == 'startAt')
      let markObj = startAtView ?? this.canvasObj.startAt ?? this.autoSavedPositions[0]
      if (markObj) {
        this.flyTo({
          x: markObj.centerX - ((this.$refs.canvasWrapper.clientWidth  / 2 ) / this.canvasMatrix.a),
          y: markObj.centerY - ((this.$refs.canvasWrapper.clientHeight / 2 ) / this.canvasMatrix.d),
          scale: markObj.scale ?? this.scale,
          duration: 300,
        })
        this.focusedElementId = markObj.focusedElementId ?? this.focusedElementId
      }
    },
    handleMoveElements() {
      // let affectedIds = this.getElementIdsToBeAffected()
      let roundToGrid = (value, increment) => {
        return Math.round(value / increment) * increment
      }
      let affectedIds = Object.keys(this.moveOrigins).filter(id => id != 'cursor')
      for (let id of affectedIds) {
        let elementIndex = this.canvasElements.findIndex(e => e.id == id)
        let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
        let xdelta = x - this.moveOrigins.cursor[0]
        let ydelta = y - this.moveOrigins.cursor[1]
        if (!this.constrainMoveToY) {
          this.canvasElements[elementIndex].x = roundToGrid(
            xdelta + this.moveOrigins[this.canvasElements[elementIndex].id][0],
            this.snapToGrid ? this.gridSize : 1
          )
        }
        if (!this.constrainMoveToX) {
          this.canvasElements[elementIndex].y = roundToGrid(
            ydelta + this.moveOrigins[this.canvasElements[elementIndex].id][1],
            this.snapToGrid ? this.gridSize : 1
          )
        }
      }
    },
    handleRotateElements() {
      let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
      let elements = this.getElementsToBeAffected()
      for (let e of elements) {
        let elementIndex = this.canvasElements.findIndex(el => el.id == e.id)
        let center = [e.x + e.width / 2, e.y + e.height / 2]
        let diffY = y - center[1]
        let diffX = x - center[0]
        let newRotation = Math.atan2(
          diffY, diffX
        ) * (180 / Math.PI)
        newRotation = (newRotation + 360) % 360 // Make sure angle is between 0 and 360
        this.$set(this.canvasElements[elementIndex], 'rotation', newRotation)
      }
    },
    handleBrushPress() {
      let radius = this.brushRadius
      var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
      for (let el of this.visibleElements) {
        let overlaps = this.circleRectangleIntersection(
          [x, y],
          radius,
          [el.x + el.width / 2, el.y + el.height / 2],
          el.width,
          el.height,
          el.rotation ?? 0,
        )
        if (overlaps) {
          this.selectedElementsIds.push(el.id)
        }
      }
      this.selectedElementsIds = [...new Set(this.selectedElementsIds)]
    },
    autoSavePosition() {
      // if ((new Date()).getTime() - this.autoSavePosDebounceTimestamp > 2000) {
        if (this.autoSavePosIntervalId) {
          clearTimeout(this.autoSavePosIntervalId)
        }
        this.autoSavePosIntervalId = setTimeout(() => {
          let canvasMatrix = this.canvasMatrix
          let centerX = canvasMatrix.e + ((this.$refs.canvasWrapper.clientWidth / 2) / canvasMatrix.a)
          let centerY = canvasMatrix.f + ((this.$refs.canvasWrapper.clientHeight / 2) / canvasMatrix.d)
          let markObj = {
            focusedElementId: this.focusedElementId || null,
            scale: this.scale,
            centerX,
            centerY,
            date: new Date(),
          }
          this.autoSavedPositions.push(markObj)
          this.autoSavedPosJumpIndex = null
        }, 15000)
        // this.autoSavePosDebounceTimestamp = (new Date()).getTime()
      // }
    },
    mouseMove(event) {
      const boundingClientRect = this.$refs.canvasWrapper.getBoundingClientRect()
      const mouseposx = event.clientX - boundingClientRect.left
      const mouseposy = event.clientY - boundingClientRect.top
      this.mouseposx = mouseposx
      this.mouseposy = mouseposy
      let [mouseposxworld, mouseposyworld] = this.toWorldPos(this.mouseposx, this.mouseposy)
      this.canvasBus.$emit('canvasWrapperMouseMove', {event, mouseposx, mouseposy, mouseposxworld, mouseposyworld})
      if (this.mode == 'move') {
        this.handleMoveElements()
      }
      if (this.mode == 'rotate') {
        this.handleRotateElements()
      }
      if (this.mode == 'brush') {
        let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
        let helperElementIndex = this.helperElements.findIndex(el => el.type == 'brush')
        this.helperElements[helperElementIndex].x = x - this.brushRadius
        this.helperElements[helperElementIndex].y = y - this.brushRadius
        if (this.brushBeingPressed) {
          this.handleBrushPress()
        }
      }
      if (this.mode == 'draw' && this.strokeBeingDrawn) {
        this.drawnStrokePoints.push([mouseposxworld, mouseposyworld, event.pressure || 0.5])
        let stroke = getStroke(this.drawnStrokePoints, {
          size: 15,
          easing: (t) => t * t,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        })
        this.$set(this.helperElements.find(el => el.type == "drawn-stroke"), 'svgPathD', this.getSvgPathFromStroke(stroke))
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
      if (this.mode == 'draw' && this.strokeBeingDrawn) {
        this.strokeBeingDrawn = false
        let stroke = getStroke(this.drawnStrokePoints, {
          size: 15,
          easing: (t) => t * t,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        })
        let pointCoordinates = stroke.reduce((acc, point) => {
          acc.x.push(point[0])
          acc.y.push(point[1])
          return acc
        }, {x: [], y: []})
        let lowestX = Math.min(...pointCoordinates.x)
        let lowestY = Math.min(...pointCoordinates.y)
        let highestX = Math.max(...pointCoordinates.x)
        let highestY = Math.max(...pointCoordinates.y)
        let width = highestX - lowestX
        let height = highestY - lowestY
        let padding = 10
        let resetStroke = stroke.map(([x, y]) => [x - lowestX + padding, y - lowestY + padding])
        let svgPathD = this.getSvgPathFromStroke(resetStroke)
        this.addNewElement({
          type: 'freehand',
          x: lowestX - padding,
          y: lowestY - padding,
          width: width + padding*2,
          height: height + padding*2,
          color: this.hexToRgb(this.workingColor),
          svgData: {
            padding,
            paths: [{d: svgPathD}],
            viewBox: `0 0 ${width + padding * 2} ${height + padding * 2}`,
          },
        })
        this.helperElements = this.helperElements.filter(el => el.type != "drawn-stroke")
      }
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
      if (this.brushBeingPressed) {
        this.brushBeingPressed = false
      }
    },
    mouseDown(event) {
      if (this.mode == 'draw') {
        this.drawnStrokePoints = []
        this.strokeBeingDrawn = true
        this.helperElements.push({
          id: uuidv4(),
          type: 'drawn-stroke',
          renderType: 'svg',
          classes: ['drawnStroke'],
          color: this.hexToRgb(this.workingColor),
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          svgPathD: '',
        })
        event.preventDefault()
        event.stopPropagation()
        return false
      }
      if (this.mode == 'move') {
        this.setMode('normal')
        event.preventDefault()
        event.stopPropagation()
        return false
      }
      if (this.mode == 'rotate') {
        this.setMode('normal')
        event.preventDefault()
        event.stopPropagation()
        return false
      }
      if (this.mode == 'brush') {
        this.brushBeingPressed = true
        this.handleBrushPress()
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
    dropFile(event) {
      event.preventDefault()
      event.stopPropagation()
      var [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
      for (let f of event.dataTransfer.files) {
        if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].some(su => f.path.endsWith(su))) {
          let url = `localfile://${f.path}`
          let img = new Image()
          img.onload = () => {
            let width = img.naturalWidth
            let height = Math.round(img.naturalHeight * 1.013) // I know this is weird but needed...
            let newElement = {
              id: uuidv4(),
              type: 'image',
              src: url,
              path: f.path,
              x,
              y,
              width,
              height,
              creationDate: new Date(),
              modificationDate: new Date(),
            }
            this.canvasElements.push(newElement)
          }
          img.src = url
        }
        else {
          let newElement = {
            id: uuidv4(),
            type: 'file',
            path: f.path,
            x,
            y,
            width: 355,
            height: 155,
            creationDate: new Date(),
            modificationDate: new Date(),
          }
          this.canvasElements.push(newElement)
        }
      }
      var noteLink = event.dataTransfer.getData("application/pensieve.note")
      if (noteLink) {
        this.canvasBus.$once('canvasWrapperMouseMove', ({event, mouseposx, mouseposy, mouseposxworld, mouseposyworld}) => {
          let note = this.$store.state.currentNoteCollection.resolveNoteLink(noteLink)
          let newElement = {
            id: uuidv4(),
            type: 'note',
            path: noteLink,
            x: mouseposxworld,
            y: mouseposyworld,
            width: 630,
            height: 300,
            creationDate: new Date(),
            modificationDate: new Date(),
          }
          this.canvasElements.push(newElement)
          this.note.addLink(note.relativePath, ['canvas-element'])
          if (this.showNoteFeeder) {
            this.feederSource.feederFunc()
          }
        })
      }
      if (event.dataTransfer.files.length < 1 && !noteLink) {
        let text = event.dataTransfer.getData("text/plain")
        console.log(text)
        this.insertTextAs({text})
      }
    },
    dragstartFeederNote(event, noteLink) {
      event.dataTransfer.setData("application/pensieve.note", noteLink)
      event.dataTransfer.setData("text/plain", noteLink)
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
    circleRectangleIntersection(circleCenter, circleRadius, rectangleCenter, rectangleWidth, rectangleHeight, rectangleRotation) {
      // See: https://stackoverflow.com/a/402019
      // Translate the circle and rectangle to the origin for easier calculations
      const rotatePoint = (point, angle) => {
        const x = point[0]
        const y = point[1]
        const rotatedX = x * Math.cos(angle) - y * Math.sin(angle)
        const rotatedY = x * Math.sin(angle) + y * Math.cos(angle)
        return [rotatedX, rotatedY]
      }
      const translatedCircleCenter = [circleCenter[0] - rectangleCenter[0], circleCenter[1] - rectangleCenter[1]]
      const rotatedCircleCenter = rotatePoint(translatedCircleCenter, -rectangleRotation)

      const halfWidth = rectangleWidth / 2
      const halfHeight = rectangleHeight / 2

      // Check if the circle's center is inside the rectangle
      if (
        -halfWidth <= rotatedCircleCenter[0] && rotatedCircleCenter[0] <= halfWidth &&
        -halfHeight <= rotatedCircleCenter[1] && rotatedCircleCenter[1] <= halfHeight
      ) {
        return true
      }

      // Check if any of the rectangle's edges have a point inside the circle
      const closestPointInRect = [
        Math.min(Math.max(rotatedCircleCenter[0], -halfWidth), halfWidth),
        Math.min(Math.max(rotatedCircleCenter[1], -halfHeight), halfHeight)
      ]

      const distanceSquared = Math.pow(rotatedCircleCenter[0] - closestPointInRect[0], 2) +
        Math.pow(rotatedCircleCenter[1] - closestPointInRect[1], 2)

      return distanceSquared <= Math.pow(circleRadius, 2)
    },
    rotatePoint(x, y, pivotX, pivotY, angle) {
      angle = (angle * Math.PI) / 180
      let newX = pivotX + (x - pivotX) * Math.cos(angle) - (y - pivotY) * Math.sin(angle)
      let newY = pivotY + (x - pivotX) * Math.sin(angle) + (y - pivotY) * Math.cos(angle)
      return { x: newX, y: newY }
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
    calculateEdgeCreateHelpers() {
      this.helperElements = []
      for (let el of this.visibleElements) {
        let centerX = el.x + el.width / 2
        let centerY = el.y + el.height / 2
        let elementMeasurements = {
          top: this.rotatePoint(centerX, el.y, centerX, centerY, el.rotation ?? 0),
          bottom: this.rotatePoint(centerX, el.y + el.height, centerX, centerY, el.rotation ?? 0),
          right: this.rotatePoint(el.x + el.width, centerY, centerX, centerY, el.rotation ?? 0),
          left: this.rotatePoint(el.x, centerY, centerX, centerY, el.rotation ?? 0),
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
              this.calculateEdgeCreateHelpers()
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
    selectElementsBy({elements, byColor, byType, byRotation, visibleOnly}) {
      let selectedElementsIds = []
      let targetElements = this.canvasElements
      if (visibleOnly) targetElements = this.visibleElements
      for (let sourceEl of elements) {
        if (byColor) {
          for (let el of targetElements) {
            if (el.color == sourceEl.color) {
              selectedElementsIds.push(el.id)
            }
          }
        }
        if (byType) {
          for (let el of targetElements) {
            if (el.type == sourceEl.type) {
              selectedElementsIds.push(el.id)
            }
          }
        }
        if (byRotation) {
          for (let el of targetElements) {
            if (el.rotation == sourceEl.rotation) {
              selectedElementsIds.push(el.id)
            }
          }
        }
      }
      selectedElementsIds = [...new Set(selectedElementsIds)]
      this.selectedElementsIds = selectedElementsIds
    },
    replaceCanvasElementObj(newCanvasElementObj) {
      var index = this.canvasElements.findIndex(e => e.id == newCanvasElementObj.id)
      if (index > -1) {
        for (let o of Object.keys(newCanvasElementObj)) {
          let v = newCanvasElementObj[o]
          if (['x', 'y', 'width', 'height'].includes(o)) v = Math.round(v) // Subpixel values lead to blur when scaling
          this.$set(this.canvasElements[index], o, v)
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
      else if (this.focusedElementId) {
        return [this.focusedElementId]
      }
      else {
        return []
      }
    },
    getElementsToBeAffected() {
      let ids = this.getElementIdsToBeAffected()
      return this.canvasElements.filter(el => ids.includes(el.id))
    },
    addToUndoList(payload) {
      this.undoList.push({
        ...payload,
        timestamp: new Date(),
      })
      this.undoList = this.undoList.slice(Math.max(this.undoList.length - this.undoLimit, 0))
    },
    undoAction() {
      let lastAction = this.undoList.pop()
      if (!lastAction) return false
      if (lastAction.action == 'delete') {
        for (let el of lastAction.elements) {
          this.canvasElements.push(el)
        }
      }
    },
    debugFunctionsPopover(event) {
      let items = [
        {
          label: 'Align elements to full pixels',
          action: () => {
            for (let el of this.canvasElements) {
              for (let k of ['x', 'y', 'width', 'height']) {
                if (el[k]) {
                  this.$set(el, k, Math.round(el[k]))
                }
              }
            }
          }
        },
      ]
      this.$store.commit('triggerCustomPopoverList', {
        message: 'Debug Funcs',
        items: items,
        options: { hintMode: false, searchMode: true },
      })
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
      let iconInstance = new ComponentClass({
        propsData: { name: 'Anchor' }
      })
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
            height = Math.round(img.naturalHeight * 1.013) // I know this is weird but needed...
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
              this.note.addLink(note.relativePath, ['canvas-element'])
              callback(newElement)
            }
          }
        }
        return null
      })
      items = items.filter(i => i !== null)
      this.$store.commit('triggerCustomSelectList', {items})
    },
    insertTextAs({text}) {
      this.canvasBus.$once('canvasWrapperMouseMove', ({ event, mouseposx, mouseposy, mouseposxworld, mouseposyworld }) => {
        let [x, y] = [mouseposxworld, mouseposyworld]
        let items = [
          {
            label: 'Markdown (Centered)',
            action: () => {
              let width = 120
              let height = 60
              let newElement = this.addNewMarkdownElement({
                x: x - (width / 2),
                y: y - (height / 2),
                width,
                height,
                text,
              })
              this.focusedElementId = newElement.id
            },
          },
        ]
        this.$store.commit('triggerCustomPopoverList', {
          message: `Insert text as...`,
          items: items,
          options: { hintMode: false },
        })
      })
    },
    duplicateElements(affectedElements = this.getElementsToBeAffected()) {
      if (affectedElements.length == 0) return false
      let newElementIds = []
      for (let el of affectedElements) {
        let newElement = {...el}
        let newElementId = uuidv4()
        newElement.id = newElementId
        newElement.creationDate = new Date()
        newElement.modificationDate = new Date()
        this.canvasElements.push(newElement)
        newElementIds.push(newElementId)
      }
      return newElementIds
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
    chooseElementModal() {
      let items = this.canvasElements.map(e => {
        if (e.type == 'note') {
          var note = this.$store.state.currentNoteCollection.resolveNoteLink(e.path)
        }
        return {
          label: e.description || e.label || e.text || note?.abstract || e.path || e.src || 'Unnamed',
          description: e.type,
          lucideIcon: {
            'image': 'Image',
            'container': 'Frame',
            'file': 'File',
            'dot': 'Circle',
            'lucideIcon': 'Boxes',
            'freehand': 'Pencil',
            'iframe': 'Globe2',
            'markdown': 'FileEdit',
            'note': 'FileText',
          }[e.type] || 'FileQuestion',
          action: () => {
            this.focusedElementId = e.id
            this.centerOnElement(e.id)
          },
        }
      })
      let filter = (context) => {
        var items = context.itemsWithIds
        var searchString = context.searchString.toLowerCase()
        if (searchString.length == 0) {
          return items
        }
        var fuzzyResults = fuzzysort.go(searchString, items || [], {key: 'label'}, {threshold: -10000})
        var itemsFiltered = fuzzyResults.map(i => {
          return {...i.obj, highlight: fuzzysort.highlight(i, '<span class="highlight">', '</span>')}
        })
        return itemsFiltered
      }
      this.$store.commit('triggerCustomSelectList', {items, filter})
    },
    chooseFeederSourceModal() {
      var filters = this.$store.state.currentNoteCollection.getAllFilters()
      let items = filters.map(f => {
        return {
          label: f.title,
          description: 'Filter',
          lucideIcon: 'Filter',
          action: () => {
            this.feederSource.label = f.title,
            this.feederSource.type = 'filter'
            this.feederSource.feederFunc = () => {
              this.$store.state.currentNoteCollection.filterNotes({filterFunc: f.filterFunc, stackList: f.stacks}).then(filteredNotes => {
                if (this.feederHideAddedNotes) {
                  this.feederNotes = filteredNotes.filter(n => {
                    return !(this.canvasElements.some(e => e.path == n.noteLink))
                  })
                }
                else {
                  this.feederNotes = filteredNotes
                }
              })
            }
            this.feederSource.feederFunc()
            this.canvasObj.feederSource = {
              label: f.title,
              type: 'filter',
              path: f.path,
            }
          },
        }
      })
      var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
      let stackItems = stacks.map(s => {
        return {
          label: s.relativePath,
          description: 'Stack',
          lucideIcon: 'Layers',
          action: () => {
            this.feederSource.label = s.relativePath
            this.feederSource.type = 'stack'
            this.feederSource.feederFunc = () => {
              let notes = s.getContent()
              if (this.feederHideAddedNotes) {
                this.feederNotes = notes.filter(n => {
                  return (
                    !n.isStack
                    &&
                    !(this.canvasElements.some(e => e.path == n.noteLink))
                  )
                })
              }
              else {
                this.feederNotes = notes.filter(n => !n.isStack)
              }
            }
            this.feederSource.feederFunc()
            this.canvasObj.feederSource = {
              label: s.relativePath,
              type: 'stack',
              path: s.relativePath,
            }
          },
        }
      })
      items = items.concat(stackItems)
      this.$store.commit('triggerCustomSelectList', {items})
    },
    savePopoverEditor(event) {
      let focusedElementItem = this.getFocusedElementItem()
      if (focusedElementItem) {
        focusedElementItem.saveElement(null, this.popoverEditorContent)
      }
      this.showPopoverEditor = false
      this.popoverEditorContent = ''
    },
    cancelPopoverEditor(event) {
      this.showPopoverEditor = false
      this.popoverEditorContent = ''
      this.setMode('normal')
    },
    saveCanvasPosition() {
      let canvasMatrix = this.canvasMatrix
      let centerX = canvasMatrix.e + ((this.$refs.canvasWrapper.clientWidth  / 2 ) / canvasMatrix.a)
      let centerY = canvasMatrix.f + ((this.$refs.canvasWrapper.clientHeight / 2 ) / canvasMatrix.d)
      let startAt = {
        focusedElementId: this.focusedElementId || null,
        scale: this.scale,
        centerX,
        centerY,
      }
      this.canvasObj.startAt = startAt
      this.note.setContent(JSON.stringify(this.canvasObj, null, 2))
    },
    saveCanvas() {
      var oldCanvas = this.canvasObj
      var newCanvas = {...oldCanvas}
      newCanvas.elements = this.canvasElements
      newCanvas.savedViews = this.savedViews
      newCanvas.title = this.canvasObj.title
      // newCanvas.background = this.canvasObj.background
      newCanvas.style = this.canvasObj.style
      newCanvas.edges = this.edges.map(ed => Object.fromEntries(Object.entries(ed).filter(i => !['fromElementMeasurements', 'toElementMeasurements', 'pathD'].includes(i[0]))))
      newCanvas.elasticFrame = this.elasticFrame
      this.note.setContent(JSON.stringify(newCanvas, null, 2))
      this.canvasObj = newCanvas
      this.unsavedChanges = false
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
          if (this.mode == 'brush') {
            this.helperElements = this.helperElements.filter(el => !(el.type == 'brush'))
          }
          if (this.mode == 'move') {
            for (let id in this.moveOrigins) {
              if (id == 'cursor') continue
              let index = this.canvasElements.findIndex(el => el.id == id)
              if (index < -1) continue
              this.canvasElements[index].x = this.moveOrigins[id][0]
              this.canvasElements[index].y = this.moveOrigins[id][1]
              this.constrainMoveToX = false
              this.constrainMoveToY = false
            }
          }
          this.setMode('normal')
          this.fullKeybuffer = ''
        }
        else if (event.key == 's' && event.metaKey) {
          this.saveCanvas()
        }
        else if (event.key == 'r' && event.metaKey) {
          this.chooseElementModal()
        }
        else if (event.key == 'a' && event.ctrlKey) {
          let affectedElements = this.getElementsToBeAffected()
          let scaleAmount = 1.1
          for (let el of affectedElements) {
            let currentFontSizeTransform = el.fontSizeTransform || 1
            this.$set(el, 'fontSizeTransform', (currentFontSizeTransform * scaleAmount).toFixed(2))
          }
        }
        else if (event.key == 'x' && event.ctrlKey) {
          let affectedElements = this.getElementsToBeAffected()
          let scaleAmount = 1.1
          for (let el of affectedElements) {
            let currentFontSizeTransform = el.fontSizeTransform || 1
            this.$set(el, 'fontSizeTransform', (currentFontSizeTransform / scaleAmount).toFixed(2))
          }
        }
        else if (event.key == 'o' && event.ctrlKey) {
          // Go back to last auto-saved position
          let index = this.autoSavedPosJumpIndex ? this.autoSavedPosJumpIndex - 1 : this.autoSavedPositions.length - 1
          if (index > -1) {
            let markObj = this.autoSavedPositions[index]
            this.flyTo({
              x: markObj.centerX - ((this.$refs.canvasWrapper.clientWidth / 2) / this.canvasMatrix.a),
              y: markObj.centerY - ((this.$refs.canvasWrapper.clientHeight / 2) / this.canvasMatrix.d),
              scale: markObj.scale ?? this.scale,
            })
            this.focusedElementId = markObj.focusedElementId ?? this.focusedElementId
            this.autoSavedPosJumpIndex = index
          }
        }
        else if (event.key == 'i' && event.ctrlKey) {
          // Go forward to previous auto-saved position
          if (this.autoSavedPosJumpIndex) {
            let index = this.autoSavedPosJumpIndex + 1
            if (index < this.autoSavedPositions.length) {
              let markObj = this.autoSavedPositions[index]
              this.flyTo({
                x: markObj.centerX - ((this.$refs.canvasWrapper.clientWidth / 2) / this.canvasMatrix.a),
                y: markObj.centerY - ((this.$refs.canvasWrapper.clientHeight / 2) / this.canvasMatrix.d),
                scale: markObj.scale ?? this.scale,
              })
              this.focusedElementId = markObj.focusedElementId ?? this.focusedElementId
              this.autoSavedPosJumpIndex = index
            }
          }
        }
        else if (event.key == 'Enter') {
          if (this.mode == 'move') {
            this.constrainMoveToX = false
            this.constrainMoveToY = false
            this.setMode('normal')
          }
          if (this.mode == 'rotate') {
            this.setMode('normal')
          }
          else if (this.mode == 'normal') {
            if (this.focusedElementId) {
              let focusedElement = this.canvasElements.find(el => el.id == this.focusedElementId)
              if (focusedElement.type == 'note') {
                let stacksPath = this.$store.state.currentNoteCollection.collectionJson.paths.stacks.split('/')[1]
                let notePath = `${stacksPath+focusedElement.path+'.md'}`
                let encodedPath = notePath.split('/').map(c => encodeURIComponent(c)).join('/')
                this.$router.push(`/note/${encodedPath}`)
              }
            }
          }
          this.fullKeybuffer = ''
        }
        else if (event.key == 'ArrowLeft') {
          let moveBy = 20
          if (event.shiftKey) moveBy = this.$refs.canvasWrapper.clientWidth / 2
          if (event.altKey) moveBy = this.$refs.canvasWrapper.clientWidth / 4
          if (event.metaKey) moveBy = this.$refs.canvasWrapper.clientWidth
          let newCanvasMatrix = tm.compose(
            this.canvasMatrix,
            tm.translate(moveBy*(1/this.scale), 0),
          )
          if (moveBy < 100) {
            this.canvasMatrix = newCanvasMatrix
          }
          else {
            this.flyTo({
              x: newCanvasMatrix.e,
              y: newCanvasMatrix.f,
              duration: 300,
            })
          }
          this.fullKeybuffer = ''
        }
        else if (event.key == 'ArrowRight') {
          let moveBy = 20
          if (event.shiftKey) moveBy = this.$refs.canvasWrapper.clientWidth / 2
          if (event.altKey) moveBy = this.$refs.canvasWrapper.clientWidth / 4
          if (event.metaKey) moveBy = this.$refs.canvasWrapper.clientWidth
          let newCanvasMatrix = tm.compose(
            this.canvasMatrix,
            tm.translate(-moveBy*(1/this.scale), 0),
          )
          if (moveBy < 100) {
            this.canvasMatrix = newCanvasMatrix
          }
          else {
            this.flyTo({
              x: newCanvasMatrix.e,
              y: newCanvasMatrix.f,
              duration: 300,
            })
          }
          this.fullKeybuffer = ''
        }
        else if (event.key == 'ArrowDown') {
          let moveBy = 20
          if (event.shiftKey) moveBy = this.$refs.canvasWrapper.clientHeight / 2
          if (event.altKey) moveBy = this.$refs.canvasWrapper.clientHeight / 4
          if (event.metaKey) moveBy = this.$refs.canvasWrapper.clientHeight
          let newCanvasMatrix = tm.compose(
            this.canvasMatrix,
            tm.translate(0, -moveBy*(1/this.scale)),
          )
          if (moveBy < 100) {
            this.canvasMatrix = newCanvasMatrix
          }
          else {
            this.flyTo({
              x: newCanvasMatrix.e,
              y: newCanvasMatrix.f,
              duration: 300,
            })
          }
          this.fullKeybuffer = ''
        }
        else if (event.key == 'ArrowUp') {
          let moveBy = 20
          if (event.shiftKey) moveBy = this.$refs.canvasWrapper.clientHeight / 2
          if (event.altKey) moveBy = this.$refs.canvasWrapper.clientHeight / 4
          if (event.metaKey) moveBy = this.$refs.canvasWrapper.clientHeight
          let newCanvasMatrix = tm.compose(
            this.canvasMatrix,
            tm.translate(0, moveBy*(1/this.scale)),
          )
          if (moveBy < 100) {
            this.canvasMatrix = newCanvasMatrix
          }
          else {
            this.flyTo({
              x: newCanvasMatrix.e,
              y: newCanvasMatrix.f,
              duration: 300,
            })
          }
          this.fullKeybuffer = ''
        }
        else if (event.key == 'Home') {
          this.goToHomeView()
          this.fullKeybuffer = ''
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
              else if (this.keybuffer == "t") {
                let focusedEdge = this.edges.find(ed => ed.id == this.focusedEdgeId)
                var items = [
                  {
                    label: 'Curve',
                    key: 'c',
                    lucideIcon: 'Spline',
                    action: () => {
                      this.$set(focusedEdge, 'edgeConnectionType', 'curve')
                    },
                  },
                  {
                    label: 'Straight line',
                    key: 's',
                    lucideIcon: 'Minus',
                    action: () => {
                      this.$set(focusedEdge, 'edgeConnectionType', 'straight')
                    },
                  },
                  {
                    label: 'Angular',
                    key: 'a',
                    lucideIcon: 'Brackets',
                    action: () => {
                      this.$set(focusedEdge, 'edgeConnectionType', 'angular')
                    },
                  },
                ]
                this.$store.commit('triggerCustomPopoverList', {
                  message: `Edge connection type`,
                  items: items,
                  options: {hintMode: false},
                })
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
            else if (this.keybuffer == "E")
            {
              let focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              if (focusedElement && ['markdown', 'note'].includes(focusedElement.type)) {
                let focusedElementItem = this.getFocusedElementItem()
                this.popoverEditorContent = focusedElementItem.editorContent
                this.setMode('edit')
                this.showPopoverEditor = true
                this.$nextTick(() => {
                  this.$refs.popoverCmEditor.codemirror.focus()
                })
              }
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
                this.addToUndoList({
                  action: 'delete',
                  elements: affectedElements,
                })
                let newCanvasElements = this.canvasElements.filter(e => !affectedIds.includes(e.id))
                for (let el of affectedElements) {
                  if (el.type == 'note' && !(newCanvasElements.some(e => e.path == el.path))) {
                    let note = this.$store.state.currentNoteCollection.resolveNoteLink(el.path)
                    this.note.removeLink(note.relativePath)
                  }
                }
                this.edges = this.edges.filter(ed => !affectedIds.includes(ed.fromElement) && !affectedIds.includes(ed.toElement))
                this.canvasElements = newCanvasElements
                this.focusedElementId = null
                this.selectedElementsIds = []
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "u")
            {
              this.undoAction()
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
            else if (this.keybuffer == "sb")
            {
              let items = [
                {
                  label: 'Color',
                  lucideIcon: 'Palette',
                  key: 'c',
                  action: () => {
                    this.selectElementsBy({
                      elements: this.getElementsToBeAffected(),
                      byColor: true,
                    })
                  }
                },
                {
                  label: 'Type',
                  key: 't',
                  action: () => {
                    this.selectElementsBy({
                      elements: this.getElementsToBeAffected(),
                      byType: true,
                    })
                  }
                },
                {
                  label: 'Rotation',
                  key: 'r',
                  lucideIcon: 'RotateCw',
                  action: () => {
                    this.selectElementsBy({
                      elements: this.getElementsToBeAffected(),
                      byRotation: true,
                    })
                  }
                },
              ]
              this.$store.commit('triggerCustomPopoverList', {
                message: 'Select elements by...',
                items: items,
                options: {hintMode: false},
              })
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
            else if (this.keybuffer == "))")
            {
              if (this.focusedElementId) {
                let jumpDistance = this.keybufferCount || 1
                let canvasElements = [...this.canvasElements]
                canvasElements.sort((a, b) => b.creationDate - a.creationDate)
                let index = canvasElements.findIndex(e => e.id == this.focusedElementId)
                let elementToJumpTo = canvasElements[Math.min(index + jumpDistance, canvasElements.length - 1)]
                this.focusedElementId = elementToJumpTo ? elementToJumpTo.id : this.focusedElementId
                this.centerOnElement()
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "((")
            {
              if (this.focusedElementId) {
                let jumpDistance = this.keybufferCount || 1
                let canvasElements = [...this.canvasElements]
                canvasElements.sort((a, b) => b.creationDate - a.creationDate)
                let index = canvasElements.findIndex(e => e.id == this.focusedElementId)
                let elementToJumpTo = canvasElements[Math.max(index - jumpDistance, 0)]
                this.focusedElementId = elementToJumpTo ? elementToJumpTo.id : this.focusedElementId
                this.centerOnElement()
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "+")
            {
              let count = this.keybufferCount || 1
              let canvasWidth = this.$refs.canvasWrapper.clientWidth
              let canvasHeight = this.$refs.canvasWrapper.clientHeight
              let oldScale = this.scale
              let newScale = oldScale * (this.zoomIntensity * count)
              let [oldCenterX, oldCenterY] = this.toWorldPos(canvasWidth/2, canvasHeight/2)
              this.setScale(newScale)
              let [newCenterX, newCenterY] = this.toWorldPos(canvasWidth/2, canvasHeight/2)
              this.canvasMatrix = tm.compose(
                this.canvasMatrix,
                tm.translate(newCenterX - oldCenterX, newCenterY - oldCenterY),
              )
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "-")
            {
              let count = this.keybufferCount || 1
              let canvasWidth = this.$refs.canvasWrapper.clientWidth
              let canvasHeight = this.$refs.canvasWrapper.clientHeight
              let oldScale = this.scale
              let newScale = oldScale / (this.zoomIntensity * count)
              let [oldCenterX, oldCenterY] = this.toWorldPos(canvasWidth/2, canvasHeight/2)
              this.setScale(newScale)
              let [newCenterX, newCenterY] = this.toWorldPos(canvasWidth/2, canvasHeight/2)
              this.canvasMatrix = tm.compose(
                this.canvasMatrix,
                tm.translate(newCenterX - oldCenterX, newCenterY - oldCenterY),
              )
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "z0")
            {
              let canvasWidth = this.$refs.canvasWrapper.clientWidth
              let canvasHeight = this.$refs.canvasWrapper.clientHeight
              let oldScale = this.scale
              let newScale = 1
              let [oldCenterX, oldCenterY] = this.toWorldPos(canvasWidth/2, canvasHeight/2)
              this.setScale(newScale)
              let [newCenterX, newCenterY] = this.toWorldPos(canvasWidth/2, canvasHeight/2)
              this.canvasMatrix = tm.compose(
                this.canvasMatrix,
                tm.translate(newCenterX - oldCenterX, newCenterY - oldCenterY),
              )
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "za")
            {
              let padding = 0.95
              let {topright, topleft, bottomleft, bottomright} = this.getBoundingRectCoveringAllElements()
              let xDistance = topright[0] - topleft[0]
              let yDistance = bottomleft[1] - topright[1]
              let canvasWidth = this.$refs.canvasWrapper.clientWidth
              let canvasHeight = this.$refs.canvasWrapper.clientHeight
              let xScale = Math.abs(canvasWidth / xDistance)
              let yScale = Math.abs(canvasHeight / yDistance)
              let newScale = Math.min(xScale, yScale) * padding
              // this.setScale(newScale)
              let newCanvasX = -newScale * (topleft[0] - (canvasWidth*(1/newScale) - xDistance) / 2)
              let newCanvasY = -newScale * (topleft[1] - (canvasHeight*(1/newScale) - yDistance) / 2)
              // this.canvasMatrix.e = newCanvasX
              // this.canvasMatrix.f = newCanvasY
              this.flyTo({
                x: newCanvasX,
                y: newCanvasY,
                scale: newScale,
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "zv")
            {
              let padding = 0.95
              let {topright, topleft, bottomleft, bottomright} = this.getBoundingRectCoveringGivenElements(this.visibleElements)
              let xDistance = topright[0] - topleft[0]
              let yDistance = bottomleft[1] - topright[1]
              let canvasWidth = this.$refs.canvasWrapper.clientWidth
              let canvasHeight = this.$refs.canvasWrapper.clientHeight
              let xScale = Math.abs(canvasWidth / xDistance)
              let yScale = Math.abs(canvasHeight / yDistance)
              let newScale = Math.min(xScale, yScale) * padding
              // this.setScale(newScale)
              let newCanvasX = -newScale * (topleft[0] - (canvasWidth*(1/newScale) - xDistance) / 2)
              let newCanvasY = -newScale * (topleft[1] - (canvasHeight*(1/newScale) - yDistance) / 2)
              // this.canvasMatrix.e = newCanvasX
              // this.canvasMatrix.f = newCanvasY
              this.flyTo({
                x: newCanvasX,
                y: newCanvasY,
                scale: newScale,
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",d")
            {
              this.statusBarDebugInfo = !this.statusBarDebugInfo
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",r")
            {
              let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              let elements = this.getElementsToBeAffected()
              for (let e of elements) {
                let center = [e.x + e.width/2, e.y+e.height/2]
                // console.log(center)
                let diffY = y-center[1]
                let diffX = x-center[0]
                console.log(`diffX: ${diffX} diffY: ${diffY}`)
                console.log(Math.atan(
                  diffY
                  /
                  diffX
                )*(180/Math.PI))
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",p")
            {
              var $this = this
              let node = this.$refs.canvasWrapper
              // let nodeClone = node.cloneNode(true)
              const calculateAspectRatioFit = (srcWidth, srcHeight, maxWidth, maxHeight) => {
                var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
                return { width: srcWidth*ratio, height: srcHeight*ratio }
              }
              let {width: canvasWidth, height: canvasHeight} = calculateAspectRatioFit(node.clientWidth, node.clientHeight, 150, 150)
              htmlToImage.toPng(node, {
                canvasWidth,
                canvasHeight,
                filter: (node) => {
                  if (node.src?.startsWith('localfile://')) {
                    return false
                  }
                  const exclusionClasses = ['edge-outline'];
                  return !exclusionClasses.some((classname) => node.classList?.contains(classname))
                  return true
                }
              })
              .then(function (dataUrl) {
                $this.canvasObj.thumbnail = dataUrl
                $this.note.setContent(JSON.stringify($this.canvasObj, null, 2))
              })
              .catch(function (error) {
                console.error('oops, something went wrong!', error);
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",,p")
            {
              var $this = this
              let node = this.$refs.canvasWrapper
              // let nodeClone = node.cloneNode(true)
              const calculateAspectRatioFit = (srcWidth, srcHeight, maxWidth, maxHeight) => {
                var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
                return { width: srcWidth*ratio, height: srcHeight*ratio }
              }
              let {width: canvasWidth, height: canvasHeight} = calculateAspectRatioFit(node.clientWidth, node.clientHeight, 150, 150)
              htmlToImage.toSvg(node, {
                canvasWidth,
                canvasHeight,
                filter: (node) => {
                  if (node.src?.startsWith('localfile://')) {
                    return false
                  }
                  const exclusionClasses = ['edge-outline'];
                  return !exclusionClasses.some((classname) => node.classList?.contains(classname))
                  return true
                }
              })
              .then(function (dataUrl) {
                console.log(dataUrl)
              })
              .catch(function (error) {
                console.error('oops, something went wrong!', error);
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "ä")
            {
              this.elasticFrame = !this.elasticFrame
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",e")
            {
              let affectedElements = this.getElementsToBeAffected()
              for (let el of affectedElements) {
                console.log(el)
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",m")
            {
              this.minimapEnabled = !this.minimapEnabled
              if (this.minimapEnabled) {
                setTimeout(() => {
                  let ctx = this.$refs.minimap.getContext('2d')
                  let downscaleFactor = 10
                  for (let el of this.canvasElements) {
                    ctx.fillStyle = '#000000'
                    ctx.fillRect(
                      Math.round(el.x/downscaleFactor), 
                      Math.round(el.y/downscaleFactor),
                      Math.round(el.width/downscaleFactor),
                      Math.round(el.height/downscaleFactor)
                      )
                  }
                  ctx.lineWidth = 1
                  ctx.strokeStyle = "#ff0000"
                  ctx.strokeRect(
                    -this.canvasMatrix.e / downscaleFactor,
                    -this.canvasMatrix.f / downscaleFactor,
                    (this.$refs.canvasWrapper.clientWidth  / this.canvasMatrix.a) / downscaleFactor,
                    (this.$refs.canvasWrapper.clientHeight  / this.canvasMatrix.d) / downscaleFactor,
                    )
                }, 100)
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",s")
            {
              this.showSettingsPanel = !this.showSettingsPanel
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",f")
            {
              if (this.canvasObj.feederSource) {
                let feederSource = this.canvasObj.feederSource
                if (feederSource.type == 'filter') {
                  let filters = this.$store.state.currentNoteCollection.getAllFilters()
                  let f = filter.filter(f => feederSource.path == f.path)
                  if (f) {
                    this.feederSource.label = f.title,
                    this.feederSource.type = 'filter'
                    this.feederSource.feederFunc = () => {
                      this.$store.state.currentNoteCollection.filterNotes({filterFunc: f.filterFunc, stackList: f.stacks}).then(filteredNotes => {
                        if (this.feederHideAddedNotes) {
                          this.feederNotes = filteredNotes.filter(n => {
                            return !(this.canvasElements.some(e => e.path == n.noteLink))
                          })
                        }
                        else {
                          this.feederNotes = filteredNotes
                        }
                      })
                    }
                    this.feederSource.feederFunc()
                  }
                }
                else if (feederSource.type == 'stack') {
                  let s = this.$store.state.currentNoteCollection.stacks.getStackByPath(feederSource.path)
                  this.feederSource.label = s.relativePath
                  this.feederSource.type = 'stack'
                  this.feederSource.feederFunc = () => {
                    let notes = s.getContent()
                    if (this.feederHideAddedNotes) {
                      this.feederNotes = notes.filter(n => {
                        return (
                          !n.isStack
                          &&
                          !(this.canvasElements.some(e => e.path == n.noteLink))
                        )
                      })
                    }
                    else {
                      this.feederNotes = notes.filter(n => !n.isStack)
                    }
                  }
                  this.feederSource.feederFunc()
                }
              }
              this.showNoteFeeder = !this.showNoteFeeder
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == ",b")
            {
              console.log(this.getBoundingRectCoveringAllElements())
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
            else if (this.keybuffer == "H")
            {
              this.goToHomeView()
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
            else if (this.keybuffer == "m'")
            {
              // Set jump mark
              this.$store.commit('triggerCustomTextPrompt', {
                message: 'Set custom jump mark',
                text: '',
                action: (mark) => {
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
                  let i = this.savedViews.findIndex(v => v.key == mark)
                  if (i > -1) {
                    this.savedViews[i] = markObj
                  }
                  else {
                    this.savedViews.push(markObj)
                  }
                }
              })
              this.fullKeybuffer = ''
            }
            else if (/^'[a-zA-Z0-9]/.test(this.keybuffer))
            {
              // Jump to jump mark
              let mark = this.keybuffer[1]
              let i = this.savedViews.findIndex(v => v.key == mark)
              if (i > -1) {
                let markObj = this.savedViews[i]
                // this.setScale(markObj.scale ?? this.scale)
                this.flyTo({
                  x: markObj.centerX - ((this.$refs.canvasWrapper.clientWidth  / 2 ) / this.canvasMatrix.a),
                  y: markObj.centerY - ((this.$refs.canvasWrapper.clientHeight / 2 ) / this.canvasMatrix.d),
                  scale: markObj.scale ?? this.scale,
                })
                // this.canvasMatrix.e = markObj.centerX - ((this.$refs.canvasWrapper.clientWidth  / 2 ) / this.canvasMatrix.a)
                // this.canvasMatrix.f = markObj.centerY - ((this.$refs.canvasWrapper.clientHeight / 2 ) / this.canvasMatrix.d)
                this.focusedElementId = markObj.focusedElementId ?? this.focusedElementId
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "''")
            {
              let $this = this
              let items = this.savedViews.map((markObj) => ({
                label: markObj.key,
                // lucideIcon: (function () {
                //   let [x, y] = $this.toWorldPos($this.mouseposx, $this.mouseposy)
                //   let diffY = -markObj.centerY - y
                //   let diffX = -markObj.centerX - x
                //   let angle = Math.atan2(
                //     diffY, diffX
                //   ) * (180 / Math.PI)
                //   angle = (angle + 360) % 360 // Make sure angle is between 0 and 360
                //   console.log(`${markObj.key} centerY:${markObj.centerY} centerX:${markObj.centerX} x:${x} y:${y} diffY${diffY} diffX:${diffY} ${angle}°`)
                //   let arrows = ['ArrowRight', 'ArrowDownRight', 'ArrowDown', 'ArrowDownLeft', 'ArrowLeft', 'ArrowUpLeft', 'ArrowUp', 'ArrowUpRight', 'ArrowRight']
                //   return arrows[Math.round(angle/45)]
                // })(),
                action: () => {
                  this.flyTo({
                    x: markObj.centerX - ((this.$refs.canvasWrapper.clientWidth  / 2 ) / this.canvasMatrix.a),
                    y: markObj.centerY - ((this.$refs.canvasWrapper.clientHeight / 2 ) / this.canvasMatrix.d),
                    scale: markObj.scale ?? this.scale,
                  })
                  this.focusedElementId = markObj.focusedElementId ?? this.focusedElementId
                },
                actionButtons: [
                  {
                    lucideIcon: 'Trash',
                    action: () => {
                      this.savedViews = this.savedViews.filter(v => v.key != markObj.key)
                    },
                  },
                ],
              }))
              this.$store.commit('triggerCustomPopoverList', {
                message: 'Jump to mark',
                items: items,
                options: {hintMode: false, searchMode: true},
              })
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
                color: focusedElement.color || undefined,
                ...((this.edgeArrowMode == 'from' || this.edgeArrowMode == 'bidirectional') && {fromEnd: 'arrow'}),
                ...((this.edgeArrowMode == 'to' || this.edgeArrowMode == 'bidirectional') && {toEnd: 'arrow'}),
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "D")
            {
              let newElementIds = this.duplicateElements()
              if (newElementIds) {
                this.selectedElementsIds = []
                if (newElementIds.length == 1) {
                  this.focusedElementId = newElementIds[0]
                }
                else {
                  this.selectedElementsIds = newElementIds
                }
                // The following code should be put into a new 'enterMode' function of 'move' mode
                let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
                this.moveOrigins = {}
                this.$set(this.moveOrigins, 'cursor', [x, y])
                var focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
                let affectedElements = this.getElementsToBeAffected()
                for (let el of affectedElements) {
                  this.$set(this.moveOrigins, el.id, [el.x, el.y])
                }
                // End of code
                this.setMode('move')
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "yy") {
              let affectedElements = this.getElementsToBeAffected()
              this.$store.commit('setCanvasYankRegister', {
                register: this.keybufferRegister,
                elements: affectedElements,
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "pp") {
              let register = this.keybufferRegister || 'default'
              let registerContent = this.$store.state.canvasYankRegisters[register]
              if (registerContent && registerContent.length > 0) {
                let leftmostX = Math.min(...registerContent.map(el => el.x))
                let topmostY = Math.min(...registerContent.map(el => el.y))
                let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
                let elementsToPaste = registerContent.map(el => {
                  return {
                    ...el,
                    x: el.x - leftmostX + x,
                    y: el.y - topmostY + y,
                  }
                })
                let newElementIds = this.duplicateElements(elementsToPaste)
                if (newElementIds) {
                  this.selectedElementsIds = []
                  if (newElementIds.length == 1) {
                    this.focusedElementId = newElementIds[0]
                  }
                  else {
                    this.selectedElementsIds = newElementIds
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
                text: this.canvasObj.style.background || '',
                action: (background) => {
                  this.$set(this.canvasObj.style, 'background', background)
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
                // let additionalElements = this.getElementsFullyEnclosed({x, y, width, height} = con)
                let additionalElements = this.getElementsFullyEnclosed({x: con.x, y: con.y, width: con.width, height: con.height})
                affectedElements = affectedElements.concat(additionalElements)
              }
              for (let el of affectedElements) {
                this.$set(this.moveOrigins, el.id, [el.x, el.y])
              }
              this.setMode('move')
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "d") {
              this.setMode('draw')
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "wb") {
              this.setMode('brush')
              let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
              this.helperElements.push({
                id: uuidv4(),
                type: 'brush',
                classes: ['brush'],
                // color: this.hexToRgb(this.workingColor),
                x: x - this.brushRadius,
                y: y - this.brushRadius,
                width: this.brushRadius*2,
                height: this.brushRadius*2,
              })
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "ae") {
              this.setMode('edge-create')
              this.calculateEdgeCreateHelpers()
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "<")
            {
              this.nextEdgeArrowMode()
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "=") {
              let affectedElements = this.getElementsToBeAffected()
              var items = [
                {
                  label: 'Align left',
                  lucideIcon: 'AlignStartVertical',
                  key: 'l',
                  action: () => {
                    let leftmostX = Math.min(...affectedElements.map(el => el.x))
                    for (let el of affectedElements) {
                      this.$set(el, 'x', leftmostX)
                    }
                  },
                },
                {
                  label: 'Align center',
                  lucideIcon: 'AlignCenterVertical',
                  key: 'c',
                  action: () => {
                    let centerX = affectedElements.reduce((accumulator, el) => (accumulator + (el.x + el.width / 2)), 0) / affectedElements.length
                    for (let el of affectedElements) {
                      this.$set(el, 'x', centerX - (el.width / 2))
                    }
                  },
                },
                {
                  label: 'Align right',
                  lucideIcon: 'AlignEndVertical',
                  key: 'r',
                  action: () => {
                    let rightmostXWithWidth = Math.max(...affectedElements.map(el => el.x + el.width))
                    for (let el of affectedElements) {
                      this.$set(el, 'x', rightmostXWithWidth - el.width)
                    }
                  },
                },
                { role: 'separator' },
                {
                  label: 'Align top',
                  lucideIcon: 'AlignStartHorizontal',
                  key: 't',
                  action: () => {
                    let highestY = Math.min(...affectedElements.map(el => el.y))
                    for (let el of affectedElements) {
                      this.$set(el, 'y', highestY)
                    }
                  },
                },
                {
                  label: 'Align middle',
                  lucideIcon: 'AlignCenterHorizontal',
                  key: 'm',
                  action: () => {
                    let centerY = affectedElements.reduce((accumulator, el) => (accumulator + (el.y + el.height / 2)), 0) / affectedElements.length
                    for (let el of affectedElements) {
                      this.$set(el, 'y', centerY - (el.height / 2))
                    }
                  },
                },
                {
                  label: 'Align bottom',
                  lucideIcon: 'AlignEndHorizontal',
                  key: 'b',
                  action: () => {
                    let lowestYWithHeight = Math.max(...affectedElements.map(el => el.y + el.height))
                    for (let el of affectedElements) {
                      this.$set(el, 'y', lowestYWithHeight - el.height)
                    }
                  },
                },
                { role: 'separator' },
                {
                  label: 'Column',
                  lucideIcon: 'Columns',
                  key: 'Shift+C',
                  action: () => {
                    let padding = 5
                    affectedElements.sort((a, b) => a.y - b.y)
                    for (let i = 1; i < affectedElements.length; i++) {
                      let el = affectedElements[i]
                      let lastEl = affectedElements[i-1]
                      this.$set(el, 'y', lastEl.y + lastEl.height + padding)
                      this.$set(el, 'x', affectedElements[0].x)
                    }
                  },
                },
                {
                  label: 'Row',
                  lucideIcon: 'Rows',
                  key: 'Shift+R',
                  action: () => {
                    let padding = 5
                    affectedElements.sort((a, b) => a.x - b.x)
                    for (let i = 1; i < affectedElements.length; i++) {
                      let el = affectedElements[i]
                      let lastEl = affectedElements[i-1]
                      this.$set(el, 'x', lastEl.x + lastEl.width + padding)
                      this.$set(el, 'y', affectedElements[0].y)
                    }
                  },
                },
              ]
              this.$store.commit('triggerCustomPopoverList', {
                message: `Align selected elements`,
                items: items,
                options: {hintMode: false},
              })
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
            else if (this.keybuffer == "cd")
            {
              var focusedElement = this.canvasElements.find(e => e.id == this.focusedElementId)
              if (focusedElement) {
                this.$store.commit('triggerCustomTextPrompt', {
                  message: 'Change description of canvas element',
                  text: focusedElement.description || '',
                  selectAll: true,
                  action: (description) => {
                    if (description.trim()) {
                      this.$set(focusedElement, 'description', description)
                    }
                    else {
                      this.$delete(focusedElement, 'description')
                    }
                  }
                })
              }
              else if (this.focusedEdgeId) {
                var edgeIndex = this.edges.findIndex(ed => ed.id == this.focusedEdgeId)
                this.$store.commit('triggerCustomTextPrompt', {
                  message: 'Change description of edge',
                  text: this.edges[edgeIndex].description || '',
                  selectAll: true,
                  action: (description) => {
                    if (description.trim()) {
                      this.$set(this.edges[edgeIndex], 'description', description)
                    }
                    else {
                      this.$delete(this.edges[edgeIndex], 'description')
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
              }
              for (let [color, number] of Object.entries(colors)) {
                items.push({
                  label: color,
                  // lucideIcon: 'Palette',
                  dotIcon: true,
                  iconColor: 'rgb('+getComputedStyle(this.$refs.canvasWrapper).getPropertyValue(`--canvas-color-${number}-rgb`)+')',
                  action: () => {
                    var affectedIds = this.getElementIdsToBeAffected()
                    if (affectedIds.length == 0 && this.focusedEdgeId) {
                      var edgeIndex = this.edges.findIndex(ed => ed.id == this.focusedEdgeId)
                      if (number == 9) {
                        this.$set(this.edges[edgeIndex], 'color', '0, 0, 0')
                      }
                      else {
                        this.$set(this.edges[edgeIndex], 'color', `var(--canvas-color-${number}-rgb)`)
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
                        this.$set(this.canvasElements[elementIndex], 'color', `var(--canvas-color-${number}-rgb)`)
                      }
                    }
                  },
                })
              }
              items = items.concat([
                {role: 'separator'},
                {
                  label: 'Black',
                  action: () => {
                    var affectedIds = this.getElementIdsToBeAffected()
                    if (affectedIds.length == 0 && this.focusedEdgeId) {
                      var edgeIndex = this.edges.findIndex(ed => ed.id == this.focusedEdgeId)
                      this.$set(this.edges[edgeIndex], 'color', '0, 0, 0')
                      return
                    }
                    for (let id of affectedIds) {
                      var elementIndex = this.canvasElements.findIndex(e => e.id == id)
                      var focusedElement = this.canvasElements[elementIndex]
                        focusedElement.color = '0, 0, 0'
                        this.$set(this.canvasElements[elementIndex], 'color', '0, 0, 0')
                    }
                  },
                },
                {role: 'separator'},
                {
                  label: 'Working color',
                  iconColor: `rgb(${this.hexToRgb(this.workingColor)})`,
                  dotIcon: true,
                  key: 'w',
                  action: () => {
                    var affectedIds = this.getElementIdsToBeAffected()
                    if (affectedIds.length == 0 && this.focusedEdgeId) {
                      var edgeIndex = this.edges.findIndex(ed => ed.id == this.focusedEdgeId)
                      this.$set(this.edges[edgeIndex], 'color', this.hexToRgb(this.workingColor).join(', '))
                      return
                    }
                    for (let id of affectedIds) {
                      var elementIndex = this.canvasElements.findIndex(e => e.id == id)
                      var focusedElement = this.canvasElements[elementIndex]
                        focusedElement.color = '0, 0, 0'
                        this.$set(this.canvasElements[elementIndex], 'color', this.hexToRgb(this.workingColor).join(', '))
                    }
                  },
                },
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
                        if (/\d{1,3},\s?\d{1,3},\s?\d{1,3}/.test(color) || /var\(--.+\)/.test(color)) {
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
              if (this.keybufferCount) {
                let focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
                this.$set(this.canvasElements[focusedElementIndex], 'rotation', this.keybufferCount || 0)
              }
              else {
                this.setMode('rotate')
              }
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
                        return {returnFocus: false}
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
                        return {returnFocus: false}
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
                        return {returnFocus: false}
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
                        return {returnFocus: false}
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
                        return {returnFocus: false}
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
                        return {returnFocus: false}
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
                        return {returnFocus: false}
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
                      label: 'Transparent Backdrop',
                      className: 'transparentBackdrop',
                    },
                    {
                      label: 'Opaque Background',
                      className: 'opaqueBackground',
                    },
                    {
                      label: 'Center Headings',
                      className: 'centerHeadings',
                    },
                    {
                      label: 'Center Everything',
                      className: 'centerEverything',
                    },
                    {
                      label: 'Pixel Art',
                      className: 'pixelArt',
                    },
                    {
                      label: 'Candybars Text',
                      className: 'candybarsText',
                    },
                    {
                      label: 'Shortcut',
                      className: 'shortcut',
                    },
                    {
                      label: 'Tasklist',
                      className: 'tasklist',
                    },
                    {
                      label: 'Black on White',
                      className: 'blackOnWhite',
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
                    options: {hintMode: false, searchMode: true},
                  })
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "C")
            {
              var focusedElementIndex = this.canvasElements.findIndex(e => e.id == this.focusedElementId)
              if (focusedElementIndex > -1) {
                var focusedElement = this.canvasElements[focusedElementIndex]
                var focusedElementItem = this.$refs.elementItems?.find(e => e.isFocused)
                var items = [
                  {
                    label: '...to Note',
                    key: 'n',
                    visible: (focusedElement.type == 'markdown'),
                    action: () => {
                      var $this = this
                      var text = focusedElement.text || ''
                      var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
                      var items = stacks.map(s => {
                        return {
                          label: s.relativePath,
                          lucideIcon: 'Layers',
                          action:() => {
                            let notePath = s.sendText(text, `${moment(focusedElement.creationDate).format('YYYY-MM-DD HH,mm,ss')}.md`)
                            let note = $this.$store.state.currentNoteCollection.getNoteByPath(notePath)
                            $this.$set($this.canvasElements[focusedElementIndex], 'path', note.relativePath)
                            $this.$set($this.canvasElements[focusedElementIndex], 'type', 'note')
                            $this.$delete(this.canvasElements[focusedElementIndex], 'text')
                            $this.note.addLink(note.relativePath, ['canvas-element'])
                          }
                        }
                      })
                      var filter = function (context) {
                        var $items = context.itemsWithIds
                        var itemsFiltered = $items.filter(item => {
                          return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
                        })
                        return itemsFiltered
                      }
                      this.$store.commit('triggerCustomSelectList', {items, filter})
                      return {returnFocus: false}
                    },
                  },
                  {
                    label: '...to Markdown Card',
                    key: 'm',
                    visible: (focusedElement.type == 'note'),
                    action: () => {
                      let note = this.$store.state.currentNoteCollection.getNoteByPath(focusedElement.path)
                      this.$set(this.canvasElements[focusedElementIndex], 'text', note.content)
                      if (!(this.canvasElements.filter(e => e.path == focusedElement.path).length > 1)) {
                        this.note.removeLink(focusedElement.path)
                      }
                      this.$set(this.canvasElements[focusedElementIndex], 'type', 'markdown')
                      this.$delete(this.canvasElements[focusedElementIndex], 'path')
                      return {returnFocus: true}
                    },
                  },
                  {
                    label: '...to Image',
                    key: 'i',
                    visible: (focusedElement.type == 'file' && focusedElementItem.fileInfo.mimeType?.split('/')[0] == 'image'),
                    action: () => {
                      let url = `localfile://${focusedElement.path}`
                      this.$set(this.canvasElements[focusedElementIndex], 'src', url)
                      var img = new Image()
                      img.onload = () => {
                        let width = img.naturalWidth
                        let height = img.naturalHeight
                        this.$set(this.canvasElements[focusedElementIndex], 'width', width)
                        this.$set(this.canvasElements[focusedElementIndex], 'height', Math.round(height * 1.013)) // I know this is weird but needed...
                      }
                      img.src = url
                      this.$set(this.canvasElements[focusedElementIndex], 'type', 'image')
                      this.$delete(this.canvasElements[focusedElementIndex], 'path')
                      return {returnFocus: true}
                    },
                  },
                  {
                    label: '...merge enclosed freehands',
                    key: 'm',
                    visible: (focusedElement.type == 'container'),
                    action: () => {
                      let con = focusedElement
                      let freehandElements = this.getElementsFullyEnclosed({ x: con.x, y: con.y, width: con.width, height: con.height }).filter(e => e.type == 'freehand')
                      let svgData = { paths: []}
                      for (let e of freehandElements) {
                        let offsetX = e.x - con.x
                        let offsetY = e.y - con.y
                        svgData.paths.push({
                          d: e.svgData.paths[0].d,
                          transform: `translate(${offsetX} ${offsetY})`,
                        })
                      }
                      let newElement = this.addNewElement({
                        type: 'freehand',
                        x: con.x,
                        y: con.y,
                        width: con.width,
                        height: con.height,
                        color: this.hexToRgb(this.workingColor),
                        svgData: {
                          ...svgData,
                          viewBox: `0 0 ${con.width} ${con.height}`,
                        },
                      })
                      if (newElement) {
                        this.focusedElementId = newElement.id
                      }
                      // console.log(freehandElements.map(e => e.svgData.paths))
                      return {returnFocus: true}
                    },
                  },
                ]
                this.$store.commit('triggerCustomPopoverList', {
                  message: 'Convert...',
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
              this.centerOnElement()
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "zf")
            {
              // Zoom to fit focused / selected element(s)
              var affectedElements = this.getElementsToBeAffected()
              if (affectedElements.length > 0) {
                let boundingRect = this.getBoundingRectCoveringGivenElements(affectedElements)
                this.zoomToFitBoundingRect(boundingRect)
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "zt")
            {
              // Center on focused element with focused element's top at top of view
              var focusedElement= this.canvasElements.find(e => e.id == this.focusedElementId)
              if (focusedElement) {
                let {x, y, width, height} = focusedElement
                let canvasWidth = this.$refs.canvasWrapper.clientWidth
                let canvasHeight = this.$refs.canvasWrapper.clientHeight
                let newCenterX = x + (width/2)
                let newCenterY = y + (height/2)
                let newCanvasX = (-newCenterX * this.scale) + canvasWidth  / 2
                let newCanvasY = (-y + 5) * this.scale
                // this.canvasMatrix.e = newCanvasX
                // this.canvasMatrix.f = newCanvasY
                this.flyTo({
                  x: newCanvasX,
                  y: newCanvasY,
                })
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "qx")
            {
              // Grow height of element until there is no more overflow (scrollbar)
              var focusedElementItem = this.getFocusedElementItem()
              if (focusedElementItem) {
                focusedElementItem.growDownUntilNoOverflow()
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "qg")
            {
              // Grow height and width of element until there is no more overflow (scrollbar)
              var focusedElementItem = this.getFocusedElementItem()
              if (focusedElementItem) {
                focusedElementItem.growUntilNoOverflow()
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "zb")
            {
              // Center on focused element with focused element's bottom at bottom of view
              var focusedElement= this.canvasElements.find(e => e.id == this.focusedElementId)
              if (focusedElement) {
                let {x, y, width, height} = focusedElement
                let canvasWidth = this.$refs.canvasWrapper.clientWidth
                let canvasHeight = this.$refs.canvasWrapper.clientHeight
                let newCenterX = x + (width/2)
                let newCenterY = y + (height/2)
                let newCanvasX = (-newCenterX * this.scale) + canvasWidth  / 2
                let newCanvasY = ((-y - height - 10) * this.scale) + canvasHeight
                // this.canvasMatrix.e = newCanvasX
                // this.canvasMatrix.f = newCanvasY
                this.flyTo({
                  x: newCanvasX,
                  y: newCanvasY,
                })
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
              }
              this.handleMoveElements()
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "x")
            {
              this.constrainMoveToY = false
              this.constrainMoveToX = !this.constrainMoveToX
              for (let id in this.moveOrigins) {
                if (id == 'cursor') continue
                let index = this.canvasElements.findIndex(el => el.id == id)
                if (index < -1) continue
                this.canvasElements[index].y = this.moveOrigins[id][1]
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "y")
            {
              this.constrainMoveToX = false
              this.constrainMoveToY = !this.constrainMoveToY
              for (let id in this.moveOrigins) {
                if (id == 'cursor') continue
                let index = this.canvasElements.findIndex(el => el.id == id)
                if (index < -1) continue
                this.canvasElements[index].x = this.moveOrigins[id][0]
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "zz")
            {
              let affectedElements = this.getElementsToBeAffected()
              let centerOfElements = this.getBoundingRectCoveringGivenElements(affectedElements).center
              this.moveOrigins.cursor = centerOfElements
              this.handleMoveElements()
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
          else if (this.mode == 'brush') {
            if (this.keybuffer == "r")
            {
              let newRadius = this.keybufferCount ?? 40
              this.brushRadius = newRadius
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
          title: `${this.unsavedChanges ? '*' : ''}${this.title || 'Canvas Page'}`,
          thumbnail: this.canvasObj.thumbnail || null,
        }
        return routeTabData
      }
    },
    computedTransformStyle() {
      return `transform: ${tm.toCSS(this.canvasMatrix)}; transform-origin: top left;`
    },
    canvasWrapperStyle() {
      if (this.canvasObj.style) {
        if (this.canvasObj.style.background) {
          var background = this.canvasObj.style.background
        }
      }
      return {
        background,
        '--foreground-primary': this.canvasObj.style?.primaryForegroundColor,
        '--foreground-primary-rgb': this.canvasObj.style?.primaryForegroundColor ? this.hexToRgb(this.canvasObj.style?.primaryForegroundColor) : null,
        '--background-primary': this.canvasObj.style?.primaryBackgroundColor,
        '--background-primary-rgb': this.canvasObj.style?.primaryBackgroundColor ? this.hexToRgb(this.canvasObj.style?.primaryBackgroundColor) : null,
        '--canvas-color-1': this.canvasObj.style?.canvasColor1,
        '--canvas-color-1-rgb': this.canvasObj.style?.canvasColor1 ? this.hexToRgb(this.canvasObj.style?.canvasColor1) : null,
        '--canvas-color-2': this.canvasObj.style?.canvasColor2,
        '--canvas-color-2-rgb': this.canvasObj.style?.canvasColor2 ? this.hexToRgb(this.canvasObj.style?.canvasColor2) : null,
        '--canvas-color-3': this.canvasObj.style?.canvasColor3,
        '--canvas-color-3-rgb': this.canvasObj.style?.canvasColor3 ? this.hexToRgb(this.canvasObj.style?.canvasColor3) : null,
        '--canvas-color-4': this.canvasObj.style?.canvasColor4,
        '--canvas-color-4-rgb': this.canvasObj.style?.canvasColor4 ? this.hexToRgb(this.canvasObj.style?.canvasColor4) : null,
        '--canvas-color-5': this.canvasObj.style?.canvasColor5,
        '--canvas-color-5-rgb': this.canvasObj.style?.canvasColor5 ? this.hexToRgb(this.canvasObj.style?.canvasColor5) : null,
        '--canvas-color-6': this.canvasObj.style?.canvasColor6,
        '--canvas-color-6-rgb': this.canvasObj.style?.canvasColor6 ? this.hexToRgb(this.canvasObj.style?.canvasColor6) : null,
        '--canvas-color-7': this.canvasObj.style?.canvasColor7,
        '--canvas-color-7-rgb': this.canvasObj.style?.canvasColor7 ? this.hexToRgb(this.canvasObj.style?.canvasColor7) : null,
        '--canvas-color-8': this.canvasObj.style?.canvasColor8,
        '--canvas-color-8-rgb': this.canvasObj.style?.canvasColor8 ? this.hexToRgb(this.canvasObj.style?.canvasColor8) : null,
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
        let toElementCenterX = toElement.x + toElement.width / 2
        let toElementCenterY = toElement.y + toElement.height / 2
        let toElementMeasurements = {
          top: this.rotatePoint(toElementCenterX, toElement.y - toElementOffset, toElementCenterX, toElementCenterY, toElement.rotation ?? 0),
          bottom: this.rotatePoint(toElementCenterX, toElement.y + toElement.height + toElementOffset, toElementCenterX, toElementCenterY, toElement.rotation ?? 0),
          right: this.rotatePoint(toElement.x + toElement.width + toElementOffset, toElementCenterY, toElementCenterX, toElementCenterY, toElement.rotation ?? 0),
          left: this.rotatePoint(toElement.x - toElementOffset, toElementCenterY, toElementCenterX, toElementCenterY, toElement.rotation ?? 0),
        }
        let fromElementCenterX = fromElement.x + fromElement.width / 2
        let fromElementCenterY = fromElement.y + fromElement.height / 2
        let fromElementMeasurements = {
          top: this.rotatePoint(fromElementCenterX, fromElement.y - fromElementOffset, fromElementCenterX, fromElementCenterY, fromElement.rotation ?? 0),
          bottom: this.rotatePoint(fromElementCenterX, fromElement.y + fromElement.height + fromElementOffset, fromElementCenterX, fromElementCenterY, fromElement.rotation ?? 0),
          right: this.rotatePoint(fromElement.x + fromElement.width + fromElementOffset, fromElementCenterY, fromElementCenterX, fromElementCenterY, fromElement.rotation ?? 0),
          left: this.rotatePoint(fromElement.x - fromElementOffset, fromElementCenterY, fromElementCenterX, fromElementCenterY, fromElement.rotation ?? 0),
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
        if (ed.edgeConnectionType == 'straight') {
          ed.pathD = `M ${fromElementMeasurements[ed.fromSide].x}, ${fromElementMeasurements[ed.fromSide].y} L ${toElementMeasurements[ed.toSide].x}, ${toElementMeasurements[ed.toSide].y}`
        }
        else if (ed.edgeConnectionType == 'angular') {
          ed.pathD = `M ${fromElementMeasurements[ed.fromSide].x}, ${fromElementMeasurements[ed.fromSide].y} L ${controlPointFrom.x}, ${controlPointFrom.y} L ${controlPointTo.x}, ${controlPointTo.y} L ${toElementMeasurements[ed.toSide].x}, ${toElementMeasurements[ed.toSide].y}`
        }
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
        this.autoSavePosition()
      },
      deep: true,
    },
    canvasElements: {
      handler() {
        this.calculateVisibleElements()
        this.unsavedChanges = true
      },
      deep: true,
    },
    visibleElements: {
      handler() {
        if (this.mode == 'edge-create') {
          this.calculateEdgeCreateHelpers()
        }
      },
      deep: false,
    },
    brushRadius: {
      handler() {
        if (this.mode == 'brush') {
          let helperElementIndex = this.helperElements.findIndex(el => el.type == 'brush')
          this.helperElements[helperElementIndex].width = this.brushRadius * 2
          this.helperElements[helperElementIndex].height = this.brushRadius * 2
          let [x, y] = this.toWorldPos(this.mouseposx, this.mouseposy)
          this.helperElements[helperElementIndex].x = x - this.brushRadius
          this.helperElements[helperElementIndex].y = y - this.brushRadius
        }
      },
      deep: false,
    },
    activatedEdgeInitiators: {
      handler(newValue, oldValue) {
        if (newValue.length == 2) {
          let fromElement = this.canvasElements.find(e => e.id == newValue[0].elementId)
          this.edges.push({
            id: uuidv4(),
            fromElement: newValue[0].elementId,
            fromSide: newValue[0].side,
            toElement: newValue[1].elementId,
            toSide: newValue[1].side,
            color: fromElement?.color || undefined,
            ...((this.edgeArrowMode == 'from' || this.edgeArrowMode == 'bidirectional') && {fromEnd: 'arrow'}),
            ...((this.edgeArrowMode == 'to' || this.edgeArrowMode == 'bidirectional') && {toEnd: 'arrow'}),
          })
          this.activatedEdgeInitiators = []
          this.calculateEdgeCreateHelpers()
        }
      },
      deep: false,
    },
    settingsColors: {
      handler(newSettingsColors, oldSettingsColors) {
        if (newSettingsColors.primaryBackgroundColor) {
          this.$set(this.canvasObj.style, 'primaryBackgroundColor', newSettingsColors.primaryBackgroundColor)
        }
        if (newSettingsColors.primaryForegroundColor) {
          this.$set(this.canvasObj.style, 'primaryForegroundColor', newSettingsColors.primaryForegroundColor)
        }
        if (newSettingsColors.canvasColor1) {
          this.$set(this.canvasObj.style, 'canvasColor1', newSettingsColors.canvasColor1)
        }
        if (newSettingsColors.canvasColor2) {
          this.$set(this.canvasObj.style, 'canvasColor2', newSettingsColors.canvasColor2)
        }
        if (newSettingsColors.canvasColor3) {
          this.$set(this.canvasObj.style, 'canvasColor3', newSettingsColors.canvasColor3)
        }
        if (newSettingsColors.canvasColor4) {
          this.$set(this.canvasObj.style, 'canvasColor4', newSettingsColors.canvasColor4)
        }
        if (newSettingsColors.canvasColor5) {
          this.$set(this.canvasObj.style, 'canvasColor5', newSettingsColors.canvasColor5)
        }
        if (newSettingsColors.canvasColor6) {
          this.$set(this.canvasObj.style, 'canvasColor6', newSettingsColors.canvasColor6)
        }
        if (newSettingsColors.canvasColor7) {
          this.$set(this.canvasObj.style, 'canvasColor7', newSettingsColors.canvasColor7)
        }
        if (newSettingsColors.canvasColor8) {
          this.$set(this.canvasObj.style, 'canvasColor8', newSettingsColors.canvasColor8)
        }
      },
      deep: true,
    },
    feederHideAddedNotes: {
      handler() {
        if (this.feederSource?.feederFunc) {
          this.feederSource.feederFunc()
        }
      },
      deep: false,
    }
  },
  mounted() {
    this.canvasObj = JSON.parse(this.note.content)
    this.canvasElements = this.canvasObj.elements
    this.savedViews = this.canvasObj.savedViews || []
    this.edges = this.canvasObj.edges || []
    if (this.canvasObj.style) {
      for (let [key, value] of Object.entries(this.canvasObj.style)) {
        this.$set(this.settingsColors, key, value)
      }
    }
    this.elasticFrame = this.canvasObj.elasticFrame ?? false
    this.isMounted = true
    this.setCanvasMatrix({
      a: this.scale, c: 0, e: this.originX,
      b: 0, d: this.scale, f: this.originY
    })
    setTimeout(() => {
      this.calculateVisibleElements()
      this.$refs.canvasWrapper.focus()
      this.unsavedChanges = false
      for (let n = 1; n < 9; n++) {
        let c = getComputedStyle(this.$refs.canvasWrapper).getPropertyValue(`--canvas-color-${n}`)
        this.$set(this.settingsColors, `canvasColor${n}`, c?.trim())
      }
      if (this.canvasObj.style) {
        for (let [key, value] of Object.entries(this.canvasObj.style)) {
          this.$set(this.settingsColors, key, value)
        }
      }
      let startAtView = this.savedViews.find(v => v.key == 'startAt')
      if (startAtView || this.canvasObj.startAt) {
        let startAt = startAtView ?? this.canvasObj.startAt
        this.setScale(startAt.scale ?? this.scale)
        this.canvasMatrix.e = startAt.centerX - ((this.$refs.canvasWrapper.clientWidth  / 2 ) / this.canvasMatrix.a)
        this.canvasMatrix.f = startAt.centerY - ((this.$refs.canvasWrapper.clientHeight / 2 ) / this.canvasMatrix.d)
        this.focusedElementId = startAt.focusedElementId ?? this.focusedElementId
      }
      this.autoSavePosition()
    }, 50)
    bus.$on('goToCanvasMark', (opts) => {
      if (!this._inactive && opts.mark) {
        let i = this.savedViews.findIndex(v => v.key == opts.mark)
        if (i > -1) {
          let markObj = this.savedViews[i]
          this.flyTo({
            x: markObj.centerX - ((this.$refs.canvasWrapper.clientWidth / 2) / this.canvasMatrix.a),
            y: markObj.centerY - ((this.$refs.canvasWrapper.clientHeight / 2) / this.canvasMatrix.d),
            scale: markObj.scale ?? this.scale,
          })
          this.focusedElementId = markObj.focusedElementId ?? this.focusedElementId
        }
      }
    })
  },
  unmounted() {
    // this.saveCanvasPosition()
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
    this.saveCanvasPosition()
  },
  beforePageLeave(tab, type) {
    this.saveCanvasPosition()
  }
}
</script>

<style lang='scss'>
.canvasPage {
  position: relative;
  --focus-color: cornflowerblue;
  --background-primary: #ebebeb;
  --foreground-primary: #000000;
  --canvas-background: var(--background-primary);
  --canvas-color-1: #c0c0c0; // Grey
  --canvas-color-1-rgb: 192, 192, 192; // Grey
  --canvas-color-2: #e93147; // Red
  --canvas-color-2-rgb: 233, 49, 71; // Red
  --canvas-color-3: #08b94e; // Green
  --canvas-color-3-rgb: 8, 185, 78; // Green
  --canvas-color-4: #e0ac00; // Yellow
  --canvas-color-4-rgb: 224, 172, 0; // Yellow
  --canvas-color-5: #00bfbc; // Cyan
  --canvas-color-5-rgb: 0, 191, 188; // Cyan
  --canvas-color-6: #086ddd; // Blue
  --canvas-color-6-rgb: 8, 109, 221; // Blue
  --canvas-color-7: #7852ee; // Purple
  --canvas-color-7-rgb: 120, 82, 238; // Purple
  --canvas-color-8: #d53984; // Pink
  --canvas-color-8-rgb: 213, 57, 132; // Pink
  --canvas-color-rgb: var(--canvas-color-1-rgb);
  --canvas-color: var(--canvas-color-1);
  .popoverEditor {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: flex !important;
    align-items: center;
    justify-content: center;
    flex-flow: column;
    background: radial-gradient(#ffffff00, #000000ba);
    .vue-codemirror {
      width: 50%;
      opacity: 0.97;
    }
  }
  .settings-panel {
    position: absolute;
    top: 0;
    right: 10px;
    background: #c7c7c7d9;
    height: 93%;
    border-radius: 5px;
    padding: 10px;
    margin: 10px;
    backdrop-filter: blur(3px);
    border: 2px solid #5c6768;
    label, input{
      display:flex;
      flex-direction:column;
    }
    label {
      font-size: 12px;
      color: grey;
    }
    input {
      font-size: 14px;
    }
    input[type=color]{
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 30px;
      background: none;
    }
    input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    input[type="color"]::-webkit-color-swatch {
      border: none; /*change color of the swatch border here*/
      border-radius: 30px;
    }
  }
  .note-feeder {
    position: absolute;
    top: 0;
    right: 10px;
    background: #c7c7c7d9;
    height: 93%;
    border-radius: 5px;
    padding: 10px;
    margin: 10px;
    backdrop-filter: blur(3px);
    border: 2px solid #5c6768;
    overflow: auto;
    .feeder-source {
      color: white;
      background: black;
      border-radius: 5px;
      font-family: 'Helvetica';
      padding: 4px;
      display: inline-flex;
      gap: 3px;
    }
    .note {
      border: 1px solid #bbbbbb;
      background: #d3d3d3;
      margin-top: 2px;
      padding: 2px;
      border-radius: 5px;
      display: flex;
      cursor: pointer;
      user-select: none;
    }
  }
  .minimap {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: #e3e3e3c2;
    backdrop-filter: blur(5px);
    border-radius: 5px;
    box-shadow: 0px 0px 10px #545454;
  }
}
.canvas-wrapper {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: var(--canvas-background);
  color: var(--foreground-primary);
  overflow: hidden;
  contain: strict;
  touch-action: none;
  user-select: none;
  outline: none;
}
.canvas {
  .canvas-helper-element {
    position: absolute;
    &.drawnStroke {
      svg {
        overflow: visible;
      }
    }
  }
  .selectRect {
    border: 1px dashed black;
    background: rgba(256, 256, 256, 0.15);
    z-index: 100;
  }
  .brush {
    border: 1px dashed black;
    background: rgba(256, 256, 256, 0.15);
    z-index: 100;
    border-radius: 50%;
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
        stroke: var(--foreground-primary);
        fill: none;
      }
      .edge-outline {
        stroke-width: 15px;
        fill: none;
      }
      marker {
        fill: var(--foreground-primary);
      }
      .edge-label {
        fill: var(--foreground-primary);
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
.panLockXAxis, .panLockYAxis {
  user-select: none;
  &.locked {
    color: #ff6e6e;
  }
}
</style>
