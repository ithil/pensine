<template>
  <div id="app">
    <splitpanes style="height: 100vh">
    <!-- <splitpanes style="height: 100vh" class="default-theme"> -->
      <pane min-size="20" size="30" id="navbar">
        <nav-bar></nav-bar>
      </pane>
      <pane>
        <router-view/>
      </pane>
    </splitpanes>
  </div>
</template>

<script>
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import NavBar from './components/NavBar.vue'

// const pensieve = require('pensieve')

export default {
  components: {
    Splitpanes,
    Pane,
    NavBar,
  },
  data() {
    return {
    }
  },
  mounted() {
    console.log(this.$noteCollection)
  }
}
</script>

<style lang="scss">

body {
  overflow: hidden;
  margin: 0;
}

#navbar {
  background-color: #222527;
}

.navbar-tree {
  padding-top: 16px;
  padding-right: 5px;
  width: 100%;

  h1 {
    color: white;
  }
}

.splitpanes__pane {
  overflow: scroll;
}
.splitpanes__splitter{
  -ms-touch-action:none;
  touch-action:none
}
.splitpanes--vertical>.splitpanes__splitter{
  min-width:1px;
  cursor:col-resize
}
.splitpanes--horizontal>.splitpanes__splitter{
  min-height:1px;
  cursor:row-resize
}
.splitpanes__splitter{
  background-color: rgba(42, 42, 42, 0.5);
  -webkit-box-sizing:border-box;
  box-sizing:border-box;
  position:relative;
  -ms-flex-negative:0;
  flex-shrink:0
}
.splitpanes__splitter:after,.splitpanes.default-theme .splitpanes__splitter:before{
  content:"";
  position:absolute;
  top:50%;
  left:50%;
  background-color:rgba(0,0,0,.15);
  -webkit-transition:background-color .3s;
  transition:background-color .3s
}
.splitpanes__splitter:hover:after,.splitpanes.default-theme .splitpanes__splitter:hover:before{
  background-color:rgba(0,0,0,.25)
}
.splitpanes__splitter:first-child{
  cursor:auto
}
.splitpanes .splitpanes__splitter{
  z-index:1
}
.splitpanes--vertical>.splitpanes__splitter,.splitpanes--vertical>.splitpanes__splitter{
  width:7px;
  // border-left:1px solid #eee;
  margin-left:-1px
}
.splitpanes--vertical>.splitpanes__splitter:after,.default-theme .splitpanes--vertical>.splitpanes__splitter:after,.splitpanes--vertical>.splitpanes__splitter:before,.splitpanes--vertical>.splitpanes__splitter:before{
  -webkit-transform:translateY(-50%);
  transform:translateY(-50%);
  width:1px;
  height:30px
}
.splitpanes--vertical>.splitpanes__splitter:before,.splitpanes--vertical>.splitpanes__splitter:before{
  margin-left:-2px
}
.splitpanes--vertical>.splitpanes__splitter:after,.splitpanes--vertical>.splitpanes__splitter:after{
  margin-left:1px
}
.splitpanes--horizontal>.splitpanes__splitter,.splitpanes--horizontal>.splitpanes__splitter{
  height:7px;
  // border-top:1px solid #eee;
  margin-top:-1px
}
.splitpanes--horizontal>.splitpanes__splitter:after,.default-theme .splitpanes--horizontal>.splitpanes__splitter:after,.default-theme.splitpanes--horizontal>.splitpanes__splitter:before,.default-theme .splitpanes--horizontal>.splitpanes__splitter:before{
  -webkit-transform:translateX(-50%);
  transform:translateX(-50%);
  width:30px;
  height:1px
}
.splitpanes--horizontal>.splitpanes__splitter:before,.splitpanes--horizontal>.splitpanes__splitter:before{
  margin-top:-2px
}
.splitpanes--horizontal>.splitpanes__splitter:after,.splitpanes--horizontal>.splitpanes__splitter:after{
  margin-top:1px
}


::-webkit-scrollbar {
  background-color: rgba(42, 42, 42, 0.5);
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb:window-inactive,
::-webkit-scrollbar-thumb {
  background: rgba(92, 92, 92, 0.5);
  border-radius: 5px;
  box-shadow: 0 0 1px black inset;
}

::-webkit-scrollbar-corner {
  background-color: rgba(42, 42, 42, 0.5);
}

</style>
