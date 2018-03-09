const AnchorsInArea = require('anchors-in-area')

window.dynamicGazo = {
  env: process.env.NODE_ENV
}

dynamicGazo.AnchorsInArea = AnchorsInArea

dynamicGazo.uploadToGyazo = async ({scale, image, referer, title, dynamicGazoUrl}) => {
  const apiEndpoint = `https://upload.gyazo.com/api/upload/easy_auth`
  const clientId = 'a9544994509725a7ecceb7381661274751b5b31f006c7788c1d88517c13d1ebe'

  const formdata = new window.FormData()
  formdata.append('client_id', clientId)
  formdata.append('image_url', image)
  formdata.append('title', title)
  formdata.append('referer_url', referer)
  formdata.append('scale', scale)
  formdata.append('desc', `\n${dynamicGazoUrl}\n#DynamicGazo`)

  const response = await window.fetch(apiEndpoint, {
    method: 'POST',
    body: formdata,
    credentials: 'include'
  })
  const _data = await response.json()

  const data = await window.fetch(_data.get_image_url, {
    method: 'GET',
    credentials: 'include'
  })
  const gyazoImageId = data.url.split('gyazo.com/')[1]

  chrome.tabs.create({
    url: data.url,
    active: false
  }, null)
  return gyazoImageId
}
