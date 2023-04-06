<template>
  <div
  class="canvas-element"
  :style="{width: `${canvasElementObj.width}px`, height: `${canvasElementObj.height}px`, transform: `translate(${canvasElementObj.x}px, ${canvasElementObj.y}px) rotate(${canvasElementObj.rotation || 0}deg)`, '--canvas-color': canvasElementObj.color, 'z-index': zIndex}"
  @click="setFocusedElement(canvasElementObj.id)"
  :class="{focused: isFocused, selected: isSelected}"
  ref="canvasElement"
  >
    <div class="canvas-element-container" :data-element-type="canvasElementObj.type" :data-element-id="canvasElementObj.id" :class="additionalCssClasses" :style="{'z-index': zIndex}">
      <div class="is-selected-overlay" v-if="isSelected"></div>
      <div class="content markdown" v-if="canvasElementObj.fitText && canvasElementObj.type == 'markdown' && !editing">
        <div>
          <div class="fitText" ref="content" v-html="renderedContent"></div>
        </div>
      </div>
      <div class="content markdown" v-html="renderedContent" v-else-if="canvasElementObj.type == 'markdown' && !editing" ref="content"></div>
      <div class="noteLink" v-if="canvasElementObj.type == 'note' && !editing" @click="$router.push(`/note/${encodedPath}`)">
        <Icon name="FileText"/>
      </div>
      <div class="content markdown note" v-html="renderedContent" v-if="canvasElementObj.type == 'note' && !editing" ref="content"></div>
      <div class="content image" v-else-if="canvasElementObj.type == 'image'">
        <img :src="canvasElementObj.src" :style="imageStyle"></img>
      </div>
      <div class="content iframe" v-else-if="canvasElementObj.type == 'iframe'">
        <iframe
        sandbox="allow-forms allow-scripts"
        :src="canvasElementObj.url">
      </iframe>
      </div>
      <div class="content lucideIcon" :class="{fitText: canvasElementObj.fitText}" v-else-if="canvasElementObj.type == 'lucideIcon'" ref="content">
        <Icon :name="canvasElementObj.lucideIcon"/>
      </div>
      <div class="content file" v-else-if="canvasElementObj.type == 'file'">
        <div>{{canvasElementObj.path}}</div>
        <img class="thumbnail" :src="thumbnail"></img>
      </div>
      <div class="editor" v-if="editing"
      @keydown.meta.83="saveElement"
      @keydown.ctrl.67="cancelEditing"
      >
        <codemirror v-model="editorContent" :options="cmOptions" ref="cmEditor" @ready="onCmReady"/>
      </div>
      <div class="crop-line crop-top-line" @mousedown="startResize('top')"></div>
      <div class="crop-line crop-right-line" @mousedown="startResize('right')"></div>
      <div class="crop-line crop-bottom-line" @mousedown="startResize('bottom')"></div>
      <div class="crop-line crop-left-line" @mousedown="startResize('left')"></div>

      <div class="crop-corner crop-top-left-corner" @mousedown="startResize('top-left')"></div>
      <div class="crop-corner crop-top-right-corner" @mousedown="startResize('top-right')"></div>
      <div class="crop-corner crop-bottom-right-corner" @mousedown="startResize('bottom-right')"></div>
      <div class="crop-corner crop-bottom-left-corner" @mousedown="startResize('bottom-left')"></div>
    </div>
  </div>
</template>

