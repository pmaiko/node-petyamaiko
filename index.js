require('dotenv').config()
const PORT = process.env.PORT || 8000
// https://socket.io/docs/v4/emit-cheatsheet/
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
const privateMessages = {}

const createHash = (value1, value2) => {
  if (value1 && value2 && typeof value1 === 'string' && typeof value2 === 'string') {
    let hash = [value1, value2].sort();
    return hash.join('')
  }
}

privateMessageSend = (from, to) => {
  const hash = createHash(from, to)
  io.to([from, to]).emit('private_message:send', {
    hash,
    privateMessages: privateMessages[hash]
  })
}

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

    const removedKeysPrivateMessages = []
    Object.keys(privateMessages).forEach((key => {
      if (key.includes(socket.id)) {
        delete privateMessages[key]
        removedKeysPrivateMessages.push(key)
      }
    }))
    io.emit('private_message:remove', removedKeysPrivateMessages)
    emitUpdateUser()
  })

  socket.on('add_new:user', ({ name }, callback) => {
    if (name) {
      users.unshift({
        socketId: socket.id,
        name: name
      })
      callback({
        status: 'success',
        data: users
      })
      emitUpdateUser()
    } else {
      callback({
        status: 'error',
        message: 'User name error'
      })
    }
  })

  socket.on('private_message:send', ({ to, message }, callback) => {
    if (to && message) {
      const from = socket.id

      const hash = createHash(from, to)

      const privateMessage = {
        from,
        to,
        message
      }

      if (privateMessages[hash]) {
        privateMessages[hash].push(privateMessage)
      } else {
        privateMessages[hash] = [privateMessage]
      }

      privateMessageSend(from, to)
      callback({
        status: 'success',
        data: {}
      })
    } else {
      callback({
        status: 'error',
        message: ''
      })
    }
  })
})







setInterval(() => {
  // console.log('users', users)
  console.log('privateMessages', privateMessages)
}, 10000)

console.log('users', users)


app.get('/', (req, res) => {
  res.send('HI!')
})

server.listen(PORT, () => console.log(`Server listening on port: http://localhost:${PORT}`));
