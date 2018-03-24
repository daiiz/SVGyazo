// BrowserActionのBadgeをクリア
const clearBadge = () => {
  chrome.browserAction.setBadgeText({ text: '' })
};

// ブラウザ側でもa.href, titleを確認する
var validateUrl = (url='') => {
  // http, https で始まるもののみOK
  var prot = url.split(':')[0].toLowerCase();
  if (prot && (prot === 'http' || prot === 'https')) {
    // OK
  }else {
    return '';
  }
  // <, > を除去
  url = url.replace(/</g, '').replace(/>/g, '');
  return url;
};

var validateTitle = (title='') => {
  // <, > を除去
  title = title.replace(/</g, '').replace(/>/g, '');
  return title;
};

const setAttributeNS = (elem, namespace, attrs) => {
  const keys = Object.keys(attrs)
  for (const key of keys) {
    elem.setAttributeNS(namespace || null, key, attrs[key])
  }
  return elem
}

const transprantImage = `
  data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IA
  rs4c6QAAAVlpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYm
  U6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDUuNC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRm
  PSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZj
  pEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25z
  LmFkb2JlLmNvbS90aWZmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk
  9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1w
  bWV0YT4KTMInWQAAAAtJREFUCB1jYAACAAAFAAGNu5vzAAAAAElFTkSuQmCC`
  .replace(/\n/gi, '').replace(/\s/gi, '')
