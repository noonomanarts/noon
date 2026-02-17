import * as bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { changePassword, getUserByEmail, getUserById, getUserByPhone, updateUser } from '@/lib/db/users';
import type { PreferredLanguage } from '@/lib/db/types';

type SettingsPayload = {
  fullName?: string;
  phoneNumber?: string;
  profileImage?: string | null;
  preferredLanguage?: PreferredLanguage;
  currentPassword?: string;
  newPassword?: string;
};

async function requireAuthenticatedUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return null;
  }

  return getUserById(sessionId);
}

function sanitizePreferredLanguage(value: unknown): PreferredLanguage {
  return value === 'ARABIC' ? 'ARABIC' : 'ENGLISH';
}

function sanitizeProfileImage(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 500);
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (error) {
    console.error('Failed to load account settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as SettingsPayload;

    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : user.fullName;
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : user.phoneNumber;
    const preferredLanguage = sanitizePreferredLanguage(body.preferredLanguage);
    const profileImage = sanitizeProfileImage(body.profileImage);

    if (fullName.length < 2 || fullName.length > 120) {
      return NextResponse.json({ error: 'Full name must be between 2 and 120 characters.' }, { status: 400 });
    }

    if (phoneNumber.length < 6 || phoneNumber.length > 20) {
      return NextResponse.json({ error: 'Phone number is invalid.' }, { status: 400 });
    }

    const existingPhone = await getUserByPhone(phoneNumber);
    if (existingPhone && existingPhone.id !== user.id) {
      return NextResponse.json({ error: 'Phone number is already used by another account.' }, { status: 409 });
    }

    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';

    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
      }

      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password.' }, { status: 400 });
      }

      const userWithPassword = await getUserByEmail(user.email);
      if (!userWithPassword) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      const currentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);
      if (!currentPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      const passwordUpdated = await changePassword(user.id, newPassword);
      if (!passwordUpdated) {
        return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
      }
    }

    const updatedUser = await updateUser(user.id, {
      full_name: fullName,
      phone_number: phoneNumber,
      preferred_language: preferredLanguage,
      profile_image: profileImage,
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update account settings.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phoneNumber: updatedUser.phoneNumber,
        profileImage: updatedUser.profileImage,
        preferredLanguage: updatedUser.preferredLanguage,
      },
    });
  } catch (error) {
    console.error('Failed to update account settings:', error);
    return NextResponse.json({ error: 'Failed to update account settings' }, { status: 500 });
  }
}
