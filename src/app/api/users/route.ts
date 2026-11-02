import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { requireUser } from '@/lib/guard';

export const dynamic = 'force-dynamic';

// GET /api/users - List all users (any authenticated user)
export async function GET(req: NextRequest) {
  const auth = await requireUser(req, 'read');
  if (auth.response) return auth.response;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordResetRequestedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new User or Admin (Restricted to ADMIN role only)
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, 'admin');
  if (auth.response) return auth.response;

  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required fields' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const targetRole = role === 'ADMIN' ? 'ADMIN' : role === 'VIEWER' ? 'VIEWER' : 'OPERATOR';

    if (String(password).length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `User account with email "${cleanEmail}" already exists.` },
        { status: 400 }
      );
    }

    // Hash password with bcrypt
    const hashedPassword = await hashPassword(password);

    // Create user in PostgreSQL DB
    const newUser = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: targetRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `Successfully created new ${targetRole} account for "${newUser.name}" (${newUser.email}).`,
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user account' },
      { status: 500 }
    );
  }
}
