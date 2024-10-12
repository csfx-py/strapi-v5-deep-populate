"use strict";
const { getFullPopulateObject } = require("./helpers");

function deleteKeys(obj, keys) {
  if (obj === null || typeof obj !== "object") return;

  const keysSet = new Set(keys);

  function recursiveDelete(obj) {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        recursiveDelete(item);
      }
    } else {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (keysSet.has(key)) {
            delete obj[key];
          } else if (typeof obj[key] === "object") {
            recursiveDelete(obj[key]);
          }
        }
      }
    }
  }

  recursiveDelete(obj);
  return obj;
}

module.exports = ({ strapi }) => {
  const pluginConfig = strapi.plugin("strapi-v5-deep-populate")?.config;
  const defaultDepth = pluginConfig("defaultDepth") || 5;
  const keysToDelete = pluginConfig("keysToDelete") || [];

  // Subscribe to the lifecycles that we are interested in.
  strapi.db.lifecycles.subscribe((event) => {
    const { action, params, model } = event;
    if (action === "beforeFindMany" || action === "beforeFindOne") {
      const level = params?.pLevel;

      if (level !== undefined) {
        const depth = level ?? defaultDepth;
        const modelObject = getFullPopulateObject(model.uid, depth, []);
        params.populate = modelObject.populate;
      }
    }

    if (action === "afterFindMany" || action === "afterFindOne") {
      event.result = deleteKeys(event.result, keysToDelete);
    }
  });
};
