module.exports = function (io) {
  let users = []
  const privateMessages = {}

  const callTypes = {
    CALLING: 'CALLING',
    SPEAKING: 'SPEAKING',
    CANSEL: 'CANSEL',
    COMPLETED: 'COMPLETED'
  }

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
    console.log(`User connected socketId = ${socket.id}`)

    socket.on('disconnect', () => {
      console.log(`User disconnect socketId = ${socket.id}`)
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
          timestamp: new Date().getTime(),
          isWatched: false
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

    socket.on('private_message:update', ({ from, to, isWatched }) => {
      console.log('private_message:update')
      const hash = createHash(from, to)
      if (privateMessages[hash]) {
        privateMessages[hash] = privateMessages[hash].map(item => {
          item.isWatched = true
          return item
        })

        io.to([to]).emit('private_message:update', {
          hash
        })
      }
    })

    socket.on('notification:typing', ({ to }) => {
      io.to([to]).emit('notification:typing', {
        from: socket.id
      })
    })

    socket.on(callTypes.CALLING, ({from, to}) => {
      io.to([to]).emit(callTypes.CALLING, {
        from: from,
        to: to
      })
    })

    socket.on(callTypes.CANSEL, ({from, to}) => {
      io.to([from, to]).emit(callTypes.CANSEL, {
        from: from,
        to: to
      })
    })

    socket.on(callTypes.SPEAKING, ({from, to}) => {
      io.to([from, to]).emit(callTypes.SPEAKING, {
        from: from,
        to: to
      })
    })

    socket.on(callTypes.COMPLETED, ({from, to}) => {
      io.to([from, to]).emit(callTypes.COMPLETED, {
        from: from,
        to: to
      })
    })

    socket.on('peer', ({ peerId, to }) => {
      io.to([to]).emit('peer', {
        peerId: peerId,
        to: to
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
