var express       = require('express');
var bodyParser    = require('body-parser');
var request       = require('request');
var dotenv        = require('dotenv');
var auth          = require('http-auth');
var api          = require('./api.js');
var SpotifyWebApi = require('spotify-web-api-node');

dotenv.load();

var spotifyApi = new SpotifyWebApi({
  clientId     : process.env.SPOTIFY_KEY,
  clientSecret : process.env.SPOTIFY_SECRET,
  redirectUri  : process.env.SPOTIFY_REDIRECT_URI
});

var basic = auth.basic({
        realm: "Web."
    }, function (username, password, callback) { // Custom authentication method.
        callback(username === process.env.HTTPUSER && password === process.env.HTTPPASS);
    }
);

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(auth.connect(basic));

app.get('/', function(req, res) {
  if (spotifyApi.getAccessToken()) {
    return res.send('You are logged in.');
  }
  return res.send('<a href="/authorise">Authorise</a>');
});

app.get('/authorise', function(req, res) {
  var scopes = ['playlist-modify-public', 'playlist-modify-private'];
  var state  = new Date().getTime();
  var authoriseURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.redirect(authoriseURL);
});

app.get('/callback', function(req, res) {
  spotifyApi.authorizationCodeGrant(req.query.code)
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);
      return res.redirect('/');
    }, function(err) {
      return res.send(err);
    });
});

app.use('/store', function(req, res, next) {
  if (req.body.token !== process.env.SLACK_TOKEN) {
    return res.status(500).send('Cross site request forgerizzle!');
  }
  next();
});


app.post('/api', function(req, res) {
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      if (data.body['refresh_token']) {
        spotifyApi.setRefreshToken(data.body['refresh_token']);
      }

      var request_string = req.body.text;
      var request_array = request_string.split(" ");
      var command = request_array.shift();

      switch(command) {
        case 'help':
          response = api.help();
          return res.send(response);
          break;
        case 'view':
          spotifyApi.getPlaylistTracks(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID)
            .then(function(data) {
             //res.send(data.body.tracks.items);
             var results = data.body.items;
             var playlist = '*Current Play List*\n';
             for (var i=0, len=results.length;i<len;i++) {
               var trackobj = results[i];
               playlist += (i+1) + ": " + trackobj.track.name + " by " + trackobj.track.artists[0].name + "\n";
             }

              res.send('Some information about this playlist', playlist);
            }, function(err) {
              res.send('Something went wrong!', err);
            });
          break;

        case 'add':
        default:
          //response = api.addToPlaylist(spotifyApi, request_array);
          var request_string = request_array.join(' ');
          if(request_string.indexOf(' - ') === -1) {
            var query = 'track:' + request_string;
          } else {
            var pieces = request_string.split(' - ');
            var query = 'artist:' + pieces[0].trim() + ' track:' + pieces[1].trim();
          }
          var response = query + " cache";
          spotifyApi.searchTracks(query)
            .then(function(data) {
              var results = data.body.tracks.items;
              if (results.length === 0) {
                res.send('Could not find that track.');
              }
              var track = results[0];

              spotifyApi.addTracksToPlaylist(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID, ['spotify:track:' + track.id])
                .then(function(data) {
                  res.send('Track added: *' + track.name + '* by *' + track.artists[0].name + '*');
                }, function(err) {
                  res.send(err.message);
                });
            }, function(err) {
              res.send(err.message);
            });

          break;
      }

    }, function(err) {
      return res.send('Could not refresh access token. You probably need to re-authorise yourself from your app\'s homepage.');
    });
});


app.post('/store', function(req, res) {
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      if (data.body['refresh_token']) {
        spotifyApi.setRefreshToken(data.body['refresh_token']);
      }
      if(req.body.text.indexOf(' - ') === -1) {
        var query = 'track:' + req.body.text;
      } else {
        var pieces = req.body.text.split(' - ');
        var query = 'artist:' + pieces[0].trim() + ' track:' + pieces[1].trim();
      }
      spotifyApi.searchTracks(query)
        .then(function(data) {
          var results = data.body.tracks.items;
          if (results.length === 0) {
            return res.send('Could not find that track.');
          }
          var track = results[0];
          spotifyApi.addTracksToPlaylist(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID, ['spotify:track:' + track.id])
            .then(function(data) {
              return res.send('Track added: *' + track.name + '* by *' + track.artists[0].name + '*');
            }, function(err) {
              return res.send(err.message);
            });
        }, function(err) {
          return res.send(err.message);
        });
    }, function(err) {
      return res.send('Could not refresh access token. You probably need to re-authorise yourself from your app\'s homepage.');
    });
});

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));