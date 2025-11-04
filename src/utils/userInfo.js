// Collect comprehensive user information
export const collectUserInfo = async () => {
  const userAgent = navigator.userAgent

  // Parse OS
  const getOS = () => {
    const ua = userAgent
    if (ua.includes('Win')) return 'Windows'
    if (ua.includes('Mac')) return 'MacOS'
    if (ua.includes('X11') || ua.includes('Linux')) return 'Linux'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
    return 'Unknown'
  }

  // Parse Browser
  const getBrowser = () => {
    const ua = userAgent
    if (ua.includes('Firefox') && !ua.includes('Seamonkey')) {
      const match = ua.match(/Firefox\/(\d+\.\d+)/)
      return `Firefox ${match ? match[1] : ''}`
    }
    if (ua.includes('Chrome') && !ua.includes('Chromium') && !ua.includes('Edg')) {
      const match = ua.match(/Chrome\/(\d+\.\d+)/)
      return `Chrome ${match ? match[1] : ''}`
    }
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+\.\d+)/)
      return `Safari ${match ? match[1] : ''}`
    }
    if (ua.includes('Edg')) {
      const match = ua.match(/Edg\/(\d+\.\d+)/)
      return `Edge ${match ? match[1] : ''}`
    }
    if (ua.includes('Opera') || ua.includes('OPR')) {
      return 'Opera'
    }
    return 'Unknown'
  }

  // Get WebRTC IPs
  const getWebRTCIPs = () => {
    return new Promise((resolve) => {
      const ips = []
      const rtc = new RTCPeerConnection({
        iceServers: []
      })

      rtc.createDataChannel('')

      rtc.createOffer().then(offer => rtc.setLocalDescription(offer))

      rtc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve(ips)
          return
        }

        const parts = ice.candidate.candidate.split(' ')
        const ip = parts[4]

        if (ip && !ips.includes(ip) && ip !== '0.0.0.0') {
          ips.push(ip)
        }
      }

      // Timeout after 2 seconds
      setTimeout(() => {
        rtc.close()
        resolve(ips)
      }, 2000)
    })
  }

  // Collect all info
  const webrtcIPs = await getWebRTCIPs()

  return {
    // Browser & OS
    userAgent: userAgent,
    browser: getBrowser(),
    os: getOS(),
    platform: navigator.platform,

    // Time & Location
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    localTime: new Date().toLocaleString(),

    // Network
    webrtcIPs: webrtcIPs.length > 0 ? webrtcIPs : ['Not available'],
    language: navigator.language,
    languages: navigator.languages,
    onLine: navigator.onLine,

    // Screen & Device
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    windowSize: `${window.innerWidth}x${window.innerHeight}`,
    colorDepth: `${window.screen.colorDepth}-bit`,
    pixelRatio: window.devicePixelRatio,

    // Hardware
    hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
    deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown',

    // Additional
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || 'Not set',
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    vendor: navigator.vendor,

    // Battery (if available)
    battery: null // Will be populated if available
  }
}

// Get battery info separately as it's async
export const getBatteryInfo = async () => {
  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery()
      return {
        charging: battery.charging,
        level: `${Math.round(battery.level * 100)}%`,
        chargingTime: battery.chargingTime === Infinity ? 'N/A' : `${battery.chargingTime}s`,
        dischargingTime: battery.dischargingTime === Infinity ? 'N/A' : `${battery.dischargingTime}s`
      }
    } catch (err) {
      return null
    }
  }
  return null
}
