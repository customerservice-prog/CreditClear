import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Home as HomePage } from './pages/Home'
import { useAuthContext } from './context/useAuthContext'
import { useSubscriptionContext } from './context/useSubscriptionContext'
import { createCheckoutRequest, createPortalRequest } from './lib/apiClient'
import { trackEvent, trackPageView } from './lib/analytics'
import { streamGeneratedLetters } from './lib/letterStream'
import { createInitialState } from './lib/constants'
import { isSupabaseConfigured, requireSupabase } from './lib/supabase'
import { buildAutoDisputeTitle, buildLetterFileName } from './lib/formatters'
import { captureClientError } from './lib/monitoring'
import { MarketingMain, SkipToContent } from './components/MarketingPageFrame'
import { formatAuthError } from './lib/authErrors'
import { sanitizeEditableLetterText, validateAppInfo } from './lib/validators'
import { useDisputes } from './hooks/useDisputes'
import { useUploads } from './hooks/useUploads'
import { validateFileCoverageForAgencies } from './lib/reportCoverage'
import type { AppInfo, DisputeDetail, DisputeRecord, Letter, ReportBureauTag } from './types'
import { getBlogPostBySlug } from './data/blogPosts'
import { getPublicEnv } from './lib/publicEnv'
import { SITE_URL } from './lib/site'

