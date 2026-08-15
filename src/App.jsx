import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import questionBank from './data/questionBank'

const NICKNAME_KEY = 'kpop-nickname-v2'
const API_BASE = import.meta.env.VITE_API_BASE || (
  typeof window !== 'undefined' && /github\.io/i.test(window.location.hostname)
    ? 'https://kpop-kdc8.onrender.com'
    : import.meta.env.DEV ? 'http://localhost:4000' : ''
)

const LETTERS = ['A', 'B', 'C', 'D']
const QUIZ_SIZE = 10

const buildApiUrl = (path) => {
  if (!API_BASE) return path
  return `${API_BASE.replace(/\/$/, '')}${path}`
}

const readInvite = () => {
  if (typeof window === 'undefined') return { room: '', host: '' }
  const params = new URLSearchParams(window.location.search)
  return {
    room: (params.get('room') || '').trim(),
    host: (params.get('host') || '').trim(),
  }
}

const makeRoomCode = (name = '') => {
  const slug = String(name).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '').slice(0, 8) || 'room'
  return `${slug}-${Math.random().toString(36).slice(2, 6)}`
}

const normalizeQuestion = (question, index = 0, keepAnswer = false) => {
  const safeOptions = Array.isArray(question.options)
    ? question.options.slice(0, 4).map((option) => String(option || '').trim()).filter(Boolean)
    : []

  const options = safeOptions.length >= 4
    ? safeOptions.slice(0, 4)
    : [...safeOptions, ...Array.from({ length: Math.max(0, 4 - safeOptions.length) }, (_, offset) => `选项 ${offset + 1}`)]

  const parsedIndex = Number.isInteger(question.correctIndex) ? question.correctIndex : null

  return {
    ...question,
    id: question.id || `q-${index + 1}`,
    category: question.category || 'K-pop',
    prompt: String(question.prompt || '').trim() || `题目 ${index + 1}`,
    options,
    correctIndex: keepAnswer && parsedIndex !== null
      ? Math.min(Math.max(parsedIndex, 0), 3)
      : null,
  }
}

const normalizeQuestions = (items = [], keepAnswer = false, limit = null) => {
  if (!Array.isArray(items)) return []
  const normalized = items
    .map((question, index) => normalizeQuestion(question, index, keepAnswer))
    .filter((question) => Array.isArray(question.options) && question.options.length === 4)
  return limit ? normalized.slice(0, limit) : normalized
}

const getStarterQuestions = () => {
  if (!questionBank?.length) return []
  const shuffled = [...questionBank].sort(() => Math.random() - 0.5)
  return normalizeQuestions(shuffled, false, QUIZ_SIZE)
}

const getShareUrl = (roomName, hostName) => {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('room', roomName)
  url.searchParams.set('host', hostName)
  return url.toString()
}

const toAnswerList = (answers, length) => {
  if (Array.isArray(answers)) {
    return Array.from({ length }, (_, index) => (answers[index] === undefined ? null : answers[index]))
  }
  if (answers && typeof answers === 'object') {
    return Array.from({ length }, (_, index) => {
      const value = answers[index] ?? answers[String(index)]
      return value === undefined ? null : value
    })
  }
  return Array.from({ length }, () => null)
}

const optionText = (question, index) => {
  if (!Number.isInteger(index) || !question?.options?.[index]) return '未作答'
  return question.options[index]
}