<script>
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
  import fitty from 'fitty'


  export default {
    name: 'canvas-element',
    props: {
      'canvasElementObj': Object,
      'options': Object,
      'isFocused': Boolean,
      'isSelected': Boolean,
      'canvasBus': Object,
      'scale': Number,
      'canvasMatrix': Object,
    },
    components: {
      codemirror,
      Icon,
    },
    data: function () {
      return {
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
        beingResized: false,
        resizeLocation: '',
        editorContent: '',
        noteRefreshKey: 0,
        $_fitty: null,
        thumbnail: null,
        bus: bus,
        computedOptions: {
          // Default options here
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
      renderedContent() {
        if (this.canvasElementObj.type == "markdown") {
          return this.md.render(this.canvasElementObj.text)
        }
        else if (this.canvasElementObj.type == "note") {
          return this.md.render(this.note.content)
        }
      },
      note() {
        if (this.canvasElementObj.type == "note") {
          this.noteRefreshKey // this is just to be able to trigger a recompute
          return this.$store.state.currentNoteCollection.getNoteByPath(
            this.canvasElementObj.path
          )
        }
      },
      encodedPath() {
        if (this.canvasElementObj.type == "note") {
          return this.note.relativePath.split('/').map(c => encodeURIComponent(c)).join('/')
        }
      },
      imageStyle() {
        var imageFilters = this.canvasElementObj.imageFilters
        if (!imageFilters) return {}
        var style = {}
        var filter = ''
        var transform = ''
        if ('grayscale' in imageFilters) {
          filter = filter + ` grayscale(${imageFilters.grayscale})`
        }
        if ('blur' in imageFilters) {
          filter = filter + ` blur(${imageFilters.blur}px)`
        }
        if ('sepia' in imageFilters) {
          filter = filter + ` sepia(${imageFilters.sepia})`
        }
        if ('brightness' in imageFilters) {
          filter = filter + ` brightness(${imageFilters.brightness})`
        }
        if ('contrast' in imageFilters) {
          filter = filter + ` contrast(${imageFilters.contrast})`
        }
        if ('saturate' in imageFilters) {
          filter = filter + ` saturate(${imageFilters.saturate})`
        }
        if ('invert' in imageFilters) {
          filter = filter + ` invert(${imageFilters.invert})`
        }
        if ('flipX' in imageFilters) {
          transform = transform + ' scaleX(-1)'
        }
        if ('flipY' in imageFilters) {
          transform = transform + ' scaleY(-1)'
        }
        filter = filter.trim()
        transform = transform.trim()
        return {
          filter,
          transform,
        }
      },
      additionalCssClasses() {
        var additionalCssClasses = []
        if (this.canvasElementObj.cssClasses) {
          for (let c of this.canvasElementObj.cssClasses) {
            additionalCssClasses.push(`opt_${c}`)
          }
        }
        return additionalCssClasses
      },
      zIndex() {
        if (this.canvasElementObj.type == 'container') {
          return -100
        }
        else if (this.canvasElementObj.zIndex) {
          return this.canvasElementObj.zIndex
        }
        else {
          return null
        }
      },
    },
  watch: {
  },
  methods: {
    log(message) {
      console.log(message)
    },
    setOption(opt, value) {
      this.computedOptions[opt] = value
    },
    getOption(opt) {
      return this.computedOptions[opt]
    },
    setFocusedElement(canvasElementId) {
      this.$emit('setFocusedElement', canvasElementId)
    },
    editElement(event) {
      if (this.canvasElementObj.type == 'markdown' || this.canvasElementObj.type == 'note' ) {
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
    toggleSelectElement(event) {
      this.selected = !this.selected
      if (this.selected) {
        this.$emit('selectElement', this.noteObj)
      }
      else {
        this.$emit('unselectElement', this.noteObj)
      }
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    focusElement(event) {
      this.focused = true
      this.$emit('focusNote', this.noteObj, event)
    },
    saveElement(event) {
      var newCanvasElementObj = {...this.canvasElementObj}
      if (this.canvasElementObj.type == "markdown") {
        newCanvasElementObj.text = this.editorContent
      }
      else if (this.canvasElementObj.type == "note") {
        this.note.setContent(this.editorContent)
        this.noteRefreshKey++
      }
      newCanvasElementObj.modificationDate = new Date()
      this.editing = !this.editing
      this.$emit('setFocusedElement', this.canvasElementObj.id)
      this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      this.$emit('focusCanvasWrapper')
      this.$emit('setMode', 'normal')
      event.preventDefault()
      event.stopPropagation()
      if (this.canvasElementObj.fitText) {
        var $this = this
        setTimeout(() => {
          $this.$_fitty = fitty($this.$refs.content, {minSize: 12, maxSize: 512})
        }, 50)
      }
    },
    cancelEditing(event) {
      this.editing = !this.editing
      if (this.canvasElementObj.type == "markdown") {
        this.editorContent = this.canvasElementObj.text
      }
      else if (this.canvasElementObj.type == "note") {
        this.editorContent = this.note.content
      }
      this.$emit('setFocusedElement', this.canvasElementObj.id)
      this.$emit('focusCanvasWrapper')
      this.$emit('setMode', 'normal')
      event.preventDefault()
      event.stopPropagation()
    },
    onCmReady(cm) {
      // cm.setSize(null, '60vh')
    },
    growDownUntilNoOverflow() {
      var contentEl = this.$refs.content
      if (contentEl) {
        var diff = contentEl.scrollHeight - contentEl.clientHeight
        var newCanvasElementObj = {...this.canvasElementObj}
        newCanvasElementObj.height += diff
        this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      }
    },
    startResize(location) {
      this.beingResized = true
      this.resizeLocation = location
    },
    stopResize() {
      this.beingResized = false
      this.resizeLocation = ''
    },
    handleResize({event, mouseposx, mouseposy}) {
      // This is a big work in progress, still a lot of bugs and question marks
      // (x - canvasMatrix.e) / canvasMatrix.a,
      // (y - canvasMatrix.f) / canvasMatrix.d,
      const minWidth = 50
      const minHeight = 30
      var keepAspect = false
      if (this.canvasElementObj.type == 'image') keepAspect = true
      var canvasMatrix = this.canvasMatrix
      var newCanvasElementObj = {...this.canvasElementObj}
      const cx = this.canvasElementObj.x + this.canvasElementObj.width / 2
      const cy = this.canvasElementObj.y + this.canvasElementObj.height / 2
      const angleInRadian = (this.canvasElementObj.rotation || 0 ) * (Math.PI / 180) // Convert degrees to radian
      const rotate = (x, y, cx, cy, angle) => {
        angle = angle * (Math.PI / 180) // Convert degrees to radian
        return [
          (x - cx) * Math.cos(angle) - (y - cy) * Math.sin(angle) + cx,
          (x - cx) * Math.sin(angle) + (y - cy) * Math.cos(angle) + cy,
        ];
      }
      /**
      * Conserve aspect ratio of the original region. Useful when shrinking/enlarging
      * images to fit into a certain area.
      * https://stackoverflow.com/a/14731922
      *
      * @param {Number} srcWidth width of source image
      * @param {Number} srcHeight height of source image
      * @param {Number} maxWidth maximum available width
      * @param {Number} maxHeight maximum available height
      * @return {Object} { width, height }
      */
      const calculateAspectRatioFit = (srcWidth, srcHeight, maxWidth, maxHeight) => {
        if (maxWidth < srcWidth || maxHeight < srcHeight) {
          var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
        }
        else {
          var ratio = Math.max(maxWidth / srcWidth, maxHeight / srcHeight)
        }
        return { width: srcWidth*ratio, height: srcHeight*ratio }
      }

      if (this.resizeLocation == 'right') {
        const rotatedA = rotate(this.canvasElementObj.x, this.canvasElementObj.y, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedQ = [
          (mouseposx / canvasMatrix.a) - (canvasMatrix.e / canvasMatrix.a),
          (mouseposy / canvasMatrix.d) - (canvasMatrix.f / canvasMatrix.a),
        ]
        const unrotatedQ = rotate(rotatedQ[0], rotatedQ[1], cx, cy, -(this.canvasElementObj.rotation || 0))
        const heightDifference = (this.canvasElementObj.y + this.canvasElementObj.height) - unrotatedQ[1]
        const rotatedC = [
          rotatedQ[0] - (Math.sin(angleInRadian) * heightDifference),
          rotatedQ[1] + (Math.cos(angleInRadian) * heightDifference),
        ]
        const newCenter = [
          (rotatedA[0] + rotatedC[0]) / 2,
          (rotatedA[1] + rotatedC[1]) / 2,
        ]
        const newA = rotate(rotatedA[0], rotatedA[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        const newC = rotate(rotatedC[0], rotatedC[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newWidth = newC[0] - newA[0]
        if (newWidth < minWidth) return
        newCanvasElementObj.width = newWidth
        if (keepAspect) {
          // TODO: with rotation the image starts wandering, need to fix this at some point...
          let {width, height} = calculateAspectRatioFit(this.canvasElementObj.width, this.canvasElementObj.height, newWidth, this.canvasElementObj.height)
          newCanvasElementObj.width = width
          newCanvasElementObj.height = height
        }
        newCanvasElementObj.x = newA[0]
        newCanvasElementObj.y = newA[1]
        this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      }
      else if (this.resizeLocation == 'left') {
        // const rotatedA = rotate(this.canvasElementObj.x, this.canvasElementObj.y, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedQ = [
          (mouseposx / canvasMatrix.a) - (canvasMatrix.e / canvasMatrix.a),
          (mouseposy / canvasMatrix.d) - (canvasMatrix.f / canvasMatrix.a),
        ]
        const unrotatedQ = rotate(rotatedQ[0], rotatedQ[1], cx, cy, -(this.canvasElementObj.rotation || 0))
        // const heightDifference = (this.canvasElementObj.y + this.canvasElementObj.height) - unrotatedQ[1]
        const heightDifference = unrotatedQ[1] - this.canvasElementObj.y
        const rotatedC = rotate(this.canvasElementObj.x+this.canvasElementObj.width, this.canvasElementObj.y+this.canvasElementObj.height, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedA = [
          rotatedQ[0] + (Math.sin(angleInRadian) * heightDifference),
          rotatedQ[1] - (Math.cos(angleInRadian) * heightDifference),
        ]
        console.log(JSON.stringify(rotatedQ))
        console.log(`heightDifference: ${heightDifference}`)
        const newCenter = [
          (rotatedA[0] + rotatedC[0]) / 2,
          (rotatedA[1] + rotatedC[1]) / 2,
        ]
        const newA = rotate(rotatedA[0], rotatedA[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        const newC = rotate(rotatedC[0], rotatedC[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newWidth = newC[0] - newA[0]
        if (newWidth < minWidth) return
        newCanvasElementObj.width = newWidth
        if (keepAspect) {
          // TODO: with rotation the image starts wandering, need to fix this at some point...
          let {width, height} = calculateAspectRatioFit(this.canvasElementObj.width, this.canvasElementObj.height, newWidth, this.canvasElementObj.height)
          newCanvasElementObj.width = width
          newCanvasElementObj.height = height
        }
        newCanvasElementObj.x = newA[0]
        newCanvasElementObj.y = newA[1]
        console.log(`x: ${newA[0]}, y: ${newA[1]}`)
        this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      }
      else if (this.resizeLocation == 'bottom') {
        const rotatedA = rotate(this.canvasElementObj.x, this.canvasElementObj.y, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedQ = [
          (mouseposx / canvasMatrix.a) - (canvasMatrix.e / canvasMatrix.a),
          (mouseposy / canvasMatrix.d) - (canvasMatrix.f / canvasMatrix.a),
        ]
        const unrotatedQ = rotate(rotatedQ[0], rotatedQ[1], cx, cy, -(this.canvasElementObj.rotation || 0))
        const widthDifference = (this.canvasElementObj.x + this.canvasElementObj.width) - unrotatedQ[0]
        const rotatedC = [
          rotatedQ[0] + (Math.cos(angleInRadian) * widthDifference),
          rotatedQ[1] + (Math.sin(angleInRadian) * widthDifference),
        ]
        const newCenter = [
          (rotatedA[0] + rotatedC[0]) / 2,
          (rotatedA[1] + rotatedC[1]) / 2,
        ]
        const newA = rotate(rotatedA[0], rotatedA[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        const newC = rotate(rotatedC[0], rotatedC[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newHeight = newC[1] - newA[1]
        if (newHeight < minHeight) return
        newCanvasElementObj.height = newHeight
        if (keepAspect) {
          // TODO: with rotation the image starts wandering, need to fix this at some point...
          let {width, height} = calculateAspectRatioFit(this.canvasElementObj.width, this.canvasElementObj.height, this.canvasElementObj.width, newHeight)
          newCanvasElementObj.width = width
          newCanvasElementObj.height = height
        }
        newCanvasElementObj.x = newA[0]
        newCanvasElementObj.y = newA[1]
        this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      }
      else if (this.resizeLocation == 'top') {
        // const rotatedA = rotate(this.canvasElementObj.x, this.canvasElementObj.y, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedQ = [
          (mouseposx / canvasMatrix.a) - (canvasMatrix.e / canvasMatrix.a),
          (mouseposy / canvasMatrix.d) - (canvasMatrix.f / canvasMatrix.a),
        ]
        const unrotatedQ = rotate(rotatedQ[0], rotatedQ[1], cx, cy, -(this.canvasElementObj.rotation || 0))
        // const widthDifference = this.canvasElementObj.width - ((this.canvasElementObj.x + this.canvasElementObj.width) - unrotatedQ[0])
        const widthDifference = unrotatedQ[0] - this.canvasElementObj.x
        const rotatedC = rotate(this.canvasElementObj.x+this.canvasElementObj.width, this.canvasElementObj.y+this.canvasElementObj.height, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedA = [
          rotatedQ[0] - (Math.sin((360*(Math.PI/180))-angleInRadian) * widthDifference),
          rotatedQ[1] - (Math.cos((360*(Math.PI/180))-angleInRadian) * widthDifference),
        ]
        console.log(`x, y: ${this.canvasElementObj.x} ${this.canvasElementObj.y}`)
        console.log(`unrotatedQ: ${JSON.stringify(unrotatedQ)}`)
        console.log(`widthDifference: ${JSON.stringify(widthDifference)}`)
        console.log(`rotatedQ: ${JSON.stringify(rotatedQ)}`)
        console.log(`rotatedA: ${JSON.stringify(rotatedA)}`)
        const newCenter = [
          (rotatedA[0] + rotatedC[0]) / 2,
          (rotatedA[1] + rotatedC[1]) / 2,
        ]
        // const rotatedA = rotate(unrotatedA[0], unrotatedA[1], newCenter[0], newCenter[1], this.canvasElementObj.rotation || 0)
        const newA = rotate(rotatedA[0], rotatedA[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        const newC = rotate(rotatedC[0], rotatedC[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newHeight = newC[1] - newA[1]
        if (newHeight < minHeight) return
        newCanvasElementObj.height = newHeight
        if (keepAspect) {
          // TODO: with rotation the image starts wandering, need to fix this at some point...
          let {width, height} = calculateAspectRatioFit(this.canvasElementObj.width, this.canvasElementObj.height, this.canvasElementObj.width, newHeight)
          newCanvasElementObj.width = width
          newCanvasElementObj.height = height
        }
        newCanvasElementObj.x = newA[0]
        newCanvasElementObj.y = newA[1]
        this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      }
      else if (this.resizeLocation == 'bottom-right') {
        const rotatedA = rotate(this.canvasElementObj.x, this.canvasElementObj.y, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedC = [
          (mouseposx / canvasMatrix.a) - (canvasMatrix.e / canvasMatrix.a),
          (mouseposy / canvasMatrix.d) - (canvasMatrix.f / canvasMatrix.a),
        ]
        var newCenter = [
          (rotatedA[0] + rotatedC[0]) / 2,
          (rotatedA[1] + rotatedC[1]) / 2,
        ]
        var newA = rotate(rotatedA[0], rotatedA[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newC = rotate(rotatedC[0], rotatedC[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newWidth = newC[0] - newA[0]
        var newHeight = newC[1] - newA[1]
        // TODO: if newWidth or newHeight is below minWidth or minHeight, set to min and recalculate x and y
        // TODO: works kinda but the origin x,y is wandering
        if (newWidth < minWidth || newHeight < minHeight) {
          if (newWidth < minWidth) newWidth = minWidth
          if (newHeight < minHeight) newHeight = minHeight
          newCenter = [
            (this.canvasElementObj.x + newWidth) / 2,
            (this.canvasElementObj.y + newHeight) / 2,
          ]
          newA = rotate(rotatedA[0], rotatedA[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        }
        newCanvasElementObj.width = newWidth
        newCanvasElementObj.height = newHeight
        if (keepAspect) {
          // TODO: with rotation the image starts wandering, need to fix this at some point...
          let {width, height} = calculateAspectRatioFit(this.canvasElementObj.width, this.canvasElementObj.height, newWidth, this.canvasElementObj.height)
          newCanvasElementObj.width = width
          newCanvasElementObj.height = height
        }
        newCanvasElementObj.x = newA[0]
        newCanvasElementObj.y = newA[1]
        this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      }
      else if (this.resizeLocation == 'bottom-left') {
        const rotatedD = rotate(this.canvasElementObj.x+this.canvasElementObj.width, this.canvasElementObj.y, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedB = [
          (mouseposx / canvasMatrix.a) - (canvasMatrix.e / canvasMatrix.a),
          (mouseposy / canvasMatrix.d) - (canvasMatrix.f / canvasMatrix.a),
        ]
        const unrotatedB = rotate(rotatedB[0], rotatedB[1], cx, cy, -(this.canvasElementObj.rotation || 0))
        var newCenter = [
          (rotatedB[0] + rotatedD[0]) / 2,
          (rotatedB[1] + rotatedD[1]) / 2,
        ]
        var newB = rotate(rotatedB[0], rotatedB[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newD = rotate(rotatedD[0], rotatedD[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newWidth = newD[0] - newB[0]
        var newHeight = newB[1] - newD[1]
        var newA = [
          newD[0] - newWidth,
          newB[1] - newHeight,
        ]
        // TODO: if newWidth or newHeight is below minWidth or minHeight, set to min and recalculate x and y
        // TODO: works kinda but the origin x,y is wandering
        if (newWidth < minWidth || newHeight < minHeight) {
          if (newWidth < minWidth) newWidth = minWidth
          if (newHeight < minHeight) newHeight = minHeight
          newCenter = [
            (this.canvasElementObj.x + newWidth) / 2,
            (this.canvasElementObj.y + newHeight) / 2,
          ]
          newA = rotate(rotatedA[0], rotatedA[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        }
        newCanvasElementObj.width = newWidth
        newCanvasElementObj.height = newHeight
        if (keepAspect) {
          // TODO: with rotation the image starts wandering, need to fix this at some point...
          let {width, height} = calculateAspectRatioFit(this.canvasElementObj.width, this.canvasElementObj.height, newWidth, this.canvasElementObj.height)
          newCanvasElementObj.width = width
          newCanvasElementObj.height = height
        }
        newCanvasElementObj.x = newA[0]
        newCanvasElementObj.y = newA[1]
        this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      }
      else if (this.resizeLocation == 'top-left') {
        const rotatedC = rotate(this.canvasElementObj.x+this.canvasElementObj.width, this.canvasElementObj.y+this.canvasElementObj.height, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedA = [
          (mouseposx / canvasMatrix.a) - (canvasMatrix.e / canvasMatrix.a),
          (mouseposy / canvasMatrix.d) - (canvasMatrix.f / canvasMatrix.a),
        ]
        var newCenter = [
          (rotatedC[0] + rotatedA[0]) / 2,
          (rotatedC[1] + rotatedA[1]) / 2,
        ]
        var newA = rotate(rotatedA[0], rotatedA[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newC = rotate(rotatedC[0], rotatedC[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newWidth = newC[0] - newA[0]
        var newHeight = newC[1] - newA[1]
        // TODO: if newWidth or newHeight is below minWidth or minHeight, set to min and recalculate x and y
        // TODO: works kinda but the origin x,y is wandering
        if (newWidth < minWidth || newHeight < minHeight) {
          if (newWidth < minWidth) newWidth = minWidth
          if (newHeight < minHeight) newHeight = minHeight
          newCenter = [
            (this.canvasElementObj.x + newWidth) / 2,
            (this.canvasElementObj.y + newHeight) / 2,
          ]
          newA = rotate(rotatedA[0], rotatedA[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        }
        newCanvasElementObj.width = newWidth
        newCanvasElementObj.height = newHeight
        if (keepAspect) {
          // TODO: with rotation the image starts wandering, need to fix this at some point...
          let {width, height} = calculateAspectRatioFit(this.canvasElementObj.width, this.canvasElementObj.height, newWidth, this.canvasElementObj.height)
          newCanvasElementObj.width = width
          newCanvasElementObj.height = height
        }
        newCanvasElementObj.x = newA[0]
        newCanvasElementObj.y = newA[1]
        this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      }
      else if (this.resizeLocation == 'top-right') {
        const rotatedB = rotate(this.canvasElementObj.x, this.canvasElementObj.y+this.canvasElementObj.height, cx, cy, this.canvasElementObj.rotation || 0)
        const rotatedD = [
          (mouseposx / canvasMatrix.a) - (canvasMatrix.e / canvasMatrix.a),
          (mouseposy / canvasMatrix.d) - (canvasMatrix.f / canvasMatrix.a),
        ]
        var newCenter = [
          (rotatedB[0] + rotatedD[0]) / 2,
          (rotatedB[1] + rotatedD[1]) / 2,
        ]
        var newB = rotate(rotatedB[0], rotatedB[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newD = rotate(rotatedD[0], rotatedD[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
        var newWidth = newD[0] - newB[0]
        var newHeight = newB[1] - newD[1]
        var newA = [
          newD[0] - newWidth,
          newB[1] - newHeight,
        ]
        // TODO: if newWidth or newHeight is below minWidth or minHeight, set to min and recalculate x and y
        // TODO: works kinda but the origin x,y is wandering
        if (newWidth < minWidth || newHeight < minHeight) {
          if (newWidth < minWidth) newWidth = minWidth
          if (newHeight < minHeight) newHeight = minHeight
          newCenter = [
            (this.canvasElementObj.x + newWidth) / 2,
            (this.canvasElementObj.y + this.canvasElementObj.height + newHeight) / 2,
          ]
          newB = rotate(rotatedB[0], rotatedB[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
          newD = rotate(rotatedD[0], rotatedD[1], newCenter[0], newCenter[1], -(this.canvasElementObj.rotation || 0))
          newA = [
            newD[0] - newWidth,
            newB[1] - newHeight,
          ]
        }
        newCanvasElementObj.width = newWidth
        newCanvasElementObj.height = newHeight
        if (keepAspect) {
          // TODO: with rotation the image starts wandering, need to fix this at some point...
          let {width, height} = calculateAspectRatioFit(this.canvasElementObj.width, this.canvasElementObj.height, newWidth, this.canvasElementObj.height)
          newCanvasElementObj.width = width
          newCanvasElementObj.height = height
        }
        newCanvasElementObj.x = newA[0]
        newCanvasElementObj.y = newA[1]
        this.$emit('replaceCanvasElementObj', newCanvasElementObj)
      }
      if (this.canvasElementObj.fitText) {
        var $this = this
        setTimeout(() => {
          $this.$_fitty.fit()
        }, 50)
      }
    },
  },
  mounted() {
    // TODO: Remove these event listeners on unmounted (how?)
    // Like so: https://stackoverflow.com/a/45401471
    this.canvasBus.$on('canvasWrapperMouseUp', ({event}) => {
      if (this.beingResized) {
        this.stopResize()
      }
      // console.log('canvasWrapperMouseUp')
      // console.log(event)
    })
    this.canvasBus.$on('canvasWrapperMouseMove', (args) => {
      if (this.beingResized) {
        this.handleResize(args)
      }
      // console.log('canvasWrapperMouseMove')
      // console.log(event)
    })
    if (this.canvasElementObj.fitText) {
      var $this = this
      setTimeout(() => {
        $this.$_fitty = fitty($this.$refs.content, {minSize: 12, maxSize: 512})
      }, 50)
    }

    if (this.canvasElementObj.type == 'file') {
      var $this = this;
      (async () => {
        const thumbnail = await ipcRenderer.invoke('getThumbnail', $this.canvasElementObj.path)
        $this.thumbnail = thumbnail
      })()
    }
    // Markdown Stuff
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
    this.md.use( require('markdown-it-collapsible') )
    var stacksPath = this.$store.state.currentNoteCollection.collectionJson.paths.stacks.split('/')[1]
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
    if (this.canvasElementObj.type == 'markdown') {
      this.editorContent = this.canvasElementObj.text
    }
    else if (this.canvasElementObj.type == 'note') {
      this.editorContent = this.note.content
    }
    if (this.options) {
      for (let o of Object.keys(this.options)) {
        this.$set(this.computedOptions, o, this.options[o])
      }
    }
  },
  destroyed() {
    if (this.$_fitty) {
      this.$_fitty.unsubscribe()
    }
  },
}
</script>

<style lang="scss">
.canvas-element {
  position: absolute;
  width: 0;
  height: 0;
}
.canvas-element.focused .canvas-element-container {
  // box-shadow: 0px 0px 0px 3px var(--focus-color);
  box-shadow: 0px 0px 0px 5px rgba(var(--canvas-color), 0.5);
  .content {
    user-select: text;
  }
}

.canvas-element-label {
  position: absolute;
  left: 0;
  top: -42px;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: initial;
  font-size: 1.2em;
  padding: 7px;
  border-radius: 5px;
  color: #525252;
  background-color: rgba(var(--canvas-color), 0.1);
  line-height: 1;
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

.canvas-element-container {
  border-radius: 6px;
  border: 2px solid RGB(var(--canvas-color));
  contain: strict;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  transition: border 0.25s;
  background: var(--background-primary);
  .is-selected-overlay {
    position: absolute;
    top: 0;
    left :0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 4px,
      RGBA(var(--canvas-color), 0.6) 4px,
      RGBA(var(--canvas-color), 0.6) 8px
    );
    pointer-events:none; /* To be able to click through */
    z-index: 2;
  }
  &.opt_textColorFromElementColor {
    color: RGB(var(--canvas-color));
  }
  &.opt_blurBackground {
    backdrop-filter: blur(10px);
  }
  &.opt_contentOnly {
    &:not(:hover) {
      border-color: transparent;
    }
    .content.markdown {
      background: none;
    }
  }
  &.opt_centerHeadings {
    h1, h2, h3, h4, h5, h6 {
      text-align: center;
    }
  }
  &[data-element-type="image"]:not(:hover) {
    border-color: transparent;
  }
  &[data-element-type="lucideIcon"]:not(:hover) {
    border-color: transparent;
  }
  &[data-element-type="container"] {
    background: RGBA(var(--canvas-color), 0.07);
  }
  &[data-element-type="dot"] {
    --dot-size: 20px;
    border-radius: var(--dot-size);
    background: RGBA(var(--canvas-color), 1);
    & + .canvas-element-label {
      transform: translateX(-50%);
      left: 50%;
    }
  }
  .noteLink {
    position: absolute;
    right: 4px;
    top: 4px;
    z-index: 1;
    color: RGB(var(--canvas-color));
  }
  .content.markdown {
    overflow: auto;
    padding: 5px;
    font-family: 'Georgia';
    padding: 10px;
    word-break: break-word;
    background: #fff;
    background: RGBA(var(--canvas-color), 0.07);
    height: 100%;
    width: auto;
    border: none;
    .fitText {
      text-align: center;
      display: inline-block;
      white-space: nowrap;
      font-size: 512px;
      padding: 0;
      width: min-content;
      display: flex !important;
      align-items: center;
      blockquote:first-child, h1:first-child, h2:first-child, h3:first-child, ol:first-child, p:first-child, pre:first-child, ul:first-child {
        margin-top: unset;
        margin-bottom: unset;
      }
    }
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
      font-size: 75%;
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
    details.collapsible {
      border: 2px solid #80808038;
      padding: 10px;
      margin-bottom: 3px;
      border-radius: 10px;
      summary {
        cursor: pointer;
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
          text-shadow: 0px 0px 10px #0090f787;
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
      &[data-emoji] {
        @include emoji-highlight;
        &:before {
          content: attr(data-emoji);
        }
      }
    }
    [data-gloss] {
      position: relative;
      border-bottom: 1px dashed grey;
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
    a {
      color: royalblue;
      word-break: break-all;
      position: relative;
      &[href^="/"] {
        text-decoration-color: burlywood;
      }
    }
    a:after {
      visibility: hidden;
      opacity: 0;
    }
    a[href^=http]:not(.linkify):hover:after {
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
      border: 2px solid #c5c5c5;
      padding: 5px;
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
    a[href*="stackoverflow.com"]:before {
      background-image: url('https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico');
      @include favicon;
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
    div p:last-child {
      margin-block-end: 0;
    }
    img {
      max-width: 500px;
    }
  }
  .content {
    &.iframe {
      height: 100%;
      iframe {
        height: 100%;
        width: 100%;
        border: none;
      }
    }
    &.lucideIcon {
      color: RGB(var(--canvas-color));
      font-size: 512px;
    }
  }
  .content.image {
    img {
      width: 100%;
      height: 100%;
    }
  }
  .editor {
    height: 100%;
    .vue-codemirror {
      height: 100%;
      padding: 0;
      .CodeMirror {
        height: 100%;
        &.CodeMirror-focused {
          border: none;
        }
      }
    }
  }
  .crop-line {
    position: absolute;
  }
  &:hover .crop-line {
    border-color: transparent;
  }
  .crop-top-line {
    top: 0;
    left: 0;
    right: 0;
    height: 5px; /* 5px for the mouse cursor update size */
    border-top: 1px solid transparent; /* 1px for the "border" size */
    cursor: n-resize;
  }
  .crop-bottom-line {
    bottom: 0;
    left: 0;
    right: 0;
    height: 5px; /* 5px for the mouse cursor update size */
    border-bottom: 1px solid transparent; /* 1px for the "border" size */
    cursor: s-resize;
  }
  .crop-left-line {
    top: 0;
    left: 0;
    bottom: 0;
    width: 5px; /* 5px for the mouse cursor update size */
    border-left: 1px solid transparent; /* 1px for the "border" size */
    cursor: w-resize;
  }
  .crop-right-line {
    top: 0;
    right: 0;
    bottom: 0;
    width: 5px; /* 5px for the mouse cursor update size */
    border-right: 1px solid transparent; /* 1px for the "border" size */
    cursor: e-resize;
  }
  .crop-corner {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 2px;
    border: 1px solid transparent;
    background: transparent;
    opacity: 0;
    transition: all 0.25s;
  }
  .crop-top-left-corner {
    top: -3px;
    left: -3px;
    cursor: nw-resize;
  }
  .crop-top-right-corner {
    top: -3px;
    right: -3px;
    cursor: ne-resize;
  }
  .crop-bottom-left-corner {
    bottom: -3px;
    left: -3px;
    cursor: sw-resize;
  }
  .crop-bottom-right-corner {
    bottom: -3px;
    right: -3px;
    cursor: se-resize;
  }
  &:hover .crop-corner {
    opacity: 1;
  }
}
</style>
