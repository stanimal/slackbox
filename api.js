var ApiFunctions = {
  help: function() {
    var msg = "\n" +
      "/jukebox help *shows this text*\n" +
      "/jukebox view *displays current tracklisting*\n" +
      "/jukebox add <song title and artist> *adds song to playlist*\n"
    return msg;
  }
};

module.exports = ApiFunctions;