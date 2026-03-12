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

  // Routes toujours accessibles
  const isPublic = pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/join')

  // Non connecté → /login
  if (!user) {
    if (!isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const isOnboarding = pathname.startsWith('/onboarding')

  // Vérifier le profil (avec fallback si table absente)
  let profileComplete = false
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_complete')
      .eq('id', user.id)
      .single()
    profileComplete = profile?.profile_complete === true
  } catch {
    return supabaseResponse
  }

  // Profil incomplet → /onboarding/profile
  if (!profileComplete && !isOnboarding && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding/profile'
    return NextResponse.redirect(url)
  }

  // Déjà sur /onboarding/profile avec profil complet → /onboarding/couple
  if (profileComplete && pathname === '/onboarding/profile') {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding/couple'
    return NextResponse.redirect(url)
  }

  // Vérifier le couple (seulement si profil complet et route protégée)
  if (profileComplete && !isOnboarding && !isPublic) {
    try {
      const { data: member } = await supabase
        .from('couple_members')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!member) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding/couple'
        return NextResponse.redirect(url)
      }
    } catch {
      // Table couple_members pas encore créée → laisser passer
    }
  }

  return supabaseResponse
}
