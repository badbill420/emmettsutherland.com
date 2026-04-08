self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  if (url.hostname === 'static.wixstatic.com' && url.pathname.startsWith('/media/')) {
    // Extract the base filename from the path, e.g. 304f15_xxx~mv2.jpg
    const segment = url.pathname.replace('/media/', '').split('/')[0];
    if (/\.(jpe?g|png|gif|svg|webp|avif)$/i.test(segment)) {
      const localUrl = new URL('/images/' + segment, self.location.origin);
      event.respondWith(
        fetch(localUrl).catch(function() {
          return fetch(event.request);
        })
      );
      return;
    }
  }
});
