const { CQWebSocket, CQText, CQAt } = require('cq-websocket')

const BiliAPI = require('bili-api')
const { KeepLiveWS } = require('bilibili-live-ws')

const { targetGroups, roomids, ws, admins } = require('./config')

const bot = new CQWebSocket(ws)

bot.on('socket.connecting', (_socketType, attempts) => {
  console.log('CONNECTING', attempts)
})

bot.on('socket.connect', (_socketType, _sock, attempts) => {
  console.log('CONNECT', attempts)
})

bot.on('socket.failed', (_socketType, attempts) => {
  console.error('FAILED', attempts)
})

bot.on('socket.error', e => {
  console.error('ERROR', e)
})

bot.connect()

const liveStatus = new Map()
const justLive = new Map()

const nowLive = roomid => {
  if (justLive.has(roomid)) {
    clearTimeout(justLive.get(roomid))
  }
  const timeout = setTimeout(() => justLive.delete(roomid), 1000 * 60 * 5)
  justLive.set(roomid, timeout)
}

roomids.forEach(roomid => {
  liveStatus.set(roomid, 1)
})

const dispatch = (...message) => targetGroups.forEach(targetGroup => bot('send_group_msg', {
  group_id: targetGroup,
  message
}))

bot.once('socket.connect', () => Promise.all(roomids.map(roomid => BiliAPI({ roomid }, ['mid', 'roomid'])))
  .then(infos => infos.forEach(({ roomid, mid }) => {
    const sendLiveMessage = async () => {
      const { uname, title } = await BiliAPI({ roomid, mid }, ['uname', 'title'])
      dispatch(new CQAt('all'), new CQText(`${uname} 开播啦！
「${title}」
https://live.bilibili.com/${roomid}`))
    }
    const live = new KeepLiveWS(roomid)
    live.on('live', () => console.log('live', mid))
    live.on('LIVE', () => {
      if (!justLive.has(roomid)) {
        sendLiveMessage()
      }
      nowLive(roomid)
    })
    live.on('heartbeat', async online => {
      if (online > 1 && liveStatus.get(roomid) === 1 && !justLive.has(roomid)) {
        sendLiveMessage()
      }
      liveStatus.set(roomid, online)
    })

    bot.on('message.group.@.me', async (_e, ctx) => {
      const send = (...message) => bot('send_group_msg', {
        group_id: ctx.group_id,
        message
      })
      send(new CQText('「你好呀，我是莎茶酱」'))
      if (ctx.raw_message.includes('stats')) {
        const { uname, title, follower } = await BiliAPI({ mid, roomid }, ['uname', 'title', 'follower'])
        send(new CQText(JSON.stringify({ mid, roomid, uname, title, follower, online: live.online }, undefined, 2)))
      }
      if (ctx.raw_message.includes('test')) {
        send(new CQText(`https://live.bilibili.com/${roomid}`))
      }
      if (ctx.raw_message.includes('testat') && admins.includes(ctx.user_id)) {
        send(new CQAt('all'))
      }
    })
  }))
)
