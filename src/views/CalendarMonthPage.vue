<template>
  <div class="calendar-month-page" @keydown="keymonitor" tabindex="0" ref="calendarMonthPage">
    <div class="header">
      <span class="today" @click="goToToday()">
        Today
      </span>
      <span class="monthChooser">
        <span class="month-chooser-button" @click="previousMonth()"><Icon name="ChevronLeft" /></span>
        <span class="currentMonth"><span @click="monthPopover()">{{monthShortName}}</span> <span @click="yearPopover()">{{year}}</span></span>
        <span class="month-chooser-button" @click="nextMonth()"><Icon name="ChevronRight" /></span>
      </span>
    </div>
    <div class="weekChooser previousWeek" @click="previousWeek()">
      <Icon name="ChevronUp" />
    </div>
    <div class="weeks">
      <div class="weekday-header">
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
        <div>Sun</div>
      </div>
      <div class="week" v-for="week in rows">
      <div class="day" :class="{notCurrentMonth: !day.isCurrentMonth, isToday: day.isToday}" v-for="day in week">
        <div class="header">
          <span class="add" @click="addFromTemplate(day.date)">+</span>
          <span class="dayNumber">{{day.dayOfMonth}}</span>
          <span v-if="day.dayOfMonth == 1" class="monthName">{{day.monthShortName}}</span>
        </div>
        <ul v-if="day.dateNode" class="datedNotes">
          <li v-for="note in day.dateNode.relations.map(r => r.note)" @click="$router.push(`/note/${encodeURIComponent(note.relativePath)}`)">
            <Icon v-if="getCustomIcon(note.stack)" :name="getCustomIcon(note.stack)" />
            <Icon v-else name="FileText" />
            <span class="title">{{note.abstract}}</span>
          </li>
        </ul>
      </div>
      </div>
    </div>
    <div class="weekChooser nextWeek" @click="nextWeek()">
      <Icon name="ChevronDown" />
    </div>
    <portal to="statusBarRight" :order="1" v-if="portalActive">
      <span class="keybuffer">{{fullKeybuffer}}</span>
      <span class="month">{{monthName}} {{year}}</span>
    </portal>
  </div>
</template>

<script>
// @ is an alias to /src
import Icon from '@/components/Icon.vue'

