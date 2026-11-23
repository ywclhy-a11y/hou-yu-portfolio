export function closeOnBackdrop(dialog) {
  let beganOnBackdrop = false;
  dialog.addEventListener('pointerdown', event => {
    beganOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog && beganOnBackdrop) dialog.close();
    beganOnBackdrop = false;
  });
}

export function createImageViewer(dialog) {
  const title = dialog.querySelector('h2');
  const photo = dialog.querySelector('img');
  const caption = dialog.querySelector('.viewer-caption');
  const controls = dialog.querySelector('.viewer-controls');
  const position = dialog.querySelector('.viewer-position');
  const previous = dialog.querySelector('[data-image-step="-1"]');
  const next = dialog.querySelector('[data-image-step="1"]');
  const related = dialog.querySelector('a');
  let images = [];
  let selected = 0;
  function render() {
    const image = images[selected];
    title.textContent = image.title;
    photo.src = image.src;
    photo.alt = image.title;
    caption.textContent = image.caption || '';
    caption.hidden = !image.caption;
    position.textContent = (selected + 1) + ' / ' + images.length;
    controls.hidden = images.length < 2;
    related.hidden = !image.related;
    if (image.related) related.href = image.related;
    else related.removeAttribute('href');
  }
  function step(offset) {
    selected = (selected + offset + images.length) % images.length;
    render();
  }
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  closeOnBackdrop(dialog);
  dialog.querySelector('[data-image-close]').addEventListener('click', () => dialog.close());
  related.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (!dialog.open) photo.removeAttribute('src');
  });
  dialog.addEventListener('keydown', event => {
    if (images.length < 2 || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  });
  return {
    open(items, index = 0) {
      if (!items.length) return;
      images = items;
      selected = index;
      render();
      if (!dialog.open) dialog.showModal();
    }
  };
}
