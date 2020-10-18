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
// #app {
//   font-family: Avenir, Helvetica, Arial, sans-serif;
//   -webkit-font-smoothing: antialiased;
//   -moz-osx-font-smoothing: grayscale;
//   text-align: center;
//   color: #2c3e50;
// }

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
  // background-color: #1c1d21;
  // height: 100%;
  width: 100%;

  h1 {
    color: white;
  }
}

.splitpanes__pane {
  overflow: scroll;
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
