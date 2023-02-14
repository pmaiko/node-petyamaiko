module.exports = function (io) {
  let users = []
  const privateMessages = {}

  const createHash = (value1, value2) => {
    if (value1 && value2 && typeof value1 === 'string' && typeof value2 === 'string') {
      let hash = [value1, value2].sort();
      return hash.join('')
    }
  }

  const createResponse = ({status, data, message} = {}) => {
    return {
      status: status || '',
      data: data || {},
      message: message || ''
    }
  }

  const privateMessageSend = (from, to) => {
    const hash = createHash(from, to)
    io.to([from, to]).emit('private_message:send', {
      hash,
      privateMessages: privateMessages[hash]
    })
  }

  const emitUsersUpdate = () => {
    io.emit('users:update', users)
  }

  emitUsersUpdate()

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
      emitUsersUpdate()
    })

    socket.on('user:add_new', ({ name }, callback) => {
      if (name) {
        users.unshift({
          socketId: socket.id,
          name: name,
          timestamp: new Date().getTime()
        })
        callback(createResponse({
          status: 'success',
          data: users
        }))
        emitUsersUpdate()
      } else {
        callback(createResponse({
          status: 'error',
          message: 'User name error'
        }))
      }
    })

    socket.on('private_message:send', ({ to, message }, callback) => {
      if (to && message) {
        const from = socket.id

        const hash = createHash(from, to)

        const privateMessage = {
          from,
          to,
          message,
          timestamp: new Date().getTime()
        }

        if (privateMessages[hash]) {
          privateMessages[hash].push(privateMessage)
        } else {
          privateMessages[hash] = [privateMessage]
        }

        privateMessageSend(from, to)

        const userFrom = users.find(user => user.socketId === from)
        io.to([to]).emit('notification:send-message', {
          from: from,
          name: userFrom ? userFrom.name : '',
          message: message
        })
        callback(createResponse({
          status: 'success',
        }))
      } else {
        callback(createResponse({
          status: 'error',
        }))
      }
    })

    socket.on('notification:typing', ({ to }) => {
      io.to([to]).emit('notification:typing', {
        from: socket.id
      })
    })
  })

  setInterval(() => {
    // console.log('users', users)
    console.log('privateMessages', privateMessages)
  }, 10000)

  return {
    users,
    privateMessages
  }
}
