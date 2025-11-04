import { useState } from 'react'

function AdminChat({ messages, onSendMessage }) {
  const [message, setMessage] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [uploadingFileSize, setUploadingFileSize] = useState(0)
  const [showUserInfo, setShowUserInfo] = useState(false)
  const [selectedUserInfo, setSelectedUserInfo] = useState(null)

  const handleSend = (e) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage({
        id: Date.now(),
        username: 'Admin',
        text: message,
        type: 'text',
        from: 'admin',
        timestamp: new Date().toLocaleTimeString()
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

    console.log('[Admin] Files selected:', files.length)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`[Admin] File ${i + 1}/${files.length}:`, file.name, file.type, file.size)

      setUploading(true)
      setUploadProgress(0)
      setUploadingFileName(`${file.name} (${i + 1}/${files.length})`)
      setUploadingFileSize(file.size)

      await new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            console.log('[Admin] Upload progress:', progress + '%')
            setUploadProgress(progress)
          }
        }

        reader.onload = (event) => {
          console.log('[Admin] File loaded, sending message...')
          console.log('[Admin] File data length:', event.target.result.length)
          try {
            const messageData = {
              id: Date.now() + i,
              username: 'Admin',
              text: file.name,
              type: 'file',
              fileData: event.target.result,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              from: 'admin',
              timestamp: new Date().toLocaleTimeString()
            }
            console.log('[Admin] Sending message:', messageData.fileName, messageData.type, 'with data length:', messageData.fileData.length)
            onSendMessage(messageData)
            console.log('[Admin] Message sent successfully!')

            // Wait a bit for socket to process
            setTimeout(() => resolve(), 100)
          } catch (err) {
            console.error('[Admin] Upload failed:', err)
            alert('File upload failed: ' + err.message)
            reject(err)
          }
        }

        reader.onerror = (error) => {
          console.error('[Admin] FileReader error:', error)
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

  const goBack = () => {
    window.history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleShowUserInfo = (userInfo, serverInfo) => {
    setSelectedUserInfo({ ...userInfo, serverInfo })
    setShowUserInfo(true)
  }

  // Function to get country flag emoji
  const getCountryFlag = (countryCode) => {
    if (!countryCode) return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  const handleCloseUserInfo = () => {
    setShowUserInfo(false)
    setSelectedUserInfo(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto h-screen flex flex-col py-2 sm:py-4">
        <div className="bg-white rounded-t-lg shadow-xl p-3 sm:p-4 flex justify-between items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-xs sm:text-sm text-gray-600">All messages from users</p>
          </div>
          <button
            onClick={goBack}
            className="bg-gray-200 text-gray-800 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-gray-300 transition text-xs sm:text-sm font-semibold whitespace-nowrap"
          >
            Back to Chat
          </button>
        </div>

        <div className="bg-white flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm sm:text-base">No messages yet</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${msg.from === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.from === 'user' && msg.userInfo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShowUserInfo(msg.userInfo, msg.serverInfo)
                    }}
                    className="mt-1 flex flex-col items-center gap-1 hover:scale-110 transition-transform cursor-pointer"
                    title="View user details"
                  >
                    <span className="text-2xl">👁</span>
                    {msg.serverInfo?.geo?.country && (
                      <span className="text-xl">{getCountryFlag(msg.serverInfo.geo.country)}</span>
                    )}
                  </button>
                )}
                <div
                  onClick={() => (!msg.type || msg.type === 'text') && copyToClipboard(msg.text, msg.id)}
                  className={`max-w-[85%] sm:max-w-md px-3 sm:px-4 py-2 rounded-lg relative text-sm sm:text-base ${
                    (!msg.type || msg.type === 'text') ? 'cursor-pointer hover:opacity-90' : ''
                  } ${
                    msg.from === 'admin'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {msg.from === 'user' && (
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
                          className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 rounded text-xs sm:text-sm transition font-semibold"
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
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="bg-white rounded-b-lg shadow-xl p-2 sm:p-4">
          {uploading && (
            <div className="mb-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-purple-900 truncate">{uploadingFileName}</p>
                  <p className="text-xs text-purple-700">{formatFileSize(uploadingFileSize)}</p>
                </div>
                <span className="text-sm sm:text-base font-bold text-purple-600 ml-2">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-3">
                <div
                  className="bg-purple-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
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
              placeholder="Reply to users..."
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 text-sm sm:text-base"
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
              className="bg-purple-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-purple-600 transition font-semibold text-sm sm:text-base"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* User Info Modal */}
      {showUserInfo && selectedUserInfo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseUserInfo}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold">User Information</h2>
              <button
                onClick={handleCloseUserInfo}
                className="text-2xl hover:bg-purple-700 rounded-full w-8 h-8 flex items-center justify-center transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* IP & Location */}
              {selectedUserInfo.serverInfo && (
                <div>
                  <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b pb-2 flex items-center gap-2">
                    IP Address & Location
                    {selectedUserInfo.serverInfo.geo?.country && (
                      <span className="text-3xl">{getCountryFlag(selectedUserInfo.serverInfo.geo.country)}</span>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-purple-50 p-3 rounded border-2 border-purple-300">
                      <p className="text-xs text-purple-900 font-semibold">IP Address</p>
                      <p className="text-lg font-mono font-bold text-purple-700">{selectedUserInfo.serverInfo.ip}</p>
                    </div>
                    {selectedUserInfo.serverInfo.geo && (
                      <>
                        <div className="bg-purple-50 p-3 rounded border-2 border-purple-300">
                          <p className="text-xs text-purple-900 font-semibold">Country</p>
                          <p className="text-sm font-medium flex items-center gap-2">
                            <span className="text-2xl">{getCountryFlag(selectedUserInfo.serverInfo.geo.country)}</span>
                            <span>{selectedUserInfo.serverInfo.geo.country}</span>
                          </p>
                        </div>
                        {selectedUserInfo.serverInfo.geo.city && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 font-semibold">City</p>
                            <p className="text-sm font-medium">{selectedUserInfo.serverInfo.geo.city}</p>
                          </div>
                        )}
                        {selectedUserInfo.serverInfo.geo.region && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 font-semibold">Region</p>
                            <p className="text-sm font-medium">{selectedUserInfo.serverInfo.geo.region}</p>
                          </div>
                        )}
                        {selectedUserInfo.serverInfo.geo.ll && (
                          <div className="bg-gray-50 p-3 rounded sm:col-span-2">
                            <p className="text-xs text-gray-600 font-semibold">Coordinates (Latitude, Longitude)</p>
                            <p className="text-sm font-medium font-mono">{selectedUserInfo.serverInfo.geo.ll.join(', ')}</p>
                          </div>
                        )}
                        {selectedUserInfo.serverInfo.geo.timezone && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 font-semibold">Server Detected Timezone</p>
                            <p className="text-sm font-medium">{selectedUserInfo.serverInfo.geo.timezone}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Browser & OS */}
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b pb-2">Browser & System</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Browser</p>
                    <p className="text-sm font-medium">{selectedUserInfo.browser}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Operating System</p>
                    <p className="text-sm font-medium">{selectedUserInfo.os}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Platform</p>
                    <p className="text-sm font-medium">{selectedUserInfo.platform}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Vendor</p>
                    <p className="text-sm font-medium">{selectedUserInfo.vendor || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              {/* Network Info */}
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b pb-2">Network</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">WebRTC IPs</p>
                    <div className="text-sm font-medium">
                      {selectedUserInfo.webrtcIPs.map((ip, idx) => (
                        <p key={idx} className="font-mono">{ip}</p>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Online Status</p>
                    <p className="text-sm font-medium">{selectedUserInfo.onLine ? '🟢 Online' : '🔴 Offline'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Language</p>
                    <p className="text-sm font-medium">{selectedUserInfo.language}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">All Languages</p>
                    <p className="text-sm font-medium">{selectedUserInfo.languages.join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Time & Location */}
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b pb-2">Time & Location</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Timezone</p>
                    <p className="text-sm font-medium">{selectedUserInfo.timezone}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Local Time</p>
                    <p className="text-sm font-medium">{selectedUserInfo.localTime}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Timezone Offset</p>
                    <p className="text-sm font-medium">{selectedUserInfo.timezoneOffset} minutes</p>
                  </div>
                </div>
              </div>

              {/* Screen & Device */}
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b pb-2">Screen & Device</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Screen Resolution</p>
                    <p className="text-sm font-medium">{selectedUserInfo.screenResolution}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Window Size</p>
                    <p className="text-sm font-medium">{selectedUserInfo.windowSize}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Color Depth</p>
                    <p className="text-sm font-medium">{selectedUserInfo.colorDepth}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Pixel Ratio</p>
                    <p className="text-sm font-medium">{selectedUserInfo.pixelRatio}x</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Touch Support</p>
                    <p className="text-sm font-medium">{selectedUserInfo.touchSupport ? '✅ Yes' : '❌ No'}</p>
                  </div>
                </div>
              </div>

              {/* Hardware */}
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b pb-2">Hardware</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">CPU Cores</p>
                    <p className="text-sm font-medium">{selectedUserInfo.hardwareConcurrency}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Device Memory</p>
                    <p className="text-sm font-medium">{selectedUserInfo.deviceMemory}</p>
                  </div>
                </div>
              </div>

              {/* Battery Info */}
              {selectedUserInfo.battery && (
                <div>
                  <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b pb-2">Battery</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600 font-semibold">Charging</p>
                      <p className="text-sm font-medium">{selectedUserInfo.battery.charging ? '🔌 Yes' : '🔋 No'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600 font-semibold">Battery Level</p>
                      <p className="text-sm font-medium">{selectedUserInfo.battery.level}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy & Misc */}
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b pb-2">Privacy & Misc</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Cookies Enabled</p>
                    <p className="text-sm font-medium">{selectedUserInfo.cookieEnabled ? '✅ Yes' : '❌ No'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Do Not Track</p>
                    <p className="text-sm font-medium">{selectedUserInfo.doNotTrack}</p>
                  </div>
                </div>
              </div>

              {/* User Agent (Full) */}
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b pb-2">User Agent</h3>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-mono break-all">{selectedUserInfo.userAgent}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminChat
