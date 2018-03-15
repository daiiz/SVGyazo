(function () {
  window.addEventListener('load', () => {
    const description = document.querySelector('.input-description')
    description.focus()
    document.execCommand('paste')
    window.scrollTo(0, 0)
  }, false)
})()
