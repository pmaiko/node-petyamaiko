// https://socket.io/docs/v4/emit-cheatsheet/

require('dotenv').config()
const PORT = process.env.PORT || 8000

const path = require('path')
const http = require('http')

const express = require('express')
const app = express()
const cors = require('cors')
app.use(cors({origin: '*'}))
const server = http.createServer(app)

const { Server } = require("socket.io")
const io = new Server(server, {
  cors: {
    origin: "*",
  }
})

const { ExpressPeerServer } = require('peer')
const peerServer = ExpressPeerServer(server, {
  debug: true
})
app.use("/peerjs", peerServer)

peerServer.on('connection', (client) => {
  console.log('peer client.id', client.id)
})

const ModuleSocket = require('./modules/socket')
ModuleSocket(io)

app.get('/', (req, res) => {
  res.send('HI!')
})

server.listen(PORT, () => console.log(`Server listening on port: http://localhost:${PORT}`));
