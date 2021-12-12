const nodeExternals = require("webpack-node-externals")

module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      // List native deps here if they don't work
      externals: ['pensieve'],
      // If you are using Yarn Workspaces, you may have multiple node_modules folders
      // List them all here so that VCP Electron Builder can find them
      nodeModulesPath: ['../../node_modules', './node_modules'],
      builderOptions: {
        appId: "com.ithil.pensine",
        productName: "Pensine",
        asar: false,
        mac: {
          category: "public.app-category.productivity",
          target: "dir",
          extendInfo: {
            "NSServices": [
              {
                "NSSendTypes": ["NSStringPboardType"],
                "NSMessage": "droppedText",
                "NSMenuItem": {
                  "default": "Text Drop"
                },
              }
            ],
          },
        },
      }
    }
  },
  runtimeCompiler: true,
}
