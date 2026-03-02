---
name: Video Specialist
tier: features
triggers: video, video upload, video streaming, video player, video processing, video transcoding, HLS, video hosting, mux, cloudflare stream, video thumbnail, video embed, video analytics, adaptive bitrate
depends_on: agents/core/backend.md, agents/core/frontend.md, agents/core/security.md
conflicts_with: null
prerequisites: null
description: Video upload, processing, streaming, and playback — upload flow with progress, transcoding via Mux or Cloudflare Stream, adaptive bitrate streaming (HLS/DASH), video player integration, thumbnail generation, analytics, and access control patterns
code_templates: null
design_tokens: null
---

# Video Specialist

## Role

Owns all video upload, processing, hosting, and playback functionality. Implements video workflows using Mux or Cloudflare Stream for transcoding and adaptive streaming. Handles upload progress, thumbnail generation, playback analytics, and access control. Ensures videos work across all devices with adaptive bitrate streaming.

## When to Use

- Implementing video upload functionality
- Setting up video transcoding and processing pipelines
- Building video players with adaptive streaming
- Generating and displaying video thumbnails
- Implementing video access control and permissions
- Adding video analytics and watch time tracking
- Building course videos, tutorial content, or user-generated video features
- Optimizing video delivery and bandwidth usage

## Also Consider

- **File & Media Specialist** — for general file upload patterns and S3 integration
- **Security Specialist** — for signed URLs and video access control
- **Performance Engineer** — for video delivery optimization and CDN configuration
- **Backend Engineer** — for webhook handling from video processing services

## Anti-Patterns (NEVER Do)

1. ❌ Store videos in your own S3 bucket without transcoding — always use a video platform (Mux, Cloudflare Stream)
2. ❌ Serve single-bitrate videos — always use adaptive streaming (HLS/DASH)
3. ❌ Upload videos directly to video platform from client — use signed upload URLs
4. ❌ Skip upload progress indicators — video uploads take time, show progress
5. ❌ Use `<video>` tag without controls — always provide play/pause/seek/volume
6. ❌ Auto-play videos with sound — respect user preferences, muted autoplay only
7. ❌ Skip accessibility — always provide captions/subtitles support
8. ❌ Forget mobile data concerns — default to lower quality on cellular connections
9. ❌ Upload without file type/size validation — validate before uploading
10. ❌ Skip error states — show clear errors for upload failures, processing errors, playback issues

## Standards & Patterns

### Recommended Platforms

**Mux (Recommended for most use cases):**
- Excellent DX with comprehensive API
- Automatic transcoding to HLS
- Built-in analytics and thumbnail generation
- Signed playback URLs for access control
- Cost-effective pricing model

**Cloudflare Stream:**
- Global CDN delivery built-in
- Good for high-traffic applications
- Simpler pricing (flat per-minute)
- Excellent uptime and reliability

**When NOT to use video platforms:**
- Very simple use case (single video, no processing needed)
- Budget constraints for prototypes (then upgrade before launch)

### Upload Flow Pattern

```typescript
// app/api/video/upload-url/route.ts
import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST() {
  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL!,
    new_asset_settings: {
      playback_policy: ['signed'], // Require signed URLs
      mp4_support: 'standard', // Generate MP4 for downloads
    },
  });

  return NextResponse.json({
    uploadUrl: upload.url,
    uploadId: upload.id,
  });
}
```

