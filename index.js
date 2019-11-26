const { CQWebSocket, CQText } = require('cq-websocket')

const BiliAPI = require('bili-api')
const { KeepLiveWS } = require('bilibili-live-ws')

const { targetGroups, roomids, ws } = require('./config')

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

Promise.all(roomids.map(roomid => BiliAPI({ roomid }, ['mid', 'roomid'])))
  .then(infos => infos.forEach(({ roomid, mid }) => {
    const live = new KeepLiveWS(roomid)
    live.on('live', () => console.log('live', mid))

    live.on('online', async online => {
      if (online > 1) {
        if (liveStatus.get(mid) === 1) {
          const { uname, title } = await BiliAPI({ roomid, mid }, ['uname', 'title'])
          targetGroups.forEach(targetGroup => {
            bot('send_group_msg', {
              group_id: targetGroup,
              message: [new CQText(`${uname} 开播啦！
${title}
https://live.bilibili.com/${roomid}`)]
            })
          })
        }
      }
      liveStatus.set(mid, online)
    })

    bot.on('message.group.@.me', async (_e, ctx) => {
      bot('send_group_msg', {
        group_id: ctx.group_id,
        message: [new CQText('「你好呀，我是莎茶酱」')]
      })
      if (ctx.raw_message.includes('stats')) {
        const { uname, title, follower, online } = await BiliAPI({ mid, roomid }, ['uname', 'title', 'follower', 'online'])
        bot('send_group_msg', {
          group_id: ctx.group_id,
          message: [new CQText(JSON.stringify({ mid, roomid, uname, title, follower, online }, undefined, 2))]
        })
      }
    })
  }))
