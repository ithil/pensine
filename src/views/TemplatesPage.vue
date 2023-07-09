<template>
  <div class="templates-page" tabindex="0">
    <div class="template" v-for="t in templates" :key="t.id">
      <ul>
        <li class="title">
          <input type="text" v-model="t.templateObj.title">
          <span v-if="!comp(t.templateObj.title, t.savedTemplateObj.title)" @click="reset(t, 'title')">
            <Icon name="RotateCcw" />
          </span>
        </li>
        <li>
          <input type="text" v-model="t.templateObj.type">
          <span v-if="!comp(t.templateObj.type, t.savedTemplateObj.type)" @click="reset(t, 'type')">
            <Icon name="RotateCcw" />
          </span>
        </li>
        <li>
          <input :id="`${t.id}_enabled`" type="checkbox" v-model="t.templateObj.enabled">
          <label :for="`${t.id}_enabled`">Enabled</label>
          <span v-if="!comp(t.templateObj.enabled, t.savedTemplateObj.enabled)" @click="reset(t, 'enabled')">
            <Icon name="RotateCcw" />
          </span>
        </li>
        <li>
          <input :id="`${t.id}_fromDate`" type="checkbox" v-model="t.templateObj.fromDate">
          <label :for="`${t.id}_fromDate`">From date</label>
          <span v-if="!comp(t.templateObj.fromDate, t.savedTemplateObj.fromDate)" @click="reset(t, 'fromDate')">
            <Icon name="RotateCcw" />
          </span>
        </li>
        <li>
          <input type="text" v-model="t.templateObj.stack">
          <span v-if="!comp(t.templateObj.stack, t.savedTemplateObj.stack)" @click="reset(t, 'stack')">
            <Icon name="RotateCcw" />
          </span>
        </li>
        <li>
          <span v-if="!comp(t.templateObj.generator, t.savedTemplateObj.generator)" @click="reset(t, 'generator')">
            <Icon name="RotateCcw" />
          </span>
          <codemirror v-model="t.templateObj.generator" :options="cmOptions"/>
        </li>
      </ul>
      <button @click="saveTemplate(t)">Save</button>
      <button @click="resetTemplate(t)">Reset</button>
      <button @click="duplicateTemplate(t)">Duplicate</button>
      <button @click="deleteTemplate(t)">Delete</button>
    </div>
    <div class="addNewTemplate" @click="addTemplate()">
      <Icon name="Plus" />
    </div>
  </div>
</template>

<script>
// @ is an alias to /src
import Icon from '@/components/Icon.vue'
import { codemirror } from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/keymap/vim.js'
import 'codemirror/addon/selection/active-line.js'
import 'codemirror/addon/edit/trailingspace.js'
import 'codemirror/theme/seti.css'

export default {
  name: 'TemplatesPage',
  data() {
    return {
      previouslyFocusedElement: null,
      portalActive: true,
      templates: [],
      cmOptions: {
        tabSize: 2,
        mode: 'text/javascript',
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
  components: {
    Icon,
    codemirror,
  },
  methods: {
    getTemplates() {
      this.templates = this.$store.state.currentNoteCollection.getAllTemplates()
    },
    comp(v1, v2) {
      return JSON.stringify(v1) === JSON.stringify(v2)
    },
    reset(template, key) {
      template.templateObj[key] = template.savedTemplateObj[key]
    },
    saveTemplate(template) {
      template.setTemplate()
      this.getTemplates()
    },
    resetTemplate(template) {
      template.templateObj = JSON.parse(JSON.stringify(template.savedTemplateObj))
    },
    duplicateTemplate(template) {
      this.$store.commit('triggerCustomTextPrompt', {
        message: 'Name for new duplicated template',
        action: (name) => {
          template.duplicate(name)
          this.getTemplates()
        }
      })
    },
    deleteTemplate(template) {
      this.$store.commit('triggerCustomTextPrompt', {
        message: `Do you really want to delete template '${template.title}'?`,
        action: (input) => {
          if (input.trim() == 'y') {
            template.delete()
            this.getTemplates()
          }
        }
      })
    },
    addTemplate() {
      this.$store.commit('triggerCustomTextPrompt', {
        message: 'Name for new template',
        action: (name) => {
          this.$store.state.currentNoteCollection.newTemplate(name)
          this.getTemplates()
        }
      })
    },
  },
  computed: {
    routeTab() {
      var routeTabData = {
        title: `Templates`,
      }
      return routeTabData
    },
  },
  watch: {
  },
  mounted() {
    this.getTemplates()
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

<style lang="scss">
.templates-page {
  background: #ebebeb;
  padding: 5px;
  .template {
    width: 600px;
    margin: 0 auto;
    background: #dfdede;
    padding: 10px;
    margin-top: 10px;
    border-radius: 10px;
    & > ul {
      list-style: none;
      & > li {
        input {
          font-size: 20px;
        }
        &.title {
          input {
            font-weight: bold;
            border: none;
            background: none;
            font-size: 25px;
            outline: none;
          }
        }
        .cm-s-seti.CodeMirror {
          border: 2px solid #a3a3a3;
          &.CodeMirror-focused {
            border-color: cornflowerblue;
            border-style: dashed;
          }
        }
      }
    }
  }
  .addNewTemplate {
    font-size: 80px;
    cursor: pointer;
    position: fixed;
    right: 10px;
    bottom: 30px;
    color: white;
    background: cornflowerblue;
    height: 80px;
    width: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 40px;
  }
}
</style>
