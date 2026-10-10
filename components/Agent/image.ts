export type ChatImage = { mimeType: string; data: string } // data = base64 without the data: prefix

export const MAX_PHOTOS = 4 // keep in sync with MAX_IMAGES_PER_MESSAGE in lib/agent.ts
const MAX_SIDE = 1600 // enough to read handwriting, small enough to upload quickly

export const imageSrc = (img: ChatImage) => `data:${img.mimeType};base64,${img.data}`

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Can't read "${file.name}". Try a JPG or PNG.`)) }
    img.src = url
  })
}

// Downscale and re-encode as JPEG in the browser before sending
export async function compressImage(file: File): Promise<ChatImage> {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" is not an image`)
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the photo')
  ctx.fillStyle = '#fff' // transparent PNGs become white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  return { mimeType: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}
