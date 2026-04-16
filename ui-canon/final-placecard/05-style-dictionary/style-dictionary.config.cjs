module.exports = {
  source: [
    "ui-canon/tokens/primitives.json",
    "ui-canon/tokens/semantic.json",
    "ui-canon/tokens/components.json",
    "ui-canon/tokens/motion.json"
  ],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "ui-canon/final-placecard/06-projections/generated/",
      files: [
        {
          destination: "tokens.css",
          format: "css/variables"
        }
      ]
    },
    js: {
      transformGroup: "js",
      buildPath: "ui-canon/final-placecard/06-projections/generated/",
      files: [
        {
          destination: "tokens.js",
          format: "javascript/es6"
        }
      ]
    }
  }
};
