document.getElementById('btn-top').onclick = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('btn-bottom').onclick = () => {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
};
