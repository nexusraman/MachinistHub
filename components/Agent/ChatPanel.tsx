'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSnackbar } from 'notistack'
import {
  Box, Button, Chip, CircularProgress, Dialog, IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto'
import CloseIcon from '@mui/icons-material/Close'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import { useAgent } from './AgentProvider'
import EntryCard from './EntryCard'
import LookupResults from './LookupResults'
import { EXAMPLES, DraftChanges } from './shared'
import { ChatImage, MAX_PHOTOS, compressImage, imageSrc } from './image'

function Thumb({ img, size, onOpen, onRemove }: { img: ChatImage; size: number; onOpen: () => void; onRemove?: () => void }) {
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, nothing to optimise */}
      <img src={imageSrc(img)} alt="Attached photo" onClick={onOpen}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in', display: 'block' }} />
      {onRemove && (
        <IconButton size="small" onClick={onRemove} aria-label="Remove photo"
          sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', boxShadow: 1, p: 0.25, '&:hover': { bgcolor: 'grey.100' } }}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Box>
  )
}

function ChangeChips({ changes }: { changes?: DraftChanges }) {
  if (!changes) return null
  const parts = [
    changes.added ? { label: `+${changes.added} added`, color: 'success' as const } : null,
    changes.updated ? { label: `${changes.updated} updated`, color: 'info' as const } : null,
    changes.removed ? { label: `${changes.removed} removed`, color: 'default' as const } : null,
  ].filter(Boolean) as { label: string; color: 'success' | 'info' | 'default' }[]
  if (!parts.length) return null
  return (
    <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
      {parts.map(p => <Chip key={p.label} size="small" variant="outlined" color={p.color} label={p.label} />)}
    </Stack>
  )
}

// The conversation itself; used inside the floating drawer and on the /assistant page
export default function ChatPanel({ variant }: { variant: 'drawer' | 'page' }) {
  const { messages, draft, lastAddedIds, thinking, send, removeDraft, openReview } = useAgent()
  const [draftOpen, setDraftOpen] = useState(true)
  const { enqueueSnackbar } = useSnackbar()
  const [input, setInput] = useState('')
  const [photos, setPhotos] = useState<ChatImage[]>([])
  const [processing, setProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<ChatImage | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isPage = variant === 'page'

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const addFiles = async (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (!images.length) return
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) { enqueueSnackbar(`Up to ${MAX_PHOTOS} photos per message`, { variant: 'warning' }); return }
    if (images.length > room) enqueueSnackbar(`Only the first ${room} photo(s) were added (max ${MAX_PHOTOS})`, { variant: 'warning' })
    setProcessing(true)
    try {
      const added: ChatImage[] = []
      for (const f of images.slice(0, room)) {
        try { added.push(await compressImage(f)) } catch (e) { enqueueSnackbar((e as Error).message, { variant: 'error' }) }
      }
      setPhotos(p => [...p, ...added])
    } finally {
      setProcessing(false)
    }
  }

  const submit = async (text: string) => {
    const t = text.trim()
    if ((!t && !photos.length) || thinking || processing) return
    const sentPhotos = photos
    setInput('')
    setPhotos([])
    const ok = await send(t, sentPhotos)
    if (!ok) { setInput(t); setPhotos(sentPhotos) } // give everything back so it can be retried
  }

  const issues = draft.filter(e => e.issues?.length).length
  const column = { maxWidth: isPage ? 860 : undefined, mx: 'auto', width: '100%' }
  const canSend = (!!input.trim() || photos.length > 0) && !thinking && !processing
  const lastHasPhotos = !!messages[messages.length - 1]?.images?.length

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
      onDrop={e => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)) }}
    >
      {dragging && (
        <Box sx={{ position: 'absolute', inset: 8, zIndex: 2, border: '2px dashed', borderColor: 'primary.main', borderRadius: 2, bgcolor: 'rgba(25,118,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Typography fontWeight={700} color="primary">Drop photos to scan</Typography>
        </Box>
      )}

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'grey.50' }}>
        <Box sx={column}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', mt: isPage ? 8 : 4 }}>
              <Typography variant={isPage ? 'h6' : 'body1'} fontWeight={700} sx={{ mb: 1 }}>What do you want to log?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 520, mx: 'auto' }}>
                Type it the way you&apos;d say it, or add a photo of a register page, bill or payment screenshot.
                Put as many things as you like in one message. You&apos;ll review everything before it&apos;s saved.
              </Typography>
              <Stack spacing={1} alignItems="center">
                {EXAMPLES.map(ex => (
                  <Chip key={ex} label={ex} variant="outlined" onClick={() => submit(ex)} sx={{ maxWidth: '100%' }} />
                ))}
              </Stack>
            </Box>
          )}

          <Stack spacing={1.5}>
            {messages.map((m, i) => {

              if (m.role === 'user') {
                return (
                  <Box key={i} sx={{ alignSelf: 'flex-end', maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                    {m.images?.length ? (
                      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {m.images.map((img, j) => <Thumb key={j} img={img} size={isPage ? 120 : 84} onOpen={() => setPreview(img)} />)}
                      </Stack>
                    ) : null}
                    {m.text && (
                      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', px: 1.5, py: 1, borderRadius: 2, whiteSpace: 'pre-wrap' }}>
                        <Typography variant="body2">{m.text}</Typography>
                      </Box>
                    )}
                  </Box>
                )
              }
              if (m.note) {
                return (
                  <Stack key={i} direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ color: 'success.dark' }}>
                    <TaskAltIcon sx={{ fontSize: 16 }} />
                    <Typography variant="caption" fontWeight={600}>{m.text}</Typography>
                  </Stack>
                )
              }
              return (
                <Box key={i} sx={{ alignSelf: 'flex-start', maxWidth: m.lookup ? '100%' : '90%', width: m.lookup ? '100%' : undefined }}>
                  {m.text && <Typography variant="body2">{m.text}</Typography>}
                  <ChangeChips changes={m.changes} />
                  {m.lookup && <LookupResults lookup={m.lookup} compact={!isPage} />}
                </Box>
              )
            })}
            {thinking && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ alignSelf: 'flex-start' }}>
                <CircularProgress size={18} />
                {lastHasPhotos && <Typography variant="caption" color="text.secondary">Reading photo…</Typography>}
              </Stack>
            )}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ ...column, px: 2, pt: draft.length || photos.length || processing ? 1.5 : 0 }}>
          {draft.length > 0 && (
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: draftOpen ? 1 : 0 }}>
                <Button size="small" onClick={() => setDraftOpen(o => !o)} endIcon={draftOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, color: 'text.primary', px: 0.5 }}>
                  Draft · {draft.length} unsaved
                </Button>
                {issues > 0 && <Chip size="small" color="error" variant="outlined" label={`${issues} to fix`} />}
                <Box flex={1} />
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>Keep typing to add more</Typography>
              </Stack>
              {draftOpen && (
                <Box sx={{ maxHeight: isPage ? '38vh' : '32vh', overflowY: 'auto', display: 'grid', gap: 1, gridTemplateColumns: isPage ? { xs: '1fr', sm: '1fr 1fr' } : '1fr', mb: 1.5, pr: 0.5 }}>
                  {[...draft].reverse().map(e => (
                    <EntryCard key={e.id} entry={e} isNew={!!e.id && lastAddedIds.has(e.id)} onRemove={e.id ? () => removeDraft(e.id!) : undefined} />
                  ))}
                </Box>
              )}
              <Button fullWidth variant="contained" color="success" onClick={openReview} disabled={thinking} startIcon={<FactCheckIcon />}>
                Review & save {draft.length} {draft.length === 1 ? 'entry' : 'entries'}
              </Button>
            </Box>
          )}
          {(photos.length > 0 || processing) && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pt: draft.length ? 1.5 : 0.5, pl: 0.5 }}>
              {photos.map((img, j) => (
                <Thumb key={j} img={img} size={56} onOpen={() => setPreview(img)} onRemove={() => setPhotos(p => p.filter((_, k) => k !== j))} />
              ))}
              {processing && <CircularProgress size={20} />}
            </Stack>
          )}
          {/* Plain div, not a <form>: browser autofill extensions rewrite form controls before hydration */}
          <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ py: 1.5 }}>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
            <Tooltip title="Add photo (or paste / drag one in)">
              <span>
                <IconButton onClick={() => fileRef.current?.click()} disabled={thinking || processing || photos.length >= MAX_PHOTOS} aria-label="Add photo">
                  <AddAPhotoIcon />
                </IconButton>
              </span>
            </Tooltip>
            <TextField fullWidth multiline maxRows={isPage ? 8 : 4} size="small" autoFocus
              placeholder={photos.length ? 'Add a note (optional), e.g. "all for Akash"' : draft.length ? 'Add more, or correct something ("make Mahesh 1500")…' : 'e.g. Akash 20 pcs 4 inch, paid Mahesh 1500 UPI, groceries 850'}
              value={input} onChange={e => setInput(e.target.value)}
              onPaste={e => {
                const files = Array.from(e.clipboardData.files)
                if (files.some(f => f.type.startsWith('image/'))) { e.preventDefault(); addFiles(files) }
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input) } }} />
            <IconButton color="primary" onClick={() => submit(input)} disabled={!canSend} aria-label="Send"><SendIcon /></IconButton>
          </Stack>
        </Box>
      </Box>

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="lg">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img src={imageSrc(preview)} alt="Photo preview" onClick={() => setPreview(null)}
            style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'block', cursor: 'zoom-out' }} />
        )}
      </Dialog>
    </Box>
  )
}
