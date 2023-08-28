module.exports = {
  "env":{
    "development":{
      "sourceMaps":true,
      "retainLines":true,
    }
  },
  presets: [
    [
      "@vue/app",
      {
        useBuiltIns: "entry"
      }
    ]
  ]
};
