const { isEmpty, merge } = require("lodash/fp");

const getModelPopulationAttributes = (model) => {
  if (model.uid === "plugin::upload.file") {
    const { related, ...attributes } = model.attributes;
    return attributes;
  }
  return model.attributes;
};

const getFullPopulateObject = (modelUid, maxDepth = 20, ignore = []) => {
  const skipCreatorFields =
    strapi.plugin("strapi-v5-deep-populate")?.config("skipCreatorFields") ||
    false;

  if (maxDepth <= 1) return true;
  if (modelUid === "admin::user" && skipCreatorFields) return undefined;

  const populate = {};
  const model = strapi.getModel(modelUid);
  const collectionName = model.collectionName;

  if (!ignore.includes(collectionName)) ignore.push(collectionName);

  const attributes = getModelPopulationAttributes(model);
  for (const [key, value] of Object.entries(attributes)) {
    if (ignore?.includes(key)) continue;

    if (value) {
      switch (value.type) {
        case "component":
          populate[key] = getFullPopulateObject(value.component, maxDepth - 1);
          break;
        case "dynamiczone":
          const dynamicPopulate = value.components.reduce((prev, cur) => {
            const curPopulate = getFullPopulateObject(cur, maxDepth - 1);
            return curPopulate === true ? prev : merge(prev, curPopulate);
          }, {});
          populate[key] = isEmpty(dynamicPopulate) ? true : dynamicPopulate;
          break;
        case "relation":
          const relationPopulate = getFullPopulateObject(
            value.target,
            key === "localizations" && maxDepth > 2 ? 1 : maxDepth - 1,
            ignore
          );
          if (relationPopulate) populate[key] = relationPopulate;
          break;
        case "media":
          populate[key] = true;
          break;
      }
    }
  }

  return isEmpty(populate) ? true : { populate };
};

module.exports = {
  getFullPopulateObject,
};
