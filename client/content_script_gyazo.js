(function () {
  window.addEventListener('load', () => {
    const description = document.querySelector('.input-description')
    description.focus()
    document.execCommand('paste')

    // description.focus()
    // let event = document.createEvent('KeyboardEvent')
    // event.initEvent('keydown', true, true)
    // event.which = 13
    // event.keyCode = 13
    // description.dispatchEvent(event)
    window.scrollTo(0, 0)
    // alert('SVG file uploaded successfully')


    // let event = document.createEvent('MouseEvent')
    // event.initEvent('click', true, true)
    // // event.which = 13
    // // event.keyCode = 13
    // root.dispatchEvent(event)
    // $(root).trigger('click')
    // // description.blur()
  }, false)
})()
