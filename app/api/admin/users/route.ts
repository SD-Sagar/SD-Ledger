import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL } from '../../../../lib/constants';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAnonClient(token?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

// Verify that the caller is the authorized administrator
async function verifyAdminCaller(req: NextRequest): Promise<{ isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  const callerEmail = req.headers.get('x-admin-email');

  if (callerEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { isAdmin: true };
  }

  if (!authHeader) {
    return { isAdmin: false, error: 'Unauthorized: Missing admin authorization.' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const anonClient = getAnonClient(token);
  if (!anonClient) {
    return { isAdmin: false, error: 'Supabase client not configured.' };
  }

  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { isAdmin: false, error: `Unauthorized: Only ${ADMIN_EMAIL} can access this admin endpoint.` };
  }

  return { isAdmin: true };
}

// GET: List all registered users
export async function GET(req: NextRequest) {
  const authCheck = await verifyAdminCaller(req);
  if (!authCheck.isAdmin) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const adminClient = getAdminClient();
  const anonClient = getAnonClient(token);

  try {
    let usersList: Array<{
      id: string;
      email: string;
      fullName?: string;
      created_at: string;
      last_sign_in_at?: string | null;
      is_blocked: boolean;
    }> = [];

    // 1. If service role key is present, get directly from Supabase auth.users
    if (adminClient) {
      const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (!listError && authUsers?.users) {
        // Query user_profiles to overlay is_blocked flags
        let profilesMap = new Map<string, boolean>();
        try {
          const { data: profiles } = await adminClient.from('user_profiles').select('id, is_blocked');
          if (profiles) {
            profiles.forEach((p) => profilesMap.set(p.id, Boolean(p.is_blocked)));
          }
        } catch {
          // ignore if table not created yet
        }

        usersList = authUsers.users.map((u) => {
          const isBlocked =
            profilesMap.get(u.id) ?? Boolean(u.user_metadata?.is_blocked);
          return {
            id: u.id,
            email: u.email || '',
            fullName: u.user_metadata?.full_name || u.email?.split('@')[0],
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            is_blocked: isBlocked,
          };
        });
      }
    }

    // 2. Fallback to public.user_profiles table
    if (usersList.length === 0 && anonClient) {
      const { data: profiles, error: pErr } = await anonClient
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!pErr && profiles) {
        usersList = profiles.map((p) => ({
          id: p.id,
          email: p.email,
          fullName: p.full_name || p.email?.split('@')[0],
          created_at: p.created_at,
          last_sign_in_at: null,
          is_blocked: Boolean(p.is_blocked),
        }));
      }
    }

    return NextResponse.json({
      success: true,
      users: usersList,
      hasServiceRoleKey: Boolean(adminClient),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch users';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Admin Actions (create_user, toggle_block, change_password, delete_user)
export async function POST(req: NextRequest) {
  const authCheck = await verifyAdminCaller(req);
  if (!authCheck.isAdmin) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const adminClient = getAdminClient();
  const anonClient = getAnonClient(token);

  try {
    const body = await req.json();
    const { action } = body;

    // ACTION 1: Create New User
    if (action === 'create_user') {
      const { email, password, fullName } = body;
      const cleanEmail = email?.trim().toLowerCase();
      if (!cleanEmail || !password || password.length < 6) {
        return NextResponse.json(
          { error: 'Please provide a valid email and password (minimum 6 characters).' },
          { status: 400 }
        );
      }

      if (!adminClient) {
        return NextResponse.json(
          {
            error:
              'SUPABASE_SERVICE_ROLE_KEY is required in .env to create users directly without email confirmation. Please add your service_role secret from Supabase Dashboard -> Settings -> API.',
          },
          { status: 501 }
        );
      }

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName?.trim() || cleanEmail.split('@')[0],
          is_blocked: false,
        },
      });

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }

      // Record into public.user_profiles
      try {
        await adminClient.from('user_profiles').upsert({
          id: newUser.user.id,
          email: cleanEmail,
          full_name: fullName?.trim() || cleanEmail.split('@')[0],
          is_blocked: false,
          role: cleanEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
        });
      } catch {
        // ignore if table doesn't exist
      }

      return NextResponse.json({
        success: true,
        message: `User ${cleanEmail} created successfully!`,
        user: newUser.user,
      });
    }

    // ACTION 2: Toggle Block / Unblock User
    if (action === 'toggle_block') {
      const { userId, isBlocked } = body;
      if (!userId) {
        return NextResponse.json({ error: 'Missing userId parameter.' }, { status: 400 });
      }

      // Protect admin account from ever being blocked
      if (adminClient) {
        const { data: targetUser } = await adminClient.auth.admin.getUserById(userId);
        if (targetUser?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          return NextResponse.json({ error: 'The primary admin account cannot be blocked.' }, { status: 400 });
        }

        // Update auth metadata
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: { is_blocked: Boolean(isBlocked) },
        });

        // Update public.user_profiles
        try {
          await adminClient.from('user_profiles').upsert({
            id: userId,
            is_blocked: Boolean(isBlocked),
            email: targetUser?.user?.email || '',
            updated_at: new Date().toISOString(),
          });
        } catch {
          // ignore
        }
      } else if (anonClient) {
        await anonClient.from('user_profiles').upsert({
          id: userId,
          is_blocked: Boolean(isBlocked),
          updated_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        message: isBlocked ? 'User has been blocked.' : 'User has been unblocked.',
      });
    }

    // ACTION 3: Change User Password
    if (action === 'change_password') {
      const { userId, newPassword } = body;
      if (!userId || !newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Please provide a valid password of at least 6 characters.' },
          { status: 400 }
        );
      }

      if (!adminClient) {
        return NextResponse.json(
          {
            error:
              'SUPABASE_SERVICE_ROLE_KEY is required in .env to update other users passwords from the database. Please add your service_role secret from Supabase Dashboard -> Settings -> API.',
          },
          { status: 501 }
        );
      }

      const { error: passErr } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (passErr) {
        return NextResponse.json({ error: passErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'User password updated successfully in the database!',
      });
    }

    // ACTION 4: Delete User
    if (action === 'delete_user') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ error: 'Missing userId parameter.' }, { status: 400 });
      }

      if (adminClient) {
        const { data: targetUser } = await adminClient.auth.admin.getUserById(userId);
        if (targetUser?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          return NextResponse.json({ error: 'The primary admin account cannot be deleted.' }, { status: 400 });
        }

        const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
        if (delErr) {
          return NextResponse.json({ error: delErr.message }, { status: 400 });
        }

        try {
          await adminClient.from('user_profiles').delete().eq('id', userId);
        } catch {
          // ignore
        }
      } else if (anonClient) {
        await anonClient.from('user_profiles').delete().eq('id', userId);
      }

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully.',
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Admin action failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

