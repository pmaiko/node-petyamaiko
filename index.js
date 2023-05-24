// https://socket.io/docs/v4/emit-cheatsheet/

const Logger = {
  staticLogs: [],

  addStaticLog (data) {
    this.staticLogs.push(data)
  },

  clearStaticLogs () {
    this.staticLogs = []
  },

  out: function (data) {
    streamSendMessage(data)
  },

  formatted (data) {
    return `data: ${JSON.stringify(data)}\n\n`
  }
}

let streamClients = []
const streamSendMessage = (data) => {
  if (data) {
    streamClients.forEach(client => {
      client.write(Logger.formatted(data))
    })
  }
}

require('dotenv').config()
const PORT = process.env.PORT || 8000

const fs = require('fs')
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

// app.get('/', (req, res) => {
//   fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
//     if (err) {
//       res.status(404).send(err.message)
//       return
//     }
//     res.status(200).send(data.toString())
//   })
// })

app.use(express.static(path.join(__dirname, '/')))

app.get('/stream', (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream",
  })
  res.flushHeaders()

  res.write(Logger.formatted(Logger.staticLogs))
  streamClients.push(res)

  res.on('close', () => {
    streamClients = streamClients.filter(client => client !== res)
    res.end()
  })
})

const ModuleSocket = require('./modules/socket')
ModuleSocket(io, {
  streamSendMessage,
  Logger
})

server.listen(PORT, () => {
  Logger.addStaticLog(`Server listening on port: http://localhost:${PORT}`)
})
