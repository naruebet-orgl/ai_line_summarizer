'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, MessageCircle, Clock, Users, Sparkles, Square, Zap, ScrollText } from 'lucide-react'
import Link from 'next/link'
import { getStatusColor, formatDate } from '@/lib/utils'

interface ChatSession {
  session_id: string
  room_id: {
    _id: string
    line_room_id: string
    name: string
    type: string
  } | string
  room_name?: string
  status: 'active' | 'closed' | 'summarizing'
  message_count?: number
  start_time: string
  end_time?: string
  participants?: string[]
  message_logs?: Array<{
    timestamp: string
    direction: string
    message_type: string
    message: string
    line_message_id: string
    image_grid_fs_id: string | null
    user_id?: string
    user_name?: string
    sender?: string
  }>
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
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch actual session data from backend
      const response = await fetch(`/api/trpc/sessions.get?input=${encodeURIComponent(JSON.stringify({"sessionId":sessionId}))}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.status}`)
      }

      const data = await response.json()
      const sessionData = data?.result?.data

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



  const handleEndSession = async () => {
    try {
      setActionLoading('ending')

      // First generate summary if session has enough messages
      if (session && (session.message_logs?.length || 0) >= 1) {
        const summaryResponse = await fetch(`/api/trpc/sessions.generateSummary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"sessionId": sessionId})
        })

        if (!summaryResponse.ok) {
          console.warn('Failed to generate summary before ending session')
        }
      }

      // Then close the session
      const response = await fetch(`/api/trpc/sessions.close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({"sessionId": sessionId})
      })

      if (!response.ok) {
        throw new Error('Failed to end session')
      }

      await fetchSession() // Refresh session data
    } catch (err) {
      console.error('Error ending session:', err)
      setError(`Failed to end session: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleGenerateSummary = async () => {
    try {
      setActionLoading('summarizing')
      setError(null) // Clear any previous errors

      const response = await fetch(`/api/trpc/sessions.generateSummary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({"sessionId": sessionId})
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to generate summary: ${response.status} ${errorText}`)
      }

      await fetchSession() // Refresh session data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Error generating summary:', errorMessage)
      setError(`Failed to generate summary: ${errorMessage}`)
    } finally {
      setActionLoading(null)
    }
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
              <h2 className="text-xl font-normal text-gray-900 mb-4">Session Not Found</h2>
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

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

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
                <p className="text-sm font-medium text-gray-500 mb-1">Room</p>
                <p className="text-sm">{session.room_name || 'Unknown Room'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Messages</p>
                <p className="text-xl font-normal text-blue-600">{session.message_logs?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Participants</p>
                <p className="text-xl font-normal text-green-600">{session.participants?.length || 1}</p>
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
        {session.participants && session.participants.length > 0 && (
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

        {/* Chat History */}
        {session.message_logs && session.message_logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ScrollText className="h-5 w-5" />
                <span>Chat History ({session.message_logs.length} messages)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {session.message_logs.map((message, index) => (
                  <div key={index} className="border-l-4 border-gray-300 pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant={message.direction === 'incoming' ? 'default' : 'secondary'} className="text-xs">
                          {message.direction === 'incoming' ? 'Received' : 'Sent'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {message.message_type}
                        </Badge>
                        {(message.user_name || message.sender || message.user_id) && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            👤 {message.user_name || message.sender || message.user_id}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(message.timestamp)}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      {(message.user_name || message.sender || message.user_id) && (
                        <div className="text-xs text-gray-600 mb-1 font-medium">
                          {message.user_name || message.sender || message.user_id}:
                        </div>
                      )}
                      <p className="text-sm text-gray-800">
                        {message.message}
                      </p>
                    </div>
                    {message.image_grid_fs_id && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          📷 Image attachment
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {session.status === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle>Session Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleGenerateSummary}
                  disabled={actionLoading !== null}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading === 'summarizing' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  <span>
                    {actionLoading === 'summarizing' ? 'Generating Summary...' : 'Generate Summary Now'}
                  </span>
                </Button>

                <Button
                  onClick={handleEndSession}
                  disabled={actionLoading !== null}
                  variant="destructive"
                  className="flex items-center space-x-2"
                >
                  {actionLoading === 'ending' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span>
                    {actionLoading === 'ending' ? 'Ending & Summarizing...' : 'End Session & Summarize'}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}