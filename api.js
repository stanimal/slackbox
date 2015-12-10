var ApiFunctions = {
  help: function() {
    var msg = "@channel:\n" +
      "/jukebox help <show this>" +
      "/jukebox add <show this>";
    return msg;
  },
  addToPlaylist: function(spotifyApi, request_array) {
    var request_string = request_array.join(' ');
    if(request_string.indexOf(' - ') === -1) {
      var query = 'track:' + request_string;
    } else {
      var pieces = request_string.split(' - ');
      var query = 'artist:' + pieces[0].trim() + ' track:' + pieces[1].trim();
    }
    spotifyApi.searchTracks(query)
      .then(function(data) {
        var results = data.body.tracks.items;
        if (results.length === 0) {
          return 'Could not find that track.';
        }
        var track = results[0];
        spotifyApi.addTracksToPlaylist(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID, ['spotify:track:' + track.id])
          .then(function(data) {
            return 'Track added: *' + track.name + '* by *' + track.artists[0].name + '*';
          }, function(err) {
            return err.message;
          });
      }, function(err) {
        return err.message;
      });
  }

};

module.exports = ApiFunctions;