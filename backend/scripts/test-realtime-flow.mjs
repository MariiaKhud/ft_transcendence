#!/usr/bin/env node
// ============================================================================
// Real-time (Socket.IO) integration tests for articles/comments/likes.
// Covers the live-update + notification-suppression behavior added on top of
// the plain HTTP article/comment/like flow (see scripts/test-articles-flow.sh
// for the HTTP-only coverage of the same endpoints):
//   - comment:new / comment:updated / comment:deleted pushed to article:<id>
//   - article:like-updated pushed to article:<id>
//   - notification:new suppressed while the author's socket is "viewing" the
//     article (article:join), delivered once they leave (article:leave)
//   - notifications:comments-read emitted (and unread notifs marked read) on
//     article:join
//   - article:stats-updated scoped to the "feed" room only, not broadcast to
//     every connected socket
//
// Requires a running backend (BACKEND_BASE_URL, default http://localhost:3000)
// and `socket.io-client` installed (devDependency). Uses Node's built-in
// fetch + a minimal cookie jar to mimic the curl -c/-b flow used by the other
// test-*-flow.sh scripts, since sockets authenticate off the same auth_token
// cookie.
// ============================================================================

import { io } from 'socket.io-client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3000'
const RUN_ID = Date.now().toString().slice(-6)

const RED = '\x1b[0;31m'
const GREEN = '\x1b[0;32m'
const YELLOW = '\x1b[0;33m'
const BLUE = '\x1b[0;34m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

let pass = 0

function color(c, msg) {
  console.log(`${c}${msg}${RESET}`)
}

function passCheck(label) {
  pass += 1
  color(GREEN, `  ✔ PASS: ${label}`)
}

function failCheck(label, reason) {
  color(RED, `  ✘ FAIL: ${label}: ${reason}`)
  process.exitCode = 1
  throw new Error(`FAIL: ${label}`)
}

// ── Minimal cookie jar, mirroring curl -c/-b ────────────────────────────────
function makeJar() {
  const cookies = new Map()
  return {
    absorb(res) {
      const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
      for (const raw of setCookies) {
        const [pair] = raw.split(';')
        const idx = pair.indexOf('=')
        if (idx === -1) continue
        cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
      }
    },
    header() {
      return Array.from(cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
    },
  }
}

async function request(jar, path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (jar) {
    const cookieHeader = jar.header()
    if (cookieHeader) headers.Cookie = cookieHeader
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (jar) jar.absorb(res)
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

async function registerAndLogin(username, email, password = 'strongPass123') {
  const jar = makeJar()
  const reg = await request(jar, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password, displayName: username }),
  })
  if (reg.status !== 201) throw new Error(`register ${username} failed: HTTP ${reg.status} ${JSON.stringify(reg.body)}`)

  const login = await request(jar, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (login.status !== 200) throw new Error(`login ${username} failed: HTTP ${login.status} ${JSON.stringify(login.body)}`)

  return { jar, userId: login.body.data.id }
}

function connectSocket(jar) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      extraHeaders: { Cookie: jar.header() },
      reconnection: false,
      forceNew: true,
    })
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 5000)
    socket.once('connect', () => {
      clearTimeout(timer)
      resolve(socket)
    })
    socket.once('connect_error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function waitForEvent(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler)
      reject(new Error(`timed out waiting for '${event}'`))
    }, timeoutMs)
    function handler(payload) {
      clearTimeout(timer)
      socket.off(event, handler)
      resolve(payload)
    }
    socket.on(event, handler)
  })
}

// Resolves if the event does NOT fire within the window; rejects if it does.
function assertNoEvent(socket, event, windowMs = 1500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler)
      resolve()
    }, windowMs)
    function handler(payload) {
      clearTimeout(timer)
      socket.off(event, handler)
      reject(new Error(`unexpectedly received '${event}': ${JSON.stringify(payload)}`))
    }
    socket.on(event, handler)
  })
}

