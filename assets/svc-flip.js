function toggleFlip(card){card.classList.toggle('flipped');}
function flipBack(btn){btn.closest('.svc-flip-wrap').classList.remove('flipped');}
function openCWModal(svc){
  document.getElementById('cwModalBadge').textContent=svc;
  document.getElementById('cwServiceField').value=svc;
  document.getElementById('cwModal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeCWModal(){
  document.getElementById('cwModal').classList.remove('open');
  document.body.style.overflow='';
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeCWModal();});
function cwFormSubmit(e){
  e.preventDefault();
  var f=e.target;
  var body='Name: '+f.name.value+'\nEmail: '+f.email.value+'\nService: '+f.service.value+(f.budget.value?'\nBudget: '+f.budget.value:'')+'\n\n'+f.message.value;
  var sub='Quote Request: '+f.service.value;
  window.location.href='mailto:crystalnation15@gmail.com?subject='+encodeURIComponent(sub)+'&body='+encodeURIComponent(body);
}
