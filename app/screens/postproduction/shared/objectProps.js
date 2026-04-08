function pickKeys(source = {}, keys = []) {
  const out = {};
  for (const key of keys) {
    out[key] = source?.[key];
  }
  return out;
}

function mapKeys(source = {}, aliases = {}) {
  const out = {};
  for (const [targetKey, sourceKey] of Object.entries(aliases || {})) {
    out[targetKey] = source?.[sourceKey];
  }
  return out;
}

function buildProps(source = {}, { keys = [], aliases = {} } = {}) {
  return {
    ...pickKeys(source, keys),
    ...mapKeys(source, aliases),
  };
}

export {
  buildProps,
  mapKeys,
  pickKeys,
};

export default buildProps;
