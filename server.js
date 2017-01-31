
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

function myID(socket) {
  return entities[socket.uid].id;
}

function myHandle(socket) {
  var data = entities[socket.uid];
  if (data) {
    return data.handle;
  }
  return 'bird-person';
}

io.on('connection', function(socket){
  socket.on('register', function(handle, id) {
    if (!id) {
      id = Math.random().toString(36).substring(3,16);
    }
    socket.uid = id;
    entities[id] = { id:id||'', handle:handle||'', socket:socket };
    socket.emit('registered', {handle:handle, id:id});
    socket.emit('add_text', {text:"[System Msg] Hello There!"});
    //sendOthers('register', handle, id);
  })

  socket.on('add_text', function(content) {
    content.handle = myHandle(socket);
    sendOthers('add_text', content, socket.uid);
  });
  // socket.on('add_link', function(content) {
  //   content.handle = myHandle(socket);
  //   sendOthers('add_link', content);
  // });
  // socket.on('add_picture', function(content) {
  //   content.handle = myHandle(socket);
  //   sendOthers('add_picture', content);
  // });

  // socket.on('disconnect', function() {
  //   var ent = entities[socket.uid];

  // })
});
