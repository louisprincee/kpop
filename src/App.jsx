import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import questionBank from './data/questionBank'

const NICKNAME_KEY = 'kpop-nickname-v2'
const TOKEN_KEY = 'kpop-token-v1'
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

const readStored = (key) => {
  try {
    // Token 使用 sessionStorage（关闭浏览器就清空），昵称用 localStorage（保留输入便利）
    const storage = key === TOKEN_KEY ? sessionStorage : localStorage
    return storage.getItem(key) || ''
  } catch {
    return ''
  }
}

const writeStored = (key, value) => {
  try {
    // Token 使用 sessionStorage（关闭浏览器就清空），昵称用 localStorage
    const storage = key === TOKEN_KEY ? sessionStorage : localStorage
    if (value) storage.setItem(key, value)
    else storage.removeItem(key)
  } catch {
    /* ignore */
  }
}

const apiFetch = (path, options = {}) => {
  const headers = { ...(options.headers || {}) }
  const token = readStored(TOKEN_KEY)
  if (token) headers.Authorization = `Bearer ${token}`
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)
  
  return fetch(buildApiUrl(path), { ...options, headers, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId))
}

// 安全的响应处理
const getJsonResponse = async (res) => {
  try {
    const text = await res.text()
    if (!text) return {}
    return JSON.parse(text)
  } catch {
    return { error: '服务器返回格式错误' }
  }
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
  const slug = String(name).replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '').slice(0, 8) || 'room'
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
    .filter(item => item && typeof item === 'object')
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
  if (!question || !Number.isInteger(index) || !Array.isArray(question.options)) return '未作答'
  const option = question.options?.[index]
  return option ? String(option).trim() : '未作答'
}

const SCORE_COMMENTS = [
  '🫥 建议先确认一下你俩混的是不是同一个圈。',
  '📡 同担雷达完全没对上，信号还有待加强。',
  '🃏 默契水平：买十张专辑，偏偏抽不到想要的卡。',
  '🎧 能聊，但一到关键问题就开始“啊？你居然选这个？”',
  '👀 平时聊得挺好，一做题发现大家各有各的坚持。',
  '🤝 标准追星搭子水平，能懂一半已经很不错了。',
  '📱 刷到新物料会想到对方，默契正在稳定上升。',
  '🎤 相当懂了，连对方会pick哪段舞台都能猜个七七八八。',
  '🧠 脑回路高度重合，选项还没看完就知道对方要选啥。',
  '✨ 默契高得有点离谱，你俩平时到底一起刷了多少物料？',
  '🏆 K-pop最佳拍档！再测下去公司都要给你俩安排双人综艺了。',
];
 

const scoreComment = (score, total) => {
  if (total === 10 && Number.isInteger(score) && score >= 0 && score < SCORE_COMMENTS.length) {
    return SCORE_COMMENTS[score]
  }
  const ratio = total ? score / total : 0
  if (ratio === 1) return SCORE_COMMENTS[10]
  if (ratio >= 0.9) return SCORE_COMMENTS[9]
  if (ratio >= 0.8) return SCORE_COMMENTS[8]
  if (ratio >= 0.7) return SCORE_COMMENTS[7]
  if (ratio >= 0.6) return SCORE_COMMENTS[6]
  if (ratio >= 0.5) return SCORE_COMMENTS[5]
  if (ratio >= 0.4) return SCORE_COMMENTS[4]
  if (ratio >= 0.3) return SCORE_COMMENTS[3]
  if (ratio >= 0.2) return SCORE_COMMENTS[2]
  if (ratio > 0) return SCORE_COMMENTS[1]
  return SCORE_COMMENTS[0]
}

const rankMark = (index) => ['🥇', '🥈', '🥉'][index] || `${index + 1}`

const RankSlot = ({ index }) => (
  <span className={index < 3 ? 'rank-mark' : 'rank-mark is-num'}>{rankMark(index)}</span>
)