export default {
  name: 'CalendarMonthPage',
  data() {
    return {
      firstRowMonday: this.getMonday(),
      previouslyFocusedElement: null,
      portalActive: true,
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
      },
      fullKeybuffer: '',
      keybuffer: '',
      keybufferCount: null,
      keybufferRegister: null,
    }
  },
  components: {
    Icon
  },
  methods: {
    setMode(newmode) {
      if (!Object.keys(this.modes).includes(newmode)) {
        this.modes[newmode] = {}
      }
      this.mode = newmode
    },
    nextWeek(c = 1) {
      let firstRowMonday = new Date(this.firstRowMonday.getTime())
      firstRowMonday.setDate(firstRowMonday.getDate() + (7 * c))
      this.firstRowMonday = firstRowMonday
    },
    previousWeek(c = 1) {
      let firstRowMonday = new Date(this.firstRowMonday.getTime())
      firstRowMonday.setDate(firstRowMonday.getDate() - (7 * c))
      this.firstRowMonday = firstRowMonday
    },
    nextMonth(c = 1) {
      let firstRowSunday = new Date(this.firstRowMonday.getTime())
      firstRowSunday.setDate(firstRowSunday.getDate() + 6)
      let firstDayOfMonth = new Date(firstRowSunday.getTime())
      firstDayOfMonth.setMonth(firstDayOfMonth.getMonth() + (1 * c), 1)
      let firstRowMonday = this.getMonday(firstDayOfMonth)
      this.firstRowMonday = firstRowMonday
    },
    previousMonth(c = 1) {
      let firstRowSunday = new Date(this.firstRowMonday.getTime())
      firstRowSunday.setDate(firstRowSunday.getDate() + 6)
      let firstDayOfMonth = new Date(firstRowSunday.getTime())
      firstDayOfMonth.setMonth(firstDayOfMonth.getMonth() - (1 * c), 1)
      let firstRowMonday = this.getMonday(firstDayOfMonth)
      this.firstRowMonday = firstRowMonday
    },
    goToYear(year) {
      let month = this.month || 1
      month = `${month}`.padStart(2, '0')
      year = `${year}`.padStart(4, '0')
      let date = new Date(`${year}-${month}`)
      let firstRowMonday = this.getMonday(date)
      this.firstRowMonday = firstRowMonday
    },
    getMonday(date = new Date()) {
      // Returns previous Monday unless date is Monday
      let newDate = new Date(date.getTime())
      newDate.setDate(newDate.getDate() - (newDate.getDay() + 6) % 7)
      return newDate
    },
    monthNumberToName(number) {
      if (number && number > 0 && number < 13) {
        return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][number - 1]
      }
    },
    monthNumberToShortName(number) {
      if (number && number > 0 && number < 13) {
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][number - 1]
      }
    },
    checkIfIsToday(date) {
      let today = new Date()
      return date.getDate() == today.getDate() &&
      date.getMonth() == today.getMonth() &&
      date.getUTCFullYear() == today.getUTCFullYear()
    },
    goToToday() {
      let firstRowMonday = this.getMonday(new Date())
      this.firstRowMonday = firstRowMonday
    },
    getDateNode(date) {
      return this.$store.state.currentNoteCollection.getDateNode({date})
    },
    getCustomIcon(stackRelativePath) {
      var stackStyleProps = this.$store.state.currentNoteCollection.getStackStyleProps(stackRelativePath)
      return stackStyleProps['icon'] || null
    },
    monthPopover(year = this.year) {
      let yearStack = this.$store.state.currentNoteCollection.stacks.getStackByPath(`calendar/${year}`)
      let items = []
      if (yearStack) {
        let monthStacks = yearStack.getContent().filter(i => i.isStack)
        for (let monthStack of monthStacks) {
          items.push({
            label: `${this.monthNumberToName(parseInt(monthStack.name))}`,
            action: () => {
              let monthNumber = parseInt(monthStack.name)
              if (monthNumber > 0 && monthNumber < 13) {
                let diff = monthNumber - this.month
                if (diff < 0) {
                  this.previousMonth(Math.abs(diff))
                }
                else if (diff > 0) {
                  this.nextMonth(diff)
                }
              }
            },
          })
        }
        this.$store.commit('triggerCustomPopoverList', {
          message: `${year}`,
          items: items,
          options: {hintMode: false},
        })
      }
    },
    yearPopover() {
      let calendarStack = this.$store.state.currentNoteCollection.stacks.getStackByPath('calendar')
      let items = []
      if (calendarStack) {
        let yearStacks = calendarStack.getContent().filter(i => i.isStack)
        for (let yearStack of yearStacks) {
          items.push({
            label: `${yearStack.name}`,
            action: () => {
              this.goToYear(yearStack.name)
            },
          })
        }
        this.$store.commit('triggerCustomPopoverList', {
          message: `Years`,
          items: items,
          options: {hintMode: false},
        })
      }
    },
    addFromTemplate(date) {
      let dateTemplates = this.$store.state.currentNoteCollection.getAllTemplates().filter(t => t.templateObj.fromDate)
      let items = []
      for (let dt of dateTemplates) {
        items.push({
          label: dt.templateObj.title,
          action: () => {
            let note = dt.execute({args: {date: date}, callback: (note) => {
              if (note) {
                this.$router.push(`/note/${encodeURIComponent(note.relativePath)}`)
              }
            }})
          }
        })
      }
      this.$store.commit('triggerCustomPopoverList', {
        message: 'Date Templates',
        items: items,
        options: {hintMode: false},
      })
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
          this.setMode('normal')
          this.fullKeybuffer = ''
        }
        else if (event.key == 'Enter') {
          this.fullKeybuffer = ''
        }
        else if (event.altKey && event.key == 'ArrowUp') {
          this.previousMonth()
        }
        else if (event.altKey && event.key == 'ArrowDown') {
          this.nextMonth()
        }
        else if (event.key == 'ArrowUp') {
          this.previousWeek()
        }
        else if (event.key == 'ArrowDown') {
          this.nextWeek()
        }
        else if (event.metaKey && event.key=='r') {
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
            if (this.keybuffer == "t")
            {
              this.goToToday()
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "j") {
              let count = this.keybufferCount || 1
              this.nextWeek(count)
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "k") {
              let count = this.keybufferCount || 1
              this.previousWeek(count)
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "J") {
              let count = this.keybufferCount || 1
              this.nextMonth(count)
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "K") {
              let count = this.keybufferCount || 1
              this.previousMonth(count)
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "gm") {
              let count = this.keybufferCount || 1
              if (count > 0 && count < 13) {
                let diff = count - this.month
                if (diff < 0) {
                  this.previousMonth(Math.abs(diff))
                }
                else if (diff > 0) {
                  this.nextMonth(diff)
                }
              }
              this.fullKeybuffer = ''
            }
            else if (this.keybuffer == "gy") {
              let count = this.keybufferCount || (new Date()).getUTCFullYear()
              count = parseInt(count)
              if (count < 1000) {
                count += 2000
              }
              this.goToYear(count)
              this.fullKeybuffer = ''
            }
          }
        }
      }
    },
  },
  computed: {
    routeTab() {
      var routeTabData = {
        title: `${this.monthShortName} ${this.year}`,
      }
      return routeTabData
    },
    month() {
      let firstRowSunday = new Date(this.firstRowMonday.getTime())
      firstRowSunday.setDate(firstRowSunday.getDate() + 6)
      return firstRowSunday.getMonth() + 1
    },
    year() {
      let firstRowSunday = new Date(this.firstRowMonday.getTime())
      firstRowSunday.setDate(firstRowSunday.getDate() + 6)
      return firstRowSunday.getUTCFullYear()
    },
    monthName() {
      return this.monthNumberToName(this.month)
    },
    monthShortName() {
      return this.monthNumberToShortName(this.month)
    },
    firstDay() {
      return (new Date(this.year, this.month - 1)).getDay();
    },
    daysInMonth() {
      return 32 - new Date(this.year, this.month - 1, 32).getDate()
    },
    rows() {
      let rows = []
      let currentDate = new Date(this.firstRowMonday.getTime())
      for (let i = 0; i < 6; i++) {
        let row = []
        for (let j = 0; j < 7; j++) {
          row.push({
            date: new Date(currentDate.getTime()),
            dayOfMonth: currentDate.getDate(),
            month: currentDate.getMonth() + 1,
            monthName: this.monthNumberToName(currentDate.getMonth() + 1),
            monthShortName: this.monthNumberToShortName(currentDate.getMonth() + 1),
            year: currentDate.getUTCFullYear(),
            isCurrentMonth: (currentDate.getMonth() + 1) == this.month,
            isToday: this.checkIfIsToday(currentDate),
            dateNode: this.getDateNode(currentDate),
          })
          currentDate.setDate(currentDate.getDate() + 1)
        }
        rows.push(row)
      }
      return rows
    },
  },
  watch: {
  },
  mounted() {
    this.$refs.calendarMonthPage.focus()
    if (this.$store.state.monthPageGoToDate && !this.$store.state.monthPageGoToDateAccessed) {
      let firstRowMonday = this.getMonday(this.$store.state.monthPageGoToDate)
      this.firstRowMonday = firstRowMonday
      this.$store.commit('setMonthPageGoToDateAsAccessed')
    }
  },
  unmounted() {
  },
  activated() {
    this.portalActive = true
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
    }
    else {
      this.$refs.calendarMonthPage.focus()
    }
    if (this.$store.state.monthPageGoToDate && !this.$store.state.monthPageGoToDateAccessed) {
      let firstRowMonday = this.getMonday(this.$store.state.monthPageGoToDate)
      this.firstRowMonday = firstRowMonday
      this.$store.commit('setMonthPageGoToDateAsAccessed')
    }
  },
  deactivated() {
    this.portalActive = false
    this.previouslyFocusedElement = document.activeElement
  },
}
</script>

