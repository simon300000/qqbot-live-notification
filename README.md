# qqbot live notification

可以达到直播开始时通过CoolQ提醒QQ群的目的

### 运行

```shell
npm i
node index.js
```

或者可以通过`ecosystem.config.js`使用pm2

### 配置

编辑`config.js`文件

例子:

```javascript
module.exports = {
  list: [{ // 可以填多个
    ws: {
      host: '127.0.0.1', // coolq http WebSocket Host
      port: 6701 // coolq http WebSocket 端口
    },
    hi: '「你好呀，我是莎茶酱」', // 被@时说的话
    targetGroups: [640969703], // 需要通知的群
    roomids: [870004] // 监测的房间号
  }],
  admins: [2241139100] // 这里是Bot管理员的信息，没啥用，可以用一点特殊指令
}
```

