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
