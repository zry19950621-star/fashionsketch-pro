import { startTransition, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  KeyRound,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wand2,
} from 'lucide-react'

const initialResults = { top: null, bottom: null }
const initialAuthState = {
  status: 'loading',
  authEnabled: true,
  authConfigured: true,
  user: null,
}

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sketch'

const isValidClientEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

function FullScreenShell({ children }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(239,241,236,0.88)_42%,_rgba(228,231,226,1)_100%)] px-4 py-5 text-stone-900 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  )
}

function SessionLoadingScreen() {
  return (
    <FullScreenShell>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-xl rounded-[2.5rem] border border-white/80 bg-white/85 p-10 text-center shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-stone-200 bg-stone-50">
            <RefreshCw size={22} className="animate-spin text-stone-500" />
          </div>
          <h1 className="mt-6 text-2xl font-black tracking-tight text-stone-950">
            正在检查登录状态
          </h1>
          <p className="mt-3 text-sm leading-7 text-stone-500">
            稍等片刻，系统会确认当前会话并恢复你的工作台。
          </p>
        </div>
      </div>
    </FullScreenShell>
  )
}

function AuthScreen({
  authEmail,
  authPassword,
  errorMessage,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onLogin,
}) {
  return (
    <FullScreenShell>
      <div className="grid min-h-[calc(100vh-4rem)] items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/88 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur md:p-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-stone-200 bg-stone-50 px-4 py-2">
            <div className="rounded-2xl bg-stone-950 p-2 text-white">
              <LayoutGrid size={18} />
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.35em] text-stone-400">
                FashionSketch Pro
              </p>
              <p className="text-sm font-black text-stone-950">Member Access Only</p>
            </div>
          </div>

          <div className="mt-8 max-w-2xl">
            <h1 className="text-4xl font-black tracking-tight text-stone-950 md:text-5xl">
              先登录，再生成秀场 tech pack 线稿
            </h1>
            <p className="mt-5 text-base leading-8 text-stone-600">
              仅限购买世界时装阅览室的 Notion 用户
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.8rem] border border-stone-200 bg-stone-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-stone-400">
                Step 1
              </p>
              <p className="mt-3 text-sm font-bold text-stone-950">输入购买时绑定邮箱</p>
            </div>
            <div className="rounded-[1.8rem] border border-stone-200 bg-stone-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-stone-400">
                Step 2
              </p>
              <p className="mt-3 text-sm font-bold text-stone-950">输入站点登录密码</p>
            </div>
            <div className="rounded-[1.8rem] border border-stone-200 bg-stone-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-stone-400">
                Step 3
              </p>
              <p className="mt-3 text-sm font-bold text-stone-950">进入工作台继续出图</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,244,241,0.95))] p-8 shadow-[0_25px_80px_rgba(15,23,42,0.06)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-[0.26em] text-emerald-700">
            <ShieldCheck size={14} />
            Private Access
          </div>

          <h2 className="mt-6 text-2xl font-black tracking-tight text-stone-950">
            会员登录
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            仅向购买世界时装阅览室的 Notion 用户开放。
          </p>

          {errorMessage && (
            <div className="mt-6 flex items-start gap-3 rounded-[1.75rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.3em] text-stone-400">
                Email
              </span>
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-stone-200 bg-white px-4 py-4 shadow-sm">
                <Mail size={18} className="text-stone-400" />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="购买时绑定的邮箱"
                  className="w-full border-none bg-transparent text-sm font-medium text-stone-900 outline-none placeholder:text-stone-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.3em] text-stone-400">
                Password
              </span>
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-stone-200 bg-white px-4 py-4 shadow-sm">
                <LockKeyhole size={18} className="text-stone-400" />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="输入登录密码"
                  className="w-full border-none bg-transparent text-sm font-medium text-stone-900 outline-none placeholder:text-stone-400"
                />
              </div>
            </label>
          </div>

          <button
            type="button"
            disabled={!isValidClientEmail(authEmail) || !authPassword || isSubmitting}
            onClick={onLogin}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-[1.6rem] bg-stone-950 px-5 py-4 text-sm font-black text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                正在登录...
              </>
            ) : (
              <>
                <KeyRound size={18} />
                邮箱密码登录
              </>
            )}
          </button>
        </section>
      </div>
    </FullScreenShell>
  )
}

