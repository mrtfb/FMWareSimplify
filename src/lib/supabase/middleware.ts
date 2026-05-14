import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

  const pathname = request.nextUrl.pathname

  // Helper: redirect while preserving any refreshed session cookies
  function redirect(url: string) {
    const res = NextResponse.redirect(new URL(url, request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => res.cookies.set(cookie))
    return res
  }

  const publicPaths = ['/auth', '/register', '/auth/reset-password']
  if (!user && !publicPaths.some(p => pathname.startsWith(p))) {
    return redirect('/auth/login')
  }

  if (user && pathname === '/') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    if (role === 'superadmin') return redirect('/admin')
    if (role === 'manager') return redirect('/manager')
    return redirect('/worker')
  }

  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'superadmin') return redirect('/')
  }

  return supabaseResponse
}
