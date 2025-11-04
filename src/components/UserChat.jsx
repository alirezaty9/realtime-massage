import { useState, useEffect } from 'react'
import { collectUserInfo, getBatteryInfo } from '../utils/userInfo'

function UserChat({ messages, onSendMessage }) {
  const [message, setMessage] = useState('')
  const [username, setUsername] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [uploadingFileSize, setUploadingFileSize] = useState(0)
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    // Generate random username
    const randomId = Math.floor(Math.random() * 10000)
    setUsername(`User${randomId}`)

    // Collect user information
    const gatherUserInfo = async () => {
      const info = await collectUserInfo()
      const battery = await getBatteryInfo()
      if (battery) {
        info.battery = battery
      }
      setUserInfo(info)
      console.log('User info collected:', info)
    }
    gatherUserInfo()
  }, [])

  const handleSend = (e) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage({
        id: Date.now(),
        username,
        text: message,
        type: 'text',
        from: 'user',
        timestamp: new Date().toLocaleTimeString(),
        userInfo: userInfo // Include user metadata
      })
      setMessage('')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    console.log('Files selected:', files.length)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`File ${i + 1}/${files.length}:`, file.name, file.type, file.size)

      setUploading(true)
      setUploadProgress(0)
      setUploadingFileName(`${file.name} (${i + 1}/${files.length})`)
      setUploadingFileSize(file.size)

      await new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            console.log('Upload progress:', progress + '%')
            setUploadProgress(progress)
          }
        }

        reader.onload = (event) => {
          console.log('File loaded, sending message...')
          console.log('File data length:', event.target.result.length)
          try {
            const messageData = {
              id: Date.now() + i,
              username,
              text: file.name,
              type: 'file',
              fileData: event.target.result,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              from: 'user',
              timestamp: new Date().toLocaleTimeString(),
              userInfo: userInfo // Include user metadata
            }
            console.log('Sending message:', messageData.fileName, messageData.type, 'with data length:', messageData.fileData.length)
            onSendMessage(messageData)
            console.log('Message sent successfully!')

            // Wait a bit for socket to process
            setTimeout(() => resolve(), 100)
          } catch (err) {
            console.error('Upload failed:', err)
            alert('File upload failed: ' + err.message)
            reject(err)
          }
        }

        reader.onerror = (error) => {
          console.error('FileReader error:', error)
          alert('File upload failed!')
          reject(error)
        }

        reader.readAsDataURL(file)
      })
    }

    setUploading(false)
    setUploadProgress(100)
    setTimeout(() => {
      setUploadProgress(0)
      setUploadingFileName('')
    }, 2000)

    e.target.value = ''
  }

  const copyToClipboard = (text, id) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()

    try {
      document.execCommand('copy')
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }

    document.body.removeChild(textArea)
  }

  const downloadFile = (fileData, fileName) => {
    const link = document.createElement('a')
    link.href = fileData
    link.download = fileName
    link.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-2 sm:p-4">
      <div className="max-w-2xl mx-auto h-screen flex flex-col py-2 sm:py-4">
        <div className="bg-white rounded-t-lg shadow-xl p-3 sm:p-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Chat with Admin</h1>
          <p className="text-xs sm:text-sm text-gray-600">Logged in as: {username}</p>
        </div>

        <div className="bg-white flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm sm:text-base">No messages yet. Say hi!</p>
          ) : (
            messages.map((msg) => {
              if (msg.type === 'file') {
                console.log('Rendering file message:', msg.fileName, 'hasData:', !!msg.fileData, 'dataLength:', msg.fileData ? msg.fileData.length : 0)
              }
              return (
              <div
                key={msg.id}
                className={`flex ${msg.from === 'user' && msg.username === username ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  onClick={() => (!msg.type || msg.type === 'text') && copyToClipboard(msg.text, msg.id)}
                  className={`max-w-[85%] sm:max-w-xs px-3 sm:px-4 py-2 rounded-lg relative text-sm sm:text-base ${
                    (!msg.type || msg.type === 'text') ? 'cursor-pointer hover:opacity-90' : ''
                  } ${
                    msg.from === 'admin'
                      ? 'bg-gray-200 text-gray-800'
                      : msg.username === username
                      ? 'bg-blue-500 text-white'
                      : 'bg-green-200 text-gray-800'
                  }`}
                >
                  {msg.from === 'user' && msg.username !== username && (
                    <p className="text-xs font-semibold mb-1">{msg.username}</p>
                  )}

                  {msg.type === 'file' ? (
                    msg.fileData ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium text-xs sm:text-sm break-all">{msg.fileName}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadFile(msg.fileData, msg.fileName)
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs sm:text-sm transition font-semibold"
                        >
                          Download ({formatFileSize(msg.fileSize)})
                        </button>
                      </div>
                    ) : (
                      <div className="text-yellow-600 text-xs">
                        <p className="font-medium">{msg.fileName}</p>
                        <p>File data missing</p>
                      </div>
                    )
                  ) : (
                    <div>
                      <p className="break-words">{msg.text}</p>
                      {copiedId === msg.id && (
                        <p className="text-xs mt-1 opacity-75">Copied!</p>
                      )}
                    </div>
                  )}

                  <p className="text-xs opacity-75 mt-1">{msg.timestamp}</p>
                </div>
              </div>
            )})
          )}
        </div>

        <form onSubmit={handleSend} className="bg-white rounded-b-lg shadow-xl p-2 sm:p-4">
          {uploading && (
            <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-blue-900 truncate">{uploadingFileName}</p>
                  <p className="text-xs text-blue-700">{formatFileSize(uploadingFileSize)}</p>
                </div>
                <span className="text-sm sm:text-base font-bold text-blue-600 ml-2">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                  style={{ width: `${uploadProgress}%` }}
                >
                  {uploadProgress > 10 && (
                    <span className="text-white text-xs font-bold">{uploadProgress}%</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {uploadProgress === 100 && !uploading && (
            <div className="mb-2 bg-green-50 border border-green-200 rounded-lg p-2 text-green-700 text-xs sm:text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">File uploaded successfully!</span>
            </div>
          )}
          <div className="flex gap-1 sm:gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-sm sm:text-base"
            />
            <label className={`${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-600'} bg-gray-500 text-white px-2 sm:px-4 py-2 sm:py-3 rounded-lg transition font-semibold flex items-center`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
              </svg>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
                multiple
              />
            </label>
            <button
              type="submit"
              className="bg-blue-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-600 transition font-semibold text-sm sm:text-base"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserChat
