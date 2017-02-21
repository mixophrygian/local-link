// Local-Link - a simple LAN-only text sharing server.
// Copyright (C) 2017 Alex Evers

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var express = require('express');
var app = express();
var http = require('http').Server(app);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendfile('pasteboard.html');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

// SOCKET STARTS HERE

var io = require('socket.io')(http);
var marked = require('marked');
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
});

var entities = {}; // users
var messages = [];

function sendOthers(message, data, exclude) {
  for (var uid in entities) {
    if (exclude && uid === exclude) {
      continue;
    }
    var socket = entities[uid].socket;
    console.log(message, data)
    socket.emit(message, data)
  }
}


// keys must be {a, c} for hash {a:1,b:2,c:3}
function slice(data, keys) {
  return ((keys) => (keys))(data);
}

io.on('connection', function(socket){
  socket.on('update_handle', function(handle) {
    var me = entities[socket.uid];
    var prevHandle = me.handle;
    me.handle = handle;
    sendOthers('update_handle', {prev:prevHandle, curr:handle});
  });
  socket.on('register', function(handle) {
    handle = handle || Math.random().toString(36).substring(3,16);
    socket.uid = handle;
    entities[handle] = { handle:handle, socket:socket };
    var ents = [];
    Object.keys(entities).map(function(key) {
      var ent = entities[key];
      if (ent.handle === socket.uid) {
        return;
      }
      ents.push({handle:ent.handle, online:ent.socket.connected});
    });
    socket.emit('registered', {handle:handle, messages:messages, people:ents});
    socket.emit('add_pinned', {
      text:"[System Msg] Hello! Click to Message!",
      left:0,
      top:0
    });
    //socket.emit('add_pinned_list', messages);
    sendOthers('other_registered', handle, handle);
  })

  socket.on('add_text', function(content) {
    content.handle = socket.uid;
    messages.push({text:content.text, handle:content.handle});
    sendOthers('add_text', content, socket.uid);
  });
  socket.on('disconnect', function() {
    sendOthers('other_disconnect', socket.uid, socket.uid);
  })
});