async function main() {
  const VALID_CONTENT = 'This is a valid article body. It is long enough to pass the minimum content length requirement of one hundred characters.'
  const authorEmail = `rt_author_${RUN_ID}@example.com`
  const authorUsername = `rt_author_${RUN_ID}`
  const commenterEmail = `rt_commenter_${RUN_ID}@example.com`
  const commenterUsername = `rt_commenter_${RUN_ID}`
  const spectatorEmail = `rt_spectator_${RUN_ID}@example.com`
  const spectatorUsername = `rt_spectator_${RUN_ID}`

  const sockets = []
  const cleanupEmails = [authorEmail, commenterEmail, spectatorEmail]

  try {
    color(BLUE, '1. Registering author, commenter, and spectator test users')
    const author = await registerAndLogin(authorUsername, authorEmail)
    const commenter = await registerAndLogin(commenterUsername, commenterEmail)
    const spectator = await registerAndLogin(spectatorUsername, spectatorEmail)
    passCheck('Registered and logged in all test users')

    color(BLUE, '2. Author creates an article')
    const createArticle = await request(author.jar, '/api/articles', {
      method: 'POST',
      body: JSON.stringify({ title: `Realtime Test Article ${RUN_ID}`, content: VALID_CONTENT, category: 'PROGRAMMING' }),
    })
    if (createArticle.status !== 201) failCheck('Create article', `HTTP ${createArticle.status}`)
    const articleId = createArticle.body.data.id
    passCheck(`Created article ${articleId}`)

    color(BLUE, '3. Connecting sockets for author, spectator (feed), and a bystander (no feed join)')
    const authorSocket = await connectSocket(author.jar)
    const spectatorSocket = await connectSocket(spectator.jar)
    const bystanderSocket = await connectSocket(commenter.jar) // reuses commenter's session for a second, independent connection
    sockets.push(authorSocket, spectatorSocket, bystanderSocket)
    passCheck('All sockets connected')

    color(BLUE, "4. Author joins the article room (article:join) — 'viewing' the article")
    authorSocket.emit('article:join', articleId)
    await waitForEvent(authorSocket, 'notifications:comments-read', 3000)
    passCheck('article:join acknowledged via notifications:comments-read')

    color(BLUE, '5. Commenter posts a comment — author should see it live (comment:new)')
    const commentWait = waitForEvent(authorSocket, 'comment:new', 3000)
    const addComment = await request(commenter.jar, `/api/articles/${articleId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Nice article!' }),
    })
    if (addComment.status !== 201) failCheck('Add comment (HTTP)', `HTTP ${addComment.status}`)
    const firstCommentId = addComment.body.data.id
    const commentNewPayload = await commentWait
    if (commentNewPayload.id !== firstCommentId || commentNewPayload.content !== 'Nice article!') {
      failCheck('comment:new payload', `unexpected payload ${JSON.stringify(commentNewPayload)}`)
    }
    passCheck('Author received comment:new live')

    color(BLUE, '6. Since the author is viewing, no notification:new should fire for that comment')
    await assertNoEvent(authorSocket, 'notification:new', 1500)
    passCheck('notification:new suppressed while author is viewing the article')

    color(BLUE, '7. Author leaves the article room (article:leave)')
    authorSocket.emit('article:leave', articleId)
    await new Promise((r) => setTimeout(r, 300)) // give the server a beat to process the leave
    passCheck('article:leave sent')

    color(BLUE, '8. Commenter posts another comment — author is no longer viewing, so a notification should fire')
    const notifWait = waitForEvent(authorSocket, 'notification:new', 3000)
    const addComment2 = await request(commenter.jar, `/api/articles/${articleId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Second comment while away' }),
    })
    if (addComment2.status !== 201) failCheck('Add second comment (HTTP)', `HTTP ${addComment2.status}`)
    const secondCommentId = addComment2.body.data.id
    const notifPayload = await notifWait
    if (notifPayload.type !== 'COMMENT' || notifPayload.refId !== articleId) {
      failCheck('notification:new payload', `unexpected payload ${JSON.stringify(notifPayload)}`)
    }
    passCheck('Author received notification:new once no longer viewing')

    color(BLUE, '9. Author re-joins the article room to watch edit/delete live-updates')
    authorSocket.emit('article:join', articleId)
    await waitForEvent(authorSocket, 'notifications:comments-read', 3000)
    passCheck('Re-joined article room')

    color(BLUE, '10. Commenter edits their comment — author should see comment:updated live')
    const updateWait = waitForEvent(authorSocket, 'comment:updated', 3000)
    const editComment = await request(commenter.jar, `/api/comments/${secondCommentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: 'Edited: second comment while away' }),
    })
    if (editComment.status !== 200) failCheck('Edit comment (HTTP)', `HTTP ${editComment.status}`)
    const updatedPayload = await updateWait
    if (updatedPayload.id !== secondCommentId || updatedPayload.content !== 'Edited: second comment while away') {
      failCheck('comment:updated payload', `unexpected payload ${JSON.stringify(updatedPayload)}`)
    }
    passCheck('Author received comment:updated live')

    color(BLUE, '11. Commenter deletes their own comment — author should see comment:deleted live')
    const deleteWait = waitForEvent(authorSocket, 'comment:deleted', 3000)
    const deleteComment = await request(commenter.jar, `/api/comments/${secondCommentId}`, { method: 'DELETE' })
    if (deleteComment.status !== 200) failCheck('Delete comment (HTTP)', `HTTP ${deleteComment.status}`)
    const deletedPayload = await deleteWait
    if (deletedPayload.id !== secondCommentId) {
      failCheck('comment:deleted payload', `unexpected payload ${JSON.stringify(deletedPayload)}`)
    }
    passCheck('Author received comment:deleted live')

    color(BLUE, '12. Commenter likes the article — author (still viewing) sees article:like-updated, no notification')
    const likeUpdateWait = waitForEvent(authorSocket, 'article:like-updated', 3000)
    const likeArticle = await request(commenter.jar, `/api/articles/${articleId}/like`, { method: 'POST' })
    if (likeArticle.status !== 200 || likeArticle.body.data.liked !== true) failCheck('Like article (HTTP)', `HTTP ${likeArticle.status} ${JSON.stringify(likeArticle.body)}`)
    const likeUpdatePayload = await likeUpdateWait
    if (likeUpdatePayload.likeCount !== 1) failCheck('article:like-updated payload', `expected likeCount 1, got ${JSON.stringify(likeUpdatePayload)}`)
    passCheck('Author received article:like-updated live')
    await assertNoEvent(authorSocket, 'notification:new', 1500)
    passCheck('notification:new suppressed for a like while author is viewing')

    color(BLUE, '13. Author leaves, commenter unlikes then likes again — this like should notify')
    authorSocket.emit('article:leave', articleId)
    await new Promise((r) => setTimeout(r, 300))
    const unlike = await request(commenter.jar, `/api/articles/${articleId}/like`, { method: 'POST' })
    if (unlike.status !== 200 || unlike.body.data.liked !== false) failCheck('Unlike article (HTTP)', `HTTP ${unlike.status}`)
    const likeNotifWait = waitForEvent(authorSocket, 'notification:new', 3000)
    const relike = await request(commenter.jar, `/api/articles/${articleId}/like`, { method: 'POST' })
    if (relike.status !== 200 || relike.body.data.liked !== true) failCheck('Re-like article (HTTP)', `HTTP ${relike.status}`)
    const likeNotifPayload = await likeNotifWait
    if (likeNotifPayload.type !== 'LIKE' || likeNotifPayload.refId !== articleId) {
      failCheck('LIKE notification:new payload', `unexpected payload ${JSON.stringify(likeNotifPayload)}`)
    }
    passCheck('Author received notification:new for a like once no longer viewing')

    color(BLUE, "14. Feed room scoping: only a socket that joined 'feed' should get article:stats-updated")
    spectatorSocket.emit('feed:join')
    await new Promise((r) => setTimeout(r, 300))
    const feedWait = waitForEvent(spectatorSocket, 'article:stats-updated', 3000)
    const bystanderNoFeedWait = assertNoEvent(bystanderSocket, 'article:stats-updated', 1500)
    const thirdComment = await request(commenter.jar, `/api/articles/${articleId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Comment to trigger feed stats update' }),
    })
    if (thirdComment.status !== 201) failCheck('Add third comment (HTTP)', `HTTP ${thirdComment.status}`)
    const feedPayload = await feedWait
    if (feedPayload.articleId !== articleId || feedPayload.commentsCount === undefined) {
      failCheck('article:stats-updated payload', `unexpected payload ${JSON.stringify(feedPayload)}`)
    }
    passCheck("Feed-joined socket received article:stats-updated")
    await bystanderNoFeedWait
    passCheck("Socket that never joined 'feed' did not receive article:stats-updated")

    color(BLUE, '15. Cleaning up: deleting the test article')
    const deleteArticle = await request(author.jar, `/api/articles/${articleId}`, { method: 'DELETE' })
    if (deleteArticle.status !== 200) failCheck('Delete article (HTTP)', `HTTP ${deleteArticle.status}`)
    passCheck('Test article deleted')

    color(GREEN, '==============================================')
    color(GREEN, ` ALL ${pass} CHECKS PASSED`)
    color(GREEN, '==============================================')
  } finally {
    for (const s of sockets) {
      try { s.disconnect() } catch { /* ignore */ }
    }
    // Connects directly to Postgres (same driver-adapter setup as src/lib/prisma.ts),
    // so cleanup works whether this script runs inside the backend container
    // (DATABASE_URL points at the `postgres` service host) or from the host
    // (falls back to localhost, which docker-compose exposes 5432 on).
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://transcendence:transcendence@localhost:5432/transcendence'
    try {
      const adapter = new PrismaPg({ connectionString: databaseUrl })
      const prisma = new PrismaClient({ adapter })
      await prisma.user.deleteMany({ where: { email: { in: cleanupEmails } } })
      await prisma.$disconnect()
      color(DIM, 'Test users cleaned up')
    } catch (err) {
      color(YELLOW, `Cleanup skipped (${err.message}) — test users left behind: ${cleanupEmails.join(', ')}`)
    }
  }
}

main().catch((err) => {
  color(RED, `Fatal: ${err.message}`)
  process.exitCode = 1
})
