{
  "targets": [{
    "target_name": "taskbar_progress",
    "sources": ["src/taskbar.cc"],
    "conditions": [[
      "OS=='win'", {
        "libraries": ["shell32.lib", "ole32.lib", "uuid.lib"],
        "msvs_settings": {
          "VCCLCompilerTool": {
            "Optimization": "2",
            "RuntimeLibrary": "0"
          }
        }
      }
    ]]
  }]
}