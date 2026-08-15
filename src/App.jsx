import { useEffect, useMemo, useState } from 'react'
import { defaultQuestions } from './data/questions'

const STORAGE_KEY = 'kpop-quiz-state-v1'
const PLAYER_KEY = 'kpop-player-name-v1'
const LEADERBOARD_KEY = 'kpop-leaderboard-v1'

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
  const [questions, setQuestions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return defaultQuestions

      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) && parsed.length ? parsed : defaultQuestions
    } catch {
      return defaultQuestions
    }
  })
  const [leaderboard, setLeaderboard] = useState(() => {
    try {
      const saved = localStorage.getItem(LEADERBOARD_KEY)
      const parsed = JSON.parse(saved || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isEditingQuestion, setIsEditingQuestion] = useState(false)
  const [draftQuestion, setDraftQuestion] = useState(null)
  const [shareNotice, setShareNotice] = useState('')

  const currentQuestion = questions[currentIndex] || null

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions))
  }, [questions])

  useEffect(() => {
    localStorage.setItem(PLAYER_KEY, playerName)
  }, [playerName])

  useEffect(() => {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard))
  }, [leaderboard])

  useEffect(() => {
    if (!currentQuestion) return
    setSelectedAnswer(null)
    setShowAnswer(false)
    setIsEditingQuestion(false)
    setDraftQuestion(null)
  }, [currentIndex, currentQuestion])

  const progress = useMemo(() => {
    if (!questions.length) return 0
    return ((currentIndex + (completed ? 1 : 0)) / questions.length) * 100
  }, [completed, currentIndex, questions.length])

  const handleSelect = (optionIndex) => {
    if (selectedAnswer !== null || !currentQuestion) return

    setSelectedAnswer(optionIndex)
    if (optionIndex === currentQuestion.correctIndex) {
      setScore((prev) => prev + 1)
    }
    setShowAnswer(true)
  }

  const handleLogin = () => {
    const trimmed = nicknameInput.trim()
    if (!trimmed) {
      alert('请输入你的昵称后再开始挑战。')
      return
    }

    setPlayerName(trimmed)
  }

  const handleLogout = () => {
    setPlayerName('')
    setNicknameInput('')
  }

  const resetQuiz = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowAnswer(false)
    setCompleted(false)
    setScore(0)
  }

  const goNext = () => {
    if (!currentQuestion) return

    if (currentIndex === questions.length - 1) {
      setCompleted(true)
      setLeaderboard((prev) => {
        const updated = [
          ...prev,
          {
            name: playerName,
            score,
            createdAt: new Date().toISOString(),
          },
        ]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)

        return updated
      })
      return
    }

    setCurrentIndex((prev) => prev + 1)
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
      alert('题目和至少两个选项不能为空。')
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

  const totalQuestions = questions.length
  const groupNames = [...new Set(questions.map((question) => question.category))]

  const handleShareResult = async () => {
    const summary = `我刚刚在 K-pop 默契挑战里拿了 ${score}/${totalQuestions} 分，${playerName}真的很懂我的 K-pop 口味！`

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

  return (
    <div className="app-shell">
      {!playerName ? (
        <div className="login-screen">
          <div className="login-card">
            <div className="brand-mark">K</div>
            <p className="eyebrow">K-pop 默契挑战</p>
            <h1>和朋友来一场 K-pop 默契测试</h1>
            <p className="login-copy">输入昵称后开始答题，看看你和朋友是不是真的很了解彼此的 K-pop 口味。</p>

            <div className="login-form">
              <input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="请输入昵称"
              />
              <button className="primary-button" onClick={handleLogin}>开始挑战</button>
            </div>

            <div className="rules-box">
              <h3>玩法说明</h3>
              <ul>
                <li>一共 10 道题，全部围绕你最爱的 K-pop 团体和音乐偏好</li>
                <li>登录后才会显示题目，适合朋友之间互相发链接挑战</li>
                <li>答对一题得 1 分，最后计算总分</li>
                <li>题目可以直接在页面里编辑，方便你随时换成自己的口味</li>
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
                <h1>Mutual Love Quiz</h1>
              </div>
            </div>

            <div className="topbar-actions">
              <div className="login-box">
                <span>{playerName}</span>
                <button onClick={handleLogout}>切换账号</button>
              </div>
              <div className="score-chip">
                <span>目前分数</span>
                <strong>{score}</strong>
              </div>
            </div>
          </header>

          <main className="layout">
            <section className="panel quiz-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-tag">题库</p>
                  <h2>{completed ? '测试结果' : currentQuestion?.category || '题目'}</h2>
                </div>
                <button className="ghost-button" onClick={shuffleQuestion}>换一题</button>
              </div>

              {!completed && currentQuestion ? (
                <>
                  <div className="progress-wrap">
                    <div className="progress-bar">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <p>{currentIndex + 1}/{totalQuestions}</p>
                  </div>

                  {isEditingQuestion && draftQuestion ? (
                    <div className="edit-card">
                      <label>
                        团名
                        <input
                          value={draftQuestion.category}
                          onChange={(e) => updateDraftQuestion('category', e.target.value)}
                        />
                      </label>

                      <label>
                        题目
                        <textarea
                          value={draftQuestion.prompt}
                          onChange={(e) => updateDraftQuestion('prompt', e.target.value)}
                        />
                      </label>

                      {draftQuestion.options.map((option, index) => (
                        <label key={`edit-option-${index}`}>
                          选项 {index + 1}
                          <input
                            value={option}
                            onChange={(e) => updateDraftOption(index, e.target.value)}
                          />
                        </label>
                      ))}

                      <label>
                        正确答案
                        <select
                          value={draftQuestion.correctIndex}
                          onChange={(e) => updateDraftQuestion('correctIndex', Number(e.target.value))}
                        >
                          {draftQuestion.options.map((_, index) => (
                            <option key={`answer-${index}`} value={index}>选项 {index + 1}</option>
                          ))}
                        </select>
                      </label>

                      <div className="action-row editing">
                        <button className="secondary-button" onClick={() => setIsEditingQuestion(false)}>
                          取消
                        </button>
                        <button className="primary-button" onClick={saveQuestionEdit}>
                          保存修改
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="question-card">
                        <p className="question-label">题目</p>
                        <h3>{currentQuestion.prompt}</h3>
                      </div>

                      <div className="options-grid">
                        {currentQuestion.options.map((option, index) => {
                          const isCorrect = index === currentQuestion.correctIndex
                          const isSelected = selectedAnswer === index
                          const showCorrect = showAnswer && isCorrect
                          const showWrong = showAnswer && isSelected && !isCorrect

                          return (
                            <button
                              key={`${option}-${index}`}
                              className={[
                                'option-button',
                                isSelected ? 'selected' : '',
                                showCorrect ? 'correct' : '',
                                showWrong ? 'wrong' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onClick={() => handleSelect(index)}
                            >
                              <span>{String.fromCharCode(65 + index)}</span>
                              <p>{option}</p>
                            </button>
                          )
                        })}
                      </div>

                      {showAnswer && (
                        <div className="answer-box">
                          <strong>{selectedAnswer === currentQuestion.correctIndex ? '答对了！' : '答错了！'}</strong>
                          <p>{currentQuestion.fact}</p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="action-row">
                    <button className="secondary-button" onClick={resetQuiz}>重新开始</button>
                    {!isEditingQuestion && (
                      <button className="secondary-button" onClick={startEditing}>编辑题目</button>
                    )}
                    {showAnswer && (
                      <button className="primary-button" onClick={goNext}>
                        {currentIndex === questions.length - 1 ? '看结果' : '下一题'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="result-card">
                  <p className="panel-tag">测试结束</p>
                  <h3>
                    你答对了 <span>{score}</span> / {totalQuestions} 题
                  </h3>
                  <p>
                    {playerName ? `${playerName}，` : ''}
                    {score === totalQuestions
                      ? '完美分数！你和我简直就是 K-pop 断层版默契天花板。'
                      : score >= Math.ceil(totalQuestions * 0.7)
                        ? '很强，说明你真的很了解我的 K-pop 口味。'
                        : score >= Math.ceil(totalQuestions * 0.4)
                          ? '还不错，继续玩就会越来越懂我。'
                          : '这轮先当热身，下一轮一定会更准。'}
                  </p>

                  <div className="result-actions">
                    <button className="primary-button" onClick={handleShareResult}>分享结果</button>
                    <button className="secondary-button" onClick={resetQuiz}>再玩一次</button>
                  </div>

                  {shareNotice && <div className="share-notice">{shareNotice}</div>}
                </div>
              )}
            </section>

            <aside className="panel sidebar-panel">
              <div className="panel-header compact">
                <div>
                  <p className="panel-tag">题库列表</p>
                  <h2>按团分区</h2>
                </div>
              </div>

              <div className="group-list">
                {groupNames.map((groupName) => (
                  <button
                    key={groupName}
                    className={`group-pill ${currentQuestion?.category === groupName ? 'active' : ''}`}
                    onClick={() => {
                      const index = questions.findIndex((question) => question.category === groupName)
                      if (index >= 0) setCurrentIndex(index)
                    }}
                  >
                    {groupName}
                  </button>
                ))}
              </div>

              <div className="mini-summary">
                <p>当前题目</p>
                <strong>{currentQuestion?.category || '暂无'}</strong>
                <span>共 {totalQuestions} 道题</span>
              </div>

              <div className="leaderboard-box">
                <h3>排行榜</h3>
                {leaderboard.length ? (
                  <ol>
                    {leaderboard.map((entry, index) => (
                      <li key={`${entry.name}-${index}`}>
                        <span>{index + 1}. {entry.name}</span>
                        <strong>{entry.score}/{totalQuestions}</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>目前还没有记录，先来一局吧！</p>
                )}
              </div>
            </aside>
          </main>
        </>
      )}
    </div>
  )
}

export default App
