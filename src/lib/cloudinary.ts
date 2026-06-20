/**
 * Cloudinary photo upload utility for SINTHA.
 *
 * Uploads photos directly from the browser to Cloudinary using unsigned
 * uploads (no API secret needed). Includes automatic image compression
 * to keep file sizes small (5 MB phone photos → ~200 KB).
 *
 * Required env vars (set on Vercel):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    — your Cloudinary cloud name
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET — your unsigned upload preset name
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`

export interface UploadResult {
  success: boolean
  url?: string  // Cloudinary secure URL (https://res.cloudinary.com/...)
  publicId?: string
  bytes?: number
  faceDetected?: boolean  // true if Cloudinary detected a face (passport photo check)
  faceConfidence?: number // 0..1 — how confident Cloudinary is about the face
  error?: string
}

/**
 * Compress and resize an image File before uploading.
 *
 * - Resizes to max 400x400 pixels (perfect for profile photos)
 * - Converts to JPEG quality 80% (smaller than PNG, no quality loss visible)
 * - Phone camera photos (5 MB) → ~150-250 KB
 *
 * Returns a new File object ready to upload.
 */
async function compressImage(file: File, maxSize = 400, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    // If it's already small enough, return as-is
    if (file.size < 500 * 1024) {
      // Under 500 KB — no need to compress
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Calculate new dimensions (preserve aspect ratio, fit within maxSize×maxSize)
        let { width, height } = img
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        // Draw to canvas at new size
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'))
              return
            }
            // Create a new File from the blob
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('Could not load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Upload a photo to Cloudinary.
 *
 * @param file The image File to upload (from <input type="file">)
 * @param folder Optional folder name (e.g. 'profiles', 'verifications')
 * @returns UploadResult with the Cloudinary URL on success
 */
export async function uploadPhoto(
  file: File,
  folder: string = 'profiles'
): Promise<UploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return {
      success: false,
      error: 'Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET env vars.',
    }
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return {
      success: false,
      error: 'Please select an image file (JPG, PNG, etc.)',
    }
  }

  // Validate file size (max 10 MB before compression)
  if (file.size > 10 * 1024 * 1024) {
    return {
      success: false,
      error: 'Image is too large. Please select a file under 10 MB.',
    }
  }

  try {
    // Compress the image first
    const compressedFile = await compressImage(file)

    // Create form data for upload
    const formData = new FormData()
    formData.append('file', compressedFile)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', folder)

    // Upload to Cloudinary
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData?.error?.message || `Upload failed (HTTP ${response.status})`,
      }
    }

    const data = await response.json()

    return {
      success: true,
      url: data.secure_url as string,
      publicId: data.public_id as string,
      bytes: data.bytes as number,
    }
  } catch (err: unknown) {
    const message = (err as Error).message || 'Upload failed'
    return {
      success: false,
      error: message.includes('Failed to fetch')
        ? 'Network error. Please check your internet connection.'
        : message,
    }
  }
}

/**
 * Upload a verification document (Aadhaar card photo or passport photo).
 *
 * Different from uploadPhoto in two ways:
 *   1. Larger maxSize (1600px) — Aadhaar cards need legible text
 *   2. Optional face detection — for passport photos, Cloudinary's AI
 *      checks whether a face is present and returns faceDetected +
 *      faceConfidence in the result. The caller can reject the upload
 *      if no face is detected.
 *
 * @param file The image File to upload
 * @param folder Cloudinary folder (default 'verifications')
 * @param options.detectFace If true, request face detection from Cloudinary
 * @returns UploadResult with url + optional faceDetected/faceConfidence
 */
export async function uploadVerificationPhoto(
  file: File,
  folder: string = 'verifications',
  options: { detectFace?: boolean } = {}
): Promise<UploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return {
      success: false,
      error: 'Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET env vars.',
    }
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return {
      success: false,
      error: 'Please select an image file (JPG, PNG, etc.)',
    }
  }

  // Validate file size (max 10 MB before compression)
  if (file.size > 10 * 1024 * 1024) {
    return {
      success: false,
      error: 'Image is too large. Please select a file under 10 MB.',
    }
  }

  try {
    // Compress with larger maxSize for documents (1600px — keeps text legible)
    const compressedFile = await compressImage(file, 1600, 0.85)

    // Create form data for upload
    const formData = new FormData()
    formData.append('file', compressedFile)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', folder)

    // Request face detection if asked (Cloudinary's 'adv_face' detection)
    // This makes Cloudinary run its AI face detection and include the
    // results in the upload response under `faces` and `info.detection.adv_face`
    if (options.detectFace) {
      formData.append('detection', 'adv_face')
    }

    // Upload to Cloudinary
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData?.error?.message || `Upload failed (HTTP ${response.status})`,
      }
    }

    const data = await response.json() as {
      secure_url: string
      public_id: string
      bytes: number
      faces?: Array<Array<number>> // Cloudinary returns array of face bounding boxes
      info?: {
        detection?: {
          adv_face?: Array<{ confidence: number }>
        }
      }
    }

    // Determine face detection result
    let faceDetected: boolean | undefined
    let faceConfidence: number | undefined
    if (options.detectFace) {
      // Cloudinary returns `faces` as an array of bounding boxes.
      // Empty array or missing = no face detected.
      const faceBoxes = data.faces
      faceDetected = !!(faceBoxes && faceBoxes.length > 0)
      // Confidence comes from the adv_face detection data (0..1)
      const advFace = data.info?.detection?.adv_face
      if (advFace && advFace.length > 0) {
        faceConfidence = advFace[0].confidence
      }
    }

    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      bytes: data.bytes,
      faceDetected,
      faceConfidence,
    }
  } catch (err: unknown) {
    const message = (err as Error).message || 'Upload failed'
    return {
      success: false,
      error: message.includes('Failed to fetch')
        ? 'Network error. Please check your internet connection.'
        : message,
    }
  }
}

/**
 * Delete a photo from Cloudinary by its public ID.
 * Requires the API secret (server-side only) — not used in the browser.
 * Included here for completeness; would need a backend route to use.
 */
export async function deletePhoto(publicId: string): Promise<boolean> {
  // Not implemented in browser — would need a backend route with API secret
  // Cloudinary's unsigned uploads can't delete files
  console.warn('deletePhoto requires a backend route with API secret')
  return false
}