function App() {
  const invite = useMemo(() => readInvite(), [])
  const [screen, setScreen] = useState('home')
  const [nicknameInput, setNicknameInput] = useState(() => {
    try {
      return localStorage.getItem(NICKNAME_KEY) || ''
    } catch {
      return ''
    }
  })
  const [playerName, setPlayerName] = useState('')
  const [questions, setQuestions] = useState([])
  const [roomName, setRoomName] = useState(invite.room)
  const [hostName, setHostName] = useState(invite.host)
  const [leaderboard, setLeaderboard] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [score, setScore] = useState(0)
  const [isEditingQuestion, setIsEditingQuestion] = useState(false)
  const [draftQuestion, setDraftQuestion] = useState(null)
  const [shareNotice, setShareNotice] = useState('')
  const [statusText, setStatusText] = useState('')
  const [roomInfo, setRoomInfo] = useState(null)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [sharing, setSharing] = useState(false)
  const captureRef = useRef(null)

  const currentQuestion = questions[currentIndex] || null
  const selectedAnswer = selectedAnswers[currentIndex]
  const totalQuestions = questions.length
  const answeredCount = Object.keys(selectedAnswers).length

  useEffect(() => {
    try {
      localStorage.removeItem('kpop-quiz-state-v1')
      localStorage.removeItem('kpop-player-name-v1')
      if (nicknameInput) localStorage.setItem(NICKNAME_KEY, nicknameInput)
    } catch {
      /* ignore */
    }
  }, [nicknameInput])

  useEffect(() => {
    if (!roomName || (screen !== 'result' && screen !== 'host-share')) return undefined

    let alive = true
    const loadBoard = async () => {
      try {
        const path = screen === 'host-share'
          ? `/api/room/${encodeURIComponent(roomName)}/results`
          : `/api/leaderboard?room=${encodeURIComponent(roomName)}`
        const res = await fetch(buildApiUrl(path))
        if (!res.ok || !alive) return
        const data = await res.json()
        if (screen === 'host-share') {
          setLeaderboard(Array.isArray(data.records) ? data.records : [])
        } else {
          setLeaderboard(Array.isArray(data) ? data : [])
        }
      } catch {
        if (alive) setLeaderboard([])
      }
    }

    loadBoard()
    const timer = screen === 'host-share' ? window.setInterval(loadBoard, 4000) : null
    return () => {
      alive = false
      if (timer) window.clearInterval(timer)
    }
  }, [roomName, screen])

  useEffect(() => {
    setIsEditingQuestion(false)
    setDraftQuestion(null)
  }, [currentIndex])

  const showToast = (message, kind = 'info') => {
    setToast({ message, kind })
    window.clearTimeout(showToast.timer)
    showToast.timer = window.setTimeout(() => setToast(null), 2200)
  }

  const requireNickname = () => {
    const trimmed = nicknameInput.trim()
    if (!trimmed) {
      showToast('请输入昵称后再继续。', 'error')
      return ''
    }
    return trimmed
  }

  const startHost = () => {
    const name = requireNickname()
    if (!name) return
    setPlayerName(name)
    setHostName(name)
    setRoomName(makeRoomCode(name))
    setQuestions(getStarterQuestions())
    setCurrentIndex(0)
    setSelectedAnswers({})
    setScore(0)
    setRoomInfo(null)
    setStatusText('')
    setScreen('host-setup')
  }

  const startJoin = () => {
    const name = requireNickname()
    if (!name) return
    setPlayerName(name)
    if (invite.room) setRoomName(invite.room)
    if (invite.host) setHostName(invite.host)
    setStatusText('')
    setScreen('join')
  }

  const startLookup = () => {
    const name = requireNickname()
    if (!name) return
    setPlayerName(name)
    if (invite.room) setRoomName(invite.room)
    if (invite.host) setHostName(invite.host)
    setStatusText('')
    setSelectedRecord(null)
    setScreen('lookup')
  }

  const goHome = () => {
    setScreen('home')
    setPlayerName('')
    setQuestions([])
    setCurrentIndex(0)
    setSelectedAnswers({})
    setScore(0)
    setRoomInfo(null)
    setStatusText('')
    setIsEditingQuestion(false)
    setDraftQuestion(null)
    setLeaderboard([])
    setSelectedRecord(null)
  }

  const handleSelect = (optionIndex) => {
    if (!currentQuestion || isEditingQuestion) return
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }))
  }

  const swapCurrentQuestion = () => {
    if (screen !== 'host-play' || !currentQuestion) return
    const usedIds = new Set(questions.map((question) => question.id))
    const pool = questionBank
      .map((question, index) => normalizeQuestion(question, index, false))
      .filter((question) => question.options.length === 4 && !usedIds.has(question.id))

    if (!pool.length) {
      showToast('题库里暂时没有更多可换的题目。', 'error')
      return
    }

    const nextQuestion = pool[Math.floor(Math.random() * pool.length)]
    setQuestions((prev) => prev.map((question, index) => (
      index === currentIndex ? nextQuestion : question
    )))
    setSelectedAnswers((prev) => {
      const next = { ...prev }
      delete next[currentIndex]
      return next
    })
    setIsEditingQuestion(false)
    setDraftQuestion(null)
  }

  const startEditing = () => {
    if (!currentQuestion) return
    setDraftQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options],
    })
    setIsEditingQuestion(true)
  }

  const updateDraftQuestion = (field, value) => {
    setDraftQuestion((prev) => ({ ...prev, [field]: value }))
  }

  const updateDraftOption = (index, value) => {
    setDraftQuestion((prev) => ({
      ...prev,
      options: prev.options.map((option, idx) => (idx === index ? value : option)),
    }))
  }

  const saveQuestionEdit = () => {
    if (!draftQuestion) return
    const cleanedOptions = draftQuestion.options.map((option) => option.trim()).filter(Boolean)
    if (!draftQuestion.prompt.trim() || cleanedOptions.length < 4) {
      showToast('题目和四个选项都不能为空。', 'error')
      return
    }

    const updatedQuestion = {
      ...draftQuestion,
      category: draftQuestion.category.trim() || 'K-pop',
      prompt: draftQuestion.prompt.trim(),
      options: cleanedOptions.slice(0, 4),
      correctIndex: null,
    }

    setQuestions((prev) => prev.map((question, index) => (
      index === currentIndex ? updatedQuestion : question
    )))
    setIsEditingQuestion(false)
    setDraftQuestion(null)
  }

  const publishRoom = async () => {
    const trimmedPlayer = playerName.trim()
    const trimmedRoom = roomName.trim()
    if (!trimmedPlayer || !trimmedRoom) {
      showToast('请填写昵称和房间名。', 'error')
      return false
    }

    if (answeredCount < questions.length) {
      showToast('请先为每一题选出标准答案。', 'error')
      return false
    }

    const payloadQuestions = questions.map((question, index) => ({
      ...question,
      correctIndex: selectedAnswers[index],
    }))

    setBusy(true)
    try {
      const res = await fetch(buildApiUrl('/api/room'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: trimmedRoom,
          hostName: trimmedPlayer,
          questions: payloadQuestions,
        }),
      })

      if (!res.ok) throw new Error('房间保存失败')

      setRoomInfo({ roomName: trimmedRoom, hostName: trimmedPlayer })
      setHostName(trimmedPlayer)
      setQuestions(payloadQuestions)
      setScreen('host-share')
      setStatusText(`房间 ${trimmedRoom} 已生成，把房间名或链接发给朋友即可。`)
      return true
    } catch (error) {
      console.error(error)
      showToast('创建房间失败，请检查后端服务是否已启动。', 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const beginHostPlay = () => {
    const trimmedPlayer = playerName.trim()
    const trimmedRoom = roomName.trim()
    if (!trimmedPlayer || !trimmedRoom) {
      showToast('请输入你的昵称和房间名。', 'error')
      return
    }
    setPlayerName(trimmedPlayer)
    setHostName(trimmedPlayer)
    if (!questions.length) setQuestions(getStarterQuestions())
    setCurrentIndex(0)
    setSelectedAnswers({})
    setScreen('host-play')
  }

  const joinRoom = async () => {
    const trimmedPlayer = nicknameInput.trim()
    const trimmedRoom = roomName.trim()
    const trimmedHost = hostName.trim()

    if (!trimmedPlayer || !trimmedRoom || !trimmedHost) {
      showToast('昵称、房间名和房主名字都需要填写。', 'error')
      return
    }

    setBusy(true)
    try {
      const res = await fetch(buildApiUrl(`/api/room/${encodeURIComponent(trimmedRoom)}`))
      if (!res.ok) throw new Error('Room not found')

      const data = await res.json()
      if (data.hostName.trim().toLowerCase() !== trimmedHost.toLowerCase()) throw new Error('房主昵称不匹配')

      const loaded = normalizeQuestions(data.questions || [], true)
      if (!loaded.length) throw new Error('房间题目为空')

      setPlayerName(trimmedPlayer)
      setRoomInfo({ roomName: trimmedRoom, hostName: trimmedHost })
      setQuestions(loaded)
      setCurrentIndex(0)
      setSelectedAnswers({})
      setScore(0)
      setScreen('play')
      setStatusText(`已进入 ${trimmedRoom}，按出题人设好的题目作答。`)
    } catch (error) {
      console.error(error)
      showToast('没有找到这个房间，或房主昵称输入不正确。', 'error')
    } finally {
      setBusy(false)
    }
  }

  const lookupResults = async () => {
    const trimmedPlayer = (nicknameInput.trim() || playerName.trim())
    const trimmedRoom = roomName.trim()
    const trimmedHost = hostName.trim()

    if (!trimmedPlayer || !trimmedRoom || !trimmedHost) {
      showToast('昵称、房间名和房主名字都需要填写。', 'error')
      return
    }

    setBusy(true)
    try {
      const res = await fetch(buildApiUrl(`/api/room/${encodeURIComponent(trimmedRoom)}/results`))
      if (!res.ok) throw new Error('Room not found')

      const data = await res.json()
      if (String(data.hostName || '').trim().toLowerCase() !== trimmedHost.toLowerCase()) {
        throw new Error('房主昵称不匹配')
      }

      const loaded = normalizeQuestions(data.questions || [], true)
      if (!loaded.length) throw new Error('房间题目为空')

      const records = Array.isArray(data.records) ? data.records : []
      setPlayerName(trimmedPlayer)
      setRoomName(trimmedRoom)
      setHostName(data.hostName)
      setRoomInfo({ roomName: trimmedRoom, hostName: data.hostName })
      setQuestions(loaded)
      setLeaderboard(records)

      const isHost = trimmedPlayer.toLowerCase() === String(data.hostName).trim().toLowerCase()
      if (isHost) {
        setSelectedRecord(null)
        setScreen('host-share')
        setStatusText('正在查看这个房间里所有人的答题结果。')
        return
      }

      const mine = records.find((entry) => String(entry.playerName || '').trim().toLowerCase() === trimmedPlayer.toLowerCase())
      if (!mine) {
        showToast('还没有你的交卷记录，确认昵称是否和答题时一致。', 'error')
        return
      }

      const packed = toAnswerList(mine.answers, loaded.length)
      const mapped = {}
      packed.forEach((value, index) => {
        if (Number.isInteger(value)) mapped[index] = value
      })
      setSelectedAnswers(mapped)
      setScore(Number(mine.score) || 0)
      setScreen('result')
      setStatusText(`${trimmedPlayer} 在 ${trimmedRoom} 的答题记录`)
    } catch (error) {
      console.error(error)
      showToast('没有找到这个房间，或房主昵称输入不正确。', 'error')
    } finally {
      setBusy(false)
    }
  }

  const finishQuiz = async (answers = selectedAnswers) => {
    const finalScore = questions.reduce((total, question, index) => {
      const chosen = answers[index]
      return total + (chosen === question.correctIndex ? 1 : 0)
    }, 0)

    const packedAnswers = questions.map((_, index) => (
      Number.isInteger(answers[index]) ? answers[index] : null
    ))

    setScore(finalScore)
    setScreen('result')

    if (!roomName || !playerName) return
    try {
      await fetch(buildApiUrl('/api/records'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          playerName,
          score: finalScore,
          total: questions.length,
          answers: packedAnswers,
        }),
      })
      setStatusText(`${playerName} 已完成 ${roomName} 房间测验`)
    } catch {
      setStatusText('分数已算出，但排行榜暂时没有同步成功。')
    }
  }

  const goBack = () => {
    if (isEditingQuestion) return
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }

  const goNext = async () => {
    if (isEditingQuestion) return
    if (selectedAnswer === undefined) {
      showToast(screen === 'host-play' ? '请先选出这题的标准答案。' : '请先选择一个答案。', 'error')
      return
    }

    if (currentIndex >= questions.length - 1) {
      if (screen === 'host-play') {
        await publishRoom()
        return
      }
      await finishQuiz()
      return
    }

    setCurrentIndex((prev) => prev + 1)
  }

  const handleShareResult = async () => {
    if (!captureRef.current) {
      showToast('还没有可分享的答题记录。', 'error')
      return
    }

    setSharing(true)
    try {
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#f7f8ff',
      })
      const link = document.createElement('a')
      link.download = `kpop-challenge-${playerName || 'result'}.png`
      link.href = dataUrl
      link.click()
      setShareNotice('完整答题长图已保存')
    } catch {
      setShareNotice('图片生成失败，请再试一次')
    } finally {
      setSharing(false)
      window.setTimeout(() => setShareNotice(''), 2200)
    }
  }

  const handleShareRoom = async () => {
    if (!roomInfo) return
    const link = getShareUrl(roomInfo.roomName, roomInfo.hostName)
    const summary = `来测测你有多懂我！\n房间名：${roomInfo.roomName}\n房主昵称：${roomInfo.hostName}\n链接：${link}`
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(summary)
      setShareNotice('房间信息已复制，直接发给朋友即可')
    } catch {
      setShareNotice('复制失败，可手动复制房间名和房主昵称')
    }
    window.setTimeout(() => setShareNotice(''), 2200)
  }

  const renderTopbar = () => (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">K</div>
        <div>
          <p className="eyebrow">K-POP 默契挑战</p>
          <h1>Kpop Challenge</h1>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="login-box">
          <span>{playerName || nicknameInput || '未登录'}</span>
          <button onClick={goHome}>返回首页</button>
        </div>
        {screen === 'play' || screen === 'result' ? (
          <div className="score-chip">
            <span>当前分数</span>
            <strong>{score}</strong>
          </div>
        ) : (
          <div className="score-chip">
            <span>{screen === 'host-share' ? '已交卷' : '已设标准答案'}</span>
            <strong>
              {screen === 'host-share'
                ? `${leaderboard.length}人`
                : `${answeredCount}/${totalQuestions || QUIZ_SIZE}`}
            </strong>
          </div>
        )}
      </div>
    </header>
  )

  const renderQuiz = () => (
    <main className="layout">
      <section className="panel quiz-panel">
        <div className="panel-header">
          <div>
            <h2>{currentQuestion?.category || 'K-pop'}</h2>
            <p className="host-hint">
              {screen === 'host-play'
                ? '选出你的标准答案。朋友之后会按你选的选项计分。'
                : '题目由出题人定好，选完后点下一题继续。'}
            </p>
          </div>
          {screen === 'host-play' && (
            <button className="ghost-button" onClick={swapCurrentQuestion}>换一题</button>
          )}
        </div>

        <div className="progress-wrap">
          <div className="progress-bar">
            <span style={{ width: `${totalQuestions ? ((currentIndex + 1) / totalQuestions) * 100 : 0}%` }} />
          </div>
          <p>{currentIndex + 1}/{totalQuestions}</p>
        </div>

        {isEditingQuestion && draftQuestion ? (
          <div className="edit-card">
            <label>
              组合
              <input value={draftQuestion.category} onChange={(e) => updateDraftQuestion('category', e.target.value)} />
            </label>
            <label>
              题目
              <textarea value={draftQuestion.prompt} onChange={(e) => updateDraftQuestion('prompt', e.target.value)} />
            </label>
            {draftQuestion.options.map((option, index) => (
              <label key={`${draftQuestion.id || 'draft'}-${index}`}>
                选项 {LETTERS[index]}
                <input value={option} onChange={(e) => updateDraftOption(index, e.target.value)} />
              </label>
            ))}
            <div className="action-row editing">
              <button className="secondary-button" onClick={() => setIsEditingQuestion(false)}>取消</button>
              <button className="primary-button" onClick={saveQuestionEdit}>保存修改</button>
            </div>
          </div>
        ) : (
          <>
            <div className="question-card">
              <p className="question-label">题目</p>
              <h3>{currentQuestion?.prompt}</h3>
            </div>

            <div className="options-grid">
              {currentQuestion?.options.map((option, index) => (
                <button
                  key={`${currentQuestion.id || currentQuestion.category}-${index}`}
                  className={['option-button', selectedAnswer === index ? 'selected' : ''].filter(Boolean).join(' ')}
                  onClick={() => handleSelect(index)}
                >
                  <span>{LETTERS[index]}</span>
                  <p>{option}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {!isEditingQuestion && (
          <div className="action-row">
            {screen === 'host-play' && (
              <button className="secondary-button" onClick={startEditing}>编辑题目</button>
            )}
            <button className="secondary-button" onClick={goBack} disabled={currentIndex === 0}>
              上一题
            </button>
            <button className="primary-button" onClick={goNext} disabled={busy}>
              {currentIndex === questions.length - 1
                ? (screen === 'host-play' ? (busy ? '生成中...' : '生成房间') : '查看结果')
                : '下一题'}
            </button>
          </div>
        )}
      </section>
    </main>
  )

  return (
    <div className="app-shell">
      {screen === 'home' ? (
        <div className="login-screen">
          <div className="login-card">
            <div className="brand-mark">K</div>
            <p className="eyebrow">K-POP 默契挑战</p>
            <h1>Kpop Challenge</h1>
            <p className="login-copy">先写下你的昵称，再选出题、答题或查看结果。</p>

            <div className="login-form stacked">
              <input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="请输入你的昵称"
              />
            </div>

            <div className="mode-grid">
              <button className="primary-button" onClick={startHost}>我来出题</button>
              <button className="secondary-button" onClick={startJoin}>我来答题</button>
            </div>
            <button className="ghost-button view-results-btn" onClick={startLookup}>查看结果</button>

            <div className="rules-box">
              <h3>玩法说明</h3>
              <ul>
                <li>出题人选出每题的标准答案，生成房间发给朋友</li>
                <li>答题人输入房间名和房主昵称后进行作答</li>
                <li>答题完毕后揭晓答案和分数</li>
                <li>出题时可以自由编辑题目和选项</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <>
          {renderTopbar()}

          {screen === 'host-setup' && (
            <div className="panel create-room-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-tag">房主入口</p>
                  <h2>创建你的 K-pop 房间</h2>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  你的昵称
                  <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
                </label>
                <label>
                  房间名
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                </label>
              </div>

              <div className="action-row host-actions">
                <button className="primary-button" onClick={beginHostPlay}>开始出题</button>
              </div>

              <div className="status-box">
                接下来请逐题选出你的标准答案。全部完成后会生成房间，把房间名或链接发给朋友即可。
              </div>
            </div>
          )}

          {screen === 'join' && (
            <div className="panel create-room-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-tag">答题入口</p>
                  <h2>输入房间与房主姓名</h2>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  你的昵称
                  <input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} />
                </label>
                <label>
                  房间名
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                </label>
                <label>
                  房主昵称
                  <input value={hostName} onChange={(e) => setHostName(e.target.value)} />
                </label>
              </div>

              <div className="action-row host-actions">
                <button className="primary-button" onClick={joinRoom} disabled={busy}>
                  {busy ? '进入中...' : '进入房间'}
                </button>
              </div>

              {statusText && <div className="status-box">{statusText}</div>}
            </div>
          )}

          {screen === 'lookup' && (
            <div className="panel create-room-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-tag">查看结果</p>
                  <h2>用房间信息找回成绩</h2>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  你的昵称
                  <input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} />
                </label>
                <label>
                  房间名
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                </label>
                <label>
                  房主昵称
                  <input value={hostName} onChange={(e) => setHostName(e.target.value)} />
                </label>
              </div>

              <div className="action-row host-actions">
                <button className="primary-button" onClick={lookupResults} disabled={busy}>
                  {busy ? '查询中...' : '查看结果'}
                </button>
              </div>

              <div className="status-box">
                房主输入自己的昵称，可以看到所有人的答题详情；答题人输入当时用的昵称，可以找回自己的成绩和长图。
              </div>
            </div>
          )}

          {(screen === 'host-play' || screen === 'play') && renderQuiz()}

          {screen === 'host-share' && roomInfo && (
            <div className="panel result-panel">
              <p className="panel-tag">房间结果</p>
              <h2>查看这间房的答题情况</h2>
              <p className="result-message">朋友交卷后会出现在下方。点名字就能看到每一题的对比。</p>

              <div className="share-card">
                <div>
                  <span>房间名</span>
                  <strong>{roomInfo.roomName}</strong>
                </div>
                <div>
                  <span>房主昵称</span>
                  <strong>{roomInfo.hostName}</strong>
                </div>
              </div>

              <div className="result-actions">
                <button className="primary-button" onClick={handleShareRoom}>复制房间信息</button>
                <button className="secondary-button" onClick={goHome}>返回首页</button>
              </div>

              <div className="host-board">
                <div className="host-board-head">
                  <h3>答题结果</h3>
                  <span>每 4 秒自动刷新</span>
                </div>
                {leaderboard.length === 0 ? (
                  <p className="empty-board">还没有朋友交卷，把房间名发给他们即可。</p>
                ) : (
                  <div className="player-result-list">
                    {leaderboard.map((entry) => (
                      <button
                        key={`${entry.playerName}-${entry.createdAt}`}
                        className={['player-result-row', selectedRecord?.playerName === entry.playerName ? 'active' : ''].filter(Boolean).join(' ')}
                        onClick={() => setSelectedRecord(entry)}
                      >
                        <span>{entry.playerName}</span>
                        <strong>{entry.score}/{entry.total || totalQuestions}</strong>
                      </button>
                    ))}
                  </div>
                )}

                {selectedRecord && (
                  <div className="review-list host-review">
                    <h4>{selectedRecord.playerName} 的答题详情</h4>
                    {questions.map((question, index) => {
                      const answers = toAnswerList(selectedRecord.answers, questions.length)
                      const userChoice = answers[index]
                      const isCorrect = userChoice === question.correctIndex
                      return (
                        <div key={`${question.id || question.category}-${index}`} className={`review-item ${isCorrect ? 'correct' : 'wrong'}`}>
                          <h4>{question.prompt}</h4>
                          <div className="review-meta">
                            <span>TA 的答案：{optionText(question, userChoice)}</span>
                            <span>你的标准答案：{optionText(question, question.correctIndex)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {shareNotice && <div className="share-notice">{shareNotice}</div>}
              {statusText && <div className="status-box">{statusText}</div>}
            </div>
          )}

          {screen === 'result' && (
            <div className="panel result-panel">
              <div className="result-capture" ref={captureRef}>
                <p className="panel-tag">测试结束</p>
                <h2>{playerName} 的最终结果</h2>
                <div className="result-score">
                  <span>{score}</span>
                  <small>/{totalQuestions}</small>
                </div>

                <p className="result-message">
                  {score === totalQuestions
                    ? '完美分数，说明你真的非常懂这位 K-pop 审美。'
                    : score >= Math.ceil(totalQuestions * 0.7)
                      ? '表现很强，和对方的口味很接近。'
                      : score >= Math.ceil(totalQuestions * 0.4)
                        ? '还不错，继续用心一点，很快就能更懂彼此。'
                        : '这轮属于热身阶段，下一轮你会更有感觉。'}
                </p>

                <div className="review-list">
                  {questions.map((question, index) => {
                    const userChoice = selectedAnswers[index]
                    const isCorrect = userChoice === question.correctIndex
                    return (
                      <div key={`${question.id || question.category}-${index}`} className={`review-item ${isCorrect ? 'correct' : 'wrong'}`}>
                        <h4>{index + 1}. {question.prompt}</h4>
                        <div className="review-meta">
                          <span>你的答案：{optionText(question, userChoice)}</span>
                          <span>出题人答案：{optionText(question, question.correctIndex)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {leaderboard.length > 0 && (
                <div className="leaderboard-box">
                  <h3>房间排行</h3>
                  <ol>
                    {leaderboard.map((entry, index) => (
                      <li key={`${entry.player_name || entry.playerName}-${index}`}>
                        <span>{index + 1}. {entry.player_name || entry.playerName}</span>
                        <strong>{entry.score}/{entry.total || totalQuestions}</strong>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="result-actions">
                <button className="primary-button" onClick={handleShareResult} disabled={sharing}>
                  {sharing ? '生成长图中...' : '保存答题长图'}
                </button>
                <button className="secondary-button" onClick={goHome}>返回首页</button>
              </div>

              {shareNotice && <div className="share-notice">{shareNotice}</div>}
              {statusText && <div className="status-box">{statusText}</div>}
            </div>
          )}
        </>
      )}

      <div className="toast-stack">
        {toast && (
          <div className={`toast ${toast.kind}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