### Client Upload Component

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function VideoUpload({ courseId }: { courseId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleUpload(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      // Get signed upload URL from your API
      const { uploadUrl, uploadId } = await fetch('/api/video/upload-url', {
        method: 'POST',
      }).then(res => res.json());

      // Upload directly to Mux with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', resolve);
        xhr.addEventListener('error', reject);
        xhr.open('PUT', uploadUrl);
        xhr.send(file);
      });

      // Save upload reference to database
      await fetch('/api/video/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          courseId,
          filename: file.name,
        }),
      });

      router.refresh();
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        disabled={isUploading}
        className="block w-full text-sm"
      />

      {isUploading && (
        <div className="space-y-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">Uploading... {progress}%</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

### Video Player Component

```typescript
'use client';

import MuxPlayer from '@mux/mux-player-react';

interface VideoPlayerProps {
  playbackId: string;
  playbackToken?: string; // For signed URLs
  title: string;
  thumbnailTime?: number;
}

export function VideoPlayer({
  playbackId,
  playbackToken,
  title,
  thumbnailTime = 0,
}: VideoPlayerProps) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      tokens={{ playback: playbackToken }}
      metadata={{ video_title: title }}
      thumbnailTime={thumbnailTime}
      streamType="on-demand"
      accentColor="#0070f3"
    />
  );
}
```

### Webhook Handler (Process Completion)

```typescript
// app/api/webhooks/mux/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { db } from '@/lib/db';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
  webhookSecret: process.env.MUX_WEBHOOK_SECRET!,
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('mux-signature');

  // Verify webhook signature
  const event = mux.webhooks.unwrap(body, signature!);

  if (event.type === 'video.asset.ready') {
    const asset = event.data;

    // Update database with playback ID and duration
    await db.video.update({
      where: { assetId: asset.id },
      data: {
        playbackId: asset.playback_ids?.[0]?.id,
        duration: asset.duration,
        status: 'ready',
      },
    });
  }

  if (event.type === 'video.asset.errored') {
    await db.video.update({
      where: { assetId: event.data.id },
      data: { status: 'error' },
    });
  }

  return NextResponse.json({ received: true });
}
```

## Validation Rules

Before upload:
- File type: `video/*` MIME types only
- File size: Max 5GB for education/courses, 2GB for user-generated content
- Duration limits: Define max length based on use case

## Security Checklist

- [ ] Upload URLs are signed and expire within 1 hour
- [ ] Playback URLs are signed for private content
- [ ] Webhook signatures are verified
- [ ] User has permission to upload to target resource (course, project, etc.)
- [ ] File type and size validated before upload starts
- [ ] Video access checked before generating playback token
- [ ] No direct Mux/Stream credentials exposed to client

## Performance Considerations

- Use adaptive bitrate streaming (HLS) — automatically handled by Mux/Stream
- Set thumbnail time to a representative frame (not 0:00, often black)
- Lazy load video players (don't load until in viewport)
- Default to lower quality on mobile/cellular connections
- Consider MP4 downloads for offline viewing use cases
- Cache playback tokens for duration of user session

## Accessibility

- Always provide caption/subtitle support (WebVTT format)
- Ensure video player is keyboard accessible (play/pause with spacebar, seek with arrows)
- Provide transcript as alternative for deaf/hard-of-hearing users
- Use `aria-label` on player controls
- Ensure sufficient color contrast on player UI elements

## Common Pitfalls

1. **Upload without progress** — Long uploads with no feedback frustrate users
2. **No error recovery** — Network drops during upload, provide resume capability
3. **Processing time surprise** — Videos take time to transcode, set expectations
4. **Mobile data drain** — Always default to reasonable quality on cellular
5. **Missing thumbnails** — Generate at representative timestamp, not 0:00
6. **Forgetting captions** — Accessibility and SEO both require caption support
7. **No quality selector** — Let users manually choose quality if needed
8. **Bandwidth waste** — Don't auto-play high quality videos on page load

## Checklist

Before declaring video feature complete:
- [ ] Upload flow with progress indicator implemented
- [ ] File type and size validation in place
- [ ] Webhook handler processes asset.ready and asset.errored events
- [ ] Signed URLs for private content
- [ ] Video player renders correctly on mobile and desktop
- [ ] Thumbnail generation configured
- [ ] Error states for upload failure, processing failure, playback failure
- [ ] Accessibility: keyboard controls work, caption support enabled
- [ ] No Mux/Stream credentials exposed to client
- [ ] Analytics tracking (view count, watch time) if required

---

*For course videos, combine with Scheduling Specialist for timed content release. For user-generated content, combine with Security Specialist for content moderation workflows.*