const BillingPage = lazy(() => import('./pages/BillingPage').then((module) => ({ default: module.BillingPage })))
const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage').then((module) => ({ default: module.BlogIndexPage })))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then((module) => ({ default: module.BlogPostPage })))
const BureauDisputePage = lazy(() =>
  import('./pages/BureauDisputePage').then((module) => ({ default: module.BureauDisputePage })),
)
const ContactPage = lazy(() => import('./pages/ContactPage').then((module) => ({ default: module.ContactPage })))
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const CreditReportsPage = lazy(() =>
  import('./pages/CreditReportsPage').then((module) => ({ default: module.CreditReportsPage })),
)
const DisputeDetailPage = lazy(() =>
  import('./pages/DisputeDetailPage').then((module) => ({ default: module.DisputeDetailPage })),
)
const LegalPage = lazy(() => import('./pages/LegalPage').then((module) => ({ default: module.LegalPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const NewDisputePage = lazy(() => import('./pages/App').then((module) => ({ default: module.AppPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const PricingPage = lazy(() => import('./pages/PricingPage').then((module) => ({ default: module.PricingPage })))
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })),
)
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const SignupPage = lazy(() => import('./pages/SignupPage').then((module) => ({ default: module.SignupPage })))

const PAGE_META: Record<string, { description: string; title: string }> = {
  '/': {
    description:
      'Generate AI-assisted credit dispute letters for Equifax, Experian, and TransUnion. Upload your credit report, identify errors, and get review-ready draft letters in minutes. Free 7-day trial.',
    title: 'AI Credit Dispute Letter Generator | CreditClear AI',
  },
  '/billing': {
    description: 'Review your CreditClear trial status, subscription access, renewal timing, and billing options.',
    title: 'Billing | CreditClear AI',
  },
  '/blog': {
    description:
      'Educational guides on credit dispute letters, FCRA basics, bureau workflows, and credit score myths—not legal advice.',
    title: 'Credit Dispute & Credit Report Guides | CreditClear AI',
  },
  '/contact': {
    description: 'Reach CreditClear support for account, billing, and product questions.',
    title: 'Contact | CreditClear AI',
  },
  '/dashboard': {
    description: 'View saved disputes, start a new workflow, and monitor your current plan status.',
    title: 'Dashboard | CreditClear AI',
  },
  '/disclaimer': {
    description: 'Important limitations and review responsibilities for CreditClear AI outputs.',
    title: 'Disclaimer | CreditClear AI',
  },
  '/login': {
    description: 'Sign in to access your saved disputes, billing details, and draft-generation workflow.',
    title: 'Log In | CreditClear AI',
  },
  '/pricing': {
    description:
      'CreditClear AI pricing for AI-assisted credit dispute letters: start with a free 7-day trial, then $49/month. Organize Equifax, Experian, and TransUnion disputes in one workflow.',
    title: 'Credit Repair Software Pricing | AI Credit Dispute Tool | CreditClear AI',
  },
  '/reset-password': {
    description: 'Set a new CreditClear password after opening the secure link from your email.',
    title: 'Reset Password | CreditClear AI',
  },
  '/privacy': {
    description: 'Learn how CreditClear stores account data, billing records, and uploaded files.',
    title: 'Privacy Policy | CreditClear AI',
  },
  '/settings': {
    description: 'Manage your account details and session settings for CreditClear.',
    title: 'Settings | CreditClear AI',
  },
  '/signup': {
    description: 'Create your CreditClear account to start your guided dispute review workflow.',
    title: 'Sign Up | CreditClear AI',
  },
  '/terms': {
    description: 'Read the terms governing CreditClear subscriptions, uploads, and AI-assisted drafts.',
    title: 'Terms Of Use | CreditClear AI',
  },
}

function AppRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    appUser,
    authUser,
    loading: sessionLoading,
    refreshAppUser,
    session,
    signIn,
    signInWithGoogle,
    signOut: signOutAuth,
    signUp,
  } = useAuthContext()
  const subscription = useSubscriptionContext()
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authLongWaitHint, setAuthLongWaitHint] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingMessage, setBillingMessage] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [disputeDetail, setDisputeDetail] = useState<DisputeDetail | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupAcceptedTerms, setSignupAcceptedTerms] = useState(false)
  const [appState, setAppState] = useState(createInitialState)
  const letterSaveTimers = useRef<Record<string, number>>({})
  const { disputes, error: disputesError, getDetail, loading: disputesLoading, refresh: refreshDisputes, setDisputes, updateLetterText } = useDisputes(authUser?.id)
  const { uploadFiles } = useUploads(authUser?.id)

  useEffect(() => {
    let meta: { description: string; title: string }

    if (location.pathname.startsWith('/disputes/') && location.pathname !== '/disputes/new') {
      meta = {
        description: 'Review a saved CreditClear dispute, edit draft letters, and download documents.',
        title: 'Saved Dispute | CreditClear AI',
      }
    } else if (location.pathname === '/disputes/new') {
      meta = {
        description: 'Complete the guided credit dispute workflow, upload files, and generate editable drafts.',
        title: 'New Dispute | CreditClear AI',
      }
    } else if (location.pathname === '/credit-reports') {
      meta = {
        description: 'View and download every credit report file you uploaded to CreditClear, with bureau labels.',
        title: 'My Credit Reports | CreditClear AI',
      }
    } else if (location.pathname.startsWith('/blog/')) {
      const slug = location.pathname.slice('/blog/'.length)
      const post = slug && !slug.includes('/') ? getBlogPostBySlug(slug) : undefined
      meta = post
        ? { title: `${post.title} | CreditClear AI`, description: post.description }
        : {
            title: 'Blog | CreditClear AI',
            description:
              'Educational guides on credit disputes, credit reports, and FCRA-oriented workflows from CreditClear AI.',
          }
    } else {
      const bureauMatch = location.pathname.match(/^\/dispute\/(equifax|experian|transunion)$/i)
      if (bureauMatch) {
        const key = bureauMatch[1].toLowerCase() as 'equifax' | 'experian' | 'transunion'
        const label = { equifax: 'Equifax', experian: 'Experian', transunion: 'TransUnion' }[key]
        meta = {
          description: `Learn how to dispute ${label} credit report errors, organize FCRA-oriented dispute letters, and review AI-assisted drafts before you file.`,
          title: `How to Dispute ${label} Credit Report Errors | CreditClear AI`,
        }
      } else {
        meta = PAGE_META[location.pathname] || {
          description: 'CreditClear AI helps organize report issues and prepare user-reviewed dispute drafts.',
          title: 'CreditClear AI',
        }
      }
    }

    document.title = meta.title
    upsertMetaName('description', meta.description)

    const canonicalHref =
      location.pathname === '/' ? `${SITE_URL}/` : `${SITE_URL}${location.pathname.split('?')[0]}`
    upsertLinkRel('canonical', canonicalHref)

    const robotsContent = shouldNoIndexPath(location.pathname)
      ? 'noindex, nofollow'
      : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    upsertMetaName('robots', robotsContent)

    upsertMetaProperty('og:url', canonicalHref)
    upsertMetaProperty('og:title', meta.title)
    upsertMetaProperty('og:description', meta.description)

    if (location.pathname.startsWith('/blog/')) {
      const slug = location.pathname.slice('/blog/'.length)
      const post = slug && !slug.includes('/') ? getBlogPostBySlug(slug) : undefined
      if (post) {
        const iso = `${post.datePublished}T12:00:00.000Z`
        upsertMetaProperty('og:type', 'article')
        upsertMetaProperty('article:published_time', iso)
        upsertMetaProperty('article:modified_time', iso)
        upsertMetaName('author', post.author)
      } else {
        upsertMetaProperty('og:type', 'website')
        removeMetaProperty('article:published_time')
        removeMetaProperty('article:modified_time')
        document.querySelector('meta[name="author"]')?.remove()
      }
    } else {
      upsertMetaProperty('og:type', 'website')
      removeMetaProperty('article:published_time')
      removeMetaProperty('article:modified_time')
      document.querySelector('meta[name="author"]')?.remove()
    }

    upsertMetaName('twitter:title', meta.title)
    upsertMetaName('twitter:description', meta.description)

    const gsv = getPublicEnv('VITE_GOOGLE_SITE_VERIFICATION')
    if (gsv) {
      upsertMetaName('google-site-verification', gsv)
    }

    const tw = (getPublicEnv('VITE_TWITTER_SITE') || 'creditclearai').replace(/^@/, '')
    upsertMetaName('twitter:site', `@${tw}`)
    upsertMetaName('twitter:creator', `@${tw}`)

    trackPageView(location.pathname + location.search, meta.title)
  }, [location.pathname, location.search])

  useEffect(() => {
    const hasUnsavedProgress =
      appState.analyzing ||
      appState.files.length > 0 ||
      appState.letters.length > 0 ||
      Boolean(appState.info.firstName || appState.info.lastName || appState.info.email)

    if (!hasUnsavedProgress) {
      return
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [appState])

  useEffect(
    () => () => {
      Object.values(letterSaveTimers.current).forEach((timer) => window.clearTimeout(timer))
    },
    [],
  )

  const userDisplayName = useMemo(() => {
    const fullName = appUser?.name || authUser?.user_metadata?.full_name || authUser?.email || 'User'
    return String(fullName).split(' ')[0] || 'User'
  }, [appUser, authUser])

  useEffect(() => {
    if (!authUser) {
      return
    }

    const fullName = appUser?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || ''
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean)
    const saved = appUser?.saved_contact
    setAppState((previous) => ({
      ...previous,
      info: {
        ...previous.info,
        email: previous.info.email || authUser.email || '',
        firstName: previous.info.firstName || parts[0] || saved?.firstName?.trim() || '',
        lastName: previous.info.lastName || parts.slice(1).join(' ') || saved?.lastName?.trim() || '',
        phone: previous.info.phone || saved?.phone?.trim() || '',
        address: previous.info.address || saved?.address?.trim() || '',
        city: previous.info.city || saved?.city?.trim() || '',
        state: previous.info.state || saved?.state?.trim() || '',
        zip: previous.info.zip || saved?.zip?.trim() || '',
        ssn: previous.info.ssn || saved?.ssn?.trim() || '',
        dob: previous.info.dob || saved?.dob?.trim() || '',
      },
    }))
  }, [appUser, authUser])

  useEffect(() => {
    if (!authUser || !location.search.includes('checkout=')) {
      return
    }

    const params = new URLSearchParams(location.search)
    const status = params.get('checkout')
    params.delete('checkout')
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true },
    )

    if (status === 'cancelled') {
      setBillingMessage('Checkout was cancelled. Your saved disputes are still available.')
      return
    }

    if (status === 'success') {
      setBillingMessage('Confirming your subscription status...')
      void (async () => {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          await wait(1500)
          const latest = await refreshAppUser(authUser)
          if (latest?.subscription_status === 'active') {
            setBillingMessage('')
            break
          }

          if (attempt === 7) {
            setBillingMessage('Your payment was received, but billing is still syncing. Refresh this page or open Billing again in a moment.')
          }
        }
      })()
    }
  }, [authUser, location.pathname, location.search, navigate, refreshAppUser])

  function handleWorkspaceTabChange(tab: 'generator' | 'disputes') {
    setAppState((previous) => ({ ...previous, tab }))
    navigate('/disputes/new')
  }

  function clearAuthMessages() {
    setAuthError('')
    setAuthNotice('')
  }

  async function beginCheckout() {
    if (!isSupabaseConfigured || !session?.access_token) {
      setBillingMessage('Stripe checkout is unavailable right now.')
      return
    }

    try {
      setBillingLoading(true)
      setBillingMessage('')
      trackEvent('begin_checkout', { location: location.pathname })
      const response = await createCheckoutRequest()
      window.location.assign(response.url)
    } catch (error) {
      captureClientError(error, { flow: 'checkout' })
      setBillingMessage(error instanceof Error ? error.message : 'Unable to start Stripe checkout.')
    } finally {
      setBillingLoading(false)
    }
  }

  async function beginPortal() {
    if (!isSupabaseConfigured || !session?.access_token) {
      setBillingMessage('Billing management is unavailable right now.')
      return
    }

    try {
      setBillingLoading(true)
      setBillingMessage('')
      trackEvent('open_billing_portal', { location: location.pathname })
      const response = await createPortalRequest()
      window.location.assign(response.url)
    } catch (error) {
      captureClientError(error, { flow: 'billing_portal' })
      setBillingMessage(error instanceof Error ? error.message : 'Unable to open billing management.')
    } finally {
      setBillingLoading(false)
    }
  }

  async function handleLogin() {
    if (!isSupabaseConfigured) {
      setAuthError('Supabase is not configured yet.')
      return
    }

    if (!loginEmail.trim() || !loginPassword) {
      setAuthError('Please enter your email and password.')
      return
    }

    setAuthLongWaitHint(false)
    setAuthLoading(true)
    const slowHintTimer = window.setTimeout(() => setAuthLongWaitHint(true), 4000)
    try {
      setAuthError('')
      setAuthNotice('')
      await signIn(loginEmail.trim(), loginPassword)
      trackEvent('login_success')
      clearAuthMessages()
      navigate('/dashboard')
    } catch (error) {
      captureClientError(error, { flow: 'login' })
      setAuthError(formatAuthError(error))
    } finally {
      window.clearTimeout(slowHintTimer)
      setAuthLongWaitHint(false)
      setAuthLoading(false)
    }
  }

  async function handleSignup() {
    if (!isSupabaseConfigured) {
      setAuthError('Supabase is not configured yet.')
      return
    }

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setAuthError('Please fill in all fields.')
      return
    }

    if (signupPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.')
      return
    }

    if (!signupAcceptedTerms) {
      setAuthError('Please accept the Terms and Privacy Policy to create your account.')
      return
    }

    if (!/\S+@\S+\.\S+/.test(signupEmail.trim())) {
      setAuthError('Please enter a valid email address.')
      return
    }

    setAuthLongWaitHint(false)
    setAuthLoading(true)
    const slowHintTimer = window.setTimeout(() => setAuthLongWaitHint(true), 4000)
    try {
      setAuthError('')
      setAuthNotice('')
      const data = await signUp(signupName.trim(), signupEmail.trim(), signupPassword)
      if (!data.session || !data.user) {
        setAuthNotice('Check your email to confirm your account, then sign in to start your trial.')
        return
      }
      trackEvent('signup_success')
      clearAuthMessages()
      navigate('/dashboard')
    } catch (error) {
      captureClientError(error, { flow: 'signup' })
      setAuthError(formatAuthError(error))
    } finally {
      window.clearTimeout(slowHintTimer)
      setAuthLongWaitHint(false)
      setAuthLoading(false)
    }
  }

  async function handleSocial() {
    if (!isSupabaseConfigured) {
      setAuthError('Supabase is not configured yet.')
      return
    }

    try {
      setAuthLoading(true)
      await signInWithGoogle()
    } catch (error) {
      captureClientError(error, { flow: 'google_auth' })
      setAuthError(formatAuthError(error))
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!isSupabaseConfigured) {
      setAuthError('Supabase is not configured yet.')
      return
    }

    if (!loginEmail.trim()) {
      setAuthError('Enter your email address first so we can send a reset link.')
      return
    }

    try {
      setAuthLoading(true)
      setAuthError('')
      setAuthNotice('')
      const supabase = requireSupabase()
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
      const result = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), { redirectTo })

      if (result.error) {
        throw result.error
      }

      setAuthNotice('Password reset email sent. Check your inbox and spam folder for the link.')
    } catch (error) {
      captureClientError(error, { flow: 'forgot_password' })
      setAuthError(formatAuthError(error))
    } finally {
      setAuthLoading(false)
    }
  }

  async function signOutUser() {
    await signOutBase()
    setBillingMessage('')
    setSignupAcceptedTerms(false)
    setAppState(createInitialState())
    navigate('/')
  }

  async function persistProfileContact(info: AppInfo) {
    if (!authUser || !isSupabaseConfigured) {
      return
    }

    const supabase = requireSupabase()
    const saved_contact = {
      firstName: info.firstName.trim(),
      lastName: info.lastName.trim(),
      email: info.email.trim(),
      phone: info.phone.trim(),
      address: info.address.trim(),
      city: info.city.trim(),
      state: info.state.trim(),
      zip: info.zip.trim(),
      ssn: info.ssn.trim(),
      dob: info.dob.trim(),
    }

    const { error } = await supabase.from('profiles').update({ saved_contact }).eq('id', authUser.id)

    if (error) {
      throw error
    }

    await refreshAppUser(authUser)
  }

  async function handleAdvanceFromPersonalStep() {
    try {
      await persistProfileContact(appState.info)
    } catch (error) {
      captureClientError(error, { flow: 'persist_profile_contact' })
      setBillingMessage('We could not save your contact info to your profile. You can still continue.')
    }
    setAppState((previous) => ({ ...previous, step: 1 }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetApp() {
    const nextState = createInitialState()

    if (authUser) {
      const fullName = appUser?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || ''
      const parts = String(fullName).trim().split(/\s+/).filter(Boolean)
      const saved = appUser?.saved_contact
      nextState.info.firstName = parts[0] || saved?.firstName?.trim() || ''
      nextState.info.lastName = parts.slice(1).join(' ') || saved?.lastName?.trim() || ''
      nextState.info.email = authUser.email || ''
      nextState.info.phone = saved?.phone?.trim() || ''
      nextState.info.address = saved?.address?.trim() || ''
      nextState.info.city = saved?.city?.trim() || ''
      nextState.info.state = saved?.state?.trim() || ''
      nextState.info.zip = saved?.zip?.trim() || ''
      nextState.info.ssn = saved?.ssn?.trim() || ''
      nextState.info.dob = saved?.dob?.trim() || ''
    }

    setAppState(nextState)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function startAnalysis() {
    if (!session?.access_token) {
      setBillingMessage('Please sign in again before generating letters.')
      return
    }

    const infoError = validateAppInfo(appState.info)
    if (infoError) {
      setBillingMessage(infoError)
      return
    }

    const coverageError = validateFileCoverageForAgencies(appState.agencies, appState.files)
    if (coverageError) {
      setBillingMessage(coverageError)
      return
    }

    setAppState((previous) => ({
      ...previous,
      analyzing: true,
      analysisStep: 0,
      openLetter: null,
      letters: [],
      aiSummary: '',
      recommendations: [],
      streamMessage: 'Uploading your report and preparing your dispute drafts…',
    }))

    let slowStreamHint: number | undefined

    try {
      trackEvent('generation_started', {
        agencies: appState.agencies.length,
        files: appState.files.length,
        issues: appState.issues.length,
      })
      const collectedLetters: Letter[] = []

      slowStreamHint = window.setTimeout(() => {
        setAppState((previous) =>
          previous.analyzing && previous.analysisStep < 2
            ? {
                ...previous,
                streamMessage:
                  'Still waiting for the drafting service… This can take several minutes for many letters — keep this tab open.',
              }
            : previous,
        )
      }, 6000)

      await streamGeneratedLetters({
        agencies: appState.agencies,
        files: appState.files,
        info: appState.info,
        issues: appState.issues,
        onEvent: (event) => {
          if (event.type === 'status') {
            setAppState((previous) => ({
              ...previous,
              analysisStep: Math.min(previous.analysisStep + 1, 5),
              streamMessage: event.message || previous.streamMessage,
            }))
          }

          if (event.type === 'letter' && event.letter) {
            collectedLetters.push(event.letter)
            setAppState((previous) => ({
              ...previous,
              letters: [...previous.letters, event.letter!],
              streamMessage: `Generated ${collectedLetters.length} of ${appState.issues.length * (appState.agencies.length || 1)} letters...`,
            }))
          }

          if (event.type === 'complete') {
            const letters = event.letters?.length ? event.letters : collectedLetters
            setAppState((previous) => ({
              ...previous,
              analysisStep: 5,
              analyzing: false,
              aiSummary: event.summary || previous.aiSummary,
              letters,
              recommendations: event.recommendations || [],
              step: 4,
              streamMessage: '',
            }))
            trackEvent('generation_completed', { letters: letters.length })
            void saveDispute(letters, event.summary || '')
          }

          if (event.type === 'error') {
            throw new Error(event.message || 'Letter generation failed.')
          }
        },
      })
    } catch (error) {
      captureClientError(error, { flow: 'generation' })
      setAppState((previous) => ({
        ...previous,
        analyzing: false,
        streamMessage: '',
      }))
      setBillingMessage(error instanceof Error ? error.message : 'Unable to generate letters.')
    } finally {
      if (slowStreamHint) {
        window.clearTimeout(slowStreamHint)
      }
    }
  }

  async function saveDispute(letters: Letter[], summary: string) {
    if (!authUser || !isSupabaseConfigured) {
      return
    }

    const supabase = requireSupabase()
    const payload = {
      ai_summary: summary || null,
      bureau_targets: appState.agencies,
      issue_categories: appState.issues,
      personal_info: appState.info,
      status: 'draft_ready',
      title:
        appState.disputeTitle.trim() ||
        buildAutoDisputeTitle(appState.agencies, appState.issues),
      user_id: authUser.id,
    }
    const inserted = await supabase
      .from('disputes')
      .insert(payload)
      .select('id, user_id, title, status, bureau_targets, issue_categories, personal_info, ai_summary, created_at, updated_at')
      .single()

    if (inserted.error || !inserted.data) {
      setBillingMessage('Your letters were generated, but the dispute could not be saved. Please try again.')
      return
    }

    const disputeId = inserted.data.id
    const letterRows = letters.map((letter) => ({
      bureau: letter.agency,
      dispute_id: disputeId,
      draft_text: letter.text,
      editable_text: letter.text,
      issue_type: letter.issue,
      user_id: authUser.id,
    }))

    const lettersInsert = await supabase.from('letters').insert(letterRows)
    if (lettersInsert.error) {
      await supabase.from('disputes').delete().eq('id', disputeId)
      setBillingMessage('Your drafts were generated, but saving them failed. Please try again.')
      return
    }

    if (appState.files.length) {
      const uploadsUpdate = await supabase
        .from('uploads')
        .update({ dispute_id: disputeId })
        .in(
          'id',
          appState.files.map((file) => file.id).filter(Boolean),
        )

      if (uploadsUpdate.error) {
        setBillingMessage('Your dispute was saved, but some uploaded files could not be linked yet.')
      }
    }

    setAppState((previous) => ({ ...previous, currentDisputeId: disputeId }))
    setDisputes((previous) => [
      { ...(inserted.data as DisputeRecord), letter_count: letters.length },
      ...previous,
    ])
    trackEvent('dispute_saved', { letters: letters.length, uploads: appState.files.length })
  }

  async function setFileReportBureau(fileId: string, bureau: ReportBureauTag | null) {
    if (!authUser) {
      return
    }
    setAppState((previous) => ({
      ...previous,
      files: previous.files.map((file) => (file.id === fileId ? { ...file, report_bureau: bureau } : file)),
    }))
    const supabase = requireSupabase()
    const { error } = await supabase
      .from('uploads')
      .update({ report_bureau: bureau })
      .eq('id', fileId)
      .eq('user_id', authUser.id)
    if (error) {
      captureClientError(error, { flow: 'upload_bureau_label' })
      setBillingMessage('Could not save the bureau label for that file. Try again.')
    }
  }

  async function addFiles(files: FileList | null) {
    try {
      const nextFiles = await uploadFiles(files, appState.currentDisputeId ?? null)
      setAppState((previous) => ({
        ...previous,
        files: [...previous.files, ...nextFiles],
      }))
      if (nextFiles.length) {
        trackEvent('upload_completed', { count: nextFiles.length })
      }
    } catch (error) {
      captureClientError(error, { flow: 'upload' })
      setBillingMessage(error instanceof Error ? error.message : 'Unable to upload files.')
    }
  }

  async function saveLetterEdit(letterId: string, text: string) {
    const sanitizedText = sanitizeEditableLetterText(text)

    setAppState((previous) => ({
      ...previous,
      letters: previous.letters.map((letter) => (letter.id === letterId ? { ...letter, text: sanitizedText } : letter)),
    }))

    setDisputeDetail((previous) =>
      previous
        ? {
            ...previous,
            letters: previous.letters.map((letter) => (letter.id === letterId ? { ...letter, text: sanitizedText } : letter)),
          }
        : previous,
    )

    window.clearTimeout(letterSaveTimers.current[letterId])
    letterSaveTimers.current[letterId] = window.setTimeout(async () => {
      try {
        await updateLetterText(letterId, sanitizedText)
      } catch (error) {
        captureClientError(error, { flow: 'letter_save' })
        setBillingMessage(error instanceof Error ? error.message : 'Unable to save your letter edit.')
      }
    }, 500)
  }

  async function loadDispute(recordId: string) {
    setDetailLoading(true)
    try {
      const detail = await getDetail(recordId)
      setDisputeDetail(detail)
      navigate(`/disputes/${recordId}`)
    } catch {
      setDisputeDetail(null)
      setBillingMessage('That dispute could not be loaded.')
    } finally {
      setDetailLoading(false)
    }
  }

  function loadDisputeIntoGenerator(detail: DisputeDetail) {
    setAppState((previous) => ({
      ...previous,
      tab: 'generator',
      currentDisputeId: detail.id,
      disputeTitle: detail.title || '',
      step: 4,
      analyzing: false,
      aiSummary: detail.ai_summary || '',
      openLetter: null,
      agencies: detail.bureau_targets.filter(isAgencyId),
      files: detail.uploads.map((upload) => ({
        dispute_id: upload.dispute_id,
        file_name: upload.file_name,
        file_path: upload.file_path,
        id: upload.id,
        name: upload.file_name,
        report_bureau: (upload.report_bureau as ReportBureauTag | null) ?? null,
        size: upload.file_size,
        type: upload.mime_type,
      })),
      info: detail.personal_info,
      issues: detail.issue_categories.filter(isIssueId),
      letters: detail.letters as Letter[],
    }))
    navigate('/disputes/new')
  }

  async function signOutBase() {
    try {
      await signOutAuth()
      trackEvent('sign_out')
    } catch (error) {
      captureClientError(error, { flow: 'sign_out' })
      setBillingMessage(error instanceof Error ? error.message : 'Unable to sign out.')
    }
  }

  function downloadLetter(letterText: string, fileName: string) {
    const blob = new Blob([letterText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  if (sessionLoading && routeRequiresSessionGate(location.pathname)) {
    return (
      <>
        <Background />
        <div className="page active">
          <SkipToContent />
          <MarketingMain>
            <div aria-busy="true" aria-live="polite" className="hero" role="status">
              <div className="hero-badge">
                <div className="pulse-dot"></div> Loading Account
              </div>
              <h1>
                Preparing Your <em>Workspace</em>
              </h1>
              <p className="hero-sub">Syncing your session, profile, and billing access.</p>
            </div>
          </MarketingMain>
        </div>
      </>
    )
  }

  return (
    <>
      <Background />
      <Suspense
        fallback={
          <div className="page active">
            <SkipToContent />
            <MarketingMain>
              <div aria-busy="true" aria-live="polite" className="hero" role="status">
                <div className="hero-badge">
                  <div className="pulse-dot"></div> Loading Page
                </div>
                <h1>
                  Preparing Your Next <em>Step</em>
                </h1>
                <p className="hero-sub">Loading the secure workspace view.</p>
              </div>
            </MarketingMain>
          </div>
        }
      >
        <Routes>
        <Route
          path="/"
          element={
            <HomePage
              onScrollTo={scrollToSection}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
            />
          }
        />
        <Route
          path="/privacy"
          element={
            <LegalPage
              onHome={() => navigate('/')}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
              subtitle="How CreditClear handles account data, uploaded documents, billing records, and AI-assisted drafting inputs."
              title="Privacy Policy"
              body={[
                {
                  title: 'Information We Store',
                  text:
                    'CreditClear stores account details, subscription state, disputes, editable letter drafts, and uploaded files needed to operate the service. Uploaded files are kept in private storage and are intended for use within the authenticated workflow only.',
                },
                {
                  title: 'How Data Is Used',
                  text:
                    'We use your inputs to authenticate your account, maintain saved disputes, process billing, and generate AI-assisted draft content. Generated outputs depend on the information you provide and should always be reviewed before use.',
                },
                {
                  title: 'Important Limits',
                  text:
                    'CreditClear is a document-assistance and workflow platform, not a law firm. The service does not guarantee deletion of accurate information, does not provide legal advice, and should not be treated as professional legal representation.',
                },
              ]}
            />
          }
        />
        <Route
          path="/terms"
          element={
            <LegalPage
              onHome={() => navigate('/')}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
              subtitle="The rules for using CreditClear's document workflow, subscription access, and draft-generation features."
              title="Terms Of Use"
              body={[
                {
                  title: 'Service Scope',
                  text:
                    'CreditClear provides AI-assisted organization tools, document uploads, summaries, and editable draft dispute letters. All generated outputs are drafts for user review and not instructions, guarantees, or legal advice.',
                },
                {
                  title: 'User Responsibilities',
                  text:
                    'You are responsible for reviewing every generated output, verifying underlying facts, and deciding whether or how to use any draft. You must not rely on generated content without confirming that it is accurate for your situation.',
                },
                {
                  title: 'Billing And Access',
                  text:
                    'Paid features may require an active subscription or valid trial. If subscription status changes, access to premium generation features may be limited until billing is restored.',
                },
              ]}
            />
          }
        />
        <Route
          path="/disclaimer"
          element={
            <LegalPage
              onHome={() => navigate('/')}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
              subtitle="Important limitations, review responsibilities, and product-scope disclosures for CreditClear users."
              title="Product Disclaimer"
              body={[
                {
                  title: 'Draft Assistance Only',
                  text:
                    'CreditClear helps organize information and generate editable draft dispute letters for user review. Outputs are starting points, not final instructions, guarantees, or legal representations.',
                },
                {
                  title: 'No Guaranteed Outcomes',
                  text:
                    'CreditClear does not promise deletion of accurate information, score increases, or dispute success. Results depend on the underlying facts and how reporting entities respond.',
                },
                {
                  title: 'Review Before Use',
                  text:
                    'Users must review every generated summary, recommendation, and letter before using it. If uploaded document analysis is incomplete or uncertain, users should verify all details independently.',
                },
              ]}
            />
          }
        />
        <Route
          path="/login"
          element={
            <LoginPage
              authLoading={authLoading}
              authLoadingSlowHint={authLongWaitHint}
              error={authError}
              loginEmail={loginEmail}
              loginPassword={loginPassword}
              onBackHome={() => navigate('/')}
              onEmailChange={setLoginEmail}
              onForgotPassword={() => void handleForgotPassword()}
              onGoogle={() => void handleSocial()}
              onLogin={() => void handleLogin()}
              onPasswordChange={setLoginPassword}
              onSignIn={() => navigate('/login')}
              onSignupRoute={() => navigate('/signup')}
              onStartTrial={() => navigate('/signup')}
              notice={authNotice}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <SignupPage
              authLoading={authLoading}
              authLoadingSlowHint={authLongWaitHint}
              error={authError}
              acceptedTerms={signupAcceptedTerms}
              notice={authNotice}
              onBackHome={() => navigate('/')}
              onAcceptedTermsChange={setSignupAcceptedTerms}
              onEmailChange={setSignupEmail}
              onGoogle={() => void handleSocial()}
              onLoginRoute={() => navigate('/login')}
              onNameChange={setSignupName}
              onPasswordChange={setSignupPassword}
              onSignIn={() => navigate('/login')}
              onSignup={() => void handleSignup()}
              onStartTrial={() => navigate('/signup')}
              signupEmail={signupEmail}
              signupName={signupName}
              signupPassword={signupPassword}
            />
          }
        />
        <Route
          path="/contact"
          element={
            <ContactPage
              onHome={() => navigate('/')}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
            />
          }
        />
        <Route
          path="/pricing"
          element={
            <PricingPage
              onHome={() => navigate('/')}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
            />
          }
        />
        <Route
          path="/blog"
          element={
            <BlogIndexPage
              onHome={() => navigate('/')}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
            />
          }
        />
        <Route
          path="/blog/:slug"
          element={
            <BlogPostPage
              onHome={() => navigate('/')}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
            />
          }
        />
        <Route
          path="/dispute/:bureauId"
          element={
            <BureauDisputePage
              onHome={() => navigate('/')}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
            />
          }
        />
        <Route
          path="/reset-password"
          element={
            <ResetPasswordPage
              onHome={() => navigate('/')}
              onSignIn={() => navigate('/login')}
              onStartTrial={() => navigate('/signup')}
            />
          }
        />
        <Route
          path="/app"
          element={<Navigate replace to={authUser ? '/dashboard' : '/login'} />}
        />
        <Route
          path="/dashboard"
          element={
            authUser ? (
              <DashboardPage
                appMessage={billingMessage}
                appTab="disputes"
                disputes={disputes}
                disputesError={disputesError}
                disputesLoading={disputesLoading}
                onAppTabChange={handleWorkspaceTabChange}
                onOpenBilling={() => navigate('/billing')}
                onOpenDispute={(id) => void loadDispute(id)}
                onOpenNewDispute={() => navigate('/disputes/new')}
                onRetryDisputes={() => void refreshDisputes().catch(() => undefined)}
                onShowHome={() => navigate('/')}
                onSignOut={() => void signOutUser()}
                statusLabel={subscription.statusLabel}
                userDisplayName={userDisplayName}
              />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/credit-reports"
          element={
            authUser ? (
              <CreditReportsPage
                appMessage={billingMessage}
                appTab="disputes"
                onAppTabChange={handleWorkspaceTabChange}
                onShowHome={() => navigate('/')}
                onSignOut={() => void signOutUser()}
                statusLabel={subscription.statusLabel}
                userDisplayName={userDisplayName}
              />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/disputes/new"
          element={
            authUser ? (
              <NewDisputePage
                appState={appState}
                billingLoading={billingLoading}
                billingMessage={billingMessage}
                canAccessApp={subscription.canAccessApp}
                disputes={disputes}
                disputesLoading={disputesLoading}
                onAddFiles={(files) => void addFiles(files)}
                onAdvanceFromPersonalStep={() => void handleAdvanceFromPersonalStep()}
                onAppTabChange={handleWorkspaceTabChange}
                onBeginCheckout={() => void beginCheckout()}
                onDisputeTitleChange={(value) => setAppState((previous) => ({ ...previous, disputeTitle: value }))}
                onDownloadAll={() => {
                  appState.letters.forEach((letter, index) => {
                    window.setTimeout(() => {
                      downloadLetter(letter.text, buildLetterFileName(letter))
                    }, index * 150)
                  })
                }}
                onDownloadLetter={(letter) => downloadLetter(letter.text, buildLetterFileName(letter))}
                onFieldChange={(field, value) =>
                  setAppState((previous) => ({
                    ...previous,
                    info: { ...previous.info, [field]: value },
                  }))
                }
                onGoToStep={(step) => {
                  setAppState((previous) => ({ ...previous, step }))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                onLoadDispute={(record) => void loadDispute(record.id)}
                onRemoveFile={(index) =>
                  setAppState((previous) => ({
                    ...previous,
                    files: previous.files.filter((_, fileIndex) => fileIndex !== index),
                  }))
                }
                onResetApp={resetApp}
                onSetFileReportBureau={(fileId, bureau) => void setFileReportBureau(fileId, bureau)}
                onSetOpenLetter={(id) => setAppState((previous) => ({ ...previous, openLetter: id }))}
                onSetSelectedAgencies={(agencies) => setAppState((previous) => ({ ...previous, agencies }))}
                onSetSelectedIssues={(issues) => setAppState((previous) => ({ ...previous, issues }))}
                onShowHome={() => navigate('/')}
                onSignOut={() => void signOutUser()}
                onStartAnalysis={() => void startAnalysis()}
                onUpdateLetterText={(letterId, text) => void saveLetterEdit(letterId, text)}
                statusLabel={subscription.statusLabel}
                userDisplayName={userDisplayName}
              />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/disputes/:id"
          element={
            authUser ? (
              <DisputeDetailRoute
                appMessage={billingMessage}
                detail={disputeDetail}
                detailLoading={detailLoading}
                onAppTabChange={handleWorkspaceTabChange}
                onDownloadLetter={downloadLetter}
                onLoadDetail={getDetail}
                onOpenInGenerator={loadDisputeIntoGenerator}
                onSaveLetterEdit={(letterId, text) => void saveLetterEdit(letterId, text)}
                onShowHome={() => navigate('/')}
                onSignOut={() => void signOutUser()}
                statusLabel={subscription.statusLabel}
                userDisplayName={userDisplayName}
              />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/billing"
          element={
            authUser ? (
              <BillingPage
                appMessage={billingMessage}
                appTab="disputes"
                billingLoading={billingLoading}
                currentPeriodEnd={appUser?.subscription_current_period_end}
                onAppTabChange={handleWorkspaceTabChange}
                onBeginCheckout={() => void beginCheckout()}
                onManageBilling={() => void beginPortal()}
                onShowHome={() => navigate('/')}
                onSignOut={() => void signOutUser()}
                statusLabel={subscription.statusLabel}
                trialEndsAt={appUser?.trial_ends_at}
                userDisplayName={userDisplayName}
              />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/settings"
          element={
            authUser ? (
              <SettingsPage
                appMessage={billingMessage}
                appTab="disputes"
                onAppTabChange={handleWorkspaceTabChange}
                onShowHome={() => navigate('/')}
                onSignOut={() => void signOutUser()}
                statusLabel={subscription.statusLabel}
                user={appUser}
                userDisplayName={userDisplayName}
              />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
          <Route
            path="*"
            element={
              <NotFoundPage
                onHome={() => navigate('/')}
                onSignIn={() => navigate('/login')}
                onStartTrial={() => navigate('/signup')}
              />
            }
          />
        </Routes>
      </Suspense>
    </>
  )
}

function Background() {
  return (
    <>
      <div className="bg-mesh"></div>
      <div className="grid-bg"></div>
      <div className="orb orb1"></div>
      <div className="orb orb2"></div>
      <div className="orb orb3"></div>
    </>
  )
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

/** Workspace routes must wait for Supabase session; public marketing pages render immediately. */
function routeRequiresSessionGate(pathname: string): boolean {
  if (pathname === '/app') {
    return true
  }
  if (['/dashboard', '/billing', '/settings', '/credit-reports'].includes(pathname)) {
    return true
  }
  if (pathname.startsWith('/disputes/')) {
    return true
  }
  return false
}

function isPublicIndexablePath(pathname: string): boolean {
  const exact = new Set(['/', '/pricing', '/blog', '/contact', '/privacy', '/terms', '/disclaimer'])
  if (exact.has(pathname)) {
    return true
  }

  if (pathname.startsWith('/blog/')) {
    const slug = pathname.slice('/blog/'.length)
    if (!slug || slug.includes('/')) {
      return false
    }
    return Boolean(getBlogPostBySlug(slug))
  }

  return /^\/dispute\/(equifax|experian|transunion)$/i.test(pathname)
}

function shouldNoIndexPath(pathname: string): boolean {
  return !isPublicIndexablePath(pathname)
}

function upsertLinkRel(rel: string, href: string) {
  const selector = `link[rel="${rel}"]`
  let el = document.querySelector(selector) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.href = href
}

function upsertMetaName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertMetaProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function removeMetaProperty(property: string) {
  document.querySelector(`meta[property="${property}"]`)?.remove()
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isAgencyId(value: string): value is 'equifax' | 'experian' | 'transunion' {
  return value === 'equifax' || value === 'experian' || value === 'transunion'
}

function isIssueId(value: string): value is
  | 'late'
  | 'coll'
  | 'inq'
  | 'id'
  | 'dup'
  | 'bal'
  | 'bk'
  | 'repo'
  | 'jud'
  | 'cl'
  | 'sl'
  | 'med' {
  return ['late', 'coll', 'inq', 'id', 'dup', 'bal', 'bk', 'repo', 'jud', 'cl', 'sl', 'med'].includes(value)
}

function DisputeDetailRoute({
  appMessage,
  detail,
  detailLoading,
  onAppTabChange,
  onDownloadLetter,
  onLoadDetail,
  onOpenInGenerator,
  onSaveLetterEdit,
  onShowHome,
  onSignOut,
  statusLabel,
  userDisplayName,
}: {
  appMessage: string
  detail: DisputeDetail | null
  detailLoading: boolean
  onAppTabChange: (tab: 'generator' | 'disputes') => void
  onDownloadLetter: (text: string, fileName: string) => void
  onLoadDetail: (id: string) => Promise<DisputeDetail>
  onOpenInGenerator: (detail: DisputeDetail) => void
  onSaveLetterEdit: (letterId: string, text: string) => void
  onShowHome: () => void
  onSignOut: () => void
  statusLabel: string
  userDisplayName: string
}) {
  const { id } = useParams()
  const [loadedDetail, setLoadedDetail] = useState<DisputeDetail | null>(detail)
  const [routeLoading, setRouteLoading] = useState(!detail)

  useEffect(() => {
    if (!id) {
      return
    }

    void (async () => {
      setRouteLoading(true)
      try {
        const nextDetail = await onLoadDetail(id)
        setLoadedDetail(nextDetail)
      } catch {
        setLoadedDetail(null)
      } finally {
        setRouteLoading(false)
      }
    })()
  }, [id, onLoadDetail])

  return (
    <>
      <DisputeDetailPage
        appMessage={appMessage}
        appTab="disputes"
        detail={loadedDetail}
        loading={routeLoading || (detailLoading && !loadedDetail)}
        onAppTabChange={onAppTabChange}
        onDownloadLetter={onDownloadLetter}
        onOpenInGenerator={() => loadedDetail ? onOpenInGenerator(loadedDetail) : undefined}
        onSaveLetterEdit={onSaveLetterEdit}
        onShowHome={onShowHome}
        onSignOut={onSignOut}
        statusLabel={statusLabel}
        userDisplayName={userDisplayName}
      />
    </>
  )
}

export default AppRoutes
