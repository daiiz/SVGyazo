(function () {
  let META = {}
  const setBadgeCaptureCompleted = () => {
    chrome.browserAction.setBadgeBackgroundColor({ color: '#4abb0c' })
    chrome.browserAction.setBadgeText({ text: '○' })
  }

  const setBadgeUploadGyazoCompleted = () => {
    chrome.browserAction.setBadgeBackgroundColor({ color: '#4abb0c' })
    chrome.browserAction.setBadgeText({ text: 'G' })
  }

  const getSettings = () => {
    if (!localStorage.svgscreenshot_settings) return null
    return JSON.parse(localStorage.svgscreenshot_settings)
  }

  const uploadToGyazo = async ({ title, url, base64Img, devicePixelRatio }) => {
    // post to gyazo.com
    const gyazoImageId = await window.dynamicGazo.uploadToGyazo({
      title,
      referer: url,
      image: base64Img,
      scale: devicePixelRatio
    })
    const res = await uploadToGyazoSVG({ gyazoImageId, devicePixelRatio })
    if (res.error) {
      const win = window.open('')
      win.document.writeln(res.error.message)
      return
    }
    clearBadge()
  }

  const uploadToGyazoSVG = async ({ gyazoImageId, devicePixelRatio }) => {
    const svg = createSVGTag(gyazoImageId)
    const res = await dynamicGazo.uploadToGyazoSVG({ svg, gyazoImageId })
    return res
  }

  // Canvasに画像をセットして，必要部分のみ切り出す
  const renderImage = function (linkdata, base64Img, devicePixelRatio) {
    var rat = devicePixelRatio;
    var canvas = document.querySelector("#cav");
    var pos_cropper = linkdata.cropperRect;
    var baseUri = linkdata.baseUri;
    var title = linkdata.title;
    var w = +pos_cropper.width;
    var h = +pos_cropper.height;
    canvas.width  = rat * w;
    canvas.height = rat * h;

    var ctx = canvas.getContext('2d');
    var img = new Image();
    img.onload = function () {
      ctx.drawImage(img, rat * pos_cropper.orgX, rat * pos_cropper.orgY, rat * w, rat * h,
       0, 0, rat * w, rat * h)
      const screenshot = canvas.toDataURL('image/png')
      keepMetaData(
        linkdata.aTagRects,
        linkdata.elementRects,
        linkdata.text,
        w,
        h,
        baseUri,
        title,
        rat,
        screenshot)
      // createSVGTag()
      // return
      uploadToGyazo({
        title,
        url: baseUri,
        devicePixelRatio: rat,
        base64Img: screenshot
      })
    };
    img.src = base64Img;
  };

  const keepMetaData = (aTagRects, elementRects, text, width, height, baseUri, title, devicePixelRatio, base64Img) => {
    META = { aTagRects, elementRects, text, width, height, baseUri, title, devicePixelRatio, base64Img }
  }

  // SVGタグを生成する
  const createSVGTag = () => {
    const {aTagRects, elementRects, text, width, height, baseUri, title, devicePixelRatio, base64Img} = META
    var svgns  = 'http://www.w3.org/2000/svg';
    var hrefns = 'http://www.w3.org/1999/xlink';

    // root SVG element
    var rootSVGtag = document.createElementNS(svgns, 'svg');
    rootSVGtag.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    rootSVGtag.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    setAttributeNS(rootSVGtag, null, {
      version: '1.1',
      class: 'svg-screenshot',
      viewBox: `0 0 ${width} ${height}`
    })

    // image element
    var img = document.createElementNS(svgns, 'image')
    setAttributeNS(img, null, {
      width,
      height,
      x: 0,
      y: 0,
      'data-selectedtext': text
    })
    img.setAttributeNS(hrefns, 'href', base64Img)
    rootSVGtag.appendChild(img);

    // style
    const style = document.createElementNS(svgns, 'style')
    style.innerHTML = 'a { cursor: pointer }'
    rootSVGtag.appendChild(style)

    // foreignObject
    insertForeignObjects(rootSVGtag, elementRects)

    // 外部ページヘのリンク用のrect elements
    for (var i = 0; i < aTagRects.length; i++) {
      var aTagRect = aTagRects[i];
      // a element
      var a = document.createElementNS(svgns, 'a');
      var url = validateUrl(aTagRect.href);
      if (url.length === 0) continue;
      a.setAttributeNS(hrefns, 'href', url);
      a.setAttributeNS(null, 'target', '_blank');

      // rect element
      var rect = document.createElementNS(svgns, 'rect');
      setAttributeNS(rect, null, {
        width: aTagRect.width,
        height: aTagRect.height,
        x: aTagRect.x,
        y: aTagRect.y,
        fill: 'rgba(0, 0, 0, 0)'
      })

      // text element
      const _text = document.createElementNS(svgns, 'text');
      _text.setAttributeNS(null, 'x', aTagRect.x);
      _text.setAttributeNS(null, 'y', aTagRect.y + aTagRect.height);
      var txt = validateTitle(aTagRect.text);
      _text.textContent = txt;
      _text.setAttributeNS(null, 'fill', 'rgba(0, 0, 0, 0)');

      a.appendChild(rect);
      a.appendChild(_text);
      rootSVGtag.appendChild(a);
    }

    insertSource(rootSVGtag, baseUri, title, height)
    setAttributeNS(rootSVGtag, null, {
      width,
      height,
      'data-url': validateUrl(baseUri),
      'data-title': validateTitle(title)
    })

    return rootSVGtag
  }

  const createForeignObject = (elem, rect) => {
    const svgns = 'http://www.w3.org/2000/svg'
    const xhtmlns = 'http://www.w3.org/1999/xhtml'

    const foreignObject = document.createElementNS(svgns, 'foreignObject')
    foreignObject.setAttribute('xmlns', svgns)
    setAttributeNS(foreignObject, null, {
      width: rect.position.width,
      height: rect.position.height,
      x: rect.x,
      y: rect.y
    })

    const html = document.createElementNS(xhtmlns, 'html')
    html.setAttribute('xmlns', xhtmlns)

    elem.setAttribute('width', rect.position.width)
    elem.setAttribute('height', rect.position.height)
    html.appendChild(elem)
    foreignObject.appendChild(html)
    return foreignObject
  }


  const insertForeignObjects = (rootSVGtag, elementRects) => {
    const svgns = 'http://www.w3.org/2000/svg'
    const insertImgs = () => {
      const imgs = elementRects.img
      for (const rect of imgs) {
        const img = document.createElementNS(svgns, 'img')
        img.setAttribute('src', rect.url)
        img.setAttribute('alt', '')
        if (rect.css) img.setAttribute('style', styleStr(rect.css))
        const fo = createForeignObject(img, rect)
        rootSVGtag.appendChild(fo)
      }
    }
    insertImgs()
  }

  const insertSource = (rootSVGtag, uri, title, height) => {
    const svgns = 'http://www.w3.org/2000/svg'
    const hrefns = 'http://www.w3.org/1999/xlink'

    // style
    const style = document.createElementNS(svgns, 'style')
    style.innerHTML = `
      text.source {
        fill: #888888;
        font-size: 11px;
        font-weight: 400;
        text-decoration: none;
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      }

      text.source:hover {
        text-decoration: underline;
        fill: #2962FF;
      }`
    const a = document.createElementNS(svgns, 'a')
    a.setAttributeNS(hrefns, 'href', validateUrl(uri))
    a.setAttributeNS(null, 'target', '_blank')
    a.setAttributeNS(null, 'class', 'source')

    const url = document.createElementNS(svgns, 'text')
    url.setAttributeNS(null, 'x', 4)
    url.setAttributeNS(null, 'y', height - 4)
    url.textContent = validateTitle(title)
    url.setAttributeNS(null, 'class', 'source')
    a.appendChild(url)
    rootSVGtag.appendChild(style)
    rootSVGtag.appendChild(a)
  }

  const styleStr = styles => {
    let str = ''
    const attrs = Object.keys(styles)
    for (const attr of attrs) {
      str += `${attr}:${styles[attr]}`
    }
    return str
  }

  // ポップアップ画面から命令を受ける
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    var opts = request.options;

    if (request.command === 'make-screen-shot') {
      // スクリーンショットの撮影
      var linkdata = opts.sitedata;
      chrome.tabs.captureVisibleTab({ format: 'png' }, function (dataUrl) {
        setBadgeCaptureCompleted()
        renderImage(linkdata, dataUrl, opts.dpr)
      });
    }
  });

  var initScreenShotMenu = () => {
    // ユーザーが閲覧中のページに専用の右クリックメニューを設ける
    // ウェブページ向け
    chrome.contextMenus.create({
      title: 'Take a SVGyazo',
      contexts: [
        'page',
        'selection'
      ],
      onclick: function (clicked, tab) {
        clearBadge();
        chrome.tabs.sendRequest(tab.id, {
          event: 'click-context-menu'
        });
      }
    })
  };

  initScreenShotMenu();

  chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
    if (info.status === 'complete') {
      chrome.tabs.sendRequest(tab.id, {
        event: 'updated-location-href'
      });
    }
  });

  chrome.browserAction.onClicked.addListener(tab => {
    chrome.tabs.sendRequest(tab.id, {
      event: 'click-context-menu'
    })
  })
})();
