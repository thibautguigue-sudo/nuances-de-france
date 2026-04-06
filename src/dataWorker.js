// Web Worker: fetch + JSON.parse off the main thread
self.onmessage = async function (e) {
  const { url, id } = e.data
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const text = await resp.text()
    const data = JSON.parse(text)
    self.postMessage({ id, data })
  } catch (err) {
    self.postMessage({ id, error: err.message })
  }
}