function App() {
  const [authState, setAuthState] = useState(initialAuthState)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authErrorMessage, setAuthErrorMessage] = useState(null)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [image, setImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState(initialResults)
  const [analysis, setAnalysis] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const fileInputRef = useRef(null)

  const resetWorkspace = () => {
    setImage(null)
    setResults(initialResults)
    setAnalysis(null)
    setErrorMessage(null)
    setIsProcessing(false)
  }

  const syncSession = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('无法获取当前会话。')
      }

      const payload = await response.json()
      setAuthState({
        status: payload.authenticated ? 'authenticated' : 'anonymous',
        authEnabled: Boolean(payload.authEnabled),
        authConfigured: Boolean(payload.authConfigured),
        user: payload.user ?? null,
      })

      if (payload.authenticated) {
        setAuthErrorMessage(null)
      }
    } catch (error) {
      setAuthState({
        status: 'anonymous',
        authEnabled: true,
        authConfigured: true,
        user: null,
      })
      setAuthErrorMessage(error.message || '登录状态检查失败。')
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncSession()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setImage({
        src: loadEvent.target?.result,
        mimeType: file.type || 'image/jpeg',
        fileName: file.name.replace(/\.[^.]+$/, ''),
      })
      setResults(initialResults)
      setAnalysis(null)
      setErrorMessage(null)
    }
    reader.readAsDataURL(file)
  }

  const downloadImage = (dataUrl, fileName) => {
    if (!dataUrl) return

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName
    link.click()
  }

  const loginWithPassword = async () => {
    setIsAuthSubmitting(true)
    setAuthErrorMessage(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || '登录失败。')
      }

      setAuthPassword('')
      await syncSession()
    } catch (error) {
      setAuthErrorMessage(error.message || '登录失败。')
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const generateTechPackSketches = async () => {
    if (!image?.src) return

    setIsProcessing(true)
    setErrorMessage(null)
    setResults(initialResults)
    setAnalysis(null)

    try {
      const response = await fetch('/api/generate-tech-pack', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageDataUrl: image.src,
          mimeType: image.mimeType,
        }),
      })

      const payload = await response.json()

      if (response.status === 401) {
        setAuthState((current) => ({
          ...current,
          status: 'anonymous',
          user: null,
        }))
      }

      if (!response.ok) {
        throw new Error(payload?.error || '服务端生成失败。')
      }

      startTransition(() => {
        setAnalysis(payload.analysis)
        setResults(payload.results)
      })
    } catch (error) {
      console.error(error)
      setErrorMessage(`生成失败：${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      resetWorkspace()
      setAuthPassword('')
      setAuthErrorMessage(null)
      setAuthState((current) => ({
        ...current,
        status: 'anonymous',
        user: null,
      }))
    }
  }

  if (authState.status === 'loading') {
    return <SessionLoadingScreen />
  }

  if (authState.status !== 'authenticated') {
    return (
      <AuthScreen
        authEmail={authEmail}
        authPassword={authPassword}
        errorMessage={authErrorMessage}
        isSubmitting={isAuthSubmitting}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onLogin={loginWithPassword}
      />
    )
  }

  const hasOutput = Boolean(results.top || results.bottom)

  return (
    <FullScreenShell>
      <header className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-stone-200 bg-stone-50 px-3 py-2">
              <div className="rounded-2xl bg-stone-950 p-2 text-white">
                <LayoutGrid size={18} />
              </div>
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.35em] text-stone-400">
                  FashionSketch Pro
                </p>
                <h1 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">
                  秀场上下装线稿拆解器
                </h1>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-stone-600">
              上传秀场照片后，工具会先识别上下装结构，再生成纯黑白的前后视工艺线稿，
              方便整理 tech pack、工艺单与打版沟通。
            </p>
          </div>

          {authState.user && (
            <div className="rounded-[1.8rem] border border-stone-200 bg-stone-50 px-5 py-4 lg:min-w-[19rem]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-stone-400">
                    Member Verified
                  </p>
                  <p className="mt-2 text-sm font-black text-stone-950">
                    {authState.user.name || authState.user.email}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">{authState.user.email}</p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 transition hover:border-stone-950 hover:text-stone-950"
                >
                  <LogOut size={14} />
                  退出
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mt-8 grid gap-8 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <section className="rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
              <span className="text-xs font-black uppercase tracking-[0.32em] text-stone-400">
                Step 1. 上传灵感图
              </span>
              {image && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-stone-500 transition hover:text-stone-950"
                >
                  更换图片
                </button>
              )}
            </div>

            <div className="p-6">
              {!image ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex aspect-[3/4] w-full flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-stone-200 bg-[linear-gradient(160deg,rgba(248,248,245,1),rgba(255,255,255,0.85))] p-6 text-center transition hover:border-stone-950 hover:bg-white"
                >
                  <div className="mb-4 rounded-full bg-white p-4 shadow-sm transition group-hover:scale-105">
                    <Upload size={22} className="text-stone-400 group-hover:text-stone-950" />
                  </div>
                  <p className="text-base font-black text-stone-950">点击上传原始秀场照片</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.3em] text-stone-400">
                    推荐全身高清图，正面姿态更稳定
                  </p>
                </button>
              ) : (
                <div className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-stone-50 p-2 shadow-inner">
                  <img
                    src={image.src}
                    alt="Uploaded runway reference"
                    className="aspect-[3/4] w-full rounded-[1.2rem] object-contain"
                  />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            <div className="px-6 pb-6">
              {errorMessage && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="button"
                disabled={!image || isProcessing}
                onClick={generateTechPackSketches}
                className="inline-flex w-full items-center justify-center gap-3 rounded-[1.4rem] bg-stone-950 px-4 py-4 text-sm font-black text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    正在识别并绘制线稿...
                  </>
                ) : (
                  <>
                    <Wand2 size={18} />
                    生成工序线稿包
                  </>
                )}
              </button>
            </div>
          </section>

          {analysis && (
            <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-stone-400">
                <FileText size={14} />
                结构分析
              </h2>

              <div className="mt-5 space-y-4">
                {analysis.top && (
                  <article className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-700">
                      上装 / Full Look
                    </p>
                    <p className="mt-2 text-lg font-black text-stone-950">{analysis.top.name}</p>
                    <p className="mt-3 rounded-2xl border border-stone-200 bg-white p-3 text-sm leading-7 text-stone-600">
                      {analysis.top.details}
                    </p>
                  </article>
                )}

                {analysis.bottom ? (
                  <article className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-700">
                      下装
                    </p>
                    <p className="mt-2 text-lg font-black text-stone-950">
                      {analysis.bottom.name}
                    </p>
                    <p className="mt-3 rounded-2xl border border-stone-200 bg-white p-3 text-sm leading-7 text-stone-600">
                      {analysis.bottom.details}
                    </p>
                  </article>
                ) : (
                  <div className="flex items-center gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-700">
                    <CheckCircle2 size={16} />
                    当前识别结果是连衣裙、长袍或连体衣，因此没有单独下装。
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="xl:col-span-8">
          <section className="flex h-full flex-col gap-6">
            <div className="flex items-center justify-between rounded-[2rem] border border-white/70 bg-white/85 px-7 py-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.32em] text-stone-400">
                <Eye size={14} />
                Step 2. 线稿输出区
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.28em] text-stone-400">
                Black / White CAD Flats
              </span>
            </div>

            {!hasOutput && !isProcessing && (
              <div className="flex min-h-[38rem] flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-stone-200 bg-white/85 px-8 text-center shadow-[0_20px_70px_rgba(15,23,42,0.05)] backdrop-blur">
                <div className="rounded-full bg-stone-100 p-5 text-stone-400">
                  <LayoutGrid size={30} />
                </div>
                <p className="mt-6 text-lg font-black text-stone-900">等待生成黑白线稿包</p>
                <p className="mt-3 max-w-md text-sm leading-7 text-stone-500">
                  上传秀场图后，系统会自动识别上下装结构，并输出适合 tech pack
                  使用的前后视技术线稿。
                </p>
              </div>
            )}

            {isProcessing && !hasOutput && (
              <div className="flex min-h-[38rem] flex-col items-center justify-center rounded-[2.5rem] border border-stone-200 bg-white/85 shadow-[0_20px_70px_rgba(15,23,42,0.05)] backdrop-blur">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
                <p className="mt-5 text-sm font-black uppercase tracking-[0.32em] text-stone-500">
                  AI 正在分析结构并绘制线稿
                </p>
              </div>
            )}

            {results.top && (
              <article className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-blue-700" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-stone-400">
                        Top Piece
                      </p>
                      <h3 className="text-sm font-black text-stone-950">
                        上装款式图 · {analysis?.top?.name ?? 'Top'}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadImage(
                        results.top,
                        `${slugify(image?.fileName ?? 'runway-look')}-${slugify(
                          analysis?.top?.name ?? 'top',
                        )}.png`,
                      )
                    }
                    className="rounded-full border border-stone-200 p-2 text-stone-500 transition hover:border-stone-950 hover:text-stone-950"
                  >
                    <Download size={16} />
                  </button>
                </div>
                <div className="flex min-h-[28rem] items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(245,245,244,0.9))] p-8">
                  <img
                    src={results.top}
                    alt="Generated top technical flat"
                    className="max-h-[32rem] max-w-full object-contain mix-blend-multiply"
                  />
                </div>
              </article>
            )}

            {results.bottom && (
              <article className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-blue-700" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-stone-400">
                        Bottom Piece
                      </p>
                      <h3 className="text-sm font-black text-stone-950">
                        下装款式图 · {analysis?.bottom?.name ?? 'Bottom'}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadImage(
                        results.bottom,
                        `${slugify(image?.fileName ?? 'runway-look')}-${slugify(
                          analysis?.bottom?.name ?? 'bottom',
                        )}.png`,
                      )
                    }
                    className="rounded-full border border-stone-200 p-2 text-stone-500 transition hover:border-stone-950 hover:text-stone-950"
                  >
                    <Download size={16} />
                  </button>
                </div>
                <div className="flex min-h-[28rem] items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(245,245,244,0.9))] p-8">
                  <img
                    src={results.bottom}
                    alt="Generated bottom technical flat"
                    className="max-h-[32rem] max-w-full object-contain mix-blend-multiply"
                  />
                </div>
              </article>
            )}
          </section>
        </div>
      </main>
    </FullScreenShell>
  )
}

export default App
