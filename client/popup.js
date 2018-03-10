const showSVGImage = async (gyazoImageId) => {
  const gyazoSVGUrl = `http://gazo.daiiz.org/o/${gyazoImageId}.svg`
  const response = await window.fetch(gyazoSVGUrl, {
    method: 'GET'
  })
  const link = document.querySelector('#gyazo-svg')
  const svgTag = await response.text()
  const parser = new DOMParser()
  const svg = parser.parseFromString(svgTag, 'image/svg+xml')
  if (!svg.rootElement) return

  const area = document.querySelector('#image')
  area.innerHTML = ''
  area.style.backgroundColor = 'rgba(0, 0, 0, 0)'
  link.href = gyazoSVGUrl
  link.innerText = gyazoSVGUrl
  link.style.display = 'block'
  area.appendChild(svg.rootElement)
}

const setupStage = () => {
  const area = document.querySelector('#image')
  const body = document.querySelector('body')
  const link = document.querySelector('#gyazo-svg')
  link.style.display = 'none'
  area.style.width = `${localStorage.width}px`
  area.style.backgroundColor = '#eee'
  body.style.width = `${localStorage.width}px`
}

(function () {
  chrome.tabs.getSelected(null, tab => {
    href = tab.url

    // 撮影直後
    if (localStorage.gyazoImageId && localStorage.gyazoImageId.length > 0) {
      const svgId = localStorage.gyazoImageId
      localStorage.gyazoImageId = ''
      setupStage()
      showSVGImage(svgId)
      return
    }
    if (!href.match(/^https:\/\/gyazo\.com\//)) return

    // gyazo.comの画像ページ
    const gyazoImageId = href.split('gyazo.com/')[1]
    if (!gyazoImageId || gyazoImageId.length === 0) return

    chrome.tabs.executeScript(tab.id, {
      file: './build/content_script_gyazo.js',
      runAt: 'document_end'
    }, res => {
      const imageSize = res[0]
      localStorage.width = imageSize.width
      setupStage()
      showSVGImage(gyazoImageId)
    })
  })
})()
