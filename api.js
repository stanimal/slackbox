var ApiFunctions = {
  help: function() {
    var msg = "@channel:\n" +
      "/jukebox help <show this>" +
      "/jukebox view <display current tracklisting>";
    return msg;
  }
};

module.exports = ApiFunctions;