<style lang="scss">
.calendar-month-page {
  outline: none;
  & > .header {
    display: flex;
    padding: 5px;
    background: #dddddd;
    .monthChooser {
      margin-inline: auto;
    }
  }
  .weekChooser {
    text-align: center;
    cursor: pointer;
    user-select: none;
    background: #c5c5c5;
  }
  .weeks {
    height: 500px;
    height: 84.6vh;
    display: flex;
    flex-direction: column;
    .weekday-header, .week {
      display: flex;
      & > * {
        flex: 1 1 0px;
      }
    }
    .weekday-header {
      background: #dddddd;
      text-align: right;
      & > * {
        padding-inline: 5px;
        padding-block: 2px;
        border-right: 1px solid #d1d1d1;
      }
    }
    .week {
      flex: 1 1 0px;
      & > .day {
        // border: 1px solid grey;
        // background: #efefef;
        border: 1px solid #efefef;
        background: #ffffff;
        padding-inline: 4px;
        padding-block: 2px;
        &.notCurrentMonth {
          // background: #cfcfcf;
          color: #bbbbbb;
        }
        &.isToday {
          & > .header {
            color: #f54e4e;
            .dayNumber {
              background: #f54e4e;
              color: #ffffff;
              border-radius: 10px;
              width: 20px;
              height: 20px;
              text-align: center;
            }
          }
        }
        & > .header {
          display: flex;
          justify-content: flex-end;
          gap: 4px;
          font-weight: bold;
          .add {
            flex-grow: 1;
            color: cornflowerblue;
            visibility: hidden;
            user-select: none;
            cursor: pointer;
          }
        }
        &:hover > .header {
          .add {
            visibility: visible;
          }
        }
        & > .datedNotes {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 13px;
          .svg-icon {
            color: #4b6ba5;
          }
          li {
            user-select: none;
            cursor: pointer;
          }
          li:hover {
            .title {
              text-decoration: underline;
            }
          }
        }
      }
    }
  }
}
</style>
