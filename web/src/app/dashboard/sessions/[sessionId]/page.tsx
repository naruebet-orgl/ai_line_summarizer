'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageCircle, Clock, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface ChatSession {
  session_id: string
  room_id: string
  status: 'active' | 'completed' | 'ended'
  message_count: number
  start_time: string
  end_time?: string
  participants: string[]
  summary?: {
    content: string
    created_at: string
  }
}

export default function SessionDetailPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [session, setSession] = useState<ChatSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch actual session data from backend
      const response = await fetch(`/api/trpc/sessions.get?batch=1&input={"0":{"json":{"sessionId":"${sessionId}"}}}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.status}`)
      }

      const data = await response.json()
      const sessionData = data[0]?.result?.data?.json

      if (sessionData) {
        setSession(sessionData)
      } else {
        setError('Session not found')
      }
    } catch (err) {
      console.error('Error fetching session:', err)
      setError(`Failed to load session: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'ended':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading session details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Not Found</h2>
              <p className="text-gray-600 mb-6">The session you're looking for doesn't exist or has been removed.</p>
              <Button asChild>
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Session Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Session Details</span>
              </CardTitle>
              <Badge className={getStatusColor(session.status)}>
                {session.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Session ID</p>
                <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {session.session_id}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Room ID</p>
                <p className="text-sm">{session.room_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Messages</p>
                <p className="text-2xl font-bold text-blue-600">{session.message_count}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Participants</p>
                <p className="text-2xl font-bold text-green-600">{session.participants.length}</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Started</p>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm">{formatDate(session.start_time)}</p>
                </div>
              </div>
              {session.end_time && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Ended</p>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="text-sm">{formatDate(session.end_time)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        {session.participants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Participants</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {session.participants.map((participant, index) => (
                  <Badge key={index} variant="outline">
                    {participant}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Summary */}
        {session.summary ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>AI Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                <p className="text-gray-800 leading-relaxed mb-4">
                  {session.summary.content}
                </p>
                <p className="text-sm text-gray-500">
                  Generated on {formatDate(session.summary.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : session.status === 'active' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>AI Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Summary not available yet</p>
                <p className="text-sm text-gray-500">
                  AI summary will be generated when the session reaches 50 messages or after 24 hours
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

      </div>
    </div>
  )
}