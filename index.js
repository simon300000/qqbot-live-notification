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

roomids.forEach(roomid => {
  liveStatus.set(roomid, 1)
})

bot.once('socket.connect', () => Promise.all(roomids.map(roomid => BiliAPI({ roomid }, ['mid', 'roomid'])))
  .then(infos => infos.forEach(({ roomid, mid }) => {
    const live = new KeepLiveWS(roomid)
    live.on('live', () => console.log('live', mid))

    live.on('heartbeat', async online => {
      if (online > 1) {
        if (liveStatus.get(roomid) === 1) {
          liveStatus.set(roomid, online)
          const { uname, title } = await BiliAPI({ roomid, mid }, ['uname', 'title'])
          targetGroups.forEach(targetGroup => {
            bot('send_group_msg', {
              group_id: targetGroup,
              message: [new CQText(`${uname} 开播啦！
「${title}」
https://live.bilibili.com/${roomid}`)]
            })
          })
        }
      } else {
        liveStatus.set(roomid, online)
      }
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
      if (ctx.raw_message.includes('at') && admins.includes(ctx.user_id)) {
        send(new CQAt('all'))
      }
    })
  }))
)
