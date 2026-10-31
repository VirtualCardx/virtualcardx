(function () {
  var btn = document.querySelector('.menu-toggle')
  var nav = document.getElementById('mainNav')
  if (!btn || !nav) return

  function close(restoreFocus) {
    nav.classList.remove('open')
    btn.setAttribute('aria-expanded', 'false')
    if (restoreFocus) btn.focus()
  }

  btn.addEventListener('click', function (event) {
    event.stopPropagation()
    var open = nav.classList.toggle('open')
    btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    if (open) {
      var first = nav.querySelector('input, a')
      if (first) first.focus()
    }
  })

  nav.addEventListener('click', function (event) {
    if (event.target.tagName === 'A') close(false)
  })

  document.addEventListener('click', function (event) {
    if (!nav.classList.contains('open')) return
    if (!nav.contains(event.target) && !btn.contains(event.target)) close(false)
  })

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.classList.contains('open')) close(true)
  })
})()
