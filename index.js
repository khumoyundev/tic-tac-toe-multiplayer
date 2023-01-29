const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*" /* means any request that is coming from outside is allowed */
    }
});
const port = process.env.PORT || 3000;

let users = [],
    splitUsers = {};

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/client'));

io.on("connection", _socket => {
    users.push(_socket);
    splitUsers = {};

    if (users.length % 2 === 0) {
        for (let i = 0; i <= (users.length * 0.5); i += 2) {
            splitUsers["room:" + i] = [users[i], users[i + 1]];
        }
    }

    for (let i in splitUsers) {
        if (splitUsers[i][0].data.room) continue;

        splitUsers[i][0].data.room = i;
        splitUsers[i][1].data.room = i;
    }

    _socket.on("registered-user", _ => {
        for (let i in splitUsers) {
            /* if both users have a username, then they're already registered and ready to play */
            if (splitUsers[i][1].data.username && splitUsers[i][0].data.username) {
                splitUsers[i][0].join(i);
                splitUsers[i][1].join(i);
                /* Circle */
                splitUsers[i][0].emit("start-game", false);
                /* X */
                splitUsers[i][1].emit("start-game", true);
            }
        }
    });

    _socket.on("cursor-move", _mouse => {
        if (_socket.data.room) {
            _socket.to(_socket.data.room).emit("cursor-move", _mouse, _socket.data.username);
        }
    });

    _socket.on("disconnect", () => {
        if (_socket.data.room) {
            _socket.to(_socket.data.room).emit("opponent-disconnected", _socket.data.username);
        }

        users = users.filter(_el => _el.id !== _socket.id);
        for (const i in splitUsers) {
            if (Array.isArray(splitUsers[i])) {
                splitUsers[i].forEach(_ => {
                    if (_.id === _socket.id) {
                        delete splitUsers[i];
                    }
                });
            }
        }
    });

    _socket.on("play", (_target, _currentClass) => {
        if (_socket.data.room) {
            _socket.to(_socket.data.room).emit("opponent", _target, _currentClass);
        }
    });

    _socket.on("set-username", _username => {
        _socket.data.username = _username;
    });

    _socket.on("notify", _message => {
        if (_socket.data.room) {
            _socket.to(_socket.data.room).emit("set-notify", _message);
        }
    });

});
