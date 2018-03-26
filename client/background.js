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
        linkdata.text,
        w,
        h,
        baseUri,
        title,
        rat,
        screenshot)
      uploadToGyazo({
        title,
        url: baseUri,
        devicePixelRatio: rat,
        base64Img: screenshot
      })
    };
    img.src = base64Img;
  };

  const keepMetaData = (aTagRects, text, width, height, baseUri, title, devicePixelRatio, base64Img) => {
    META = { aTagRects, text, width, height, baseUri, title, devicePixelRatio, base64Img }
  }

  // SVGタグを生成する
  const createSVGTag = gyazoImageId => {
    const {aTagRects, text, width, height, baseUri, title, devicePixelRatio, base64Img} = META
    var svgns  = 'http://www.w3.org/2000/svg';
    var hrefns = 'http://www.w3.org/1999/xlink';

    // root SVG element
    var rootSVGtag = document.createElementNS(svgns, 'svg');
    rootSVGtag.setAttributeNS(null, 'version', '1.1');
    rootSVGtag.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    rootSVGtag.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    rootSVGtag.setAttributeNS(null, 'class', 'svg-screenshot');
    rootSVGtag.setAttributeNS(null, 'viewBox', '0 0 ' + width + ' ' + height);

    // image element
    var img = document.createElementNS(svgns, 'image')
    img.setAttributeNS(null, 'width', width);
    img.setAttributeNS(null, 'height', height);
    img.setAttributeNS(null, 'x', 0);
    img.setAttributeNS(null, 'y', 0);
    img.setAttributeNS(null, 'data-selectedtext', text);
    img.setAttributeNS(hrefns, 'href', base64Img)
    rootSVGtag.appendChild(img);

    // style
    const style = document.createElementNS(svgns, 'style')
    style.innerHTML = 'a { cursor: pointer }'
    rootSVGtag.appendChild(style)

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
      rect.setAttributeNS(null, 'width', aTagRect.width);
      rect.setAttributeNS(null, 'height', aTagRect.height);
      rect.setAttributeNS(null, 'x', aTagRect.x);
      rect.setAttributeNS(null, 'y', aTagRect.y);
      rect.setAttributeNS(null, 'fill', 'rgba(0, 0, 0, 0)');

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

    inertSource(rootSVGtag, baseUri, title, height)
    rootSVGtag.setAttributeNS(null, 'width', width);
    rootSVGtag.setAttributeNS(null, 'height', height);
    rootSVGtag.setAttributeNS(null, 'data-url', validateUrl(baseUri));
    rootSVGtag.setAttributeNS(null, 'data-title', validateTitle(title));

    return rootSVGtag
  }


  const inertSource = (rootSVGtag, uri, title, height) => {
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
      title: 'Capture whole page',
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
