import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getServerSession } from 'next-auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = getSupabaseServer() // ✅ TEM QUE TER ()

  const session = await getServerSession()
  if (!session || !session.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const workspaceId = session.user.workspaceId
  const buffer = Buffer.from(await file.arrayBuffer())
  const path = `workspaces/${workspaceId}/logo.png`

  const { error } = await supabase.storage
    .from('logos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from('logos').getPublicUrl(path)

  return NextResponse.json({ logoUrl: data.publicUrl })
}
