import { createServerClient, getCurrentUserProfile, isUserAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * POST /api/upload
 * Upload file to Supabase Storage.
 * Admin can upload managed assets. Owners can upload dish images.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const isAdmin = await isUserAdmin(supabase);
    const profile = await getCurrentUserProfile(supabase);

    // Use Admin Client for storage operations to bypass RLS
    const adminSupabase = createAdminClient();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = (formData.get('bucket') as string) || 'images';
    const folder = (formData.get('folder') as string) || 'uploads';
    const isOwnerDishImageUpload =
      profile?.role === 'owner' && bucket === 'images' && folder === 'dishes';

    if (!isAdmin && !isOwnerDishImageUpload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate bucket
    if (!['images', 'audio'].includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${crypto.randomUUID()}.${fileExt}`;

    // Upload with Admin Client (bypasses RLS)
    const { error: uploadError } = await adminSupabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL using regular client (read is public)
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    const details = error instanceof Error ? (error.stack ?? error.message) : JSON.stringify(error);
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: message, details }, { status: 500 });
  }
}
