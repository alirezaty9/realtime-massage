import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import UserChat from './components/UserChat'
import AdminChat from './components/AdminChat'

const socket = io('http://192.168.88.70:5173', {
  maxHttpBufferSize: 3 * 1024 * 1024 * 1024, // 3 GB (supports 2GB files with base64 overhead)
  transports: ['polling', 'websocket'], // Use polling for large files
  upgrade: false, // Don't upgrade to websocket for stability
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionAttempts: 10,
  timeout: 120000
})

function App() {
  const [messages, setMessages] = useState([])
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    // Load existing messages when connected
    socket.on('load-messages', (loadedMessages) => {
      console.log('[App] Loaded messages:', loadedMessages.length)
      setMessages(loadedMessages)
    })

    // Listen for new messages
    socket.on('new-message', (message) => {
      console.log('[App] New message received:', message.type, message.fileName || message.text)
      if (message.type === 'file') {
        console.log('[App] File message details:', {
          fileName: message.fileName,
          fileType: message.fileType,
          fileSize: message.fileSize,
          hasFileData: !!message.fileData,
          fileDataLength: message.fileData ? message.fileData.length : 0
        })
      }
      setMessages((prev) => [...prev, message])
    })

    socket.on('connect', () => {
      console.log('[App] Socket connected')
    })

    socket.on('disconnect', () => {
      console.log('[App] Socket disconnected')
    })

    return () => {
      socket.off('load-messages')
      socket.off('new-message')
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [])

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  const handleSendMessage = (message) => {
    console.log('[App] Sending message:', message.type, message.fileName || message.text)
    socket.emit('send-message', message)
  }

  const navigateTo = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }

  if (currentPath === '/admin') {
    return <AdminChat messages={messages} onSendMessage={handleSendMessage} />
  }

  return <UserChat messages={messages} onSendMessage={handleSendMessage} />
}

export default App
