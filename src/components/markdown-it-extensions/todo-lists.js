// Source: https://github.com/dexfire/markdown-it-todo/blob/master/index.js
const isInline = token => token && token.type === 'inline'
const isParagraph = token => token && token.type === 'paragraph_open'
const isListItem = token => token && token.type === 'list_item_open'
const startsWithTodoMarkdown = token => token && /^\[([ Xx])]/.test(token.content)

function isTodoItem(tokens, index) {
  return isInline(tokens[index]) &&
    isParagraph(tokens[index - 1]) &&
    isListItem(tokens[index - 2]) &&
    startsWithTodoMarkdown(tokens[index])
}

function setAttr(token, name, value) {
  const index = token.attrIndex(name)
  const attr = [name, value]

  if (index < 0) {
    token.attrPush(attr)
  } else {
    token.attrs[index] = attr
  }
}

function parentToken(tokens, index) {
  const targetLevel = tokens[index].level - 1
  for (let i = index - 1; i >= 0; i--) {
    if (tokens[i].level === targetLevel) {
      return i
    }
  }

  return -1
}

function todoify(token, TokenConstructor) {
  // token.children.unshift(createTodoItem(token, TokenConstructor))

  const sliceIndex = '[ ] '.length
  token.content = token.content.slice(sliceIndex)
  token.children[0].content = token.children[0].content.slice(sliceIndex)
}

function createTodoItem(token, TokenConstructor) {
  const todo = new TokenConstructor('html_inline', '', 0)
  if (/^\[ ]/.test(token.content)) {
    todo.content = '<input disabled="true" class="markdown-todo"></input>'
  } else if (/^\[(x|X)]/.test(token.content)) {
    todo.content = '<input disabled="true" checked="true" class="markdown-todo"></input>'
  }

  return todo
}

function isDone(token) {
  if (/^\[ ]/.test(token.content)) {
    return false
  } else if (/^\[(x|X)]/.test(token.content)) {
    return true
  }
}

module.exports = md => {
  md.core.ruler.after('inline', 'todo', state => {
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      if (isTodoItem(tokens, i)) {
        setAttr(tokens[i - 2], 'data-done', isDone(tokens[i]) ? 'true' : 'false')
        todoify(tokens[i], state.Token)
        setAttr(tokens[i - 2], 'data-type', 'todo_item')
        setAttr(tokens[parentToken(tokens, i - 2)], 'data-type', 'todo_list')
      }
    }
  })
}
