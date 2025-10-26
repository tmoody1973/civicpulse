# Building Multi-Host Podcast Generation with ElevenLabs

## Overview

This guide shows you how to build a multi-host podcast generation system using ElevenLabs v3 API. Based on the rhythm-lab-app implementation, this extends single-voice podcasts to support dynamic conversations between multiple hosts.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Setup & Configuration](#setup--configuration)
4. [Core Implementation](#core-implementation)
5. [Script Generation](#script-generation)
6. [Audio Generation](#audio-generation)
7. [API Integration](#api-integration)
8. [Frontend Implementation](#frontend-implementation)
9. [Advanced Features](#advanced-features)
10. [Testing & Optimization](#testing--optimization)

---

## Prerequisites

### Required Services

- **ElevenLabs Account** with API access
  - Sign up at https://elevenlabs.io
  - Get API key from account settings
  - Ensure you have multiple voice IDs available

- **AI Service for Script Generation** (choose one):
  - OpenAI GPT-4
  - Anthropic Claude
  - Perplexity AI (used in example)
  - Google Gemini

- **Storage Solution**:
  - AWS S3
  - Supabase Storage
  - Cloudflare R2
  - Any cloud storage with public URLs

### Dependencies

```json
{
  "dependencies": {
    "@elevenlabs/elevenlabs-js": "^2.16.0",
    "openai": "^4.0.0",  // or your preferred AI SDK
    "next": "^14.0.0"     // or your framework
  }
}
```

---

## Architecture Overview

### Single-Host vs Multi-Host Flow

**Single-Host (Current):**
```
Content → Script → Single Voice → Audio File
```

**Multi-Host (Target):**
```
Content → Dialogue Script → Multiple Voices → Merged Audio File
                ↓
        [Host A segments]
        [Host B segments]
        [Host C segments]
```

### Key Components

1. **Script Generator** - Creates multi-speaker dialogue
2. **Voice Manager** - Assigns voices to hosts
3. **Audio Generator** - Generates audio per speaker
4. **Audio Merger** - Combines segments into final podcast
5. **Upload Handler** - Stores final audio file

---

## Setup & Configuration

### 1. Environment Variables

Create `.env.local`:

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here

# AI Service (choose one)
OPENAI_API_KEY=your_openai_key
PERPLEXITY_API_KEY=your_perplexity_key
ANTHROPIC_API_KEY=your_anthropic_key

# Storage
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Or AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket_name
```

### 2. Voice Configuration

Create `lib/elevenlabs/voice-config.ts`:

```typescript
export interface VoiceProfile {
  id: string
  name: string
  description: string
  gender: 'male' | 'female' | 'neutral'
  style: 'professional' | 'conversational' | 'energetic' | 'calm'
  useCase: string[]
}

export const PODCAST_VOICES: Record<string, VoiceProfile> = {
  host_main: {
    id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Alex',
    description: 'Professional male host',
    gender: 'male',
    style: 'professional',
    useCase: ['main-host', 'narrator', 'interviewer']
  },
  host_secondary: {
    id: 'ThT5KcBeYPX3keUQqHPh',
    name: 'Sarah',
    description: 'Professional female co-host',
    gender: 'female',
    style: 'conversational',
    useCase: ['co-host', 'expert', 'interviewer']
  },
  host_guest: {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Jordan',
    description: 'Conversational guest voice',
    gender: 'neutral',
    style: 'conversational',
    useCase: ['guest', 'expert', 'commentator']
  },
  host_energetic: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Marcus',
    description: 'Energetic enthusiast',
    gender: 'male',
    style: 'energetic',
    useCase: ['enthusiast', 'hype', 'reactions']
  }
}

export type HostRole = 'main' | 'secondary' | 'guest' | 'energetic'

export function getVoiceForRole(role: HostRole): VoiceProfile {
  const voiceMap: Record<HostRole, keyof typeof PODCAST_VOICES> = {
    main: 'host_main',
    secondary: 'host_secondary',
    guest: 'host_guest',
    energetic: 'host_energetic'
  }
  return PODCAST_VOICES[voiceMap[role]]
}
```

---

## Core Implementation

### 1. Multi-Host Script Structure

Create `lib/podcast/types.ts`:

```typescript
export interface PodcastSegment {
  speaker: HostRole
  text: string
  emotion?: EmotionTag
  duration?: number
  timestamp?: number
}

export type EmotionTag = 
  | 'neutral'
  | 'excited'
  | 'thoughtful'
  | 'surprised'
  | 'impressed'
  | 'concerned'
  | 'enthusiastic'
  | 'serious'
  | 'humorous'

export interface PodcastScript {
  title: string
  description: string
  hosts: {
    role: HostRole
    name: string
    voiceId: string
  }[]
  segments: PodcastSegment[]
  metadata: {
    estimatedDuration: number
    wordCount: number
    characterCount: number
  }
}

export interface MultiHostPodcastOptions {
  hosts: HostRole[]
  style: 'interview' | 'conversation' | 'debate' | 'educational'
  tone: 'casual' | 'professional' | 'humorous' | 'serious'
  targetDuration?: number // in minutes
  includeIntro?: boolean
  includeOutro?: boolean
}
```

---

## Script Generation

### 1. Multi-Host Script Generator

Create `lib/ai/multi-host-script-generator.ts`:

```typescript
import { PodcastScript, PodcastSegment, MultiHostPodcastOptions, HostRole } from '../podcast/types'
import { getVoiceForRole } from '../elevenlabs/voice-config'

export async function generateMultiHostScript(
  content: string,
  options: MultiHostPodcastOptions
): Promise<PodcastScript> {
  
  const systemPrompt = buildSystemPrompt(options)
  const userPrompt = buildUserPrompt(content, options)

  // Using OpenAI as example - adapt to your AI service
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`)
  }

  const data = await response.json()
  const scriptData = JSON.parse(data.choices[0].message.content)

  return parseScriptResponse(scriptData, options)
}

function buildSystemPrompt(options: MultiHostPodcastOptions): string {
  const hostCount = options.hosts.length
  const hostDescriptions = options.hosts.map((role, idx) => {
    const voice = getVoiceForRole(role)
    return `Host ${idx + 1} (${role}): ${voice.name} - ${voice.description}`
  }).join('\n')

  return `You are a podcast script writer creating ${options.style} podcasts with ${hostCount} hosts.

HOSTS:
${hostDescriptions}

STYLE: ${options.style}
TONE: ${options.tone}

CRITICAL REQUIREMENTS FOR ELEVENLABS V3:
1. Create natural, engaging dialogue between hosts
2. Each speaker segment should be 50-500 characters
3. Include emotional cues: [excited], [thoughtful], [surprised], [chuckles], etc.
4. Use natural conversation patterns with interruptions and reactions
5. Add verbal transitions and conversational markers
6. Include cross-talk and banter between hosts
7. Ensure each host has distinct personality and speaking style

DIALOGUE PATTERNS:
- Main host: Guides conversation, asks questions, provides structure
- Secondary host: Adds insights, challenges ideas, brings different perspective
- Guest/Expert: Provides specialized knowledge, shares experiences
- Energetic host: Adds enthusiasm, excitement, emotional reactions

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "title": "Episode title",
  "description": "Brief description",
  "segments": [
    {
      "speaker": "main|secondary|guest|energetic",
      "text": "What the speaker says with [emotion] tags",
      "emotion": "excited|thoughtful|neutral|etc"
    }
  ]
}

BEST PRACTICES:
- Keep exchanges dynamic (3-5 back-and-forth per topic)
- Vary segment length for natural flow
- Use rhetorical questions and reactions
- Include natural pauses and transitions
- Add personality through word choice and phrasing
- Make it sound like real people talking, not reading a script`
}

function buildUserPrompt(content: string, options: MultiHostPodcastOptions): string {
  const duration = options.targetDuration || 10
  const wordCount = duration * 150 // Rough estimate: 150 words per minute

  return `Transform this content into a ${duration}-minute ${options.style} podcast with ${options.hosts.length} hosts:

CONTENT:
${content}

REQUIREMENTS:
- Target ${wordCount} words (~${wordCount * 5} characters)
- ${options.includeIntro ? 'Include engaging intro with host introductions' : 'Start directly with content'}
- ${options.includeOutro ? 'Include memorable outro with call-to-action' : 'End naturally'}
- Distribute speaking time: Main host 40%, others split remaining 60%
- Create natural conversation flow with reactions and interjections
- Use ElevenLabs v3 emotion tags throughout
- Make it engaging, informative, and entertaining

Return valid JSON only.`
}

function parseScriptResponse(
  scriptData: any,
  options: MultiHostPodcastOptions
): PodcastScript {
  const segments: PodcastSegment[] = scriptData.segments.map((seg: any) => ({
    speaker: seg.speaker as HostRole,
    text: seg.text,
    emotion: seg.emotion || 'neutral'
  }))

  const hosts = options.hosts.map(role => {
    const voice = getVoiceForRole(role)
    return {
      role,
      name: voice.name,
      voiceId: voice.id
    }
  })

  const characterCount = segments.reduce((sum, seg) => sum + seg.text.length, 0)
  const wordCount = segments.reduce((sum, seg) => sum + seg.text.split(/\s+/).length, 0)

  return {
    title: scriptData.title,
    description: scriptData.description,
    hosts,
    segments,
    metadata: {
      estimatedDuration: Math.ceil(wordCount / 150),
      wordCount,
      characterCount
    }
  }
}
```

---

## Audio Generation

### 1. Multi-Host Audio Generator

Create `lib/elevenlabs/multi-host-generator.ts`:

```typescript
import { PodcastScript, PodcastSegment } from '../podcast/types'
import { getVoiceForRole } from './voice-config'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1'

export interface AudioSegmentResult {
  speaker: string
  audioBuffer: Buffer
  duration: number
  characterCount: number
}

export interface MultiHostAudioResult {
  success: boolean
  segments?: AudioSegmentResult[]
  mergedAudio?: Buffer
  script?: PodcastScript
  error?: string
  metadata?: {
    totalDuration: number
    totalSize: number
    segmentCount: number
  }
}

export async function generateMultiHostPodcast(
  script: PodcastScript,
  options: {
    stability?: number
    clarityBoost?: number
    speakerBoost?: boolean
    mergeAudio?: boolean
  } = {}
): Promise<MultiHostAudioResult> {
  try {
    console.log(`Generating multi-host podcast with ${script.segments.length} segments...`)

    // Step 1: Generate audio for each segment
    const audioSegments: AudioSegmentResult[] = []
    
    for (let i = 0; i < script.segments.length; i++) {
      const segment = script.segments[i]
      console.log(`Generating segment ${i + 1}/${script.segments.length} (${segment.speaker})...`)
      
      const audioResult = await generateSegmentAudio(segment, {
        stability: options.stability ?? 0.5,
        clarityBoost: options.clarityBoost ?? 0.75,
        speakerBoost: options.speakerBoost ?? true
      })

      if (!audioResult.success || !audioResult.audioBuffer) {
        throw new Error(`Failed to generate audio for segment ${i + 1}: ${audioResult.error}`)
      }

      audioSegments.push({
        speaker: segment.speaker,
        audioBuffer: audioResult.audioBuffer,
        duration: audioResult.duration || 0,
        characterCount: segment.text.length
      })

      // Rate limiting: small delay between requests
      if (i < script.segments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log(`All ${audioSegments.length} segments generated successfully`)

    // Step 2: Optionally merge audio segments
    let mergedAudio: Buffer | undefined
    if (options.mergeAudio) {
      console.log('Merging audio segments...')
      mergedAudio = await mergeAudioSegments(audioSegments)
    }

    const totalSize = audioSegments.reduce((sum, seg) => sum + seg.audioBuffer.length, 0)
    const totalDuration = audioSegments.reduce((sum, seg) => sum + seg.duration, 0)

    return {
      success: true,
      segments: audioSegments,
      mergedAudio,
      script,
      metadata: {
        totalDuration,
        totalSize,
        segmentCount: audioSegments.length
      }
    }

  } catch (error: any) {
    console.error('Multi-host podcast generation error:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate multi-host podcast'
    }
  }
}

async function generateSegmentAudio(
  segment: PodcastSegment,
  voiceSettings: {
    stability: number
    clarityBoost: number
    speakerBoost: boolean
  }
): Promise<{ success: boolean; audioBuffer?: Buffer; duration?: number; error?: string }> {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured')
    }

    const voice = getVoiceForRole(segment.speaker)
    const voiceId = voice.id

    const payload = {
      text: segment.text,
      model_id: 'eleven_turbo_v2_5', // Faster model for multi-segment generation
      voice_settings: {
        stability: voiceSettings.stability,
        similarity_boost: voiceSettings.clarityBoost,
        style: 0.0,
        use_speaker_boost: voiceSettings.speakerBoost
      }
    }

    const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
    }

    const audioArrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(audioArrayBuffer)

    // Estimate duration (rough calculation: ~150 words per minute)
    const wordCount = segment.text.split(/\s+/).length
    const duration = (wordCount / 150) * 60 // seconds

    return {
      success: true,
      audioBuffer,
      duration
    }

  } catch (error: any) {
    console.error('Segment audio generation error:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate segment audio'
    }
  }
}

async function mergeAudioSegments(segments: AudioSegmentResult[]): Promise<Buffer> {
  // For MP3 files, simple concatenation works for basic merging
  // For production, use ffmpeg or similar tool for proper audio merging
  
  const buffers = segments.map(seg => seg.audioBuffer)
  return Buffer.concat(buffers)
}

// Alternative: Use ffmpeg for proper audio merging with crossfades
export async function mergeAudioWithFFmpeg(
  segments: AudioSegmentResult[],
  options: {
    crossfadeDuration?: number // in milliseconds
    addSilence?: number // silence between segments in milliseconds
  } = {}
): Promise<Buffer> {
  const { exec } = require('child_process')
  const { promisify } = require('util')
  const execAsync = promisify(exec)
  const fs = require('fs').promises
  const path = require('path')
  const os = require('os')

  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'podcast-'))
    
    // Save segments to temp files
    const segmentFiles: string[] = []
    for (let i = 0; i < segments.length; i++) {
      const filePath = path.join(tempDir, `segment_${i}.mp3`)
      await fs.writeFile(filePath, segments[i].audioBuffer)
      segmentFiles.push(filePath)
    }

    // Build ffmpeg command
    const outputPath = path.join(tempDir, 'merged.mp3')
    const crossfade = options.crossfadeDuration || 100
    const silence = options.addSilence || 200

    // Create concat file
    const concatFilePath = path.join(tempDir, 'concat.txt')
    const concatContent = segmentFiles.map(f => `file '${f}'`).join('\n')
    await fs.writeFile(concatFilePath, concatContent)

    // Simple concatenation with silence
    const ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -af "apad=pad_dur=${silence}ms" "${outputPath}"`
    
    await execAsync(ffmpegCmd)

    // Read merged file
    const mergedBuffer = await fs.readFile(outputPath)

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true })

    return mergedBuffer

  } catch (error: any) {
    console.error('FFmpeg merge error:', error)
    throw new Error(`Failed to merge audio with ffmpeg: ${error.message}`)
  }
}
```

---

## API Integration

### 1. API Route Handler

Create `app/api/podcast/generate-multi-host/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateMultiHostScript } from '@/lib/ai/multi-host-script-generator'
import { generateMultiHostPodcast } from '@/lib/elevenlabs/multi-host-generator'
import { uploadPodcastAudio } from '@/lib/podcast/upload-helper'
import { MultiHostPodcastOptions } from '@/lib/podcast/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      content,
      hosts = ['main', 'secondary'],
      style = 'conversation',
      tone = 'professional',
      targetDuration = 10,
      includeIntro = true,
      includeOutro = true,
      storyId
    } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    console.log(`Generating multi-host podcast with ${hosts.length} hosts...`)

    // Step 1: Generate multi-host script
    const scriptOptions: MultiHostPodcastOptions = {
      hosts,
      style,
      tone,
      targetDuration,
      includeIntro,
      includeOutro
    }

    const script = await generateMultiHostScript(content, scriptOptions)
    console.log(`Script generated with ${script.segments.length} segments`)

    // Step 2: Generate audio for all segments
    const audioResult = await generateMultiHostPodcast(script, {
      stability: 0.71,
      clarityBoost: 0.5,
      speakerBoost: true,
      mergeAudio: true
    })

    if (!audioResult.success || !audioResult.mergedAudio) {
      return NextResponse.json(
        {
          success: false,
          error: audioResult.error || 'Failed to generate podcast audio'
        },
        { status: 500 }
      )
    }

    // Step 3: Upload merged audio
    console.log('Uploading merged podcast audio...')
    
    const filename = `podcast-multihost-${storyId || Date.now()}.mp3`
    const uploadResult = await uploadPodcastAudio(
      audioResult.mergedAudio,
      filename,
      'audio/mpeg',
      {
        storyId,
        title: script.title
      }
    )

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: uploadResult.error || 'Failed to upload audio'
        },
        { status: 500 }
      )
    }

    // Step 4: Return response
    return NextResponse.json({
      success: true,
      podcast: {
        title: script.title,
        description: script.description,
        hosts: script.hosts,
        segmentCount: script.segments.length,
        audioUrl: uploadResult.audio?.url,
        fileName: uploadResult.audio?.fileName,
        duration: audioResult.metadata?.totalDuration,
        size: audioResult.metadata?.totalSize,
        storage: 'supabase'
      },
      script: {
        segments: script.segments,
        metadata: script.metadata
      },
      audio: uploadResult.audio
    })

  } catch (error: any) {
    console.error('Multi-host podcast generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate multi-host podcast'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to preview script without generating audio
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const content = searchParams.get('content')
    const hosts = searchParams.get('hosts')?.split(',') || ['main', 'secondary']
    const style = searchParams.get('style') || 'conversation'

    if (!content) {
      return NextResponse.json(
        { error: 'Content parameter is required' },
        { status: 400 }
      )
    }

    const scriptOptions: MultiHostPodcastOptions = {
      hosts: hosts as any,
      style: style as any,
      tone: 'professional',
      targetDuration: 10,
      includeIntro: true,
      includeOutro: true
    }

    const script = await generateMultiHostScript(content, scriptOptions)

    return NextResponse.json({
      success: true,
      script
    })

  } catch (error: any) {
    console.error('Script preview error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate script preview' },
      { status: 500 }
    )
  }
}
```

---

## Frontend Implementation

### 1. React Component

Create `components/MultiHostPodcastGenerator.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { HostRole } from '@/lib/podcast/types'

