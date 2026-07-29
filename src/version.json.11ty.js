exports.data = {
  permalink: "version.json",
  eleventyExcludeFromCollections: true,
};

exports.render = function (data) {
  return JSON.stringify({ version: data.buildVersion });
};
