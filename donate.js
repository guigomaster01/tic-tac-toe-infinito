const fileInput = document.getElementById('qr-file');
const img = document.getElementById('qr-img');
const btnCopy = document.getElementById('copy-key');
const keyEl = document.getElementById('pix-key');

fileInput?.addEventListener('change', (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => { img.src = reader.result; };
  reader.readAsDataURL(file);
});

btnCopy?.addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(keyEl.textContent.trim());
    btnCopy.textContent = 'Copiado!';
    setTimeout(()=> btnCopy.textContent = 'Copiar', 1200);
  }catch(err){
    btnCopy.textContent = 'Erro :(';
    setTimeout(()=> btnCopy.textContent = 'Copiar', 1200);
  }
});
