const uuid = require('uuid').v4

module.exports = function (io) {
  let users = []
  const privateMessages = {}

  const callTypes = {
    CALLING: 'CALLING',
    SPEAKING: 'SPEAKING',
    CANSEL: 'CANSEL',
    COMPLETED: 'COMPLETED'
  }

  const getConversationId = (sender, recipient) => {
    if (sender && recipient && typeof sender === 'string' && typeof recipient === 'string') {
      let hash = [sender, recipient].sort();
      return hash.join('')
    }
  }

  const Response = ({status, data, message} = {}) => {
    return {
      status: status || '',
      data: data || {},
      message: message || ''
    }
  }

  const updateUsers = () => {
    io.emit('users:update', users)
  }

  updateUsers()

  io.on('connection', (socket) => {
    console.log(`User connected socketId = ${socket.id}`)

    // setTimeout(() => {
    //   socket.disconnect()
    // }, 5000)

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
      updateUsers()
    })

    socket.on('user:add', ({ userName }, callback) => {
      if (userName) {
        const user = {
          socketId: socket.id,
          name: userName,
          timestamp: new Date().getTime()
        }
        users.unshift(user)
        callback(Response({
          status: 'success',
          data: user
        }))
        updateUsers()
      } else {
        callback(Response({
          status: 'error',
          message: 'User name error'
        }))
      }
    })

    socket.on('message:send', (req, cb) => {
      const id = uuid()
      const senderId = req.senderId
      const recipientId = req.recipientId
      const text = req.text
      const timestamp = new Date().getTime()
      const watched = false

      const conversationId = getConversationId(senderId, recipientId)

      const message = {
        id,
        senderId,
        recipientId,
        text,
        timestamp,
        watched
      }

      if (privateMessages[conversationId]) {
        privateMessages[conversationId].push(message)
      } else {
        privateMessages[conversationId] = [message]
      }

      cb(Response({
        status: 'success'
      }))

      io.to([senderId, recipientId]).emit('messages:update', {
        conversationId,
        messages: privateMessages[conversationId]
      })

      io.to([recipientId]).emit('message:notification', {
        senderId: message.senderId,
        text: message.text
      })
    })

    socket.on('messages:watchedIds', (req, cb) => {
      const senderId = req.senderId
      const recipientId = req.recipientId
      const ids = req.ids
      console.log(senderId)
      console.log(recipientId)
      console.log(ids)

      const conversationId = getConversationId(senderId, recipientId)

      if (privateMessages[conversationId]) {
        privateMessages[conversationId] = privateMessages[conversationId].map(message => {
          if (senderId === message.recipientId && ids.includes(message.id)) {
            message.watched = true
          }

          return message
        })

        cb(Response({
          status: 'success'
        }))

        io.to([senderId, recipientId]).emit('messages:update', {
          conversationId,
          messages: privateMessages[conversationId]
        })
      } else {
        cb(Response({
          status: 'error'
        }))
      }
    })


    //
    // socket.on('private_message:update', ({ from, to, isWatched }) => {
    //   console.log('private_message:update')
    //   const hash = createHash(from, to)
    //   if (privateMessages[hash]) {
    //     privateMessages[hash] = privateMessages[hash].map(item => {
    //       item.isWatched = true
    //       return item
    //     })
    //
    //     io.to([to]).emit('private_message:update', {
    //       hash
    //     })
    //   }
    // })
    //
    // socket.on('notification:typing', ({ to }) => {
    //   io.to([to]).emit('notification:typing', {
    //     from: socket.id
    //   })
    // })

    // WebRTC
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

    socket.on('peer:open', ({ peerId, to }) => {
      io.to([to]).emit('peer:open', {
        peerId: peerId,
        to: to
      })
    })

    socket.on('peer:disconnected', ({ peerId, to }) => {
      io.to([to]).emit('peer:disconnected', {
        peerId: peerId,
        to: to
      })
    })
  })

  setInterval(() => {
    // console.log('users', users)
    // console.log('privateMessages', privateMessages)
  }, 10000)

  return {
    users,
    privateMessages
  }
}
