import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          async get(name) {
            const cookie = await cookieStore.get(name);
            return cookie?.value;
          },
          async set(name, value, options) {
            await cookieStore.set({ name, value, ...options });
          },
          async remove(name, options) {
            await cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const body = await request.json();
    const { email, password, action } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (action === 'signup') {
      // Create new account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        return NextResponse.json({ error: signUpError.message }, { status: 400 });
      }

      // If signup was successful, return the session directly
      if (signUpData?.session) {
        return NextResponse.json({
          message: 'Signup successful',
          user: signUpData.user,
          session: signUpData.session,
          access_token: signUpData.session.access_token,
        });
      }

      // If no session was returned, try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Signin error:', signInError);
        return NextResponse.json({ error: signInError.message }, { status: 401 });
      }

      return NextResponse.json({
        message: 'Signup and signin successful',
        user: signInData.user,
        session: signInData.session,
        access_token: signInData.session.access_token,
      });
    } else if (action === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Signin error:', error);
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      return NextResponse.json({
        message: 'Signin successful',
        user: data.user,
        session: data.session,
        access_token: data.session.access_token,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "signup" or "signin"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          async get(name) {
            const cookie = await cookieStore.get(name);
            return cookie?.value;
          },
          async set(name, value, options) {
            await cookieStore.set({ name, value, ...options });
          },
          async remove(name, options) {
            await cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Signout error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 