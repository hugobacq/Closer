import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPublicRoute = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/join')

  // Redirections helpers qui conservent les cookies rafraîchis de Supabase
  const redirect = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    const res = NextResponse.redirect(url)
    // IMPORTANT : On transmet les nouveaux cookies (refresh token) au redirect
    supabaseResponse.cookies.getAll().forEach(cookie => {
      res.cookies.set(cookie.name, cookie.value)
    })
    return res
  }

  // 1. Non connecté → Rediriger vers /login sauf si la route est publique
  if (!user) {
    if (!isPublicRoute) {
      return redirect('/login')
    }
    return supabaseResponse
  }

  // L'utilisateur EST connecté.

  // S'il est sur une page de login ou landing, l'envoyer vers sa session active
  if (isPublicRoute) {
    return redirect('/home')
  }

  const isOnboarding = pathname.startsWith('/onboarding')

  // 2. Vérifier si le profil est complété
  let profileComplete = false
  try {
    const { data: profile } = await supabase
      .from('profiles').select('profile_complete').eq('id', user.id).single()
    profileComplete = profile?.profile_complete === true
  } catch {
    return supabaseResponse
  }

  // Profil incomplet et on ne s'y trouve pas déjà → /onboarding/profile
  if (!profileComplete && !isOnboarding) {
    return redirect('/onboarding/profile')
  }

  // Déjà sur onboarding mais profil fini → /onboarding/couple
  if (profileComplete && pathname === '/onboarding/profile') {
    return redirect('/onboarding/couple')
  }

  // 3. Vérifier s'il a rejoint un couple
  if (profileComplete && !isOnboarding) {
    try {
      const { data: member } = await supabase
        .from('couple_members').select('id').eq('user_id', user.id).maybeSingle()

      if (!member) {
        return redirect('/onboarding/couple')
      }
    } catch {
      // Si la table n'existe pas encore
    }
  }

  return supabaseResponse
}
