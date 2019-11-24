module.exports = {
  apps: [{
    name: 'qqbot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false
  }]
}
