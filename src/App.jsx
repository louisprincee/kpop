import { useEffect, useMemo, useState } from 'react'
import questionBank from './data/questionBank'

const STORAGE_KEY = 'kpop-quiz-state-v1'
const PLAYER_KEY = 'kpop-player-name-v1'
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:4000' : '')

const buildApiUrl = (path) => {
  if (!API_BASE) return path
  return `${API_BASE.replace(/\/$/, '')}${path}`
}

const getStarterQuestions = () => {
  if (!questionBank || questionBank.length === 0) return []
  const shuffled = [...questionBank].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 20).map((question, index) => ({
    ...question,
    id: question.id || `q-${index + 1}`,
  }))
}

function App() {
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem(PLAYER_KEY) || ''
    } catch {
      return ''
    }
  })
  const [nicknameInput, setNicknameInput] = useState(() => {
    try {
      return localStorage.getItem(PLAYER_KEY) || ''
    } catch {
      return ''
    }
  })
  const [mode, setMode] = useState('entry')
  const [questions, setQuestions] = useState(() => getStarterQuestions())
  const [roomName, setRoomName] = useState('')
  const [hostName, setHostName] = useState('')
  const [leaderboard, setLeaderboard] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [isEditingQuestion, setIsEditingQuestion] = useState(false)
  const [draftQuestion, setDraftQuestion] = useState(null)
  const [shareNotice, setShareNotice] = useState('')
  const [statusText, setStatusText] = useState('')
  const [roomInfo, setRoomInfo] = useState(null)

  const currentQuestion = questions[currentIndex] || null
  const selectedAnswer = selectedAnswers[currentIndex]

  useEffect(() => {
    if (!questions.length) {
      setQuestions(getStarterQuestions())
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions))
  }, [questions])

  useEffect(() => {
    localStorage.setItem(PLAYER_KEY, playerName)
  }, [playerName])

  useEffect(() => {
    if (!roomName) return
    const loadBoard = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/leaderboard?room=${encodeURIComponent(roomName)}`))
        if (!res.ok) return
        const data = await res.json()
        setLeaderboard(Array.isArray(data) ? data : [])
      } catch {
        setLeaderboard([])
      }
    }
    loadBoard()
  }, [roomName, completed])

  useEffect(() => {
    if (!currentQuestion) return
    setIsEditingQuestion(false)
    setDraftQuestion(null)
  }, [currentIndex, currentQuestion])

  const totalQuestions = questions.length

  const progress = useMemo(() => {
    if (!questions.length) return 0
    const answeredCount = Object.keys(selectedAnswers).length
    return (answeredCount / questions.length) * 100
  }, [questions.length, selectedAnswers])

  const saveResultToBackend = async (finalScore) => {
    if (!roomName || !playerName) return
    try {
      await fetch(buildApiUrl('/api/records'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          playerName,
          score: finalScore,
          total: totalQuestions,
          answers: selectedAnswers,
        }),
      })
    } catch {
      console.warn('Failed to submit result to backend')
    }
  }

  const resetQuiz = () => {
    setCurrentIndex(0)
    setSelectedAnswers({})
    setScore(0)
    setCompleted(false)
    setStatusText('')
  }

  const handleSelect = (optionIndex) => {
    if (selectedAnswer !== undefined || !currentQuestion) return

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }))
  }

  const goNext = () => {
    if (!currentQuestion) return

    if (currentIndex >= questions.length - 1) {
      const finalScore = questions.reduce((total, question, index) => {
        const chosen = selectedAnswers[index]
        return total + (chosen === question.correctIndex ? 1 : 0)
      }, 0)

      setScore(finalScore)
      setCompleted(true)
      const roomToSave = roomName || 'solo-room'
      if (playerName) {
        saveResultToBackend(finalScore)
        setStatusText(`${playerName} 已完成 ${roomToSave} 房间测验`)
      }
      return
    }

    setCurrentIndex((prev) => prev + 1)
  }

  const handleLogin = () => {
    const trimmed = nicknameInput.trim()
    if (!trimmed) {
      alert('请输入昵称后再开始。')
      return
    }

    setPlayerName(trimmed)
    setMode('entry')
  }

  const handleLogout = () => {
    setPlayerName('')
    setNicknameInput('')
    setMode('entry')
    setRoomName('')
    setHostName('')
    setRoomInfo(null)
    setCompleted(false)
    setCurrentIndex(0)
    setSelectedAnswers({})
    setScore(0)
  }

  const shuffleQuestion = () => {
    const cloned = [...questions]
    for (let i = cloned.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[cloned[i], cloned[j]] = [cloned[j], cloned[i]]
    }
    setQuestions(cloned)
    resetQuiz()
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
    if (!draftQuestion.prompt.trim() || cleanedOptions.length < 2) {
      alert('题目和至少两个选项都不能为空。')
      return
    }

    const safeIndex = Math.min(
      Math.max(Number(draftQuestion.correctIndex) || 0, 0),
      cleanedOptions.length - 1,
    )

    const updatedQuestion = {
      ...draftQuestion,
      category: draftQuestion.category.trim() || 'K-pop',
      prompt: draftQuestion.prompt.trim(),
      options: cleanedOptions,
      correctIndex: safeIndex,
    }

    setQuestions((prev) =>
      prev.map((question, index) => (index === currentIndex ? updatedQuestion : question)),
    )
    setIsEditingQuestion(false)
    setDraftQuestion(null)
  }

  const createRoom = async () => {
    const trimmedPlayer = playerName.trim()
    const trimmedRoom = roomName.trim()
    if (!trimmedPlayer || !trimmedRoom) {
      alert('请输入你的昵称和房间名。')
      return
    }

    try {
      const res = await fetch(buildApiUrl('/api/room'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: trimmedRoom,
          hostName: trimmedPlayer,
          questions: questions.length ? questions : getStarterQuestions(),
        }),
      })

      if (!res.ok) {
        throw new Error('房间保存失败')
      }

      setRoomInfo({ roomName: trimmedRoom, hostName: trimmedPlayer })
      setHostName(trimmedPlayer)
      setMode('host')
      setStatusText(`房间 ${trimmedRoom} 已创建，分享给好友来答题吧。`)
      setLeaderboard([])
    } catch (error) {
      console.error(error)
      alert('创建房间失败，请检查后端服务是否已启动。')
    }
  }

  const joinRoom = async () => {
    const trimmedPlayer = nicknameInput.trim()
    const trimmedRoom = roomName.trim()
    const trimmedHost = hostName.trim()

    if (!trimmedPlayer || !trimmedRoom || !trimmedHost) {
      alert('昵称、房间名和房主名字都需要填写。')
      return
    }

    try {
      const res = await fetch(buildApiUrl(`/api/room/${encodeURIComponent(trimmedRoom)}`))
      if (!res.ok) {
        throw new Error('Room not found')
      }

      const data = await res.json()
      if (data.hostName !== trimmedHost) {
        throw new Error('房主昵称不匹配')
      }

      setPlayerName(trimmedPlayer)
      setRoomInfo({ roomName: trimmedRoom, hostName: trimmedHost })
      setQuestions(data.questions || [])
      setCurrentIndex(0)
      setSelectedAnswers({})
      setCompleted(false)
      setScore(0)
      setMode('challenge')
      setStatusText(`已进入 ${trimmedRoom}，准备开始答题。`)
    } catch (error) {
      console.error(error)
      alert('没有找到这个房间，或房主昵称输入不正确。')
    }
  }

  const handleShareResult = async () => {
    const summary = `${playerName} 在 K-pop 默契挑战中拿到 ${score}/${totalQuestions} 分，房间：${roomName || 'solo-room'}。`
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(summary)
      }
      setShareNotice('结果已复制到剪贴板')
    } catch {
      setShareNotice('复制失败，可手动复制结果')
    }
    window.setTimeout(() => setShareNotice(''), 1800)
  }

  const showResultReview = completed && questions.length > 0

  return (
    <div className="app-shell">
      {!playerName ? (
        <div className="login-screen">
          <div className="login-card">
            <div className="brand-mark">K</div>
            <p className="eyebrow">K-pop 默契挑战</p>
            <h1>出题人和答题人都能轻松开始</h1>
            <p className="login-copy">先写下你的昵称，再选择你要做的是“我来出题”还是“我来答题”。</p>

            <div className="login-form stacked">
              <input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="请输入你的昵称"
              />
            </div>

            <div className="mode-grid">
              <button className="primary-button" onClick={() => {
                const trimmed = nicknameInput.trim()
                if (!trimmed) {
                  alert('请输入昵称后再继续。')
                  return
                }
                setPlayerName(trimmed)
                setMode('host')
              }}>
                我来出题
              </button>
              <button className="secondary-button" onClick={() => {
                const trimmed = nicknameInput.trim()
                if (!trimmed) {
                  alert('请输入昵称后再继续。')
                  return
                }
                setPlayerName(trimmed)
                setMode('challenge')
              }}>
                我来答题
              </button>
            </div>

            <div className="rules-box">
              <h3>玩法说明</h3>
              <ul>
                <li>房主先创建房间，朋友输入房间名与房主昵称后进入</li>
                <li>所有题目都以团为单位，按你和朋友的 K-pop 口味来设计</li>
                <li>答完后系统统一计分，不会一题一揭答案</li>
                <li>题目可以直接在页面里编辑，适合自定义和换题</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className="topbar">
            <div className="brand-block">
              <div className="brand-mark">K</div>
              <div>
                <p className="eyebrow">K-pop 默契挑战</p>
                <h1>Room Challenge</h1>
              </div>
            </div>

            <div className="topbar-actions">
              <div className="login-box">
                <span>{playerName}</span>
                <button onClick={handleLogout}>切换账号</button>
              </div>
              <div className="score-chip">
                <span>当前分数</span>
                <strong>{score}</strong>
              </div>
            </div>
          </header>

          {mode === 'host' && !completed ? (
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
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="例如: louis-room" />
                </label>
              </div>

              <div className="action-row host-actions">
                <button className="primary-button" onClick={createRoom}>保存并发布房间</button>
                <button className="secondary-button" onClick={shuffleQuestion}>随机换题</button>
              </div>

              {statusText && <div className="status-box">{statusText}</div>}

              {roomInfo && (
                <div className="room-info-box">
                  <p>房间：<strong>{roomInfo.roomName}</strong></p>
                  <p>房主：<strong>{roomInfo.hostName}</strong></p>
                </div>
              )}

              <div className="question-list-edit">
                {questions.map((question, index) => (
                  <div key={question.id || `question-${index}`} className="mini-question-card">
                    <div className="mini-card-head">
                      <button type="button" onClick={() => {
                        setCurrentIndex(index)
                        setMode('host-play')
                      }}>编辑</button>
                    </div>
                    <p>{question.prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {mode === 'challenge' && !completed ? (
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
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="例如: louis-room" />
                </label>
                <label>
                  房主昵称
                  <input value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="例如: Louis" />
                </label>
              </div>

              <div className="action-row host-actions">
                <button className="primary-button" onClick={joinRoom}>进入房间</button>
              </div>

              {statusText && <div className="status-box">{statusText}</div>}
            </div>
          ) : null}

          {(mode === 'host-play' || mode === 'challenge-play') && !completed ? (
            <main className="layout">
              <section className="panel quiz-panel">
                <div className="panel-header">
                  <div>
                    <p className="panel-tag">题库</p>
                    <h2>题目</h2>
                  </div>
                  <button className="ghost-button" onClick={shuffleQuestion}>换一题</button>
                </div>

                <div className="progress-wrap">
                  <div className="progress-bar">
                    <span style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} />
                  </div>
                  <p>{currentIndex + 1}/{totalQuestions}</p>
                </div>

                {isEditingQuestion && draftQuestion ? (
                  <div className="edit-card">
                    <label>
                      团名
                      <input value={draftQuestion.category} onChange={(e) => updateDraftQuestion('category', e.target.value)} />
                    </label>
                    <label>
                      题目
                      <textarea value={draftQuestion.prompt} onChange={(e) => updateDraftQuestion('prompt', e.target.value)} />
                    </label>
                    {draftQuestion.options.map((option, index) => (
                      <label key={`${question.id || index}-${index}`}>
                        选项 {index + 1}
                        <input value={option} onChange={(e) => updateDraftOption(index, e.target.value)} />
                      </label>
                    ))}
                    <label>
                      正确答案
                      <select value={draftQuestion.correctIndex} onChange={(e) => updateDraftQuestion('correctIndex', Number(e.target.value))}>
                        {draftQuestion.options.map((_, index) => (
                          <option key={`answer-${index}`} value={index}>选项 {index + 1}</option>
                        ))}
                      </select>
                    </label>
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
                          className={[
                            'option-button',
                            selectedAnswer === index ? 'selected' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => handleSelect(index)}
                        >
                          <span>{String.fromCharCode(65 + index)}</span>
                          <p>{option}</p>
                        </button>
                      ))}
                    </div>

                    {selectedAnswer !== undefined && (
                      <div className="answer-box">
                        <strong>已选答案</strong>
                        <p>你已经完成当前题目的选择，下一题前不会立刻揭晓答案。等全部题目结束后，系统统一统计分数。</p>
                      </div>
                    )}
                  </>
                )}

                <div className="action-row">
                  <button className="secondary-button" onClick={resetQuiz}>重新开始</button>
                  {!isEditingQuestion && mode === 'host-play' && (
                    <button className="secondary-button" onClick={startEditing}>编辑题目</button>
                  )}
                  {selectedAnswer !== undefined && (
                    <button className="primary-button" onClick={goNext}>
                      {currentIndex === questions.length - 1 ? '查看结果' : '下一题'}
                    </button>
                  )}
                </div>
              </section>

              <aside className="panel sidebar-panel">
                <div className="mini-summary">
                  <p>当前题目</p>
                  <strong>随机题库</strong>
                  <span>共 {totalQuestions} 道题</span>
                </div>

                <div className="leaderboard-box">
                  <h3>房间排行</h3>
                  {leaderboard.length ? (
                    <ol>
                      {leaderboard.map((entry, index) => (
                        <li key={`${entry.player_name}-${index}`}>
                          <span>{index + 1}. {entry.player_name}</span>
                          <strong>{entry.score}/{totalQuestions}</strong>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>房间里目前还没有答题记录。</p>
                  )}
                </div>
              </aside>
            </main>
          ) : null}

          {completed && (
            <div className="panel result-panel">
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
                      <h4>{question.prompt}</h4>
                      <div className="review-meta">
                        <span>你的答案：{userChoice !== undefined ? question.options[userChoice] : '未作答'}</span>
                        <span>正确答案：{question.options[question.correctIndex]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="result-actions">
                <button className="primary-button" onClick={handleShareResult}>分享结果</button>
                <button className="secondary-button" onClick={resetQuiz}>再玩一次</button>
              </div>

              {shareNotice && <div className="share-notice">{shareNotice}</div>}
              {statusText && <div className="status-box">{statusText}</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
