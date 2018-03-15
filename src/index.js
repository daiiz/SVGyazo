const firebase = require('firebase')
const AnchorsInArea = require('anchors-in-area')
const apiKeys = require('./keys').keys

// https://developers-jp.googleblog.com/2016/09/how-to-use-firebase-in-chrome-extension.html
const config = {
  apiKey: apiKeys.firebase,
  databaseURL: 'https://gyakky2.firebaseio.com',
  storageBucket: 'gyakky2.appspot.com'
}
firebase.initializeApp(config)

window.dynamicGazo = {
  env: process.env.NODE_ENV
}

// https://github.com/firebase/quickstart-js/blob/master/auth/chromextension/credentials.js
window.dynamicGazo.initFirebaseApp = () => {
  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      console.log(user)
      const userInfo = `${user.displayName} (${user.email})`
      document.getElementById('quickstart-button').textContent = 'Sign out'
      document.getElementById('user-icon').src = user.photoURL
      document.getElementById('quickstart-account-details').innerText = userInfo
      document.getElementById('quickstart-account-details').title = user.uid
    } else {
      document.getElementById('quickstart-button').textContent = 'Sign-in with Google'
      document.getElementById('user-icon').src = ''
      document.getElementById('quickstart-account-details').textContent = ''
      document.getElementById('quickstart-account-details').textContent = ''
    }
    document.getElementById('quickstart-button').disabled = false
  })
  document.getElementById('quickstart-button').addEventListener('click', startSignIn, false)
}

const initApp = () => {
  firebase.auth().onAuthStateChanged(user => {
    if (user) console.log(user.displayName)
  })
}

const startAuth = (interactive) => {
  chrome.identity.getAuthToken({ interactive: !!interactive }, token => {
    if (chrome.runtime.lastError && !interactive) {
      console.log('It was not possible to get a token programmatically.')
    } else if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError)
    } else if (token) {
      const credential = firebase.auth.GoogleAuthProvider.credential(null, token)
      firebase.auth().signInWithCredential(credential).catch(error => {
        if (error.code === 'auth/invalid-credential') {
          chrome.identity.removeCachedAuthToken({ token: token }, () => { startAuth(interactive) })
        }
      })
    } else {
      console.error('The OAuth Token was null')
    }
  })
}

const startSignIn = () => {
  if (firebase.auth().currentUser) {
    firebase.auth().signOut()
  } else {
    startAuth(true)
  }
}

const SCREENSHOT_HASHTAG = (window.dynamicGazo.env === 'production') ? '#GyazoSVG' : '#DevGyazoSVG'
dynamicGazo.AnchorsInArea = AnchorsInArea

dynamicGazo.uploadToGyazoSVG = async ({ svg, gyazoImageId }) => {
  filePath = ''
  try {
    const currentUser = firebase.auth().currentUser
    // filePath = `gyazo-svg/o/${gyazoImageId}.svg`
    filePath = `gyazo-svg/u/${currentUser.uid}/${gyazoImageId}.svg`
  } catch (error) {
    return {error}
  }
  const storage = firebase.storage()
  const storageRef = storage.ref()
  const svgRef = storageRef.child(filePath)
  const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
  try {
    const snapshot = await svgRef.put(blob)
    return snapshot
  } catch (error) {
    return {error}
  }
}

dynamicGazo.uploadToGyazo = async ({scale, image, referer, title}) => {
  const apiEndpoint = `https://upload.gyazo.com/api/upload/easy_auth`
  const clientId = apiKeys.gyazoClientId

  const formdata = new window.FormData()
  formdata.append('client_id', clientId)
  formdata.append('image_url', image)
  formdata.append('title', title)
  formdata.append('referer_url', referer)
  formdata.append('scale', scale)
  // formdata.append('desc', `\n${SCREENSHOT_HASHTAG}`)

  let response = await window.fetch(apiEndpoint, {
    method: 'POST',
    body: formdata,
    credentials: 'include'
  })
  let _data = await response.json()
  let data = await window.fetch(_data.get_image_url, {
    method: 'GET',
    credentials: 'include'
  })

  const gyazoImageId = data.url.split('gyazo.com/')[1]

  copyToClipboard([
    '',
    `http://gazo.daiiz.org/o/${gyazoImageId}`,
    SCREENSHOT_HASHTAG
  ])
  chrome.tabs.create({
    url: data.url,
    active: true
  }, tab => {
    chrome.tabs.executeScript(tab.id, {
      file: './build/content_script_gyazo.js'
    }, res => {
    })
  })
  return gyazoImageId
}

const copyToClipboard = (txts) => {
  const bg = chrome.extension.getBackgroundPage()
  const textarea = document.querySelector('#textarea')
  textarea.value = txts.join('\n')
  textarea.select()
  bg.document.execCommand('copy')
}

window.addEventListener('load', initApp, false)
