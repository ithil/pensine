'use strict'

import { app, protocol, BrowserWindow, Menu, ipcMain, globalShortcut, Notification, shell, dialog, nativeImage } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import contextMenu from 'electron-context-menu'
import path from 'path'
// import { bus } from './main'
const isDevelopment = process.env.NODE_ENV !== 'production'
const isMac = process.platform === 'darwin'

contextMenu({
  showSaveImageAs: true,
  prepend: (defaultActions, parameters, browserWindow) => [
    {
      label: 'Open in WayBack Machine',
      visible: parameters.linkURL.trim().startsWith('http'),
      click: () => {
        shell.openExternal(`https://web.archive.org/web/*/${parameters.linkURL}`);
        }
      },
      {
        label: 'Open in Google Cache',
        visible: parameters.linkURL.trim().startsWith('http'),
        click: () => {
          shell.openExternal(`http://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(parameters.linkURL)}`);
          }
        },
      {
        label: 'Search Google for Image',
        visible: parameters.mediaType === 'image' && parameters.srcURL.trim().startsWith('http'),
        click: () => {
          shell.openExternal(`https://www.google.com/searchbyimage?image_url=${encodeURIComponent(parameters.srcURL)}`);
          }
        },
      ]
})

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1000,
    height: 600,
    titleBarStyle: 'hiddenInset',
    // backgroundColor: '#1d1f21',
    transparent: true,
    vibrancy: 'dark',
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  })
  win.maximize()


  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  // Set a variable when the app is quitting.
  var isAppQuitting = false
  var beforeQuitDone = false
  app.on('before-quit', function (evt) {
      isAppQuitting = true
      if (!beforeQuitDone) {
        evt.preventDefault()
        win.webContents.send('beforeQuit')
      }
  });

  win.on('close', function (evt) {
      if (!isAppQuitting) {
          evt.preventDefault()
          win.hide()
      }
  });

  win.on('closed', () => {
    win = null
  })

  var noteCollections = {}
  var addNoteCollections = () => {
    var temp = [
      { type: 'separator'},
    ]
    if (Object.keys(noteCollections).length < 1) {
      return []
    }
    for (let k of Object.keys(noteCollections)) {
      temp.push({
        label: noteCollections[k].name,
        click: async () => {
          win.webContents.send('changeCurrentNoteCollection', {path: noteCollections[k].path })
        }
      })
    }
    return temp
  }

  var createTemplate = () => {
    return [
      // { role: 'appMenu' }
      ...(isMac ? [{
        label: 'Pensine',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }] : []),
      // { role: 'fileMenu' }
      {
        label: 'Note',
        submenu: [
          {
            label: 'Open ...',
            accelerator: 'CommandOrControl+O',
            click: async () => {
              win.webContents.send('openNoteModal')
            }
          },
          { type: 'separator' },
          // isMac ? { role: 'close' } : { role: 'quit' },
        ]
      },
      // { role: 'editMenu' }
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          ...(isMac ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [
                { role: 'startspeaking' },
                { role: 'stopspeaking' }
              ]
            }
          ] : [
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
          ])
        ]
      },
      // { role: 'viewMenu' }
      {
        label: 'View',
        submenu: [
          {
            label: 'Open Command Palette',
            accelerator: 'CommandOrControl+P',
            click: async () => {
              win.webContents.send('openCommandPalette')
            }
          },
          {
            label: 'Toggle Popover List',
            accelerator: 'CommandOrControl+D',
            click: async () => {
              win.webContents.send('popoverList')
            }
          },
          { type: 'separator' },
          {
            label: 'Reload',
            click: async () => {
              win.webContents.reload()
            }
          },
          {
            label: 'Force Reload',
            click: async () => {
              win.webContents.reloadIgnoringCache()
            }
          },
          // { role: 'reload' },
          // { role: 'forcereload' },
          { role: 'toggledevtools' },
          { type: 'separator' },
          { role: 'resetzoom' },
          { role: 'zoomin' },
          { role: 'zoomout' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Collection',
        submenu: [
          {
            label: 'Add Collection',
            click: async () => {
              win.webContents.send('addExistingCollection')
            }
          },
          {
            label: 'Set as Default',
            click: async () => {
              win.webContents.send('setAsDefaultCollection')
            }
          },
          {
            label: 'Switch Collection',
            accelerator: 'CommandOrControl+E',
            click: async () => {
              win.webContents.send('collectionModal')
            }
          },
          ...addNoteCollections(),
        ],
      },
      // { role: 'windowMenu' }
      {
        label: 'Window',
        submenu: [
          {
            label: 'Close Tab',
            accelerator: 'CommandOrControl+W',
            click: async () => {
              win.webContents.send('closeTab')
            }
          },
          {
            label: 'Next Tab',
            accelerator: 'Control+Tab',
            click: async () => {
              win.webContents.send('nextTab')
            }
          },
          {
            label: 'Previous Tab',
            accelerator: 'Control+Shift+Tab',
            click: async () => {
              win.webContents.send('previousTab')
            }
          },
          { type: 'separator' },
          {
            label: '1st Tab',
            accelerator: 'CommandOrControl+1',
            click: async () => {
              win.webContents.send('switchToTab', 0)
            }
          },
          {
            label: '2nd Tab',
            accelerator: 'CommandOrControl+2',
            click: async () => {
              win.webContents.send('switchToTab', 1)
            }
          },
          {
            label: '3rd Tab',
            accelerator: 'CommandOrControl+3',
            click: async () => {
              win.webContents.send('switchToTab', 2)
            }
          },
          {
            label: '4th Tab',
            accelerator: 'CommandOrControl+4',
            click: async () => {
              win.webContents.send('switchToTab', 3)
            }
          },
          {
            label: '5th Tab',
            accelerator: 'CommandOrControl+5',
            click: async () => {
              win.webContents.send('switchToTab', 4)
            }
          },
          {
            label: '6th Tab',
            accelerator: 'CommandOrControl+6',
            click: async () => {
              win.webContents.send('switchToTab', 5)
            }
          },
          {
            label: '7th Tab',
            accelerator: 'CommandOrControl+7',
            click: async () => {
              win.webContents.send('switchToTab', 6)
            }
          },
          {
            label: '8th Tab',
            accelerator: 'CommandOrControl+8',
            click: async () => {
              win.webContents.send('switchToTab', 7)
            }
          },
          {
            label: 'Last Tab',
            accelerator: 'CommandOrControl+9',
            click: async () => {
              win.webContents.send('lastTab')
            }
          },
          { type: 'separator' },
          { role: 'minimize' },
          { role: 'zoom' },
          ...(isMac ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
          ] : [
            { role: 'close' }
          ])
        ]
      },
    ]
  }

  const menu = Menu.buildFromTemplate(createTemplate())
  Menu.setApplicationMenu(menu)
  ipcMain.on('updateColMenuItems', (event, cols) => {
    noteCollections = cols
    Menu.setApplicationMenu(Menu.buildFromTemplate(createTemplate()))
  })
  ipcMain.on('minimizeWindow', (event, arg) => {
    win.minimize()
  })
  ipcMain.on('quit', (event, arg) => {
    app.quit()
  })
  ipcMain.on('beforeQuitDone', (event, arg) => {
    beforeQuitDone = true
    app.quit()
  })
  ipcMain.handle('getFileIcon', async (event, myPath, callback) => {
    const icon = await app.getFileIcon(myPath)
    return icon.toDataURL()
    // win.webContents.send('')
  })
  ipcMain.handle('getThumbnail', async (event, myPath, callback) => {
    const thumbnail = await nativeImage.createThumbnailFromPath(myPath, {width: 512, height: 512})
    return thumbnail.toDataURL()
  })
  ipcMain.handle('dialog', (event, method, params) => {
    dialog[method](params)
  })
  ipcMain.handle('saveDialog', (event, options) => {
    return dialog.showSaveDialogSync(options)
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
  else {
    win.show()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