interface PodcastConfig {
  hosts: HostRole[]
  style: 'interview' | 'conversation' | 'debate' | 'educational'
  tone: 'casual' | 'professional' | 'humorous' | 'serious'
  targetDuration: number
}

export default function MultiHostPodcastGenerator({ content }: { content: string }) {
  const [config, setConfig] = useState<PodcastConfig>({
    hosts: ['main', 'secondary'],
    style: 'conversation',
    tone: 'professional',
    targetDuration: 10
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/podcast/generate-multi-host', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          ...config,
          includeIntro: true,
          includeOutro: true
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate podcast')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleHost = (host: HostRole) => {
    setConfig(prev => ({
      ...prev,
      hosts: prev.hosts.includes(host)
        ? prev.hosts.filter(h => h !== host)
        : [...prev.hosts, host]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Multi-Host Podcast Generator</h2>

        {/* Host Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Hosts (2-4)</label>
          <div className="flex flex-wrap gap-2">
            {(['main', 'secondary', 'guest', 'energetic'] as HostRole[]).map(host => (
              <button
                key={host}
                onClick={() => toggleHost(host)}
                className={`px-4 py-2 rounded ${
                  config.hosts.includes(host)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                disabled={config.hosts.length >= 4 && !config.hosts.includes(host)}
              >
                {host.charAt(0).toUpperCase() + host.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Podcast Style</label>
          <select
            value={config.style}
            onChange={(e) => setConfig(prev => ({ ...prev, style: e.target.value as any }))}
            className="w-full p-2 border rounded"
          >
            <option value="conversation">Conversation</option>
            <option value="interview">Interview</option>
            <option value="debate">Debate</option>
            <option value="educational">Educational</option>
          </select>
        </div>

        {/* Tone Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Tone</label>
          <select
            value={config.tone}
            onChange={(e) => setConfig(prev => ({ ...prev, tone: e.target.value as any }))}
            className="w-full p-2 border rounded"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="humorous">Humorous</option>
            <option value="serious">Serious</option>
          </select>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Target Duration: {config.targetDuration} minutes
          </label>
          <input
            type="range"
            min="5"
            max="30"
            step="5"
            value={config.targetDuration}
            onChange={(e) => setConfig(prev => ({ ...prev, targetDuration: parseInt(e.target.value) }))}
            className="w-full"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || config.hosts.length < 2}
          className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Generating Podcast...' : 'Generate Multi-Host Podcast'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-bold text-lg mb-2">{result.podcast.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{result.podcast.description}</p>
            
            <div className="space-y-2 text-sm">
              <p><strong>Hosts:</strong> {result.podcast.hosts.map((h: any) => h.name).join(', ')}</p>
              <p><strong>Segments:</strong> {result.podcast.segmentCount}</p>
              <p><strong>Duration:</strong> ~{Math.round(result.podcast.duration / 60)} minutes</p>
              <p><strong>Size:</strong> {(result.podcast.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>

            {result.podcast.audioUrl && (
              <div className="mt-4">
                <audio controls className="w-full">
                  <source src={result.podcast.audioUrl} type="audio/mpeg" />
                </audio>
                <a
                  href={result.podcast.audioUrl}
                  download={result.podcast.fileName}
                  className="mt-2 inline-block text-blue-600 hover:underline"
                >
                  Download Podcast
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Script Preview */}
      {result?.script && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Script Preview</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {result.script.segments.map((segment: any, idx: number) => (
              <div key={idx} className="p-3 bg-gray-50 rounded">
                <div className="font-semibold text-sm text-blue-600 mb-1">
                  {segment.speaker.toUpperCase()}
                  {segment.emotion && ` [${segment.emotion}]`}
                </div>
                <div className="text-gray-800">{segment.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Advanced Features

### 1. Dynamic Voice Assignment

Create `lib/elevenlabs/voice-matcher.ts`:

```typescript
import { VoiceProfile, PODCAST_VOICES } from './voice-config'

export interface VoiceMatchCriteria {
  gender?: 'male' | 'female' | 'neutral'
  style?: 'professional' | 'conversational' | 'energetic' | 'calm'
  role?: string
  personality?: string[]
}

export function findBestVoiceMatch(criteria: VoiceMatchCriteria): VoiceProfile {
  const voices = Object.values(PODCAST_VOICES)
  
  let bestMatch = voices[0]
  let bestScore = 0

  for (const voice of voices) {
    let score = 0

    if (criteria.gender && voice.gender === criteria.gender) score += 3
    if (criteria.style && voice.style === criteria.style) score += 2
    if (criteria.role && voice.useCase.includes(criteria.role)) score += 2

    if (score > bestScore) {
      bestScore = score
      bestMatch = voice
    }
  }

  return bestMatch
}

// Get all available voices from ElevenLabs account
export async function fetchAvailableVoices(): Promise<VoiceProfile[]> {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch voices')
  }

  const data = await response.json()
  
  return data.voices.map((v: any) => ({
    id: v.voice_id,
    name: v.name,
    description: v.description || '',
    gender: detectGender(v.name, v.labels),
    style: detectStyle(v.labels),
    useCase: v.labels?.use_case || []
  }))
}

function detectGender(name: string, labels: any): 'male' | 'female' | 'neutral' {
  const nameLower = name.toLowerCase()
  if (labels?.gender) return labels.gender
  if (nameLower.includes('male') || nameLower.includes('man')) return 'male'
  if (nameLower.includes('female') || nameLower.includes('woman')) return 'female'
  return 'neutral'
}

function detectStyle(labels: any): 'professional' | 'conversational' | 'energetic' | 'calm' {
  if (!labels) return 'conversational'
  if (labels.style) return labels.style
  return 'conversational'
}
```

### 2. Conversation Flow Controller

Create `lib/podcast/conversation-flow.ts`:

```typescript
import { PodcastSegment, HostRole } from './types'

export interface ConversationPattern {
  name: string
  description: string
  pattern: HostRole[]
}

export const CONVERSATION_PATTERNS: Record<string, ConversationPattern> = {
  ping_pong: {
    name: 'Ping Pong',
    description: 'Alternating between two hosts',
    pattern: ['main', 'secondary', 'main', 'secondary']
  },
  round_robin: {
    name: 'Round Robin',
    description: 'Each host takes turns in order',
    pattern: ['main', 'secondary', 'guest', 'main', 'secondary', 'guest']
  },
  host_led: {
    name: 'Host Led',
    description: 'Main host asks questions, others respond',
    pattern: ['main', 'secondary', 'guest', 'main', 'guest', 'secondary', 'main']
  },
  debate: {
    name: 'Debate',
    description: 'Two sides with moderator',
    pattern: ['main', 'secondary', 'guest', 'secondary', 'guest', 'main']
  }
}

export function applyConversationPattern(
  segments: PodcastSegment[],
  pattern: ConversationPattern,
  hosts: HostRole[]
): PodcastSegment[] {
  const result: PodcastSegment[] = []
  let patternIndex = 0

  for (const segment of segments) {
    const assignedHost = pattern.pattern[patternIndex % pattern.pattern.length]
    
    // Only use hosts that are actually available
    const finalHost = hosts.includes(assignedHost) ? assignedHost : hosts[0]

    result.push({
      ...segment,
      speaker: finalHost
    })

    patternIndex++
  }

  return result
}

export function balanceSpeakingTime(
  segments: PodcastSegment[],
  targetDistribution: Record<HostRole, number> // percentage
): PodcastSegment[] {
  // Calculate current distribution
  const currentDistribution = calculateDistribution(segments)
  
  // Adjust segments to match target distribution
  // This is a simplified version - implement more sophisticated balancing as needed
  
  return segments
}

function calculateDistribution(segments: PodcastSegment[]): Record<string, number> {
  const total = segments.length
  const counts: Record<string, number> = {}

  for (const segment of segments) {
    counts[segment.speaker] = (counts[segment.speaker] || 0) + 1
  }

  const distribution: Record<string, number> = {}
  for (const [speaker, count] of Object.entries(counts)) {
    distribution[speaker] = (count / total) * 100
  }

  return distribution
}
```

### 3. Audio Post-Processing

Create `lib/audio/post-processor.ts`:

```typescript
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export interface AudioProcessingOptions {
  normalize?: boolean
  addIntroMusic?: string // path to intro music file
  addOutroMusic?: string // path to outro music file
  addBackgroundMusic?: string // path to background music
  backgroundMusicVolume?: number // 0.0 to 1.0
  fadeIn?: number // milliseconds
  fadeOut?: number // milliseconds
  equalization?: 'podcast' | 'voice' | 'none'
  compression?: boolean
  noiseReduction?: boolean
}

export async function processAudio(
  inputBuffer: Buffer,
  options: AudioProcessingOptions = {}
): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-process-'))
  
  try {
    const inputPath = path.join(tempDir, 'input.mp3')
    const outputPath = path.join(tempDir, 'output.mp3')
    
    await fs.writeFile(inputPath, inputBuffer)

    let filterChain: string[] = []

    // Normalization
    if (options.normalize) {
      filterChain.push('loudnorm=I=-16:TP=-1.5:LRA=11')
    }

    // Fade in/out
    if (options.fadeIn) {
      filterChain.push(`afade=t=in:st=0:d=${options.fadeIn / 1000}`)
    }
    if (options.fadeOut) {
      filterChain.push(`afade=t=out:st=0:d=${options.fadeOut / 1000}`)
    }

    // EQ for podcast
    if (options.equalization === 'podcast') {
      filterChain.push('equalizer=f=100:width_type=h:width=50:g=3')
      filterChain.push('equalizer=f=3000:width_type=h:width=1000:g=2')
    }

    // Compression
    if (options.compression) {
      filterChain.push('acompressor=threshold=-20dB:ratio=4:attack=5:release=50')
    }

    // Noise reduction
    if (options.noiseReduction) {
      filterChain.push('highpass=f=80,lowpass=f=10000')
    }

    const filterString = filterChain.length > 0 ? `-af "${filterChain.join(',')}"` : ''

    // Build ffmpeg command
    let ffmpegCmd = `ffmpeg -i "${inputPath}" ${filterString} -codec:a libmp3lame -b:a 128k "${outputPath}"`

    // Add background music if specified
    if (options.addBackgroundMusic) {
      const bgVolume = options.backgroundMusicVolume || 0.1
      ffmpegCmd = `ffmpeg -i "${inputPath}" -i "${options.addBackgroundMusic}" -filter_complex "[1:a]volume=${bgVolume}[bg];[0:a][bg]amix=inputs=2:duration=shortest" ${filterString} -codec:a libmp3lame -b:a 128k "${outputPath}"`
    }

    await execAsync(ffmpegCmd)

    const processedBuffer = await fs.readFile(outputPath)
    
    return processedBuffer

  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

// Add intro/outro music
export async function addIntroOutro(
  podcastBuffer: Buffer,
  introPath?: string,
  outroPath?: string
): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intro-outro-'))
  
  try {
    const podcastPath = path.join(tempDir, 'podcast.mp3')
    const outputPath = path.join(tempDir, 'final.mp3')
    
    await fs.writeFile(podcastPath, podcastBuffer)

    // Create concat file
    const concatFilePath = path.join(tempDir, 'concat.txt')
    let concatContent = ''
    
    if (introPath) concatContent += `file '${introPath}'\n`
    concatContent += `file '${podcastPath}'\n`
    if (outroPath) concatContent += `file '${outroPath}'\n`
    
    await fs.writeFile(concatFilePath, concatContent)

    const ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -codec:a libmp3lame -b:a 128k "${outputPath}"`
    await execAsync(ffmpegCmd)

    const finalBuffer = await fs.readFile(outputPath)
    
    return finalBuffer

  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}
```

---

## Testing & Optimization

### 1. Cost Estimation

Create `lib/elevenlabs/cost-estimator.ts`:

```typescript
import { PodcastScript } from '../podcast/types'

export interface CostEstimate {
  characterCount: number
  estimatedCost: number
  estimatedDuration: number
  breakdown: {
    speaker: string
    characters: number
    cost: number
  }[]
}

export function estimateMultiHostCost(
  script: PodcastScript,
  costPerCharacter: number = 0.00003 // Update with your actual rate
): CostEstimate {
  const breakdown = script.hosts.map(host => {
    const hostSegments = script.segments.filter(seg => seg.speaker === host.role)
    const characters = hostSegments.reduce((sum, seg) => sum + seg.text.length, 0)
    
    return {
      speaker: host.name,
      characters,
      cost: characters * costPerCharacter
    }
  })

  const totalCharacters = breakdown.reduce((sum, b) => sum + b.characters, 0)
  const totalCost = breakdown.reduce((sum, b) => sum + b.cost, 0)
  const estimatedDuration = Math.ceil(totalCharacters / 800) // ~800 chars per minute

  return {
    characterCount: totalCharacters,
    estimatedCost: totalCost,
    estimatedDuration,
    breakdown
  }
}
```

### 2. Testing Utilities

Create `lib/podcast/__tests__/multi-host.test.ts`:

```typescript
import { generateMultiHostScript } from '../ai/multi-host-script-generator'
import { generateMultiHostPodcast } from '../elevenlabs/multi-host-generator'

describe('Multi-Host Podcast Generation', () => {
  const sampleContent = `
    The history of electronic music is fascinating...
    [Your test content here]
  `

  test('generates script with correct number of hosts', async () => {
    const script = await generateMultiHostScript(sampleContent, {
      hosts: ['main', 'secondary'],
      style: 'conversation',
      tone: 'professional',
      targetDuration: 5
    })

    expect(script.hosts).toHaveLength(2)
    expect(script.segments.length).toBeGreaterThan(0)
  })

  test('distributes speaking time appropriately', async () => {
    const script = await generateMultiHostScript(sampleContent, {
      hosts: ['main', 'secondary'],
      style: 'conversation',
      tone: 'professional',
      targetDuration: 5
    })

    const mainSegments = script.segments.filter(s => s.speaker === 'main')
    const secondarySegments = script.segments.filter(s => s.speaker === 'secondary')

    // Main host should have roughly 40-60% of segments
    const mainPercentage = (mainSegments.length / script.segments.length) * 100
    expect(mainPercentage).toBeGreaterThan(30)
    expect(mainPercentage).toBeLessThan(70)
  })

  test('generates audio for all segments', async () => {
    const mockScript = {
      title: 'Test Podcast',
      description: 'Test',
      hosts: [
        { role: 'main', name: 'Alex', voiceId: 'test-id-1' },
        { role: 'secondary', name: 'Sarah', voiceId: 'test-id-2' }
      ],
      segments: [
        { speaker: 'main', text: 'Hello and welcome!', emotion: 'excited' },
        { speaker: 'secondary', text: 'Thanks for having me!', emotion: 'happy' }
      ],
      metadata: {
        estimatedDuration: 1,
        wordCount: 10,
        characterCount: 50
      }
    }

    // Mock the actual API call for testing
    // const result = await generateMultiHostPodcast(mockScript, { mergeAudio: true })
    // expect(result.success).toBe(true)
    // expect(result.segments).toHaveLength(2)
  })
})
```

---

## Best Practices

### 1. Performance Optimization

- **Parallel Generation**: Generate audio segments in parallel when possible
- **Caching**: Cache frequently used voices and settings
- **Batch Processing**: Process multiple podcasts in queues
- **Rate Limiting**: Respect ElevenLabs API rate limits

### 2. Quality Guidelines

- **Script Length**: Keep individual segments between 50-500 characters
- **Voice Consistency**: Use consistent voice settings across segments
- **Natural Pauses**: Add appropriate silence between speakers
- **Emotional Range**: Use varied emotion tags for engagement

### 3. Error Handling

```typescript
export async function generateWithRetry(
  segment: PodcastSegment,
  maxRetries: number = 3
): Promise<Buffer> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await generateSegmentAudio(segment, {
        stability: 0.5,
        clarityBoost: 0.75,
        speakerBoost: true
      })
      
      if (result.success && result.audioBuffer) {
        return result.audioBuffer
      }
      
      throw new Error(result.error || 'Generation failed')
      
    } catch (error: any) {
      lastError = error
      console.log(`Retry ${i + 1}/${maxRetries} for segment...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}
```

---

## Deployment Checklist

- [ ] Set all environment variables
- [ ] Configure voice IDs for your account
- [ ] Test with sample content
- [ ] Set up error monitoring
- [ ] Configure rate limiting
- [ ] Set up audio storage
- [ ] Test file upload limits
- [ ] Configure CDN for audio delivery
- [ ] Set up analytics tracking
- [ ] Document API endpoints
- [ ] Create user documentation
- [ ] Set up backup/recovery

---

## Example Usage

```typescript
// Generate a 2-host conversation podcast
const result = await fetch('/api/podcast/generate-multi-host', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Your article content here...',
    hosts: ['main', 'secondary'],
    style: 'conversation',
    tone: 'professional',
    targetDuration: 10,
    includeIntro: true,
    includeOutro: true
  })
})

const podcast = await result.json()
console.log('Podcast URL:', podcast.podcast.audioUrl)
```

---

## Troubleshooting

### Common Issues

1. **Audio segments don't merge properly**
   - Use ffmpeg for proper merging
   - Ensure all segments are same format/bitrate

2. **Voice quality inconsistent**
   - Check stability and clarity settings
   - Ensure consistent voice settings across segments

3. **API rate limits exceeded**
   - Implement exponential backoff
   - Add delays between requests
   - Consider upgrading ElevenLabs plan

4. **Large file upload failures**
   - Use multipart upload for files >5MB
   - Implement chunked upload
   - Consider streaming upload

---

## Resources

- [ElevenLabs API Documentation](https://elevenlabs.io/docs)
- [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Audio Processing Best Practices](https://www.audiokinetic.com/library/)

---

## License

This guide is provided as-is for educational and implementation purposes.

