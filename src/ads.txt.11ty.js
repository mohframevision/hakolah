exports.data = {
  permalink: "ads.txt",
  eleventyExcludeFromCollections: true,
};

exports.render = function (data) {
  const pubId = (data.adsense.publisherId || "").replace(/^ca-/, "");
  return `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
};
