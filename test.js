const Fluture = require('fluture')
const http = require('http')

const beepAfter2 = (done) => {
  setTimeout(() => done(null, { message: 'beep boop' }), 2000)
}

Fluture
  .node(beepAfter2)
  .pipe(Fluture.map((value) => value))
  .pipe(Fluture.fork(
    (err) => console.error(err),
    (result) => console.log(result)
  ))

const server = http.createServer((req, res) => {

})

server.listen(9966)
console.log('listening')
