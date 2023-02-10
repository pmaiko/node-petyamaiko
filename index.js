require('dotenv').config()
const PORT = process.env.PORT || 8000

const path = require('path')
const http = require('http')

// https://socket.io/docs/v4/emit-cheatsheet/

const express = require('express')
const app = express()
const cors = require('cors')
app.use(cors({origin: '*'}))
const server = http.createServer(app)

const { Server } = require("socket.io")
const io = new Server(server, {
  cors: '*'
})

let users = []

const emitUpdateUser = () => {
  io.emit('update:users', users)
}
emitUpdateUser()
io.on('connection', (socket) => {
  console.log('user connected')
  console.log(socket.id)
  console.log('--------------------')

  socket.on('disconnect', () => {
    console.log('user disconnect')
    console.log(socket.id)
    users = users.filter(user => user.socketId !== socket.id)
    emitUpdateUser()
  })

  socket.on('add-new:user', ({ name }, callback) => {
    if (name) {
      users.unshift({
        socketId: socket.id,
        name: name
      })
      callback(users)
      emitUpdateUser()
    } else {
      callback([])
    }
  })
})

setInterval(() => {
  console.log('users', users)
}, 30000)

console.log('users', users)


app.get('/', (req, res) => {
  res.send('HI!')
})

server.listen(PORT, () => console.log(`Server listening on port: http://localhost:${PORT}`));
