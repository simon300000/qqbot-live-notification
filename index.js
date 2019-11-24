const { CQWebSocket } = require('cq-websocket')
const got = require('got')

const BiliAPI = require('bili-api')
const { KeepLiveWS } = require('bilibili-live-ws')

const { targetGroups, roomids, ws, httpGroupMsgUrl } = require('./config')

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

Promise.all(roomids.map(roomid => BiliAPI({ roomid }, ['mid', 'roomid'])))
  .then(infos => infos.forEach(({ roomid, mid }) => {
    const live = new KeepLiveWS(roomid)
    live.on('live', () => console.log('live', mid))
    live.on('LIVE', () => console.log('LIVE', mid))

    live.on('LIVE', async () => {
      const { uname, title } = await BiliAPI({ roomid, mid }, ['uname', 'title'])
      targetGroups.forEach(targetGroup => {
        got(httpGroupMsgUrl, {
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            group_id: targetGroup,
            message: `${uname} 开播啦！
${title}
https://live.bilibili.com/${roomid}`
          })
        })
      })
    })

    bot.on('message.group.@.me', async (_e, ctx) => {
      got(httpGroupMsgUrl, {
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          group_id: ctx.group_id,
          message: '「你好呀，我是莎茶酱」'
        })
      })
      if (ctx.raw_message.includes('stats')) {
        const { uname, title, follower, online } = await BiliAPI({ mid, roomid }, ['uname', 'title', 'follower', 'online'])
        got(httpGroupMsgUrl, {
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            group_id: ctx.group_id,
            message: JSON.stringify({ mid, roomid, uname, title, follower, online }, undefined, 2)
          })
        })
      }
    })
  }))