function App() {
  const invite = useMemo(() => readInvite(), [])
  const [screen, setScreen] = useState('login')
  const [nicknameInput, setNicknameInput] = useState(() => readStored(NICKNAME_KEY))
  const [passwordInput, setPasswordInput] = useState('')
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
  const [myHosted, setMyHosted] = useState([])
  const [myPlayed, setMyPlayed] = useState([])
  const [expandedPlayed, setExpandedPlayed] = useState(null)
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

  // 保存答题进度到 sessionStorage
  useEffect(() => {
    try {
      if (screen === 'play' || screen === 'host-play') {
        sessionStorage.setItem('quiz-progress', JSON.stringify({
          screen,
          playerName,
          hostName,
          roomName,
          currentIndex,
          selectedAnswers,
          questions: questions.map(q => ({ id: q.id, prompt: q.prompt, category: q.category })),
          roomInfo,
          timestamp: Date.now()
        }))
      } else {
        sessionStorage.removeItem('quiz-progress')
      }
    } catch {
      /* ignore */
    }
  }, [screen, playerName, hostName, roomName, currentIndex, selectedAnswers, questions, roomInfo])

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
    const trimmed = playerName.trim() || nicknameInput.trim()
    if (!trimmed) {
      showToast('请先登录昵称。', 'error')
      return ''
    }
    return trimmed
  }

  const enterRoomToPlay = async (player, room, expectedHost = '') => {
    const res = await fetch(buildApiUrl(`/api/room/${encodeURIComponent(room)}`))
    if (!res.ok) throw new Error('Room not found')
    const data = await res.text().then(t => {
      try {
        return JSON.parse(t)
      } catch {
        throw new Error('服务器返回格式错误')
      }
    })
    if (expectedHost && data.hostName !== expectedHost) throw new Error('房主昵称不匹配')

    const loaded = normalizeQuestions(data.questions || [], true)
    if (!loaded.length) throw new Error('房间题目为空')

    if (data.hostName === player) {
      const error = new Error('host nickname')
      error.code = 'HOST_NICKNAME'
      throw error
    }

    try {
      const boardRes = await fetch(buildApiUrl(`/api/leaderboard?room=${encodeURIComponent(room)}`))
      if (boardRes.ok) {
        const rows = await boardRes.json()
        const taken = (Array.isArray(rows) ? rows : []).some((row) => (
          String(row.player_name || row.playerName || '') === player
        ))
        if (taken) {
          const error = new Error('already played')
          error.code = 'ALREADY_PLAYED'
          throw error
        }
      }
    } catch (error) {
      if (error.code === 'ALREADY_PLAYED') throw error
    }

    setPlayerName(player)
    setRoomName(room)
    setHostName(data.hostName)
    setRoomInfo({ roomName: room, hostName: data.hostName })
    setQuestions(loaded)
    setCurrentIndex(0)
    setSelectedAnswers({})
    setScore(0)
    setScreen('play')
    setStatusText(`已进入 ${room}，按出题人设好的题目作答。`)
  }

  useEffect(() => {
    let alive = true
    const restore = async () => {
      // 先检查是否有进行中的答题进度
      try {
        const progressStr = sessionStorage.getItem('quiz-progress')
        if (progressStr) {
          const progress = JSON.parse(progressStr)
          // 进度是否超过5分钟（防止太久的过期数据）
          if (Date.now() - progress.timestamp < 5 * 60 * 1000 && progress.screen === 'play') {
            if (!alive) return
            setPlayerName(progress.playerName)
            setHostName(progress.hostName)
            setRoomName(progress.roomName)
            setCurrentIndex(progress.currentIndex)
            setSelectedAnswers(progress.selectedAnswers)
            setRoomInfo(progress.roomInfo)
            // 重新加载完整的questions数据
            try {
              const res = await fetch(buildApiUrl(`/api/room/${encodeURIComponent(progress.roomName)}`))
              if (res.ok) {
                const data = await res.json()
                const loaded = normalizeQuestions(data.questions || [], true)
                setQuestions(loaded)
                setScreen('play')
                showToast('已恢复你的答题进度！', 'info')
                return
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }

      // 没有进行中的进度，走正常登录流程
      if (!readStored(TOKEN_KEY)) return
      try {
        const res = await apiFetch('/api/me')
        if (!res.ok) throw new Error('expired')
        const data = await res.json()
        if (!alive) return
        const nickname = data.nickname || readStored(NICKNAME_KEY)
        if (!nickname) return
        setPlayerName(nickname)
        setNicknameInput(nickname)
        if (invite.room) {
          try {
            await enterRoomToPlay(nickname, invite.room)
          } catch (error) {
            if (!alive) return
            if (error.code === 'HOST_NICKNAME') {
              showToast('房主不能用同一个昵称答题。', 'error')
            } else if (error.code === 'ALREADY_PLAYED') {
              showToast('你已经答过这间房了，请去查看结果。', 'error')
            } else {
              showToast('没有找到这个房间。房间名区分大小写。', 'error')
            }
            setScreen('home')
          }
        } else {
          setScreen('home')
        }
      } catch {
        writeStored(TOKEN_KEY, '')
      }
    }
    restore()
    return () => {
      alive = false
    }
  }, [])

  const handleLogin = async () => {
    const name = nicknameInput.trim()
    const password = passwordInput
    if (!name) {
      showToast('请输入昵称后再进入。', 'error')
      return
    }
    if (name.length > 20) {
      showToast('昵称最多20个字符。', 'error')
      return
    }
    if (password.length < 4) {
      showToast('请设置至少 4 位密码，用来保护你的记录。', 'error')
      return
    }
    if (password.length > 50) {
      showToast('密码最多50个字符。', 'error')
      return
    }

    setBusy(true)
    try {
      const res = await fetch(buildApiUrl('/api/auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.code === 'AUTH_FAILED') {
          showToast('用户名或密码错误。', 'error')
        } else if (data.code === 'NICKNAME_INVALID') {
          showToast('昵称长度需要1-20个字符。', 'error')
        } else if (data.code === 'PASSWORD_INVALID') {
          showToast('密码长度需要4-50个字符。', 'error')
        } else {
          showToast(data.error || '登录失败，请稍后再试。', 'error')
        }
        return
      }

      writeStored(TOKEN_KEY, data.token)
      writeStored(NICKNAME_KEY, data.nickname)
      setPlayerName(data.nickname)
      setNicknameInput(data.nickname)
      setPasswordInput('')

      if (invite.room) {
        await enterRoomToPlay(data.nickname, invite.room)
      } else {
        setScreen('home')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        showToast('请求超时，请检查网络连接。', 'error')
      } else if (error.code === 'HOST_NICKNAME') {
        showToast('房主不能用同一个昵称答题。', 'error')
        setScreen('home')
      } else if (error.code === 'ALREADY_PLAYED') {
        showToast('你已经答过这间房了，请去查看结果。', 'error')
        setScreen('home')
      } else {
        showToast('登录失败，请稍后再试。', 'error')
      }
    } finally {
      setBusy(false)
    }
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
    setScreen('host-play')
  }

  const startJoin = () => {
    const name = requireNickname()
    if (!name) return
    setPlayerName(name)
    setRoomName(invite.room || '')
    setHostName('')
    setStatusText('')
    setScreen('join')
  }

  const startLookup = async () => {
    const name = requireNickname()
    if (!name) return
    setPlayerName(name)
    setSelectedRecord(null)
    setExpandedPlayed(null)
    setBusy(true)
    try {
      const res = await apiFetch('/api/me')
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      if (data.nickname) {
        setPlayerName(data.nickname)
        setNicknameInput(data.nickname)
      }
      setMyHosted(Array.isArray(data.hosted) ? data.hosted : [])
      setMyPlayed(Array.isArray(data.played) ? data.played : [])
      setScreen('lookup')
    } catch {
      showToast('暂时没法读取记录，请稍后再试。', 'error')
    } finally {
      setBusy(false)
    }
  }

  const goHome = () => {
    setScreen('home')
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
    setExpandedPlayed(null)
  }

  const logout = () => {
    setPlayerName('')
    setNicknameInput('')
    setPasswordInput('')
    writeStored(NICKNAME_KEY, '')
    writeStored(TOKEN_KEY, '')
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
    setExpandedPlayed(null)
    setMyHosted([])
    setMyPlayed([])
    setScreen('login')
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
    
    if (draftQuestion.prompt.trim().length > 500) {
      showToast('题目最多500个字符。', 'error')
      return
    }
    
    if (cleanedOptions.some(opt => opt.length > 100)) {
      showToast('选项最多100个字符。', 'error')
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
    if (trimmedRoom.length > 30) {
      showToast('房间名最多30个字符。', 'error')
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
      const res = await apiFetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: trimmedRoom,
          questions: payloadQuestions,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.code === 'ROOM_HAS_RECORDS') {
          showToast('房间已有人交卷，无法修改题目。', 'error')
        } else if (data.code === 'ROOM_TAKEN') {
          showToast('房间名已被占用。', 'error')
        } else {
          showToast(data.error || '创建房间失败', 'error')
        }
        return false
      }

      setRoomInfo({ roomName: trimmedRoom, hostName: trimmedPlayer })
      setHostName(trimmedPlayer)
      setQuestions(payloadQuestions)
      setScreen('host-share')
      setStatusText(`房间 ${trimmedRoom} 已生成，把房间名或链接发给朋友即可。`)
      return true
    } catch (error) {
      if (error.name === 'AbortError') {
        showToast('请求超时，请检查网络连接。', 'error')
      } else {
        console.error(error)
        showToast('创建房间失败，请检查后端服务是否已启动。', 'error')
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  const joinRoom = async () => {
    const trimmedPlayer = playerName.trim()
    const trimmedRoom = roomName.trim()

    if (!trimmedPlayer || !trimmedRoom) {
      showToast('请输入房间名。', 'error')
      return
    }

    setBusy(true)
    try {
      await enterRoomToPlay(trimmedPlayer, trimmedRoom)
    } catch (error) {
      console.error(error)
      if (error.code === 'HOST_NICKNAME') {
        showToast('房主不能用同一个昵称答题。', 'error')
      } else if (error.code === 'ALREADY_PLAYED') {
        showToast('你已经答过这间房了，请去查看结果。', 'error')
      } else {
        showToast('没有找到这个房间，房间名区分大小写。', 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  const applyRecordAnswers = (answers, length) => {
    const packed = toAnswerList(answers, length)
    const mapped = {}
    packed.forEach((value, index) => {
      if (Number.isInteger(value)) mapped[index] = value
    })
    return mapped
  }

  const openHostedRoom = async (hosted) => {
    setBusy(true)
    try {
      const res = await fetch(buildApiUrl(`/api/room/${encodeURIComponent(hosted.roomName)}/results`))
      if (!res.ok) throw new Error('Room not found')
      const data = await res.json()
      const loaded = normalizeQuestions(data.questions || [], true)
      if (!loaded.length) throw new Error('房间题目为空')

      setRoomName(hosted.roomName)
      setHostName(data.hostName)
      setRoomInfo({ roomName: hosted.roomName, hostName: data.hostName })
      setQuestions(loaded)
      setLeaderboard(Array.isArray(data.records) ? data.records : [])
      setSelectedRecord(null)
      setScreen('host-share')
      setStatusText('正在查看这个房间里所有人的答题结果。')
    } catch (error) {
      console.error(error)
      showToast('暂时没法打开这间房的结果。', 'error')
    } finally {
      setBusy(false)
    }
  }

  const openPlayedRecord = (played) => {
    const loaded = normalizeQuestions(played.questions || [], true)
    if (!loaded.length) {
      showToast('这轮记录里没有题目。', 'error')
      return
    }

    setRoomName(played.roomName)
    setHostName(played.hostName)
    setRoomInfo({ roomName: played.roomName, hostName: played.hostName })
    setQuestions(loaded)
    setSelectedAnswers(applyRecordAnswers(played.answers, loaded.length))
    setScore(Number(played.score) || 0)
    setLeaderboard([])
    setScreen('result')
    setStatusText(`${playerName} 在 ${played.roomName} 的答题记录`)
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
      const res = await apiFetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          score: finalScore,
          total: questions.length,
          answers: packedAnswers,
        }),
      })
      if (!res.ok) throw new Error('sync failed')
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
        backgroundColor: '#ffffff',
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
          <h1>K-POP Challenge</h1>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="login-box">
          <span>{playerName || '未登录'}</span>
          <div className="login-box-actions">
            <button onClick={goHome}>返回首页</button>
            <button onClick={logout}>切换账号</button>
          </div>
        </div>
        {screen === 'play' || screen === 'result' ? (
          <div className="score-chip">
            <span>当前分数</span>
            <strong>{score}</strong>
          </div>
        ) : screen === 'host-play' || screen === 'host-share' ? (
          <div className="score-chip">
            <span>{screen === 'host-share' ? '已交卷' : '已设标准答案'}</span>
            <strong>
              {screen === 'host-share'
                ? `${leaderboard.length}人`
                : `${answeredCount}/${totalQuestions || QUIZ_SIZE}`}
            </strong>
          </div>
        ) : null}
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
                ? '选出你的标准答案。'
                : '选完后点下一题继续。'}
            </p>
          </div>
          {screen === 'host-play' && (
            <button className="ghost-button swap-btn" onClick={swapCurrentQuestion}>换一题</button>
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

  const renderReviewList = (choiceOf, labels = { user: '你的答案', host: '出题人答案' }) => (
    <div className="review-list">
      {questions.map((question, index) => {
        const userChoice = choiceOf(index)
        const isCorrect = userChoice === question.correctIndex
        return (
          <div key={`${question.id || question.category}-${index}`} className={`review-item ${isCorrect ? 'correct' : 'wrong'}`}>
            <h4>{index + 1}. {question.prompt}</h4>
            <div className="review-meta">
              <span>{labels.user}：{optionText(question, userChoice)}</span>
              <span>{labels.host}：{optionText(question, question.correctIndex)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="app-shell">
      {screen === 'login' || screen === 'home' ? (
        <div className="login-screen">
          <div className="login-card">
            <div className="brand-mark">K</div>
            <p className="eyebrow">K-POP 默契挑战</p>
            <h1>K-POP Challenge</h1>
            {screen === 'login' ? (
              <>
                <p className="login-copy">输入昵称和密码后开始出题或答题。新昵称会自动创建账号。</p>
                <div className="login-form stacked">
                  <input
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLogin()
                    }}
                    placeholder="请输入你的昵称"
                    autoComplete="username"
                  />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLogin()
                    }}
                    placeholder="设置或输入密码（至少 4 位）"
                    autoComplete="current-password"
                  />
                  <button className="primary-button" onClick={handleLogin} disabled={busy}>
                    {busy ? '进入中...' : '确定'}
                  </button>
                </div>
                <p className="login-hint">暂不支持找回密码，请一定记牢自己的用户密码。</p>
              </>
            ) : (
              <>
                <p className="login-copy">当前用户：{playerName}。选择我要出题、我要答题或查看结果。</p>
                <div className="mode-grid">
                  <button className="primary-button" onClick={startHost}>我要出题</button>
                  <button className="secondary-button" onClick={startJoin}>我要答题</button>
                </div>
                <button className="ghost-button view-results-btn" onClick={startLookup} disabled={busy}>
                  {busy ? '读取中...' : '查看结果'}
                </button>
                <button className="ghost-button view-results-btn" onClick={logout}>切换账号</button>
              </>
            )}

            <div className="rules-box">
              <h3>玩法说明</h3>
              <ul>
                <li>出题人选出每题的标准答案，生成房间发给朋友</li>
                <li>答题人输入房间名后进行作答</li>
                <li>答题完毕后揭晓答案和分数</li>
                <li>出题时可以自由编辑题目和选项</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <>
          {renderTopbar()}

          {screen === 'join' && (
            <div className="panel create-room-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-tag">答题入口</p>
                  <h2>输入房间号开始答题</h2>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  房间名
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="区分大小写" />
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
                  <h2>你的出题和答题记录</h2>
                </div>
              </div>

              <div className="record-section">
                <h3>我出过的题</h3>
                {myHosted.length === 0 ? (
                  <p className="empty-board">还没有生成过房间。</p>
                ) : (
                  <div className="player-result-list">
                    {myHosted.map((entry) => (
                      <button
                        key={entry.roomName}
                        className="player-result-row"
                        onClick={() => openHostedRoom(entry)}
                      >
                        <span>{entry.roomName}</span>
                        <strong>{entry.playerCount || 0} 人交卷</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="record-section">
                <h3>我答过的题</h3>
                {myPlayed.length === 0 ? (
                  <p className="empty-board">还没有交过卷。</p>
                ) : (
                  <div className="player-result-list">
                    {myPlayed.map((entry) => {
                      const open = expandedPlayed === entry.roomName
                      const loaded = normalizeQuestions(entry.questions || [], true)
                      const answers = toAnswerList(entry.answers, loaded.length)
                      return (
                        <div key={entry.roomName} className="played-record">
                          <div className="player-result-row static">
                            <span>{entry.roomName} · 房主 {entry.hostName}</span>
                            <strong>{entry.score}/{entry.total}</strong>
                            <button
                              type="button"
                              className="ghost-button compact-toggle icon-toggle"
                              onClick={() => setExpandedPlayed(open ? null : entry.roomName)}
                              aria-label={open ? '收起' : '展示'}
                            >
                              {open ? '➖' : '➕'}
                            </button>
                          </div>
                          {open && (
                            <div className="review-list host-review">
                              {loaded.map((question, index) => {
                                const userChoice = answers[index]
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
                              <button className="secondary-button" onClick={() => openPlayedRecord(entry)}>
                                打开完整结果
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {(screen === 'host-play' || screen === 'play') && renderQuiz()}

          {screen === 'host-share' && roomInfo && (
            <div className="panel result-panel">
              <p className="panel-tag">房间结果</p>
              <h2>查看答题情况</h2>
              <p className="result-message">答题信息会出现在下方。</p>

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
                  <h3>排行榜</h3>
                  <span>每 4 秒自动刷新</span>
                </div>
                {leaderboard.length === 0 ? (
                  <p className="empty-board">还没有朋友交卷，把房间名发给他们即可。</p>
                ) : (
                  <div className="player-result-list">
                    {leaderboard.map((entry, index) => {
                      const open = selectedRecord?.playerName === entry.playerName
                      return (
                        <div key={`${entry.playerName}-${entry.createdAt}`} className="played-record">
                          <div className={['player-result-row', 'static', 'ranked', open ? 'active' : ''].filter(Boolean).join(' ')}>
                            <RankSlot index={index} />
                            <span className="rank-name">{entry.playerName}</span>
                            <strong className="rank-score">{entry.score}/{entry.total || totalQuestions}</strong>
                            <button
                              type="button"
                              className="ghost-button compact-toggle icon-toggle"
                              onClick={() => setSelectedRecord(open ? null : entry)}
                              aria-label={open ? '收起' : '展示'}
                            >
                              {open ? '➖' : '➕'}
                            </button>
                          </div>
                          {open && (
                            <div className="review-list host-review">
                              {questions.map((question, index) => {
                                const answers = toAnswerList(entry.answers, questions.length)
                                const userChoice = answers[index]
                                const isCorrect = userChoice === question.correctIndex
                                return (
                                  <div key={`${question.id || question.category}-${index}`} className={`review-item ${isCorrect ? 'correct' : 'wrong'}`}>
                                    <h4>{index + 1}. {question.prompt}</h4>
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
              <div className="result-capture-offscreen" aria-hidden="true">
                <div className="result-capture" ref={captureRef}>
                  <p className="panel-tag">测试结果</p>
                  <h2>{playerName} 的最终结果</h2>
                  <div className="result-score">
                    <span>{score}</span>
                    <small>/{totalQuestions}</small>
                  </div>
                  <p className="result-message">{scoreComment(score, totalQuestions)}</p>
                  {renderReviewList((index) => selectedAnswers[index])}
                </div>
              </div>

              <p className="panel-tag">测试结束</p>
              <h2>{playerName} 的最终结果</h2>
              <div className="result-score">
                <span>{score}</span>
                <small>/{totalQuestions}</small>
              </div>

              <p className="result-message">{scoreComment(score, totalQuestions)}</p>

              {renderReviewList((index) => selectedAnswers[index])}

              {leaderboard.length > 0 && (
                <div className="leaderboard-box">
                  <h3>排行榜</h3>
                  <ol>
                    {leaderboard.map((entry, index) => (
                      <li key={`${entry.player_name || entry.playerName}-${index}`}>
                        <RankSlot index={index} />
                        <span className="rank-name">{entry.player_name || entry.playerName}</span>
                        <strong className="rank-score">{entry.score}/{entry.total || totalQuestions}</strong>
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
