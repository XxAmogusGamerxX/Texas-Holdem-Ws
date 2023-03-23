var express = require('express')
var expressWs = require('express-ws')

var app = express()
expressWs(app)

var index = 0;

var lobby = 1;
var lobbies = [];

app.ws('/echo', (ws) => {
    ws._socket._peername = index; // Give new user an index
    console.log("New client connected with ID:", ws._socket._peername);
    index += 1;

    ws.on("message", e => {

        // on message (client sent us a request/some information)

        e = e.toString(); // the actual request
        console.log(`Client with ID ${ws._socket._peername} has sent us: ${e}`); // just logging the information

        if (e.toString() == "create") { // if they want to create a server
            ws.send("createCD" + lobby.toString()); // send them back the "createCD" command and the lobbie's id the client recives that and knows that its now in a lobby;
            lobbies.push([lobby.toString(), 1, [[ws, ws._socket._peername,"",0]],0]); // 1 lobby consists of [lobbie's id, players in the lobby, websockets and other info [[the actual websocket, the id, the choice it made currently, the reloads it has]], players who made a move]
            lobby += 1; // just make the next lobby have a code that is up one so there arent overlapping
        }

        if (e.toString().startsWith("restart")) { // restart the game (this request is asking for restart but actually goes "restartLOBBYID" so we know what lobby)
            e = e.substring(7); // remove the restart part so we just have the lobbie's id
            e--; // remove 1 from it so that we get the actual index not just the id
            lobbies[e][3] = 0; // set the amount of things done back to 0
            lobbies[e][2][0][0].send("restart"); // send both the involved clients back restart so they know to update the html
            lobbies[e][2][1][0].send("restart");
        }

        if(e.toString().startsWith("choice_")) {
          e = e.substring(7);
          let arr = e.split('_');
          let i = 0;
          let i2 = 0;
          let found = false;

          do {
            if(lobbies[arr[1] - 1][2][i][1] == ws._socket._peername) {
              i2 = i;
              found = true;
            }
            i++
          } while (i < 2);

          if(found == true) {
            lobbies[arr[1] - 1][2][i2][3] = arr[0];
            lobbies[arr[1] - 1][3] += 1;
          }
          
          if(lobbies[arr[1] - 1][3] == 2) {
            const choices = [];
            choices.push(lobbies[arr[1] - 1][2][0][3]);
            choices.push(lobbies[arr[1] - 1][2][1][3]);
          }
        }
        if (e.toString().startsWith("join")) { // if a user triest to join (this request is also "joinLOBBYID" so we know the lobby)
            e = e.substring(4); // remove the join part so we get the lobby id
            var found = false;
            let i = 0;
            let i2 = 0;
            var i3 = false;
            do {
                if(lobbies[i][0] == e) { // if the lobby is this one
                    if(lobbies[i][1] < 2) { // if the players in the lobby is less than 2 (so it can be joined)
                        i2 = i; // save the lobby to i2
                        i3 = true; 
                    } else {
                        ws.send("maxPlayer"); // send back that there are too many players already
                        i3 = false;
                    }
                    found = true;
                }
                i++;
            } while (i < lobbies.length);
            if(found == true) {
                if(i3 == true) {
                    lobbies[i2][1] += 1; // add 1 to the player count in the lobby
                    lobbies[i2][2].push([ws, ws._socket._peername,"",0]); // add the websocket and other information to the lobby on the server end
                    ws.send("join" + e); // send that they are valid to join the lobby and the code they join
                    lobbies[i2][2][0][0].send("startGame"); // tell both players to start the game
                    lobbies[i2][2][1][0].send("startGame");
                }
                
            } else {
                ws.send("failj"); // lobby not found
            }

        }

    });

    ws.on('close', () => {
        console.log(`Client with ID ${ws._socket._peername} has disconnected!`);
    });
});


app.use("/server", express.static(__dirname + '/server'));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/server/index.html");
});
app.listen(3000, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", 3000);
});